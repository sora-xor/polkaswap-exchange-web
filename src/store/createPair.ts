import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { api } from '@soramitsu/soraneo-wallet-web'

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
  'ESTIMATE_MINTED',
  'GET_FEE',
  'CHECK_LIQUIDITY'
])

function initialState () {
  return {
    firstToken: null,
    secondToken: null,
    firstTokenValue: '',
    secondTokenValue: '',
    minted: '',
    fee: '',
    isAvailable: false
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
  isAvailable (state) {
    return state.isAvailable
  },
  minted (state) {
    return state.minted || 0
  },
  fee (state) {
    return state.fee || '0'
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
  [types.ESTIMATE_MINTED_REQUEST] (state) {
  },
  [types.ESTIMATE_MINTED_SUCCESS] (state, minted) {
    state.minted = minted
  },
  [types.ESTIMATE_MINTED_FAILURE] (state, error) {
  },
  [types.GET_FEE_REQUEST] (state) {
  },
  [types.GET_FEE_SUCCESS] (state, fee) {
    state.fee = fee
  },
  [types.GET_FEE_FAILURE] (state, error) {
  },
  [types.CHECK_LIQUIDITY_REQUEST] (state) {},
  [types.CHECK_LIQUIDITY_SUCCESS] (state, isAvailable) {
    state.isAvailable = isAvailable
  },
  [types.CHECK_LIQUIDITY_FAILURE] (state) {}
}

const actions = {
  async setFirstToken ({ commit, dispatch }, asset: any) {
    let firstAsset = api.accountAssets.find(a => a.address === asset.address)
    if (!firstAsset) {
      firstAsset = { ...asset, balance: '0' }
    }
    commit(types.SET_FIRST_TOKEN, firstAsset)
    dispatch('checkLiquidity')
  },

  async setSecondToken ({ commit, dispatch }, asset: any) {
    let secondAsset = api.accountAssets.find(a => a.address === asset.address)
    if (!secondAsset) {
      secondAsset = { ...asset, balance: '0' }
    }
    commit(types.SET_SECOND_TOKEN, secondAsset)
    dispatch('checkLiquidity')
  },

  async checkLiquidity ({ commit, getters, dispatch }) {
    if (getters.firstToken && getters.secondToken) {
      commit(types.CHECK_LIQUIDITY_REQUEST)
      try {
        const exists = await api.checkLiquidity(getters.firstToken.address, getters.secondToken.address)
        commit(types.CHECK_LIQUIDITY_SUCCESS, !exists)
        dispatch('estimateMinted')
        dispatch('getNetworkFee')
      } catch (error) {
        commit(types.CHECK_LIQUIDITY_FAILURE, error)
      }
    }
  },

  async estimateMinted ({ commit, getters }) {
    if (getters.firstToken?.address && getters.secondToken?.address && getters.firstTokenValue && getters.secondTokenValue) {
      commit(types.ESTIMATE_MINTED_REQUEST)
      try {
        const [minted] = await api.estimatePoolTokensMinted(
          getters.firstToken.address,
          getters.secondToken.address,
          getters.firstTokenValue,
          getters.secondTokenValue,
          0,
          0
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
    dispatch('getNetworkFee')
  },

  setSecondTokenValue ({ commit, dispatch }, value: string | number) {
    commit(types.SET_SECOND_TOKEN_VALUE, value)
    dispatch('estimateMinted')
    dispatch('getNetworkFee')
  },

  async getNetworkFee ({ commit, getters }) {
    if (getters.firstToken?.address && getters.secondToken?.address) {
      commit(types.GET_FEE_REQUEST)
      try {
        const fee = await api.getCreatePairNetworkFee(
          getters.firstToken.address,
          getters.secondToken.address,
          getters.firstTokenValue || 0,
          getters.secondTokenValue || 0
        )
        commit(types.GET_FEE_SUCCESS, fee)
      } catch (error) {
        commit(types.GET_FEE_FAILURE, error)
      }
    } else {
      commit(types.GET_FEE_SUCCESS, 0)
    }
  },

  async createPair ({ commit, getters, rootGetters }) {
    commit(types.CREATE_PAIR_REQUEST)
    try {
      await api.createPair(
        getters.firstToken.address,
        getters.secondToken.address,
        getters.firstTokenValue,
        getters.secondTokenValue,
        rootGetters.slippageTolerance
      )
      commit(types.CREATE_PAIR_SUCCESS)
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
