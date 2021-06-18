import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { api } from '@soramitsu/soraneo-wallet-web'
import { FPNumber, CodecString } from '@sora-substrate/util'

import { ZeroStringValue } from '@/consts'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_REMOVE_PART',
    'SET_LIQUIDITY_TOKENS_ADDRESSES',
    'SET_LIQUIDITY_AMOUNT',
    'SET_FIRST_TOKEN_AMOUNT',
    'SET_SECOND_TOKEN_AMOUNT',
    'SET_FOCUSED_FIELD'
  ]),
  map(x => [x, x]),
  fromPairs
)([
  'GET_FEE',
  'GET_LIQUIDITY_RESERVE',
  'GET_TOTAL_SUPPLY'
])

interface RemoveLiquidityState {
  removePart: number;
  liquidityAmount: string;
  firstTokenAmount: string;
  secondTokenAmount: string;
  firstTokenAddress: string;
  secondTokenAddress: string;
  focusedField: Nullable<string>;
  fee: CodecString;
  reserveA: CodecString;
  reserveB: CodecString;
  totalSupply: CodecString;
}

function initialState (): RemoveLiquidityState {
  return {
    removePart: 0,
    liquidityAmount: '',
    firstTokenAmount: '',
    secondTokenAmount: '',
    firstTokenAddress: '',
    secondTokenAddress: '',
    focusedField: null,
    fee: '',
    reserveA: ZeroStringValue,
    reserveB: ZeroStringValue,
    totalSupply: ZeroStringValue
  }
}

const state = initialState()

const getters = {
  liquidity (state: RemoveLiquidityState, getters, rootState, rootGetters) {
    return rootGetters['pool/accountLiquidity'].find(liquidity =>
      liquidity.firstAddress === state.firstTokenAddress &&
      liquidity.secondAddress === state.secondTokenAddress
    )
  },
  liquidityBalance (_, getters) {
    return getters.liquidity?.balance ?? ZeroStringValue
  },
  liquidityDecimals (_, getters) {
    return getters.liquidity?.decimals ?? 0
  },
  firstTokenBalance (_, getters) {
    return getters.liquidity?.firstBalance ?? ZeroStringValue
  },
  secondTokenBalance (_, getters) {
    return getters.liquidity?.secondBalance ?? ZeroStringValue
  },
  firstToken (_, getters, rootGetters) {
    return getters.liquidity && rootGetters.assets.assets ? rootGetters.assets.assets.find(t => t.address === getters.liquidity.firstAddress) || {} : {}
  },
  secondToken (_, getters, rootGetters) {
    return getters.liquidity && rootGetters.assets.assets ? rootGetters.assets.assets.find(t => t.address === getters.liquidity.secondAddress) || {} : {}
  },
  firstTokenDecimals (_, getters) {
    return getters.firstToken.decimals || 0
  },
  secondTokenDecimals (_, getters) {
    return getters.secondToken.decimals || 0
  }
}

const mutations = {
  [types.SET_LIQUIDITY_TOKENS_ADDRESSES] (state, { firstAddress, secondAddress }) {
    state.firstTokenAddress = firstAddress
    state.secondTokenAddress = secondAddress
  },
  [types.SET_REMOVE_PART] (state, removePart = 0) {
    state.removePart = removePart
  },
  [types.SET_LIQUIDITY_AMOUNT] (state, liquidityAmount = '') {
    state.liquidityAmount = liquidityAmount
  },
  [types.SET_FIRST_TOKEN_AMOUNT] (state, firstTokenAmount = '') {
    state.firstTokenAmount = firstTokenAmount
  },
  [types.SET_SECOND_TOKEN_AMOUNT] (state, secondTokenAmount = '') {
    state.secondTokenAmount = secondTokenAmount
  },
  [types.GET_FEE_REQUEST] (state) {
  },
  [types.GET_FEE_SUCCESS] (state, fee) {
    state.fee = fee
  },
  [types.GET_FEE_FAILURE] (state, error) {
  },
  [types.GET_TOTAL_SUPPLY_REQUEST] (state) {
  },
  [types.GET_TOTAL_SUPPLY_SUCCESS] (state, totalSupply) {
    state.totalSupply = totalSupply
  },
  [types.GET_TOTAL_SUPPLY_FAILURE] (state, error) {
  },
  [types.GET_LIQUIDITY_RESERVE_REQUEST] (state) {
  },
  [types.GET_LIQUIDITY_RESERVE_SUCCESS] (state, { reserveA, reserveB }) {
    state.reserveA = reserveA
    state.reserveB = reserveB
  },
  [types.GET_LIQUIDITY_RESERVE_FAILURE] (state, error) {
  },
  [types.SET_FOCUSED_FIELD] (state, field) {
    state.focusedField = field
  }
}

const actions = {
  setLiquidity ({ commit }, { firstAddress, secondAddress }) {
    try {
      commit(types.SET_LIQUIDITY_TOKENS_ADDRESSES, { firstAddress, secondAddress })
    } catch (error) {
      console.error(error)
    }
  },

  setRemovePart ({ commit, getters, dispatch, state }, removePart) {
    if (!state.focusedField || state.focusedField === 'removePart') {
      commit(types.SET_FOCUSED_FIELD, 'removePart')
      const part = new FPNumber(Math.round(removePart))

      if (removePart) {
        commit(types.SET_REMOVE_PART, part.toString())
        commit(types.SET_LIQUIDITY_AMOUNT, part.div(new FPNumber(100)).mul(FPNumber.fromCodecValue(getters.liquidityBalance)).toString())
        commit(types.SET_FIRST_TOKEN_AMOUNT, part.div(new FPNumber(100)).mul(FPNumber.fromCodecValue(getters.firstTokenBalance)).toString())
        commit(types.SET_SECOND_TOKEN_AMOUNT, part.div(new FPNumber(100)).mul(FPNumber.fromCodecValue(getters.secondTokenBalance)).toString())
      } else {
        commit(types.SET_REMOVE_PART)
        commit(types.SET_LIQUIDITY_AMOUNT)
        commit(types.SET_FIRST_TOKEN_AMOUNT)
        commit(types.SET_SECOND_TOKEN_AMOUNT)
      }

      dispatch('getRemoveLiquidityData')
    }
  },

  setLiquidityAmount ({ commit, getters, dispatch, state }, liquidityAmount) {
    if (!state.focusedField || state.focusedField === 'liquidityAmount') {
      commit(types.SET_FOCUSED_FIELD, 'liquidityAmount')

      if (liquidityAmount) {
        if (liquidityAmount !== state.liquidityAmount && !Number.isNaN(liquidityAmount)) {
          const part = new FPNumber(liquidityAmount).div(FPNumber.fromCodecValue(getters.liquidityBalance))

          commit(types.SET_REMOVE_PART, Math.round(part.mul(new FPNumber(100)).toNumber()))
          commit(types.SET_LIQUIDITY_AMOUNT, liquidityAmount)
          commit(types.SET_FIRST_TOKEN_AMOUNT, part.mul(FPNumber.fromCodecValue(getters.firstTokenBalance)).toString())
          commit(types.SET_SECOND_TOKEN_AMOUNT, part.mul(FPNumber.fromCodecValue(getters.secondTokenBalance)).toString())
        }
      } else {
        commit(types.SET_LIQUIDITY_AMOUNT)
      }
      dispatch('getRemoveLiquidityData')
    }
  },
  setFirstTokenAmount ({ commit, getters, dispatch, state }, firstTokenAmount) {
    if (!state.focusedField || state.focusedField === 'firstTokenAmount') {
      commit(types.SET_FOCUSED_FIELD, 'firstTokenAmount')
      if (firstTokenAmount) {
        if (firstTokenAmount !== state.firstTokenAmount && !Number.isNaN(firstTokenAmount)) {
          const part = new FPNumber(firstTokenAmount).div(FPNumber.fromCodecValue(getters.firstTokenBalance))
          commit(types.SET_REMOVE_PART, Math.round(part.mul(new FPNumber(100)).toNumber()))
          commit(types.SET_LIQUIDITY_AMOUNT, part.mul(FPNumber.fromCodecValue(getters.liquidityBalance)).toString())
          commit(types.SET_FIRST_TOKEN_AMOUNT, firstTokenAmount)
          commit(types.SET_SECOND_TOKEN_AMOUNT, part.mul(FPNumber.fromCodecValue(getters.secondTokenBalance)).toString())
        }
      } else {
        commit(types.SET_FIRST_TOKEN_AMOUNT)
      }
      dispatch('getRemoveLiquidityData')
    }
  },
  setSecondTokenAmount ({ commit, getters, dispatch, state }, secondTokenAmount) {
    if (!state.focusedField || state.focusedField === 'secondTokenAmount') {
      commit(types.SET_FOCUSED_FIELD, 'secondTokenAmount')
      if (secondTokenAmount) {
        if (Number(secondTokenAmount) !== state.secondTokenAmount && !Number.isNaN(secondTokenAmount)) {
          const part = new FPNumber(secondTokenAmount).div(FPNumber.fromCodecValue(getters.secondTokenBalance))

          commit(types.SET_REMOVE_PART, Math.round(part.mul(new FPNumber(100)).toNumber()))
          commit(types.SET_LIQUIDITY_AMOUNT, part.mul(FPNumber.fromCodecValue(getters.liquidityBalance)).toString())
          commit(types.SET_FIRST_TOKEN_AMOUNT, part.mul(FPNumber.fromCodecValue(getters.firstTokenBalance)).toString())
          commit(types.SET_SECOND_TOKEN_AMOUNT, secondTokenAmount)
        }
      } else {
        commit(types.SET_SECOND_TOKEN_AMOUNT)
      }

      dispatch('getRemoveLiquidityData')
    }
  },

  setFocusedField ({ commit }, focusedField) {
    commit(types.SET_FOCUSED_FIELD, focusedField)
  },

  async resetFocusedField ({ commit, dispatch }): Promise<void> {
    await dispatch('setFocusedField', null)
  },

  async getRemoveLiquidityData ({ dispatch }) {
    await dispatch('getLiquidityReserves')
    await dispatch('getTotalSupply')
    await dispatch('getNetworkFee')
  },

  async getNetworkFee ({ commit, state }) {
    if (state.firstTokenAddress && state.secondTokenAddress) {
      commit(types.GET_FEE_REQUEST)

      try {
        const fee = await api.getRemoveLiquidityNetworkFee(
          state.firstTokenAddress,
          state.secondTokenAddress,
          state.liquidityAmount || 0,
          state.reserveA,
          state.reserveB,
          state.totalSupply
        )
        commit(types.GET_FEE_SUCCESS, fee)
      } catch (error) {
        commit(types.GET_FEE_FAILURE, error)
      }
    } else {
      commit(types.GET_FEE_SUCCESS, 0)
    }
  },

  async getLiquidityReserves ({ commit, state }) {
    try {
      commit(types.GET_LIQUIDITY_RESERVE_REQUEST)
      const [reserveA, reserveB] = await api.getLiquidityReserves(state.firstTokenAddress, state.secondTokenAddress)
      commit(types.GET_LIQUIDITY_RESERVE_SUCCESS, { reserveA, reserveB })
    } catch (error) {
      commit(types.GET_LIQUIDITY_RESERVE_FAILURE, error)
    }
  },

  async getTotalSupply ({ commit, state }) {
    try {
      commit(types.GET_TOTAL_SUPPLY_REQUEST)
      const [aOut, bOut, pts] = await api.estimateTokensRetrieved(
        state.firstTokenAddress,
        state.secondTokenAddress,
        state.liquidityAmount,
        state.reserveA,
        state.reserveB
      )

      commit(types.GET_TOTAL_SUPPLY_SUCCESS, pts)
    } catch (error) {
      commit(types.GET_TOTAL_SUPPLY_FAILURE, error)
    }
  },

  async removeLiquidity ({ state, rootGetters }) {
    await api.removeLiquidity(
      state.firstTokenAddress,
      state.secondTokenAddress,
      state.liquidityAmount,
      state.reserveA,
      state.reserveB,
      state.totalSupply,
      rootGetters.slippageTolerance
    )
  },

  resetData ({ commit }) {
    commit(types.SET_REMOVE_PART)
    commit(types.SET_LIQUIDITY_AMOUNT)
    commit(types.SET_FIRST_TOKEN_AMOUNT)
    commit(types.SET_SECOND_TOKEN_AMOUNT)
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
