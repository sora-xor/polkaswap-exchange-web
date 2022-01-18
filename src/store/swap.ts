import map from 'lodash/fp/map';
import flatMap from 'lodash/fp/flatMap';
import fromPairs from 'lodash/fp/fromPairs';
import flow from 'lodash/fp/flow';
import concat from 'lodash/fp/concat';
import isEmpty from 'lodash/fp/isEmpty';
import intersection from 'lodash/fp/intersection';
import { FPNumber, isDirectExchange, XOR, LiquiditySourceTypes } from '@sora-substrate/util';

import {
  MarketAlgorithms,
  MarketAlgorithmForLiquiditySource,
  LiquiditySourceForMarketAlgorithm,
  ZeroStringValue,
} from '@/consts';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';
import { divideAssets } from '@/utils';

import type {
  AccountBalance,
  CodecString,
  LPRewardsInfo,
  QuotePaths,
  QuotePayload,
  PrimaryMarketsEnabledAssets,
} from '@sora-substrate/util';

import { api } from '@soramitsu/soraneo-wallet-web';

const balanceSubscriptions = new TokenBalanceSubscriptions();

const types = flow(
  flatMap((x) => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_TOKEN_FROM_ADDRESS',
    'RESET_TOKEN_FROM_ADDRESS',
    'SET_TOKEN_TO_ADDRESS',
    'RESET_TOKEN_TO_ADDRESS',
    'SET_TOKEN_FROM_BALANCE',
    'SET_TOKEN_TO_BALANCE',
    'SET_FROM_VALUE',
    'SET_TO_VALUE',
    'SET_AMOUNT_WITHOUT_IMPACT',
    'SET_EXCHANGE_B',
    'SET_LIQUIDITY_PROVIDER_FEE',
    'SET_PAIR_LIQUIDITY_SOURCES',
    'SET_PATHS',
    'SET_REWARDS',
    'SET_SUBSCRIPTION_PAYLOAD',
    'SET_PRIMARY_MARKETS_ENABLED_ASSETS',
    'GET_SWAP_CONFIRM',
    'RESET',
    'SET_NETWORK_FEE',
    'SET_MIN_MAX_RECEIVED',
  ]),
  map((x) => [x, x]),
  fromPairs
)(['CHECK_AVAILABILITY']);

interface SwapState {
  tokenFromAddress: Nullable<string>;
  tokenFromBalance: Nullable<AccountBalance>;
  tokenToAddress: Nullable<string>;
  tokenToBalance: Nullable<AccountBalance>;
  fromValue: string;
  toValue: string;
  amountWithoutImpact: CodecString;
  isExchangeB: boolean;
  liquidityProviderFee: CodecString;
  pairLiquiditySources: Array<LiquiditySourceTypes>;
  paths: QuotePaths;
  enabledAssets: PrimaryMarketsEnabledAssets;
  rewards: Array<LPRewardsInfo>;
  payload: Nullable<QuotePayload>;
  minMaxReceived: CodecString;
  networkFee: CodecString;
  isAvailable: boolean;
  isAvailableChecking: boolean;
}

function initialState(): SwapState {
  return {
    tokenFromAddress: '',
    tokenToAddress: '',
    tokenFromBalance: null,
    tokenToBalance: null,
    fromValue: '',
    toValue: '',
    amountWithoutImpact: '',
    isExchangeB: false,
    liquidityProviderFee: '',
    pairLiquiditySources: [],
    paths: {},
    enabledAssets: {},
    rewards: [],
    payload: null,
    minMaxReceived: '',
    networkFee: '',
    isAvailable: false,
    isAvailableChecking: false,
  };
}

const getSources = (
  address: string,
  payload: QuotePayload,
  enabledAssets: PrimaryMarketsEnabledAssets
): Array<LiquiditySourceTypes> => {
  const rules = {
    [LiquiditySourceTypes.MulticollateralBondingCurvePool]: () => enabledAssets.tbc.includes(address),
    [LiquiditySourceTypes.XYKPool]: () => payload.reserves.xyk[address].every((tokenReserve) => !!Number(tokenReserve)),
    [LiquiditySourceTypes.XSTPool]: () => enabledAssets.xst.includes(address),
  };

  return Object.entries(rules).reduce((acc: LiquiditySourceTypes[], entry) => {
    const [source, rule] = entry;
    if (rule()) {
      acc.push(source as LiquiditySourceTypes);
    }
    return acc;
  }, []);
};

const state = initialState();

const getters = {
  tokenFrom(state: SwapState, getters, rootState, rootGetters) {
    const token = rootGetters['assets/getAssetDataByAddress'](state.tokenFromAddress);
    const balance = state.tokenFromBalance;

    return balance ? { ...token, balance } : token;
  },
  tokenTo(state: SwapState, getters, rootState, rootGetters) {
    const token = rootGetters['assets/getAssetDataByAddress'](state.tokenToAddress);
    const balance = state.tokenToBalance;

    return balance ? { ...token, balance } : token;
  },
  marketAlgorithms(state: SwapState) {
    // implementation of backend hack, to show only primary market sources
    const primarySources = state.pairLiquiditySources.filter((source) => source !== LiquiditySourceTypes.XYKPool);

    const items = Object.keys(LiquiditySourceForMarketAlgorithm) as Array<MarketAlgorithms>;

    return items.filter((marketAlgorithm) => {
      const liquiditySource = LiquiditySourceForMarketAlgorithm[marketAlgorithm];

      return marketAlgorithm === MarketAlgorithms.SMART || primarySources.includes(liquiditySource);
    });
  },
  marketAlgorithmsAvailable(state: SwapState, getters) {
    return getters.marketAlgorithms.length > 1;
  },
  swapLiquiditySource(state, getters, rootState, rootGetters) {
    if (!getters.marketAlgorithmsAvailable || !rootGetters.liquiditySource) return undefined;

    return rootGetters.liquiditySource;
  },
  isAvailable(state: SwapState) {
    return !isEmpty(state.paths) && Object.values(state.paths).every((paths) => !isEmpty(paths));
  },
  swapMarketAlgorithm(state: SwapState, getters) {
    return MarketAlgorithmForLiquiditySource[getters.swapLiquiditySource ?? ''];
  },
  price(state: SwapState, getters) {
    return divideAssets(getters.tokenFrom, getters.tokenTo, state.fromValue, state.toValue, false);
  },
  priceReversed(state: SwapState, getters) {
    return divideAssets(getters.tokenFrom, getters.tokenTo, state.fromValue, state.toValue, true);
  },
  priceImpact(state: SwapState, getters) {
    const { fromValue, toValue, amountWithoutImpact, isExchangeB } = state;

    const token = isExchangeB ? getters.tokenFrom : getters.tokenTo;
    const value = isExchangeB ? fromValue : toValue;

    if (!token || !value || !amountWithoutImpact) return ZeroStringValue;

    const withoutImpact = FPNumber.fromCodecValue(amountWithoutImpact, token.decimals);

    if (withoutImpact.isZero()) return ZeroStringValue;

    const amount = new FPNumber(value, token.decimals);
    const impact = isExchangeB ? withoutImpact.div(amount) : amount.div(withoutImpact);
    const result = new FPNumber(1).sub(impact).mul(FPNumber.HUNDRED);

    return FPNumber.lte(result, FPNumber.ZERO) ? ZeroStringValue : FPNumber.ZERO.sub(result).toFixed(2);
  },
  minMaxReceived(state: SwapState, getters, rootState, rootGetters) {
    const { fromValue, toValue, isExchangeB } = state;

    const value = isExchangeB ? fromValue : toValue;
    const token = isExchangeB ? getters.tokenFrom : getters.tokenTo;

    if (!token || !value) return ZeroStringValue;

    const resultDecimals = token.decimals;
    const result = new FPNumber(value, resultDecimals);
    const resultMulSlippage = result.mul(new FPNumber(Number(rootGetters.slippageTolerance) / 100, resultDecimals));

    return (!isExchangeB ? result.sub(resultMulSlippage) : result.add(resultMulSlippage)).toCodecString();
  },
  fromValue(state: SwapState) {
    return state.fromValue;
  },
  toValue(state: SwapState) {
    return state.toValue;
  },
  isExchangeB(state: SwapState) {
    return state.isExchangeB;
  },
  networkFee(state: SwapState) {
    return state.networkFee;
  },
  liquidityProviderFee(state: SwapState) {
    return state.liquidityProviderFee;
  },
  isAvailableChecking(state: SwapState) {
    return state.isAvailableChecking;
  },
  isAvailableSend(state: SwapState) {
    return state.isAvailable;
  },
  pairLiquiditySourcesAvailable(state: SwapState) {
    return state.pairLiquiditySources.length !== 0;
  },
  rewards(state: SwapState) {
    return state.rewards;
  },
};

const mutations = {
  [types.RESET](state: SwapState) {
    const s = initialState();

    Object.keys(s).forEach((key) => {
      state[key] = s[key];
    });
  },
  [types.SET_TOKEN_FROM_ADDRESS](state: SwapState, address: string) {
    state.tokenFromAddress = address;
  },
  [types.RESET_TOKEN_FROM_ADDRESS](state: SwapState) {
    state.tokenFromAddress = '';
  },
  [types.SET_TOKEN_FROM_BALANCE](state: SwapState, balance = null) {
    state.tokenFromBalance = balance;
  },
  [types.SET_TOKEN_TO_BALANCE](state: SwapState, balance = null) {
    state.tokenToBalance = balance;
  },
  [types.SET_TOKEN_TO_ADDRESS](state: SwapState, address: string) {
    state.tokenToAddress = address;
  },
  [types.RESET_TOKEN_TO_ADDRESS](state: SwapState) {
    state.tokenToAddress = '';
  },
  [types.SET_FROM_VALUE](state: SwapState, fromValue: string) {
    state.fromValue = fromValue;
  },
  [types.SET_TO_VALUE](state: SwapState, toValue: string) {
    state.toValue = toValue;
  },
  [types.SET_MIN_MAX_RECEIVED](state: SwapState, minMaxReceived: CodecString) {
    state.minMaxReceived = minMaxReceived;
  },
  [types.SET_AMOUNT_WITHOUT_IMPACT](state: SwapState, amount: CodecString) {
    state.amountWithoutImpact = amount;
  },
  [types.SET_EXCHANGE_B](state: SwapState, isExchangeB: boolean) {
    state.isExchangeB = isExchangeB;
  },
  [types.SET_LIQUIDITY_PROVIDER_FEE](state: SwapState, liquidityProviderFee: CodecString) {
    state.liquidityProviderFee = liquidityProviderFee;
  },
  [types.SET_PAIR_LIQUIDITY_SOURCES](state: SwapState, liquiditySources: Array<LiquiditySourceTypes>) {
    state.pairLiquiditySources = [...liquiditySources];
  },
  [types.SET_PATHS](state: SwapState, paths: QuotePaths) {
    state.paths = { ...paths };
  },
  [types.SET_PRIMARY_MARKETS_ENABLED_ASSETS](state: SwapState, assets: PrimaryMarketsEnabledAssets) {
    state.enabledAssets = { ...assets };
  },
  [types.SET_REWARDS](state: SwapState, rewards: Array<LPRewardsInfo>) {
    state.rewards = [...rewards];
  },
  [types.SET_SUBSCRIPTION_PAYLOAD](state: SwapState, payload: QuotePayload) {
    state.payload = payload;
  },
  [types.SET_NETWORK_FEE](state: SwapState, networkFee: CodecString) {
    state.networkFee = networkFee;
  },
  [types.CHECK_AVAILABILITY_REQUEST](state: SwapState) {
    console.log('CHECK_AVAILABILITY_REQUEST');
    state.isAvailable = false;
    state.isAvailableChecking = true;
  },
  [types.CHECK_AVAILABILITY_SUCCESS](state: SwapState, isAvailable: boolean) {
    console.log(isAvailable, 'CHECK_AVAILABILITY_SUCCESS');
    state.isAvailable = isAvailable;
    state.isAvailableChecking = false;
  },
  [types.CHECK_AVAILABILITY_FAILURE](state: SwapState) {
    console.log('CHECK_AVAILABILITY_FAILURE');
    state.isAvailable = false;
    state.isAvailableChecking = false;
  },
};

const actions = {
  async setTokenFromAddress({ commit, dispatch }, address?: string) {
    if (!address) {
      commit(types.RESET_TOKEN_FROM_ADDRESS);
    } else {
      commit(types.SET_TOKEN_FROM_ADDRESS, address);
    }

    dispatch('updateTokenFromSubscription');
  },

  async setTokenToAddress({ commit, dispatch }, address?: string) {
    if (!address) {
      commit(types.RESET_TOKEN_TO_ADDRESS);
    } else {
      commit(types.SET_TOKEN_TO_ADDRESS, address);
    }

    dispatch('updateTokenToSubscription');
  },

  updateTokenFromSubscription({ commit, getters, rootGetters }) {
    const updateBalance = (balance) => commit(types.SET_TOKEN_FROM_BALANCE, balance);

    balanceSubscriptions.remove('from', { updateBalance });

    if (
      rootGetters.isLoggedIn &&
      getters.tokenFrom?.address &&
      !(getters.tokenFrom.address in rootGetters.accountAssetsAddressTable)
    ) {
      balanceSubscriptions.add('from', { updateBalance, token: getters.tokenFrom });
    }
  },

  updateTokenToSubscription({ commit, getters, rootGetters }) {
    const updateBalance = (balance) => commit(types.SET_TOKEN_TO_BALANCE, balance);

    balanceSubscriptions.remove('to', { updateBalance });

    if (
      rootGetters.isLoggedIn &&
      getters.tokenTo?.address &&
      !(getters.tokenTo.address in rootGetters.accountAssetsAddressTable)
    ) {
      balanceSubscriptions.add('to', { updateBalance, token: getters.tokenTo });
    }
  },

  setFromValue({ commit }, fromValue: string | number) {
    commit(types.SET_FROM_VALUE, fromValue);
  },
  setToValue({ commit }, toValue: string | number) {
    commit(types.SET_TO_VALUE, toValue);
  },
  setMinMaxReceived({ commit }, minMaxReceived) {
    commit(types.SET_MIN_MAX_RECEIVED, minMaxReceived);
  },
  setAmountWithoutImpact({ commit }, amount: CodecString) {
    commit(types.SET_AMOUNT_WITHOUT_IMPACT, amount);
  },
  setExchangeB({ commit }, flag: boolean) {
    commit(types.SET_EXCHANGE_B, flag);
  },
  setLiquidityProviderFee({ commit }, liquidityProviderFee: string) {
    commit(types.SET_LIQUIDITY_PROVIDER_FEE, liquidityProviderFee);
  },
  setRewards({ commit }, rewards: Array<LPRewardsInfo>) {
    commit(types.SET_REWARDS, rewards);
  },
  setNetworkFee({ commit }, networkFee: string) {
    commit(types.SET_NETWORK_FEE, networkFee);
  },

  async checkMarketAlgorithmUpdate({ dispatch, rootGetters, state }) {
    // reset market algorithm to default, if related liquiditySource is not available
    if (state.pairLiquiditySources.length && !state.pairLiquiditySources.includes(rootGetters.liquiditySource)) {
      await dispatch('setMarketAlgorithm', undefined, { root: true });
    }
  },
  async checkSwap({ commit, getters }) {
    if (getters.tokenFrom?.address && getters.tokenTo?.address) {
      commit(types.CHECK_AVAILABILITY_REQUEST);
      try {
        const isAvailable = await api.checkSwap(getters.tokenFrom.address, getters.tokenTo.address);
        commit(types.CHECK_AVAILABILITY_SUCCESS, isAvailable);
      } catch (error) {
        commit(types.CHECK_AVAILABILITY_FAILURE, error);
      }
    }
  },

  updatePaths({ commit, getters, state }) {
    const inputAssetId = getters.tokenFrom?.address;
    const outputAssetId = getters.tokenTo?.address;
    const quotePaths: QuotePaths = {};
    const pairLiquiditySources: Array<LiquiditySourceTypes> = [];

    try {
      if (inputAssetId && outputAssetId) {
        const xor = XOR.address;

        if (isDirectExchange(inputAssetId, outputAssetId)) {
          const nonXor = inputAssetId === xor ? outputAssetId : inputAssetId;
          const path = getSources(nonXor, state.payload, state.enabledAssets);

          quotePaths[nonXor] = path;
          pairLiquiditySources.push(...path);
        } else {
          const [inputPaths, outputPaths] = [
            getSources(inputAssetId, state.payload, state.enabledAssets),
            getSources(outputAssetId, state.payload, state.enabledAssets),
          ];

          quotePaths[inputAssetId] = inputPaths;
          quotePaths[outputAssetId] = outputPaths;
          pairLiquiditySources.push(...intersection(inputPaths, outputPaths));
        }
      }

      commit(types.SET_PATHS, quotePaths);
      commit(types.SET_PAIR_LIQUIDITY_SOURCES, pairLiquiditySources);
    } catch (error) {
      console.error(error);
      commit(types.SET_PATHS, {});
      commit(types.SET_PAIR_LIQUIDITY_SOURCES, []);
    }
  },

  async setSubscriptionPayload({ commit, dispatch }, payload: QuotePayload) {
    commit(types.SET_SUBSCRIPTION_PAYLOAD, payload);
    await dispatch('updatePaths');
    await dispatch('checkMarketAlgorithmUpdate');
  },

  async setPrimaryMarketsEnabledAssets({ commit }, assets: PrimaryMarketsEnabledAssets) {
    commit(types.SET_PRIMARY_MARKETS_ENABLED_ASSETS, assets);
  },

  reset({ commit, dispatch }) {
    dispatch('resetSubscriptions');
    commit(types.RESET);
  },
  resetSubscriptions({ commit }) {
    balanceSubscriptions.remove('from', { updateBalance: (balance) => commit(types.SET_TOKEN_FROM_BALANCE, balance) });
    balanceSubscriptions.remove('to', { updateBalance: (balance) => commit(types.SET_TOKEN_TO_BALANCE, balance) });
  },
  updateSubscriptions({ dispatch }) {
    dispatch('updateTokenFromSubscription');
    dispatch('updateTokenToSubscription');
  },
  setPairLiquiditySources({ commit, dispatch, rootGetters }, liquiditySources: Array<LiquiditySourceTypes>) {
    // reset market algorithm to default, if related liquiditySource is not available
    if (liquiditySources.length && !liquiditySources.includes(rootGetters.liquiditySource)) {
      dispatch('setMarketAlgorithm', undefined, { root: true });
    }
    commit(types.SET_PAIR_LIQUIDITY_SOURCES, liquiditySources);
  },
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
};
