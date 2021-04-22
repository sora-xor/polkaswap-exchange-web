import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { api } from '@soramitsu/soraneo-wallet-web'
import { KnownAssets, FPNumber, CodecString } from '@sora-substrate/util'

import { ZeroStringValue } from '@/consts'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_FIRST_TOKEN_ADDRESS',
    'SET_SECOND_TOKEN_ADDRESS',
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
  'GET_FEE',
  'CHECK_LIQUIDITY'
])

interface AddLiquidityState {
  firstTokenAddress: string;
  secondTokenAddress: string;
  firstTokenValue: string;
  secondTokenValue: string;
  reserve: null | Array<CodecString>;
  minted: CodecString;
  fee: CodecString;
  totalSupply: CodecString;
  focusedField: null | string;
  isAvailable: boolean;
}

function initialState (): AddLiquidityState {
  return {
    firstTokenAddress: '',
    secondTokenAddress: '',
    firstTokenValue: '',
    secondTokenValue: '',
    reserve: null,
    minted: '',
    fee: '',
    totalSupply: '',
    focusedField: null,
    isAvailable: false
  }
}

const state = initialState()

const getters = {
  firstToken (state: AddLiquidityState, getters, rootState, rootGetters) {
    return rootGetters['assets/getAssetDataByAddress'](state.firstTokenAddress)
  },
  secondToken (state: AddLiquidityState, getters, rootState, rootGetters) {
    return rootGetters['assets/getAssetDataByAddress'](state.secondTokenAddress)
  },
  firstTokenValue (state: AddLiquidityState) {
    return state.firstTokenValue
  },
  secondTokenValue (state: AddLiquidityState) {
    return state.secondTokenValue
  },
  reserve (state: AddLiquidityState) {
    return state.reserve
  },
  reserveA (state: AddLiquidityState) {
    return state.reserve ? state.reserve[0] : ZeroStringValue
  },
  reserveB (state: AddLiquidityState) {
    return state.reserve ? state.reserve[1] : ZeroStringValue
  },
  isAvailable (state: AddLiquidityState) {
    return state.isAvailable && state.reserve
  },
  isNotFirstLiquidityProvider (state: AddLiquidityState, getters) {
    return state.reserve && (+getters.reserveA !== 0) && (+getters.reserveB !== 0)
  },
  minted (state: AddLiquidityState) {
    return state.minted || ZeroStringValue
  },
  fee (state: AddLiquidityState) {
    return state.fee || ZeroStringValue
  },
  totalSupply (state: AddLiquidityState) {
    return state.totalSupply || ZeroStringValue
  },
  shareOfPool (state: AddLiquidityState, getters) {
    const minted = FPNumber.fromCodecValue(getters.minted)
    return getters.firstTokenValue && getters.secondTokenValue
      ? minted.div(FPNumber.fromCodecValue(getters.totalSupply).add(minted)).mul(new FPNumber(100)).format() || ZeroStringValue
      : ZeroStringValue
  }
}

const mutations = {
  [types.SET_FIRST_TOKEN_ADDRESS] (state: AddLiquidityState, address: string) {
    state.firstTokenAddress = address
  },
  [types.SET_SECOND_TOKEN_ADDRESS] (state: AddLiquidityState, address: string) {
    state.secondTokenAddress = address
  },
  [types.SET_FIRST_TOKEN_VALUE] (state: AddLiquidityState, firstTokenValue: string) {
    state.firstTokenValue = firstTokenValue
  },
  [types.SET_SECOND_TOKEN_VALUE] (state: AddLiquidityState, secondTokenValue: string) {
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
  [types.GET_RESERVE_SUCCESS] (state: AddLiquidityState, reserve: null | Array<CodecString>) {
    state.reserve = reserve
  },
  [types.GET_RESERVE_FAILURE] (state, error) {
  },
  [types.ESTIMATE_MINTED_REQUEST] (state) {
  },
  [types.ESTIMATE_MINTED_SUCCESS] (state: AddLiquidityState, { minted, pts }: { minted: CodecString; pts: CodecString }) {
    state.minted = minted
    state.totalSupply = pts
  },
  [types.ESTIMATE_MINTED_FAILURE] (state, error) {
  },
  [types.GET_FEE_REQUEST] (state) {
  },
  [types.GET_FEE_SUCCESS] (state: AddLiquidityState, fee: CodecString) {
    state.fee = fee
  },
  [types.GET_FEE_FAILURE] (state, error) {
  },
  [types.SET_FOCUSED_FIELD] (state: AddLiquidityState, field: string) {
    state.focusedField = field
  },
  [types.CHECK_LIQUIDITY_REQUEST] (state) {},
  [types.CHECK_LIQUIDITY_SUCCESS] (state: AddLiquidityState, isAvailable: boolean) {
    state.isAvailable = isAvailable
  },
  [types.CHECK_LIQUIDITY_FAILURE] (state) {}
}

const actions = {
  async setFirstTokenAddress ({ commit, dispatch }, address: string) {
    commit(types.SET_FIRST_TOKEN_ADDRESS, address)
    commit(types.SET_FIRST_TOKEN_VALUE, '')
    commit(types.SET_SECOND_TOKEN_VALUE, '')
    await dispatch('checkLiquidity')
  },

  async setSecondTokenAddress ({ commit, dispatch }, address: string) {
    commit(types.SET_SECOND_TOKEN_ADDRESS, address)
    commit(types.SET_FIRST_TOKEN_VALUE, '')
    commit(types.SET_SECOND_TOKEN_VALUE, '')
    await dispatch('checkLiquidity')
  },

  async checkReserve ({ commit, getters, dispatch }) {
    if (getters.firstToken && getters.secondToken) {
      commit(types.GET_RESERVE_REQUEST)
      try {
        const reserve = await api.getLiquidityReserves(getters.firstToken?.address, getters.secondToken?.address)
        commit(types.GET_RESERVE_SUCCESS, reserve)

        dispatch('estimateMinted')
        dispatch('getNetworkFee')
      } catch (error) {
        commit(types.GET_RESERVE_FAILURE, error)
      }
    }
  },

  async checkLiquidity ({ commit, getters, dispatch }) {
    if (getters.firstToken && getters.secondToken) {
      commit(types.CHECK_LIQUIDITY_REQUEST)
      try {
        const isAvailable = await api.checkLiquidity(getters.firstToken?.address, getters.secondToken?.address)
        commit(types.CHECK_LIQUIDITY_SUCCESS, isAvailable)

        await dispatch('checkReserve')
      } catch (error) {
        commit(types.CHECK_LIQUIDITY_FAILURE, error)
      }
    }
  },

  async estimateMinted ({ commit, getters }) {
    if (getters.firstToken?.address && getters.secondToken?.address && getters.firstTokenValue && getters.secondTokenValue) {
      commit(types.ESTIMATE_MINTED_REQUEST)

      try {
        const [minted, pts] = await api.estimatePoolTokensMinted(
          getters.firstToken.address,
          getters.secondToken.address,
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

      if (!value) {
        commit(types.SET_SECOND_TOKEN_VALUE, '')
      } else if (getters.isNotFirstLiquidityProvider) {
        commit(
          types.SET_SECOND_TOKEN_VALUE,
          new FPNumber(value)
            .mul(FPNumber.fromCodecValue(getters.reserveB))
            .div(FPNumber.fromCodecValue(getters.reserveA))
            .toString()
        )
      }

      dispatch('estimateMinted')
      dispatch('getNetworkFee')
    }
  },

  setSecondTokenValue ({ commit, dispatch, getters }, value: string | number) {
    if ((!getters.focusedField || getters.focusedField === 'secondTokenValue') && value !== getters.secondTokenValue) {
      commit(types.SET_FOCUSED_FIELD, 'secondTokenValue')

      commit(types.SET_SECOND_TOKEN_VALUE, value)

      if (!value) {
        commit(types.SET_FIRST_TOKEN_VALUE, '')
      } else if (getters.isNotFirstLiquidityProvider) {
        commit(
          types.SET_FIRST_TOKEN_VALUE,
          new FPNumber(value)
            .mul(FPNumber.fromCodecValue(getters.reserveA))
            .div(FPNumber.fromCodecValue(getters.reserveB))
            .toString()
        )
      }

      dispatch('estimateMinted')
      dispatch('getNetworkFee')
    }
  },

  async getNetworkFee ({ commit, getters }) {
    if (getters.firstToken?.address && getters.secondToken?.address) {
      commit(types.GET_FEE_REQUEST)
      try {
        const fee = await api.getAddLiquidityNetworkFee(
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
      commit(types.GET_FEE_SUCCESS, ZeroStringValue)
    }
  },

  async addLiquidity ({ commit, getters, rootGetters }) {
    commit(types.ADD_LIQUIDITY_REQUEST)
    try {
      const result = await api.addLiquidity(
        getters.firstToken?.address,
        getters.secondToken?.address,
        getters.firstTokenValue,
        getters.secondTokenValue,
        rootGetters.slippageTolerance
      )
      commit(types.ADD_LIQUIDITY_SUCCESS, result)
    } catch (error) {
      commit(types.ADD_LIQUIDITY_FAILURE)
      throw error
    }
  },

  async setDataFromLiquidity ({ dispatch }, { firstAddress, secondAddress }) {
    const findAssetAddress = address => {
      const asset = KnownAssets.get(address) ?? api.accountAssets.find(a => a.address === address)
      return asset?.address ?? ''
    }

    dispatch('setFirstTokenAddress', findAssetAddress(firstAddress))
    dispatch('setSecondTokenAddress', findAssetAddress(secondAddress))
    dispatch('getNetworkFee')
  },

  resetFocusedField ({ commit }) {
    commit(types.SET_FOCUSED_FIELD, null)
  },

  resetData ({ commit }, withAssets = false) {
    if (!withAssets) {
      commit(types.SET_FIRST_TOKEN_ADDRESS, '')
      commit(types.SET_SECOND_TOKEN_ADDRESS, '')
    }
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
