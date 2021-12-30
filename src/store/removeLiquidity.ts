import map from 'lodash/fp/map';
import flatMap from 'lodash/fp/flatMap';
import fromPairs from 'lodash/fp/fromPairs';
import flow from 'lodash/fp/flow';
import concat from 'lodash/fp/concat';
import debounce from 'lodash/debounce';
import { api } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, CodecString } from '@sora-substrate/util';

import { ZeroStringValue } from '@/consts';

const types = flow(
  flatMap((x) => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_LIQUIDITY_TOKENS_ADDRESSES',
    'SET_REMOVE_PART',
    'SET_LIQUIDITY_AMOUNT',
    'SET_FIRST_TOKEN_AMOUNT',
    'SET_SECOND_TOKEN_AMOUNT',
    'SET_FOCUSED_FIELD',
  ]),
  map((x) => [x, x]),
  fromPairs
)(['GET_LIQUIDITY_RESERVE', 'GET_TOTAL_SUPPLY']);

interface RemoveLiquidityState {
  firstTokenAddress: string;
  secondTokenAddress: string;
  removePart: number;
  liquidityAmount: string;
  firstTokenAmount: string;
  secondTokenAmount: string;
  focusedField: Nullable<string>;
  reserveA: CodecString;
  reserveB: CodecString;
  totalSupply: CodecString;
}

function initialState(): RemoveLiquidityState {
  return {
    firstTokenAddress: '',
    secondTokenAddress: '',
    removePart: 0,
    liquidityAmount: '',
    firstTokenAmount: '',
    secondTokenAmount: '',
    focusedField: null,
    reserveA: ZeroStringValue,
    reserveB: ZeroStringValue,
    totalSupply: ZeroStringValue,
  };
}

const state = initialState();

const getters = {
  liquidity(state: RemoveLiquidityState, getters, rootState, rootGetters) {
    return rootGetters['pool/accountLiquidity'].find(
      (liquidity) =>
        liquidity.firstAddress === state.firstTokenAddress && liquidity.secondAddress === state.secondTokenAddress
    );
  },
  liquidityBalance(state: RemoveLiquidityState, getters) {
    return getters.liquidity?.balance ?? ZeroStringValue;
  },
  liquidityDecimals(state: RemoveLiquidityState, getters) {
    return getters.liquidity?.decimals ?? 0;
  },
  firstToken(state: RemoveLiquidityState, getters, rootGetters) {
    return getters.liquidity && rootGetters.assets.assets
      ? rootGetters.assets.assets.find((t) => t.address === getters.liquidity.firstAddress) || {}
      : {};
  },
  secondToken(state: RemoveLiquidityState, getters, rootGetters) {
    return getters.liquidity && rootGetters.assets.assets
      ? rootGetters.assets.assets.find((t) => t.address === getters.liquidity.secondAddress) || {}
      : {};
  },
  firstTokenBalance(state: RemoveLiquidityState, getters) {
    return getters.liquidity?.firstBalance ?? ZeroStringValue;
  },
  secondTokenBalance(state: RemoveLiquidityState, getters) {
    return getters.liquidity?.secondBalance ?? ZeroStringValue;
  },
  shareOfPool(state: RemoveLiquidityState, getters) {
    const balance = FPNumber.fromCodecValue(getters.liquidityBalance);
    const removed = new FPNumber(state.liquidityAmount ?? 0);
    const totalSupply = FPNumber.fromCodecValue(state.totalSupply);
    const totalSupplyAfter = totalSupply.sub(removed);

    if (balance.isZero() || totalSupply.isZero() || totalSupplyAfter.isZero()) return ZeroStringValue;

    return balance.sub(removed).div(totalSupplyAfter).mul(FPNumber.HUNDRED).toLocaleString() || ZeroStringValue;
  },
};

const mutations = {
  [types.SET_LIQUIDITY_TOKENS_ADDRESSES](
    state: RemoveLiquidityState,
    { firstAddress, secondAddress }: { firstAddress: string; secondAddress: string }
  ) {
    state.firstTokenAddress = firstAddress;
    state.secondTokenAddress = secondAddress;
  },
  [types.SET_REMOVE_PART](state: RemoveLiquidityState, removePart = 0) {
    state.removePart = removePart;
  },
  [types.SET_LIQUIDITY_AMOUNT](state: RemoveLiquidityState, liquidityAmount = '') {
    state.liquidityAmount = liquidityAmount;
  },
  [types.SET_FIRST_TOKEN_AMOUNT](state: RemoveLiquidityState, firstTokenAmount = '') {
    state.firstTokenAmount = firstTokenAmount;
  },
  [types.SET_SECOND_TOKEN_AMOUNT](state: RemoveLiquidityState, secondTokenAmount = '') {
    state.secondTokenAmount = secondTokenAmount;
  },
  [types.GET_TOTAL_SUPPLY_REQUEST](state: RemoveLiquidityState) {},
  [types.GET_TOTAL_SUPPLY_SUCCESS](state: RemoveLiquidityState, totalSupply: CodecString) {
    state.totalSupply = totalSupply;
  },
  [types.GET_TOTAL_SUPPLY_FAILURE](state: RemoveLiquidityState) {
    state.totalSupply = ZeroStringValue;
  },
  [types.GET_LIQUIDITY_RESERVE_REQUEST](state: RemoveLiquidityState) {},
  [types.GET_LIQUIDITY_RESERVE_SUCCESS](state: RemoveLiquidityState, { reserveA, reserveB }) {
    state.reserveA = reserveA;
    state.reserveB = reserveB;
  },
  [types.GET_LIQUIDITY_RESERVE_FAILURE](state: RemoveLiquidityState, error) {},
  [types.SET_FOCUSED_FIELD](state: RemoveLiquidityState, field: string) {
    state.focusedField = field;
  },
};

const actions = {
  async setLiquidity(
    { commit, dispatch },
    { firstAddress, secondAddress }: { firstAddress: string; secondAddress: string }
  ) {
    try {
      commit(types.SET_LIQUIDITY_TOKENS_ADDRESSES, { firstAddress, secondAddress });

      await dispatch('getRemoveLiquidityData');
    } catch (error) {
      console.error(error);
    }
  },

  setRemovePart({ commit, getters, dispatch, state }, removePart: number) {
    if (!state.focusedField || state.focusedField === 'removePart') {
      commit(types.SET_FOCUSED_FIELD, 'removePart');
      const part = new FPNumber(Math.round(removePart));

      if (removePart) {
        const hundred = FPNumber.HUNDRED;
        const firstBalance = FPNumber.fromCodecValue(getters.firstTokenBalance);
        const secondBalance = FPNumber.fromCodecValue(getters.secondTokenBalance);
        const liquidityAmount = part.div(hundred).mul(FPNumber.fromCodecValue(getters.liquidityBalance)).toString();
        const firstAmount = FPNumber.fromCodecValue(
          part.div(hundred).mul(firstBalance).toCodecString(),
          getters.firstToken.decimals
        ).toString();
        const secondAmount = FPNumber.fromCodecValue(
          part.div(hundred).mul(secondBalance).toCodecString(),
          getters.secondToken.decimals
        ).toString();

        commit(types.SET_REMOVE_PART, part.toString());
        commit(types.SET_LIQUIDITY_AMOUNT, liquidityAmount);
        commit(types.SET_FIRST_TOKEN_AMOUNT, firstAmount);
        commit(types.SET_SECOND_TOKEN_AMOUNT, secondAmount);
      } else {
        commit(types.SET_REMOVE_PART);
        commit(types.SET_LIQUIDITY_AMOUNT);
        commit(types.SET_FIRST_TOKEN_AMOUNT);
        commit(types.SET_SECOND_TOKEN_AMOUNT);
      }

      dispatch('getRemoveLiquidityData');
    }
  },

  setFirstTokenAmount({ commit, getters, dispatch, state }, firstTokenAmount: string) {
    if (!state.focusedField || state.focusedField === 'firstTokenAmount') {
      commit(types.SET_FOCUSED_FIELD, 'firstTokenAmount');
      if (firstTokenAmount) {
        if (!Number.isNaN(firstTokenAmount)) {
          const firstBalance = FPNumber.fromCodecValue(getters.firstTokenBalance, getters.firstToken.decimals);
          const secondBalance = FPNumber.fromCodecValue(getters.secondTokenBalance, getters.secondToken.decimals);
          const part = new FPNumber(firstTokenAmount).div(firstBalance);
          const removePart = Math.round(part.mul(FPNumber.HUNDRED).toNumber());
          const liquidityAmount = part.mul(FPNumber.fromCodecValue(getters.liquidityBalance)).toString();
          const secondAmount = part.mul(secondBalance).toFixed(getters.secondToken.decimals).toString();

          commit(types.SET_REMOVE_PART, removePart);
          commit(types.SET_LIQUIDITY_AMOUNT, liquidityAmount);
          commit(types.SET_FIRST_TOKEN_AMOUNT, firstTokenAmount);
          commit(types.SET_SECOND_TOKEN_AMOUNT, secondAmount);
        }
      } else {
        commit(types.SET_FIRST_TOKEN_AMOUNT);
      }
      dispatch('getRemoveLiquidityData');
    }
  },
  setSecondTokenAmount({ commit, getters, dispatch, state }, secondTokenAmount: string) {
    console.log('secondTokenAmount', secondTokenAmount);
    if (!state.focusedField || state.focusedField === 'secondTokenAmount') {
      commit(types.SET_FOCUSED_FIELD, 'secondTokenAmount');
      if (secondTokenAmount) {
        if (!Number.isNaN(secondTokenAmount)) {
          const firstBalance = FPNumber.fromCodecValue(getters.firstTokenBalance, getters.firstToken.decimals);
          const secondBalance = FPNumber.fromCodecValue(getters.secondTokenBalance, getters.secondToken.decimals);
          const part = new FPNumber(secondTokenAmount).div(secondBalance);
          const removePart = Math.round(part.mul(FPNumber.HUNDRED).toNumber());
          const liquidityAmount = part.mul(FPNumber.fromCodecValue(getters.liquidityBalance)).toString();
          const firstAmount = part.mul(firstBalance).toFixed(getters.firstToken.decimals).toString();

          commit(types.SET_REMOVE_PART, removePart);
          commit(types.SET_LIQUIDITY_AMOUNT, liquidityAmount);
          commit(types.SET_FIRST_TOKEN_AMOUNT, firstAmount);
          commit(types.SET_SECOND_TOKEN_AMOUNT, secondTokenAmount);
        }
      } else {
        commit(types.SET_SECOND_TOKEN_AMOUNT);
      }
      dispatch('getRemoveLiquidityData');
    }
  },

  setFocusedField({ commit }, focusedField: string) {
    commit(types.SET_FOCUSED_FIELD, focusedField);
  },

  async resetFocusedField({ dispatch }): Promise<void> {
    await dispatch('setFocusedField', null);
  },

  getRemoveLiquidityData: debounce(
    async ({ dispatch }) => {
      await dispatch('getLiquidityReserves');
      await dispatch('getTotalSupply');
    },
    500,
    { leading: true }
  ),

  async getLiquidityReserves({ commit, state }) {
    try {
      commit(types.GET_LIQUIDITY_RESERVE_REQUEST);
      const [reserveA, reserveB] = await api.getLiquidityReserves(state.firstTokenAddress, state.secondTokenAddress);
      commit(types.GET_LIQUIDITY_RESERVE_SUCCESS, { reserveA, reserveB });
    } catch (error) {
      commit(types.GET_LIQUIDITY_RESERVE_FAILURE, error);
    }
  },

  async getTotalSupply({ commit, state }) {
    try {
      commit(types.GET_TOTAL_SUPPLY_REQUEST);
      const [_, pts] = await api.estimatePoolTokensMinted(
        state.firstTokenAddress,
        state.secondTokenAddress,
        state.firstTokenAmount,
        state.secondTokenAmount,
        state.reserveA,
        state.reserveB
      );

      commit(types.GET_TOTAL_SUPPLY_SUCCESS, pts);
    } catch (error) {
      console.error(error);
      commit(types.GET_TOTAL_SUPPLY_FAILURE);
    }
  },

  async removeLiquidity({ rootGetters, state }) {
    await api.removeLiquidity(
      state.firstTokenAddress,
      state.secondTokenAddress,
      state.liquidityAmount,
      state.reserveA,
      state.reserveB,
      state.totalSupply,
      rootGetters.slippageTolerance
    );
  },

  resetData({ commit }) {
    commit(types.SET_REMOVE_PART);
    commit(types.SET_LIQUIDITY_AMOUNT);
    commit(types.SET_FIRST_TOKEN_AMOUNT);
    commit(types.SET_SECOND_TOKEN_AMOUNT);
  },
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
};
