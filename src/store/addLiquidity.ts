import map from 'lodash/fp/map';
import flatMap from 'lodash/fp/flatMap';
import fromPairs from 'lodash/fp/fromPairs';
import flow from 'lodash/fp/flow';
import concat from 'lodash/fp/concat';
import { api } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, CodecString } from '@sora-substrate/util';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';

import { ZeroStringValue } from '@/consts';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';

const balanceSubscriptions = new TokenBalanceSubscriptions();

const types = flow(
  flatMap((x) => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_FIRST_TOKEN_ADDRESS',
    'SET_SECOND_TOKEN_ADDRESS',
    'SET_FIRST_TOKEN_VALUE',
    'SET_SECOND_TOKEN_VALUE',
    'SET_SECOND_TOKEN_BALANCE',
    'SET_FOCUSED_FIELD',
  ]),
  map((x) => [x, x]),
  fromPairs
)(['ADD_LIQUIDITY', 'GET_RESERVE', 'ESTIMATE_MINTED', 'CHECK_LIQUIDITY']);

interface AddLiquidityState {
  firstTokenAddress: string;
  secondTokenAddress: string;
  firstTokenValue: string;
  secondTokenValue: string;
  secondTokenBalance: Nullable<AccountBalance>;
  reserve: Nullable<Array<CodecString>>;
  minted: CodecString;
  totalSupply: CodecString;
  focusedField: Nullable<string>;
  isAvailable: boolean;
}

function initialState(): AddLiquidityState {
  return {
    firstTokenAddress: '',
    secondTokenAddress: '',
    firstTokenValue: '',
    secondTokenValue: '',
    secondTokenBalance: null,
    reserve: null,
    minted: ZeroStringValue,
    totalSupply: ZeroStringValue,
    focusedField: null,
    isAvailable: false,
  };
}

const state = initialState();

const getters = {
  firstToken(state: AddLiquidityState, getters, rootState, rootGetters) {
    return rootGetters['assets/getAssetDataByAddress'](state.firstTokenAddress);
  },
  secondToken(state: AddLiquidityState, getters, rootState, rootGetters) {
    const token = rootGetters['assets/getAssetDataByAddress'](state.secondTokenAddress);
    const balance = state.secondTokenBalance;

    return balance ? { ...token, balance } : token;
  },
  firstTokenValue(state: AddLiquidityState) {
    return state.firstTokenValue;
  },
  secondTokenValue(state: AddLiquidityState) {
    return state.secondTokenValue;
  },
  liquidityInfo(state: AddLiquidityState, getters, rootState, rootGetters) {
    return rootGetters['pool/accountLiquidity'].find(
      (liquidity) =>
        liquidity.firstAddress === state.firstTokenAddress && liquidity.secondAddress === state.secondTokenAddress
    );
  },
  reserve(state: AddLiquidityState) {
    return state.reserve;
  },
  reserveA(state: AddLiquidityState) {
    return state.reserve ? state.reserve[0] : ZeroStringValue;
  },
  reserveB(state: AddLiquidityState) {
    return state.reserve ? state.reserve[1] : ZeroStringValue;
  },
  isAvailable(state: AddLiquidityState) {
    return state.isAvailable && state.reserve;
  },
  isNotFirstLiquidityProvider(state: AddLiquidityState, getters) {
    return state.reserve && +getters.reserveA !== 0 && +getters.reserveB !== 0;
  },
  minted(state: AddLiquidityState) {
    return state.minted || ZeroStringValue;
  },
  totalSupply(state: AddLiquidityState) {
    return state.totalSupply || ZeroStringValue;
  },
  shareOfPool(state: AddLiquidityState, getters) {
    const full = FPNumber.HUNDRED;
    const minted = FPNumber.fromCodecValue(getters.minted);
    const total = FPNumber.fromCodecValue(getters.totalSupply);
    const existed = FPNumber.fromCodecValue(getters.liquidityInfo?.balance ?? 0);

    if (total.isZero() && minted.isZero()) return full.toLocaleString(); // pair created but hasn't liquidity

    return minted.add(existed).div(total.add(minted)).mul(full).toLocaleString() || ZeroStringValue;
  },
};

const mutations = {
  [types.SET_FIRST_TOKEN_ADDRESS](state: AddLiquidityState, address: string) {
    state.firstTokenAddress = address;
  },
  [types.SET_SECOND_TOKEN_ADDRESS](state: AddLiquidityState, address: string) {
    state.secondTokenAddress = address;
  },
  [types.SET_FIRST_TOKEN_VALUE](state: AddLiquidityState, firstTokenValue: string) {
    state.firstTokenValue = firstTokenValue;
  },
  [types.SET_SECOND_TOKEN_VALUE](state: AddLiquidityState, secondTokenValue: string) {
    state.secondTokenValue = secondTokenValue;
  },
  [types.SET_SECOND_TOKEN_BALANCE](state: AddLiquidityState, balance = null) {
    state.secondTokenBalance = balance;
  },
  [types.ADD_LIQUIDITY_REQUEST](state) {},
  [types.ADD_LIQUIDITY_SUCCESS](state) {},
  [types.ADD_LIQUIDITY_FAILURE](state, error) {},
  [types.GET_RESERVE_REQUEST](state) {},
  [types.GET_RESERVE_SUCCESS](state: AddLiquidityState, reserve: Nullable<Array<CodecString>>) {
    state.reserve = reserve;
  },
  [types.GET_RESERVE_FAILURE](state, error) {},
  [types.ESTIMATE_MINTED_REQUEST](state) {},
  [types.ESTIMATE_MINTED_SUCCESS](
    state: AddLiquidityState,
    { minted, pts }: { minted: CodecString; pts: CodecString }
  ) {
    state.minted = minted;
    state.totalSupply = pts;
  },
  [types.ESTIMATE_MINTED_FAILURE](state: AddLiquidityState) {
    state.minted = ZeroStringValue;
    state.totalSupply = ZeroStringValue;
  },
  [types.SET_FOCUSED_FIELD](state: AddLiquidityState, field: Nullable<string>) {
    state.focusedField = field;
  },
  [types.CHECK_LIQUIDITY_REQUEST](state) {},
  [types.CHECK_LIQUIDITY_SUCCESS](state: AddLiquidityState, isAvailable: boolean) {
    state.isAvailable = isAvailable;
  },
  [types.CHECK_LIQUIDITY_FAILURE](state) {},
};

const actions = {
  async setFirstTokenAddress({ commit, dispatch }, address: string) {
    commit(types.SET_FIRST_TOKEN_ADDRESS, address);
    commit(types.SET_FIRST_TOKEN_VALUE, '');
    commit(types.SET_SECOND_TOKEN_VALUE, '');
    await dispatch('checkLiquidity');
  },

  async setSecondTokenAddress({ commit, dispatch, getters, rootGetters }, address: string) {
    const updateBalance = (balance: Nullable<AccountBalance>) => commit(types.SET_SECOND_TOKEN_BALANCE, balance);

    commit(types.SET_SECOND_TOKEN_ADDRESS, address);
    commit(types.SET_FIRST_TOKEN_VALUE, '');
    commit(types.SET_SECOND_TOKEN_VALUE, '');

    balanceSubscriptions.remove('second', { updateBalance });

    if (getters.secondToken?.address && !(getters.secondToken.address in rootGetters.accountAssetsAddressTable)) {
      balanceSubscriptions.add('second', { updateBalance, token: getters.secondToken });
    }

    await dispatch('checkLiquidity');
  },

  async checkReserve({ commit, getters, dispatch }) {
    if (getters.firstToken && getters.secondToken) {
      commit(types.GET_RESERVE_REQUEST);
      try {
        const { firstToken, secondToken } = getters;
        const reserve = await api.poolXyk.getReserves(firstToken?.address, secondToken?.address);
        commit(types.GET_RESERVE_SUCCESS, reserve);

        await dispatch('estimateMinted');
      } catch (error) {
        commit(types.GET_RESERVE_FAILURE, error);
      }
    }
  },

  async checkLiquidity({ commit, getters, dispatch }) {
    if (getters.firstToken && getters.secondToken) {
      commit(types.CHECK_LIQUIDITY_REQUEST);
      try {
        const { firstToken, secondToken } = getters;
        const isAvailable = await api.poolXyk.check(firstToken?.address, secondToken?.address);
        commit(types.CHECK_LIQUIDITY_SUCCESS, isAvailable);

        await dispatch('checkReserve');
      } catch (error) {
        commit(types.CHECK_LIQUIDITY_FAILURE, error);
      }
    }
  },

  async estimateMinted({ commit, getters }) {
    if (getters.firstToken?.address && getters.secondToken?.address) {
      commit(types.ESTIMATE_MINTED_REQUEST);

      try {
        const [minted, pts] = await api.poolXyk.estimatePoolTokensMinted(
          getters.firstToken,
          getters.secondToken,
          getters.firstTokenValue,
          getters.secondTokenValue,
          getters.reserveA,
          getters.reserveB
        );
        commit(types.ESTIMATE_MINTED_SUCCESS, { minted, pts });
      } catch (error) {
        console.error(error);
        commit(types.ESTIMATE_MINTED_FAILURE);
      }
    }
  },

  setFirstTokenValue({ commit, dispatch, getters }, value: string | number) {
    if ((!getters.focusedField || getters.focusedField === 'firstTokenValue') && value !== getters.firstTokenValue) {
      commit(types.SET_FOCUSED_FIELD, 'firstTokenValue');

      commit(types.SET_FIRST_TOKEN_VALUE, value);

      if (!value) {
        commit(types.SET_SECOND_TOKEN_VALUE, '');
      } else if (getters.isNotFirstLiquidityProvider) {
        commit(
          types.SET_SECOND_TOKEN_VALUE,
          new FPNumber(value)
            .mul(FPNumber.fromCodecValue(getters.reserveB))
            .div(FPNumber.fromCodecValue(getters.reserveA))
            .toString()
        );
      }

      dispatch('estimateMinted');
    }
  },

  setSecondTokenValue({ commit, dispatch, getters }, value: string | number) {
    if ((!getters.focusedField || getters.focusedField === 'secondTokenValue') && value !== getters.secondTokenValue) {
      commit(types.SET_FOCUSED_FIELD, 'secondTokenValue');

      commit(types.SET_SECOND_TOKEN_VALUE, value);

      if (!value) {
        commit(types.SET_FIRST_TOKEN_VALUE, '');
      } else if (getters.isNotFirstLiquidityProvider) {
        commit(
          types.SET_FIRST_TOKEN_VALUE,
          new FPNumber(value)
            .mul(FPNumber.fromCodecValue(getters.reserveA))
            .div(FPNumber.fromCodecValue(getters.reserveB))
            .toString()
        );
      }

      dispatch('estimateMinted');
    }
  },

  async addLiquidity({ commit, getters, rootGetters }) {
    commit(types.ADD_LIQUIDITY_REQUEST);
    try {
      const result = await api.poolXyk.add(
        getters.firstToken,
        getters.secondToken,
        getters.firstTokenValue,
        getters.secondTokenValue,
        rootGetters.slippageTolerance
      );
      commit(types.ADD_LIQUIDITY_SUCCESS, result);
    } catch (error) {
      commit(types.ADD_LIQUIDITY_FAILURE);
      throw error;
    }
  },

  async setDataFromLiquidity(
    { dispatch },
    { firstAddress, secondAddress }: { firstAddress: string; secondAddress: string }
  ) {
    const findAssetAddress = async (address: string): Promise<string> => {
      const asset = await api.assets.getAssetInfo(address);
      return asset?.address ?? '';
    };

    const [first, second] = await Promise.all([findAssetAddress(firstAddress), findAssetAddress(secondAddress)]);

    await dispatch('setFirstTokenAddress', first);
    await dispatch('setSecondTokenAddress', second);
  },

  resetFocusedField({ commit }) {
    commit(types.SET_FOCUSED_FIELD, null);
  },

  resetData({ commit }, withAssets = false) {
    balanceSubscriptions.remove('second', {
      updateBalance: (balance: Nullable<AccountBalance>) => commit(types.SET_SECOND_TOKEN_BALANCE, balance),
    });

    if (!withAssets) {
      commit(types.SET_FIRST_TOKEN_ADDRESS, '');
      commit(types.SET_SECOND_TOKEN_ADDRESS, '');
    }
    commit(types.SET_FIRST_TOKEN_VALUE, '');
    commit(types.SET_SECOND_TOKEN_VALUE, '');
  },
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
};
