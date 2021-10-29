import map from 'lodash/fp/map';
import flatMap from 'lodash/fp/flatMap';
import fromPairs from 'lodash/fp/fromPairs';
import flow from 'lodash/fp/flow';
import concat from 'lodash/fp/concat';
import { api } from '@soramitsu/soraneo-wallet-web';
import {
  FPNumber,
  CodecString,
  LiquiditySourceTypes,
  LPRewardsInfo,
  QuotePayload,
  KnownAssets,
  KnownSymbols,
} from '@sora-substrate/util';

import { MarketAlgorithmForLiquiditySource, ZeroStringValue } from '@/consts';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';
import { divideAssets } from '@/utils';
import { isDirectExchange } from '@/services/liquidityProxy';

import type { QuotePaths } from '@/services/liquidityProxy';

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
    'GET_SWAP_CONFIRM',
    'RESET',
  ]),
  map((x) => [x, x]),
  fromPairs
)(['CHECK_AVAILABILITY']);

interface SwapState {
  tokenFromAddress: Nullable<string>;
  tokenFromBalance: any;
  tokenToAddress: Nullable<string>;
  tokenToBalance: any;
  fromValue: string;
  toValue: string;
  amountWithoutImpact: CodecString;
  isExchangeB: boolean;
  liquidityProviderFee: CodecString;
  pairLiquiditySources: Array<LiquiditySourceTypes>;
  paths: QuotePaths;
  isAvailable: boolean;
  isAvailableChecking: boolean;
  rewards: Array<LPRewardsInfo>;
  payload: Nullable<QuotePayload>;
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
    isAvailable: false,
    isAvailableChecking: false,
    pairLiquiditySources: [],
    paths: {},
    rewards: [],
    payload: null,
  };
}

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
  pairLiquiditySourcesAvailable(state: SwapState) {
    return state.pairLiquiditySources.length !== 0;
  },
  swapLiquiditySource(state, getters, rootState, rootGetters) {
    if (!getters.pairLiquiditySourcesAvailable) return undefined;

    return rootGetters.liquiditySource;
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
  [types.SET_AMOUNT_WITHOUT_IMPACT](state: SwapState, amount: CodecString) {
    state.amountWithoutImpact = amount;
  },
  [types.SET_EXCHANGE_B](state: SwapState, isExchangeB: boolean) {
    state.isExchangeB = isExchangeB;
  },
  [types.SET_LIQUIDITY_PROVIDER_FEE](state: SwapState, liquidityProviderFee: CodecString) {
    state.liquidityProviderFee = liquidityProviderFee;
  },
  [types.CHECK_AVAILABILITY_REQUEST](state: SwapState) {
    state.isAvailable = false;
    state.isAvailableChecking = true;
  },
  [types.CHECK_AVAILABILITY_SUCCESS](state: SwapState, isAvailable: boolean) {
    state.isAvailable = isAvailable;
    state.isAvailableChecking = false;
  },
  [types.CHECK_AVAILABILITY_FAILURE](state: SwapState) {
    state.isAvailable = false;
    state.isAvailableChecking = false;
  },
  [types.SET_PAIR_LIQUIDITY_SOURCES](state: SwapState, liquiditySources: Array<LiquiditySourceTypes>) {
    state.pairLiquiditySources = [...liquiditySources];
  },
  [types.SET_PATHS](state: SwapState, paths: QuotePaths) {
    state.paths = { ...paths };
  },
  [types.SET_REWARDS](state: SwapState, rewards: Array<LPRewardsInfo>) {
    state.rewards = [...rewards];
  },
  [types.SET_SUBSCRIPTION_PAYLOAD](state: SwapState, payload) {
    state.payload = payload;
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
  setAmountWithoutImpact({ commit }, amount: CodecString) {
    commit(types.SET_AMOUNT_WITHOUT_IMPACT, amount);
  },
  setExchangeB({ commit }, flag: boolean) {
    commit(types.SET_EXCHANGE_B, flag);
  },
  setLiquidityProviderFee({ commit }, liquidityProviderFee: string) {
    commit(types.SET_LIQUIDITY_PROVIDER_FEE, liquidityProviderFee);
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
  async updatePairLiquiditySources({ commit, dispatch, getters, rootGetters }) {
    const isPair = !!getters.tokenFrom?.address && !!getters.tokenTo?.address;

    const sources = isPair
      ? await api.getListEnabledSourcesForPath(getters.tokenFrom?.address, getters.tokenTo?.address)
      : [];

    // reset market algorithm to default, if related liquiditySource is not available
    if (sources.length && !sources.includes(rootGetters.liquiditySource)) {
      await dispatch('setMarketAlgorithm', undefined, { root: true });
    }

    commit(types.SET_PAIR_LIQUIDITY_SOURCES, sources);
  },
  async updatePaths({ commit, getters }) {
    const inputAssetId = getters.tokenFrom?.address;
    const outputAssetId = getters.tokenTo?.address;

    if (!inputAssetId || !outputAssetId) {
      commit(types.SET_PATHS, {});
      return;
    }

    const xor = KnownAssets.get(KnownSymbols.XOR).address;

    if (isDirectExchange(inputAssetId, outputAssetId)) {
      const path = await api.getListEnabledSourcesForPath(inputAssetId, outputAssetId);
      const nonXor = inputAssetId === xor ? outputAssetId : inputAssetId;

      const paths: QuotePaths = {
        [nonXor]: path,
      };

      commit(types.SET_PATHS, paths);
    } else {
      const [inputPaths, outputPaths] = await Promise.all([
        api.getListEnabledSourcesForPath(inputAssetId, xor),
        api.getListEnabledSourcesForPath(xor, outputAssetId),
      ]);

      const paths: QuotePaths = {
        [inputAssetId]: inputPaths,
        [outputAssetId]: outputPaths,
      };

      commit(types.SET_PATHS, paths);
    }
  },
  setRewards({ commit }, rewards: Array<LPRewardsInfo>) {
    commit(types.SET_REWARDS, rewards);
  },
  setSubscriptionPayload({ commit }, payload) {
    commit(types.SET_SUBSCRIPTION_PAYLOAD, payload);
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
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
};
