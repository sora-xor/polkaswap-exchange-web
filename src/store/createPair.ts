import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { api } from '@soramitsu/soraneo-wallet-web'
import { Asset, AccountAsset } from '@sora-substrate/util'

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

interface CreatePairState {
  firstToken: Asset | AccountAsset | null;
  secondToken: Asset | AccountAsset | null;
  firstTokenValue: string;
  secondTokenValue: string;
  minted: string;
  fee: string;
  isAvailable: boolean;
}

function initialState (): CreatePairState {
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
  firstToken (state: CreatePairState) {
    return state.firstToken
  },
  secondToken (state: CreatePairState) {
    return state.secondToken
  },
  firstTokenValue (state: CreatePairState) {
    return state.firstTokenValue
  },
  secondTokenValue (state: CreatePairState) {
    return state.secondTokenValue
  },
  isAvailable (state: CreatePairState) {
    return state.isAvailable
  },
  minted (state: CreatePairState) {
    return state.minted || 0
  },
  fee (state: CreatePairState) {
    return state.fee || '0'
  }
}

const mutations = {
  [types.SET_FIRST_TOKEN] (state: CreatePairState, firstToken: Asset | AccountAsset | null) {
    state.firstToken = firstToken
  },
  [types.SET_SECOND_TOKEN] (state: CreatePairState, secondToken: Asset | AccountAsset | null) {
    state.secondToken = secondToken
  },
  [types.SET_FIRST_TOKEN_VALUE] (state: CreatePairState, firstTokenValue: string) {
    state.firstTokenValue = firstTokenValue
  },
  [types.SET_SECOND_TOKEN_VALUE] (state: CreatePairState, secondTokenValue: string) {
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
  [types.ESTIMATE_MINTED_SUCCESS] (state: CreatePairState, minted: string) {
    state.minted = minted
  },
  [types.ESTIMATE_MINTED_FAILURE] (state, error) {
  },
  [types.GET_FEE_REQUEST] (state) {
  },
  [types.GET_FEE_SUCCESS] (state: CreatePairState, fee: string) {
    state.fee = fee
  },
  [types.GET_FEE_FAILURE] (state, error) {
  },
  [types.CHECK_LIQUIDITY_REQUEST] (state) {},
  [types.CHECK_LIQUIDITY_SUCCESS] (state: CreatePairState, isAvailable: boolean) {
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
