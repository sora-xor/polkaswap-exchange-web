import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import BigNumber from 'bignumber.js'
import { dexApi } from '@soramitsu/soraneo-wallet-web'

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

function initialState () {
  return {
    liquidity: null,
    removePart: 0,
    liquidityAmount: 0,
    firstTokenAmount: 0,
    secondTokenAmount: 0,
    focusedField: null,
    fee: 0,
    reserveA: 0,
    reserveB: 0,
    totalSupply: 0
  }
}

const state = initialState()

const getters = {
  liquidity (state) {
    return state.liquidity
  },
  liquidityBalance (state) {
    return state.liquidity ? state.liquidity.balance : 0
  },
  firstTokenBalance (state) {
    return state.liquidity ? state.liquidity.firstBalance : 0
  },
  secondTokenBalance (state) {
    return state.liquidity ? state.liquidity.secondBalance : 0
  },
  firstToken (state, getters, rootGetters) {
    return state.liquidity && rootGetters.assets.assets ? rootGetters.assets.assets.find(t => t.address === state.liquidity.firstAddress) || {} : {}
  },
  secondToken (state, getters, rootGetters) {
    return state.liquidity && rootGetters.assets.assets ? rootGetters.assets.assets.find(t => t.address === state.liquidity.secondAddress) || {} : {}
  },
  removePart (state) {
    return state.removePart
  },
  liquidityAmount (state) {
    return state.liquidityAmount
  },
  firstTokenAmount (state) {
    return state.firstTokenAmount
  },
  secondTokenAmount (state) {
    return state.secondTokenAmount
  },
  fee (state) {
    return state.fee
  },
  reserveA (state) {
    return state.reserveA
  },
  reserveB (state) {
    return state.reserveB
  },
  totalSupply (state) {
    return state.totalSupply
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
  [types.SET_REMOVE_PART] (state, removePart) {
    state.removePart = removePart
  },
  [types.SET_LIQUIDITY_AMOUNT] (state, liquidityAmount) {
    state.liquidityAmount = liquidityAmount
  },
  [types.SET_FIRST_TOKEN_AMOUNT] (state, firstTokenAmount) {
    state.firstTokenAmount = firstTokenAmount
  },
  [types.SET_SECOND_TOKEN_AMOUNT] (state, secondTokenAmount) {
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
      await dexApi.getKnownAccountLiquidity()
      await dexApi.updateAccountLiquidity()
      const liquidity = dexApi.accountLiquidity.find(liquidity => liquidity.firstAddress === firstAddress && liquidity.secondAddress === secondAddress)

      commit(types.GET_LIQUIDITY_SUCCESS, liquidity)
      dispatch('getRemoveLiquidityData')
    } catch (error) {
      commit(types.GET_LIQUIDITY_FAILURE)
    }
  },

  setRemovePart ({ commit, getters, dispatch }, removePart) {
    if (!getters.focusedField || getters.focusedField === 'removePart') {
      commit(types.SET_FOCUSED_FIELD, 'removePart')
      const part = Math.round(removePart)

      if (removePart) {
        if (removePart && removePart !== getters.removePart && !Number.isNaN(removePart)) {
          commit(types.SET_REMOVE_PART, part)
          commit(types.SET_LIQUIDITY_AMOUNT, (getters.liquidityBalance * part) / 100)
          commit(types.SET_FIRST_TOKEN_AMOUNT, (getters.firstTokenBalance * part) / 100)
          commit(types.SET_SECOND_TOKEN_AMOUNT, (getters.secondTokenBalance * part) / 100)
        }
      } else {
        commit(types.SET_REMOVE_PART, 0)
        commit(types.SET_LIQUIDITY_AMOUNT, 0)
        commit(types.SET_FIRST_TOKEN_AMOUNT, 0)
        commit(types.SET_SECOND_TOKEN_AMOUNT, 0)
      }

      dispatch('getRemoveLiquidityData')
    }
  },

  setLiquidityAmount ({ commit, getters, dispatch }, liquidityAmount) {
    if (!getters.focusedField || getters.focusedField === 'liquidityAmount') {
      commit(types.SET_FOCUSED_FIELD, 'liquidityAmount')

      if (liquidityAmount) {
        if (liquidityAmount !== getters.liquidityAmount && !Number.isNaN(liquidityAmount)) {
          const part = new BigNumber(liquidityAmount).dividedBy(getters.liquidityBalance)

          commit(types.SET_REMOVE_PART, part.multipliedBy(100).toNumber())
          commit(types.SET_LIQUIDITY_AMOUNT, liquidityAmount)
          commit(types.SET_FIRST_TOKEN_AMOUNT, part.multipliedBy(getters.firstTokenBalance).toNumber())
          commit(types.SET_SECOND_TOKEN_AMOUNT, part.multipliedBy(getters.secondTokenBalance).toNumber())
        }
      } else {
        commit(types.SET_LIQUIDITY_AMOUNT)
      }

      dispatch('getRemoveLiquidityData')
    }
  },

  async getNetworkFee ({ commit, getters }) {
    if (getters.firstToken && getters.firstToken.address && getters.secondToken && getters.secondToken.address && getters.liquidityAmount) {
      commit(types.GET_FEE_REQUEST)
      try {
        const firstAddress = getters.firstToken.address
        const secondAddress = getters.secondToken.address
        const amount = getters.liquidityAmount
        const reserveA = getters.reserveA
        const reserveB = getters.reserveB
        const pts = getters.poolTokensTotalSupply

        const fee = await dexApi.getRemoveLiquidityNetworkFee(firstAddress, secondAddress, amount, reserveA, reserveB, pts)

        commit(types.GET_FEE_SUCCESS, fee)
      } catch (error) {
        commit(types.GET_FEE_FAILURE, error)
      }
    }
  },

  setFirstTokenAmount ({ commit, getters, dispatch }, firstTokenAmount) {
    if (!getters.focusedField || getters.focusedField === 'firstTokenAmount') {
      commit(types.SET_FOCUSED_FIELD, 'firstTokenAmount')

      if (firstTokenAmount) {
        if (firstTokenAmount !== getters.firstTokenAmount && !Number.isNaN(firstTokenAmount)) {
          const part = new BigNumber(firstTokenAmount).dividedBy(getters.firstTokenBalance)

          commit(types.SET_REMOVE_PART, Math.round(part.multipliedBy(100).toNumber()))
          commit(types.SET_LIQUIDITY_AMOUNT, part.multipliedBy(getters.liquidityBalance).toNumber())
          commit(types.SET_FIRST_TOKEN_AMOUNT, firstTokenAmount)
          commit(types.SET_SECOND_TOKEN_AMOUNT, part.multipliedBy(getters.secondTokenBalance).toNumber())
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
          const part = new BigNumber(secondTokenAmount).dividedBy(getters.secondTokenBalance)

          commit(types.SET_REMOVE_PART, Math.round(part.multipliedBy(100).toNumber()))
          commit(types.SET_LIQUIDITY_AMOUNT, part.multipliedBy(getters.liquidityBalance).toNumber())
          commit(types.SET_FIRST_TOKEN_AMOUNT, part.multipliedBy(getters.firstTokenBalance).toNumber())
          commit(types.SET_SECOND_TOKEN_AMOUNT, secondTokenAmount)
        }
      } else {
        commit(types.SET_SECOND_TOKEN_AMOUNT)
      }

      dispatch('getRemoveLiquidityData')
    }
  },

  resetFocusedField ({ commit }) {
    commit(types.SET_FOCUSED_FIELD, null)
  },

  async getRemoveLiquidityData ({ dispatch }) {
    await dispatch('getLiquidityReserves')
    await dispatch('getTotalSupply')
    await dispatch('getNetworkFee')
  },

  async getLiquidityReserves ({ commit, getters }) {
    const firstAddress = getters.firstToken.address
    const secondAddress = getters.secondToken.address

    try {
      commit(types.GET_LIQUIDITY_RESERVE_REQUEST)
      const [reserveA, reserveB] = await dexApi.getLiquidityReserves(firstAddress, secondAddress)
      commit(types.GET_LIQUIDITY_RESERVE_SUCCESS, { reserveA, reserveB })
    } catch (error) {
      commit(types.GET_LIQUIDITY_RESERVE_FAILURE, error)
    }
  },

  async getTotalSupply ({ commit, getters }) {
    const firstAddress = getters.firstToken.address
    const secondAddress = getters.secondToken.address
    const amount = getters.liquidityAmount
    const reserveA = getters.reserveA
    const reserveB = getters.reserveB

    try {
      commit(types.GET_TOTAL_SUPPLY_REQUEST)
      const [aOut, bOut, pts] = await dexApi.estimateTokensRetrieved(firstAddress, secondAddress, amount, reserveA, reserveB)
      commit(types.GET_TOTAL_SUPPLY_SUCCESS, pts)
    } catch (error) {
      commit(types.GET_TOTAL_SUPPLY_FAILURE, error)
    }
  },

  async removeLiquidity ({ commit, getters }) {
    const firstAddress = getters.firstToken.address
    const secondAddress = getters.secondToken.address
    const amount = getters.liquidityAmount
    const reserveA = getters.reserveA
    const reserveB = getters.reserveB
    const pts = getters.poolTokensTotalSupply

    await dexApi.removeLiquidity(
      firstAddress, secondAddress, amount, reserveA, reserveB, pts)
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
