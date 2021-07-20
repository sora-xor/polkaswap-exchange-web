import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { api } from '@soramitsu/soraneo-wallet-web'
import { FPNumber, CodecString } from '@sora-substrate/util'

import { ZeroStringValue } from '@/consts'
import { debouncedInputHandler } from '@/utils'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_REMOVE_PART',
    'SET_LIQUIDITY_AMOUNT',
    'SET_FIRST_TOKEN_AMOUNT',
    'SET_SECOND_TOKEN_AMOUNT',
    'SET_FOCUSED_FIELD'
  ]),
  map(x => [x, x]),
  fromPairs
)([
  'GET_LIQUIDITY',
  'GET_FEE',
  'GET_LIQUIDITY_RESERVE',
  'GET_TOTAL_SUPPLY'
])

interface RemoveLiquidityState {
  liquidity: any | null | undefined;
  removePart: number;
  liquidityAmount: string;
  firstTokenAmount: string;
  secondTokenAmount: string;
  focusedField: string | null | undefined;
  fee: CodecString;
  reserveA: CodecString;
  reserveB: CodecString;
  totalSupply: CodecString;
}

function initialState (): RemoveLiquidityState {
  return {
    liquidity: null,
    removePart: 0,
    liquidityAmount: '',
    firstTokenAmount: '',
    secondTokenAmount: '',
    focusedField: null,
    fee: '',
    reserveA: ZeroStringValue,
    reserveB: ZeroStringValue,
    totalSupply: ZeroStringValue
  }
}

const state = initialState()

const getters = {
  focusedField (state: RemoveLiquidityState) {
    return state.focusedField
  },
  liquidity (state: RemoveLiquidityState) {
    return state.liquidity
  },
  liquidityBalance (state: RemoveLiquidityState) {
    return state.liquidity?.balance ?? ZeroStringValue
  },
  liquidityDecimals (state: RemoveLiquidityState) {
    return state.liquidity?.decimals ?? 0
  },
  firstTokenBalance (state: RemoveLiquidityState) {
    return state.liquidity?.firstBalance ?? ZeroStringValue
  },
  secondTokenBalance (state: RemoveLiquidityState) {
    return state.liquidity?.secondBalance ?? ZeroStringValue
  },
  firstToken (state: RemoveLiquidityState, getters, rootGetters) {
    return state.liquidity && rootGetters.assets.assets ? rootGetters.assets.assets.find(t => t.address === state.liquidity.firstAddress) || {} : {}
  },
  secondToken (state: RemoveLiquidityState, getters, rootGetters) {
    return state.liquidity && rootGetters.assets.assets ? rootGetters.assets.assets.find(t => t.address === state.liquidity.secondAddress) || {} : {}
  },
  firstTokenDecimals (state: RemoveLiquidityState, getters) {
    return getters.firstToken.decimals || 0
  },
  secondTokenDecimals (state: RemoveLiquidityState, getters) {
    return getters.secondToken.decimals || 0
  },
  firstTokenAddress (state: RemoveLiquidityState, getters) {
    return getters.firstToken.address || ''
  },
  secondTokenAddress (state: RemoveLiquidityState, getters) {
    return getters.secondToken.address || ''
  },
  removePart (state: RemoveLiquidityState) {
    return state.removePart
  },
  liquidityAmount (state: RemoveLiquidityState) {
    return state.liquidityAmount
  },
  firstTokenAmount (state: RemoveLiquidityState) {
    return state.firstTokenAmount
  },
  secondTokenAmount (state: RemoveLiquidityState) {
    return state.secondTokenAmount
  },
  fee (state: RemoveLiquidityState) {
    return state.fee
  },
  reserveA (state: RemoveLiquidityState) {
    return state.reserveA
  },
  reserveB (state: RemoveLiquidityState) {
    return state.reserveB
  },
  totalSupply (state: RemoveLiquidityState) {
    return state.totalSupply
  },
  shareOfPool (state: RemoveLiquidityState, getters) {
    const balance = FPNumber.fromCodecValue(getters.liquidityBalance)
    const removed = new FPNumber(state.liquidityAmount ?? 0)
    const total = FPNumber.fromCodecValue(getters.totalSupply)
    return balance.sub(removed).div(total.sub(removed)).mul(new FPNumber(100)).toLocaleString() || ZeroStringValue
  }
}

const mutations = {
  [types.GET_LIQUIDITY_REQUEST] (state) {
  },
  [types.GET_LIQUIDITY_SUCCESS] (state, liquidity) {
    state.liquidity = liquidity
  },
  [types.GET_LIQUIDITY_FAILURE] (state, error) {
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
  async getLiquidity ({ commit, dispatch }, { firstAddress, secondAddress }) {
    commit(types.GET_LIQUIDITY_REQUEST)

    try {
      await api.getKnownAccountLiquidity()
      const liquidity = api.accountLiquidity.find(liquidity => liquidity.firstAddress === firstAddress && liquidity.secondAddress === secondAddress)

      commit(types.GET_LIQUIDITY_SUCCESS, liquidity)
      dispatch('getRemoveLiquidityData')
    } catch (error) {
      commit(types.GET_LIQUIDITY_FAILURE)
    }
  },

  setRemovePart ({ commit, getters, dispatch }, removePart) {
    if (!getters.focusedField || getters.focusedField === 'removePart') {
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

  setFirstTokenAmount ({ commit, getters, dispatch }, firstTokenAmount) {
    if (!getters.focusedField || getters.focusedField === 'firstTokenAmount') {
      commit(types.SET_FOCUSED_FIELD, 'firstTokenAmount')
      if (firstTokenAmount) {
        if (firstTokenAmount !== getters.firstTokenAmount && !Number.isNaN(firstTokenAmount)) {
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
  setSecondTokenAmount ({ commit, getters, dispatch }, secondTokenAmount) {
    if (!getters.focusedField || getters.focusedField === 'secondTokenAmount') {
      commit(types.SET_FOCUSED_FIELD, 'secondTokenAmount')
      if (secondTokenAmount) {
        if (Number(secondTokenAmount) !== getters.secondTokenAmount && !Number.isNaN(secondTokenAmount)) {
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

  getRemoveLiquidityData: debouncedInputHandler(async ({ dispatch }) => {
    await dispatch('getLiquidityReserves')
    await dispatch('getTotalSupply')
    await dispatch('getNetworkFee')
  }),

  async getNetworkFee ({ commit, getters }) {
    if (getters.firstTokenAddress && getters.secondTokenAddress) {
      commit(types.GET_FEE_REQUEST)

      try {
        const fee = await api.getRemoveLiquidityNetworkFee(
          getters.firstTokenAddress,
          getters.secondTokenAddress,
          getters.liquidityAmount || 0,
          getters.reserveA,
          getters.reserveB,
          getters.totalSupply
        )
        commit(types.GET_FEE_SUCCESS, fee)
      } catch (error) {
        commit(types.GET_FEE_FAILURE, error)
      }
    } else {
      commit(types.GET_FEE_SUCCESS, 0)
    }
  },

  async getLiquidityReserves ({ commit, getters }) {
    try {
      commit(types.GET_LIQUIDITY_RESERVE_REQUEST)
      const [reserveA, reserveB] = await api.getLiquidityReserves(getters.firstTokenAddress, getters.secondTokenAddress)
      commit(types.GET_LIQUIDITY_RESERVE_SUCCESS, { reserveA, reserveB })
    } catch (error) {
      commit(types.GET_LIQUIDITY_RESERVE_FAILURE, error)
    }
  },

  async getTotalSupply ({ commit, getters }) {
    try {
      commit(types.GET_TOTAL_SUPPLY_REQUEST)
      const [_, pts] = await api.estimatePoolTokensMinted(
        getters.firstTokenAddress,
        getters.secondTokenAddress,
        getters.firstTokenAmount,
        getters.secondTokenAmount,
        getters.reserveA,
        getters.reserveB
      )

      commit(types.GET_TOTAL_SUPPLY_SUCCESS, pts)
    } catch (error) {
      commit(types.GET_TOTAL_SUPPLY_FAILURE, error)
    }
  },

  async removeLiquidity ({ commit, getters, rootGetters }) {
    await api.removeLiquidity(
      getters.firstTokenAddress,
      getters.secondTokenAddress,
      getters.liquidityAmount,
      getters.reserveA,
      getters.reserveB,
      getters.totalSupply,
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
