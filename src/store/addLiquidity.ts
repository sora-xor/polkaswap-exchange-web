import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import liquidityAPI from '@/api/liquidity'
import { dexApi } from '@soramitsu/soraneo-wallet-web'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_FIRST_TOKEN',
    'SET_SECOND_TOKEN',
    'SET_FIRST_TOKEN_VALUE',
    'SET_SECOND_TOKEN_VALUE',
    'SET_FOCUSED_FIELD'
  ]),
  map(x => [x, x]),
  fromPairs
)([
  'ADD_LIQUIDITY',
  'GET_RESERVE',
  'ESTIMATE_MINTED'
])

function initialState () {
  return {
    firstToken: null,
    secondToken: null,
    firstTokenValue: 0,
    secondTokenValue: 0,
    reserve: null,
    minted: '',
    focusedField: null
  }
}

const state = initialState()

const getters = {
  firstToken (state) {
    return state.firstToken
  },
  secondToken (state) {
    return state.secondToken
  },
  firstTokenValue (state) {
    return state.firstTokenValue
  },
  secondTokenValue (state) {
    return state.secondTokenValue
  },
  reserve (state) {
    return state.reserve
  },
  reserveA (state) {
    return state.reserve ? state.reserve[0] : 0
  },
  reserveB (state) {
    return state.reserve ? state.reserve[1] : 0
  },
  isAvailable (state) {
    return state.reserve && state.reserve[0] !== '0' && state.reserve[1] !== '0'
  },
  minted (state) {
    return state.minted || '0'
  }
}

const mutations = {
  [types.SET_FIRST_TOKEN] (state, firstToken: any) {
    state.firstToken = firstToken
  },
  [types.SET_SECOND_TOKEN] (state, secondToken: any) {
    state.secondToken = secondToken
  },
  [types.SET_FIRST_TOKEN_VALUE] (state, firstTokenValue: string | number) {
    state.firstTokenValue = firstTokenValue
    console.log('first', firstTokenValue)
  },
  [types.SET_SECOND_TOKEN_VALUE] (state, secondTokenValue: string | number) {
    state.secondTokenValue = secondTokenValue
    console.log('second', secondTokenValue)
  },
  [types.ADD_LIQUIDITY_REQUEST] (state) {
  },
  [types.ADD_LIQUIDITY_SUCCESS] (state) {
    state.firstToken = null
    state.secondToken = null
    state.firstTokenValue = 0
    state.secondTokenValue = 0
  },
  [types.ADD_LIQUIDITY_FAILURE] (state, error) {
  },
  [types.GET_RESERVE_REQUEST] (state) {
  },
  [types.GET_RESERVE_SUCCESS] (state, reserve) {
    state.reserve = reserve
  },
  [types.GET_RESERVE_FAILURE] (state, error) {
  },
  [types.ESTIMATE_MINTED_REQUEST] (state) {
  },
  [types.ESTIMATE_MINTED_SUCCESS] (state, minted) {
    state.minted = minted
  },
  [types.ESTIMATE_MINTED_FAILURE] (state, error) {
  },
  [types.SET_FOCUSED_FIELD] (state, field) {
    state.focusedField = field
  }
}

const actions = {
  async setFirstToken ({ commit, dispatch }, token: any) {
    const asset = await dexApi.getAccountAsset(token.address)
    commit(types.SET_FIRST_TOKEN, asset)
    dispatch('checkReserve')
  },

  async setSecondToken ({ commit, dispatch }, token: any) {
    const asset = await dexApi.getAccountAsset(token.address)
    commit(types.SET_SECOND_TOKEN, asset)
    dispatch('checkReserve')
  },

  async checkReserve ({ commit, getters, dispatch }) {
    if (getters.firstToken && getters.secondToken) {
      commit(types.GET_RESERVE_REQUEST)
      try {
        const reserve = await dexApi.getLiquidityReserves(getters.firstToken.address, getters.secondToken.address)
        console.log(reserve)
        commit(types.GET_RESERVE_SUCCESS, reserve)

        dispatch('estimateMinted')
      } catch (error) {
        commit(types.GET_RESERVE_FAILURE, error)
      }
    }
  },

  async estimateMinted ({ commit, getters }) {
    if (getters.firstToken && getters.firstToken.address && getters.firstToken && getters.secondToken.address && getters.firstTokenValue && getters.secondTokenValue) {
      commit(types.ESTIMATE_MINTED_REQUEST)

      try {
        const minted = await dexApi.estimatePoolTokensMinted(
          getters.firstToken.address,
          getters.secondToken.address,
          getters.firstTokenValue,
          getters.secondTokenValue,
          getters.reserveA,
          getters.reserveB
        )
        console.log(minted)
        commit(types.ESTIMATE_MINTED_SUCCESS, minted)
      } catch (error) {
        console.log(error)
        commit(types.ESTIMATE_MINTED_FAILURE, error)
      }
    }
  },

  setFirstTokenValue ({ commit, dispatch, getters }, value: string | number) {
    console.log(value)
    if ((!getters.focusedField || getters.focusedField === 'firstTokenValue') && value !== getters.firstTokenValue) {
      commit(types.SET_FOCUSED_FIELD, 'firstTokenValue')

      commit(types.SET_FIRST_TOKEN_VALUE, value)
      commit(types.SET_SECOND_TOKEN_VALUE, Number(value) * (Number(getters.reserveB) / Number(getters.reserveA)))
      dispatch('estimateMinted')
    }
  },

  setSecondTokenValue ({ commit, dispatch, getters }, value: string | number) {
    if ((!getters.focusedField || getters.focusedField === 'secondTokenValue') && value !== getters.secondTokenValue) {
      commit(types.SET_FOCUSED_FIELD, 'secondTokenValue')

      commit(types.SET_SECOND_TOKEN_VALUE, value)
      commit(types.SET_FIRST_TOKEN_VALUE, Number(value) * (Number(getters.reserveA) / Number(getters.reserveB)))
      dispatch('estimateMinted')
    }
  },

  async addLiquidity ({ commit, getters }) {
    commit(types.ADD_LIQUIDITY_REQUEST)
    const result = await dexApi.addLiquidity(
      getters.firstToken.address,
      getters.secondToken.address,
      getters.firstTokenValue,
      getters.secondTokenValue
    )

    try {
      commit(types.ADD_LIQUIDITY_SUCCESS, result)
    } catch (error) {
      commit(types.ADD_LIQUIDITY_FAILURE)
    }
  },

  async setDataFromLiquidity ({ commit, dispatch, rootGetters }, { firstAddress, secondAddress }) {
    dispatch('setFirstToken', rootGetters['assets/assets'].find(a => a.address === firstAddress))
    dispatch('setSecondToken', rootGetters['assets/assets'].find(a => a.address === secondAddress))
  },

  resetFocusedField ({ commit }) {
    commit(types.SET_FOCUSED_FIELD, null)
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
