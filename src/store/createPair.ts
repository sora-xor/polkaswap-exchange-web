import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import liquidityAPI from '@/api/liquidity'
import { dexApi } from '@soramitsu/soraneo-wallet-web'
import { KnownAssets } from '@sora-substrate/util'

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
  'CREATE_PAIR',
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
    minted: ''
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
    console.log(state.reserve)
    return state.reserve && state.reserve[0] === '0' && state.reserve[1] === '0'
  },
  minted (state) {
    return state.minted || 0
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
  },
  [types.SET_SECOND_TOKEN_VALUE] (state, secondTokenValue: string | number) {
    state.secondTokenValue = secondTokenValue
  },
  [types.CREATE_PAIR_REQUEST] (state) {
  },
  [types.CREATE_PAIR_SUCCESS] (state) {
  },
  [types.CREATE_PAIR_FAILURE] (state, error) {
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
  }
}

const actions = {
  async setFirstToken ({ commit, dispatch }, asset: any) {
    let firstAsset = await dexApi.accountAssets.find(a => a.address === asset.address)
    if (!firstAsset) {
      firstAsset = { ...asset, balance: '0', usdBalance: '0' }
    }

    commit(types.SET_FIRST_TOKEN, firstAsset)
    dispatch('checkReserve')
  },

  async setSecondToken ({ commit, dispatch }, asset: any) {
    let secondAddress = await dexApi.accountAssets.find(a => a.address === asset.address)
    if (!secondAddress) {
      secondAddress = { ...asset, balance: '0', usdBalance: '0' }
    }

    commit(types.SET_SECOND_TOKEN, secondAddress)
    dispatch('checkReserve')
  },

  async checkReserve ({ commit, getters, dispatch }) {
    if (getters.firstToken && getters.secondToken) {
      commit(types.GET_RESERVE_REQUEST)
      try {
        const reserve = await dexApi.getLiquidityReserves(getters.firstToken.address, getters.secondToken.address)
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
        commit(types.ESTIMATE_MINTED_SUCCESS, minted)
      } catch (error) {
        commit(types.ESTIMATE_MINTED_FAILURE, error)
      }
    }
  },

  setFirstTokenValue ({ commit, dispatch }, value: string | number) {
    commit(types.SET_FIRST_TOKEN_VALUE, value)
    dispatch('estimateMinted')
  },

  setSecondTokenValue ({ commit, dispatch }, value: string | number) {
    commit(types.SET_SECOND_TOKEN_VALUE, value)
    dispatch('estimateMinted')
  },

  async createPair ({ commit, getters }) {
    commit(types.CREATE_PAIR_REQUEST)
    const result = await dexApi.addLiquidity(
      getters.firstToken.address,
      getters.secondToken.address,
      getters.firstTokenValue,
      getters.secondTokenValue
    )

    try {
      commit(types.CREATE_PAIR_SUCCESS, result)
    } catch (error) {
      commit(types.CREATE_PAIR_FAILURE)
    }
  },

  resetData ({ commit }) {
    commit(types.SET_FIRST_TOKEN, null)
    commit(types.SET_SECOND_TOKEN, null)
    commit(types.SET_FIRST_TOKEN_VALUE, '')
    commit(types.SET_SECOND_TOKEN_VALUE, '')
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
