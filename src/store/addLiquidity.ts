import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { api } from '@soramitsu/soraneo-wallet-web'
import { Asset, AccountAsset, KnownAssets, FPNumber, CodecString } from '@sora-substrate/util'

import { ZeroStringValue } from '@/consts'

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
  'GET_FEE',
  'CHECK_LIQUIDITY'
])

interface AddLiquidityState {
  firstToken: Asset | AccountAsset | null;
  secondToken: Asset | AccountAsset | null;
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
    firstToken: null,
    secondToken: null,
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
  firstToken (state: AddLiquidityState) {
    return state.firstToken
  },
  secondToken (state: AddLiquidityState) {
    return state.secondToken
  },
  firstTokenDecimals (state: AddLiquidityState) {
    return state.firstToken?.decimals ?? 0
  },
  secondTokenDecimals (state: AddLiquidityState) {
    return state.secondToken?.decimals ?? 0
  },
  firstTokenAddress (state: AddLiquidityState) {
    return state.firstToken?.address ?? ''
  },
  secondTokenAddress (state: AddLiquidityState) {
    return state.secondToken?.address ?? ''
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
  [types.SET_FIRST_TOKEN] (state: AddLiquidityState, firstToken: Asset | AccountAsset | null) {
    state.firstToken = firstToken
  },
  [types.SET_SECOND_TOKEN] (state: AddLiquidityState, secondToken: Asset | AccountAsset | null) {
    state.secondToken = secondToken
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
  async setFirstToken ({ commit, dispatch }, asset: any) {
    let firstAsset = api.accountAssets.find(a => a.address === asset.address)
    if (!firstAsset) {
      firstAsset = { ...asset, balance: ZeroStringValue }
    }

    commit(types.SET_FIRST_TOKEN, firstAsset)
    commit(types.SET_FIRST_TOKEN_VALUE, '')
    commit(types.SET_SECOND_TOKEN_VALUE, '')
    dispatch('checkLiquidity')
  },

  async setSecondToken ({ commit, dispatch }, asset: any) {
    let secondAddress = api.accountAssets.find(a => a.address === asset.address)
    if (!secondAddress) {
      secondAddress = { ...asset, balance: ZeroStringValue }
    }
    commit(types.SET_SECOND_TOKEN, secondAddress)
    commit(types.SET_FIRST_TOKEN_VALUE, '')
    commit(types.SET_SECOND_TOKEN_VALUE, '')
    dispatch('checkLiquidity')
  },

  async checkReserve ({ commit, getters, dispatch }) {
    if (getters.firstToken && getters.secondToken) {
      commit(types.GET_RESERVE_REQUEST)
      try {
        const reserve = await api.getLiquidityReserves(getters.firstTokenAddress, getters.secondTokenAddress)
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
        const isAvailable = await api.checkLiquidity(getters.firstTokenAddress, getters.secondTokenAddress)
        commit(types.CHECK_LIQUIDITY_SUCCESS, isAvailable)

        dispatch('checkReserve')
      } catch (error) {
        commit(types.CHECK_LIQUIDITY_FAILURE, error)
      }
    }
  },

  async estimateMinted ({ commit, getters }) {
    if (getters.firstTokenAddress && getters.secondTokenAddress && getters.firstTokenValue && getters.secondTokenValue) {
      commit(types.ESTIMATE_MINTED_REQUEST)

      try {
        const [minted, pts] = await api.estimatePoolTokensMinted(
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
      if (value && getters.isNotFirstLiquidityProvider) {
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
      if (value && getters.isNotFirstLiquidityProvider) {
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
    if (getters.firstTokenAddress && getters.secondTokenAddress) {
      commit(types.GET_FEE_REQUEST)
      try {
        const fee = await api.getAddLiquidityNetworkFee(
          getters.firstTokenAddress,
          getters.secondTokenAddress,
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
        getters.firstTokenAddress,
        getters.secondTokenAddress,
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
    dispatch('setFirstToken', await api.accountAssets.find(a => a.address === firstAddress))
    let secondAsset: any = await api.accountAssets.find(a => a.address === secondAddress)
    if (!secondAsset) {
      secondAsset = KnownAssets.get(secondAddress)
    }
    dispatch('setSecondToken', secondAsset)
    dispatch('getNetworkFee')
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
