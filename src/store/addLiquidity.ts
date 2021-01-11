import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { dexApi } from '@soramitsu/soraneo-wallet-web'
import { FPNumber } from '@sora-substrate/util'

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
  'ESTIMATE_MINTED',
  'GET_FEE'
])

function initialState () {
  return {
    firstToken: null,
    secondToken: null,
    firstTokenValue: 0,
    secondTokenValue: 0,
    reserve: null,
    minted: '',
    fee: '',
    totalSupply: 0,
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
  firstTokenDecimals (state) {
    return state.firstToken ? state.firstToken.decimals : 0
  },
  secondTokenDecimals (state) {
    return state.secondToken ? state.secondToken.decimals : 0
  },
  firstTokenAddress (state) {
    return state.firstToken ? state.firstToken.address : 0
  },
  secondTokenAddress (state) {
    return state.secondToken ? state.secondToken.address : 0
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
    return state.reserve ? Number(state.reserve[0]) : 0
  },
  reserveB (state) {
    return state.reserve ? Number(state.reserve[1]) : 0
  },
  isAvailable (state, getters) {
    return state.reserve && getters.reserveA !== 0 && getters.reserveB !== 0
  },
  minted (state) {
    return state.minted || '0'
  },
  fee (state) {
    return state.fee || '0'
  },
  totalSupply (state) {
    return state.totalSupply || '0'
  },
  shareOfPool (state, getters) {
    return getters.firstTokenValue && getters.secondTokenValue
      ? new FPNumber(getters.minted).div(new FPNumber(getters.totalSupply)).mul(new FPNumber(100)).toNumber(2) || 0
      : 0
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
  [types.ADD_LIQUIDITY_REQUEST] (state) {
  },
  [types.ADD_LIQUIDITY_SUCCESS] (state) {
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
  [types.ESTIMATE_MINTED_SUCCESS] (state, { minted, pts }) {
    state.minted = minted
    state.totalSupply = pts
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
  [types.SET_FOCUSED_FIELD] (state, field) {
    state.focusedField = field
  }
}

const actions = {
  async setFirstToken ({ commit, dispatch }, asset: any) {
    let firstAsset = await dexApi.accountAssets.find(a => a.address === asset.address)
    if (!firstAsset) {
      firstAsset = { ...asset, balance: '0' }
    }

    commit(types.SET_FIRST_TOKEN, firstAsset)
    commit(types.SET_FIRST_TOKEN_VALUE, '')
    commit(types.SET_SECOND_TOKEN_VALUE, '')
    dispatch('checkReserve')
  },

  async setSecondToken ({ commit, dispatch }, asset: any) {
    let secondAddress = await dexApi.accountAssets.find(a => a.address === asset.address)
    if (!secondAddress) {
      secondAddress = { ...asset, balance: '0' }
    }
    commit(types.SET_SECOND_TOKEN, secondAddress)
    commit(types.SET_FIRST_TOKEN_VALUE, '')
    commit(types.SET_SECOND_TOKEN_VALUE, '')
    dispatch('checkReserve')
  },

  async checkReserve ({ commit, getters, dispatch }) {
    if (getters.firstToken && getters.secondToken) {
      commit(types.GET_RESERVE_REQUEST)
      try {
        const reserve = await dexApi.getLiquidityReserves(getters.firstTokenAddress, getters.secondTokenAddress)
        commit(types.GET_RESERVE_SUCCESS, reserve)

        dispatch('estimateMinted')
        dispatch('getNetworkFee')
      } catch (error) {
        commit(types.GET_RESERVE_FAILURE, error)
      }
    }
  },

  async estimateMinted ({ commit, getters }) {
    if (getters.firstTokenAddress && getters.secondTokenAddress && getters.firstTokenValue && getters.secondTokenValue) {
      commit(types.ESTIMATE_MINTED_REQUEST)

      try {
        const [minted, pts] = await dexApi.estimatePoolTokensMinted(
          getters.firstTokenAddress,
          getters.secondTokenAddress,
          getters.firstTokenValue,
          getters.secondTokenValue,
          getters.reserveA,
          getters.reserveB
        )
        commit(types.ESTIMATE_MINTED_SUCCESS, { minted, pts })
      } catch (error) {
        commit(types.ESTIMATE_MINTED_FAILURE, error)
      }
    }
  },

  setFirstTokenValue ({ commit, dispatch, getters }, value: string | number) {
    if ((!getters.focusedField || getters.focusedField === 'firstTokenValue') && value !== getters.firstTokenValue) {
      commit(types.SET_FOCUSED_FIELD, 'firstTokenValue')

      commit(types.SET_FIRST_TOKEN_VALUE, value)
      if (value && getters.reserveA && getters.reserveB) {
        commit(
          types.SET_SECOND_TOKEN_VALUE,
          new FPNumber(value)
            .mul(new FPNumber(getters.reserveB))
            .div(new FPNumber(getters.reserveA))
            .toFixed(getters.firstTokenDecimals))
      }
      dispatch('estimateMinted')
      dispatch('getNetworkFee')
    }
  },

  setSecondTokenValue ({ commit, dispatch, getters }, value: string | number) {
    if ((!getters.focusedField || getters.focusedField === 'secondTokenValue') && value !== getters.secondTokenValue) {
      commit(types.SET_FOCUSED_FIELD, 'secondTokenValue')

      commit(types.SET_SECOND_TOKEN_VALUE, value)
      if (value && getters.reserveA && getters.reserveB) {
        commit(
          types.SET_FIRST_TOKEN_VALUE,
          new FPNumber(value)
            .mul(new FPNumber(getters.reserveA))
            .div(new FPNumber(getters.reserveB))
            .toFixed(getters.secondTokenDecimals))
      }
      dispatch('estimateMinted')
      dispatch('getNetworkFee')
    }
  },

  async getNetworkFee ({ commit, getters }) {
    if (getters.firstTokenAddress && getters.secondTokenAddress && getters.firstTokenValue && getters.secondTokenValue) {
      commit(types.GET_FEE_REQUEST)
      try {
        const fee = await dexApi.getAddLiquidityNetworkFee(
          getters.firstTokenAddress,
          getters.secondTokenAddress,
          getters.firstTokenValue,
          getters.secondTokenValue
        )

        commit(types.GET_FEE_SUCCESS, fee)
      } catch (error) {
        commit(types.GET_FEE_FAILURE, error)
      }
    } else {
      commit(types.GET_FEE_SUCCESS, 0)
    }
  },

  async addLiquidity ({ commit, getters }) {
    commit(types.ADD_LIQUIDITY_REQUEST)
    try {
      const result = await dexApi.addLiquidity(
        getters.firstTokenAddress,
        getters.secondTokenAddress,
        getters.firstTokenValue,
        getters.secondTokenValue
      )
      commit(types.ADD_LIQUIDITY_SUCCESS, result)
    } catch (error) {
      commit(types.ADD_LIQUIDITY_FAILURE)
      throw error
    }
  },

  async setDataFromLiquidity ({ dispatch }, { firstAddress, secondAddress, balance }) {
    dispatch('setFirstToken', dexApi.accountAssets.find(a => a.address === firstAddress))
    dispatch('setSecondToken', dexApi.accountAssets.find(a => a.address === secondAddress))
  },

  resetFocusedField ({ commit }) {
    commit(types.SET_FOCUSED_FIELD, null)
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
