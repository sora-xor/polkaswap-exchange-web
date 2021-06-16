import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { api } from '@soramitsu/soraneo-wallet-web'
import { KnownAssets, KnownSymbols, RewardInfo, RewardsInfo, CodecString } from '@sora-substrate/util'
import web3Util from '@/utils/web3-util'
import { RewardsAmountHeaderItem, RewardInfoGroup } from '@/types/rewards'
import { groupRewardsByAssetsList } from '@/utils/rewards'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'RESET',
    'SET_TRANSACTION_STEP',
    'SET_TRANSACTION_ERROR',
    'SET_REWARDS_CLAIMING',
    'SET_REWARDS_RECIEVED',
    'SET_SIGNATURE',
    'SET_SELECTED_REWARDS'
  ]),
  map(x => [x, x]),
  fromPairs
)([
  'GET_REWARDS',
  'GET_FEE'
])

interface RewardsState {
  fee: CodecString;
  feeFetching: boolean;
  externalRewards: Array<RewardInfo>;
  selectedExternalRewards: Array<RewardInfo>;
  internalRewards: Array<RewardInfo>;
  selectedInternalRewards: Array<RewardInfo>;
  vestedRewards: Nullable<RewardsInfo>;
  selectedVestedRewards: Nullable<RewardsInfo>;
  rewardsFetching: boolean;
  rewardsClaiming: boolean;
  rewardsRecieved: boolean;
  transactionError: boolean;
  transactionStep: number;
  signature: string;
}

function initialState (): RewardsState {
  return {
    fee: '',
    feeFetching: false,
    externalRewards: [],
    selectedExternalRewards: [],
    internalRewards: [],
    selectedInternalRewards: [],
    vestedRewards: null,
    selectedVestedRewards: null,
    rewardsFetching: false,
    rewardsClaiming: false,
    rewardsRecieved: false,
    transactionError: false,
    transactionStep: 1,
    signature: ''
  }
}

const state = initialState()

const getters = {
  claimableRewards (state: RewardsState): Array<RewardInfo | RewardsInfo> {
    const buffer: Array<RewardInfo | RewardsInfo> = [
      ...state.selectedInternalRewards,
      ...state.selectedExternalRewards
    ]

    if (state.selectedVestedRewards) {
      buffer.push(state.selectedVestedRewards)
    }

    return buffer
  },
  rewardsAvailable (_, getters): boolean {
    return getters.claimableRewards.length !== 0
  },
  externalRewardsAvailable (state: RewardsState): boolean {
    return state.externalRewards.length !== 0
  },
  externalRewardsSelected (state: RewardsState): boolean {
    return state.selectedExternalRewards.length !== 0
  },
  transactionStepsCount (_, getters): number {
    return getters.externalRewardsSelected ? 2 : 1
  },
  vestedRewadsGroupItem (state): RewardInfoGroup {
    return {
      type: 'Strategic Rewards',
      asset: KnownAssets.get(KnownSymbols.PSWAP),
      amount: state.vestedRewards?.limit ?? 0,
      rewards: state.vestedRewards?.rewards ?? []
    }
  },
  rewardsByAssetsList (state, getters): Array<RewardsAmountHeaderItem> {
    if (!getters.rewardsAvailable) {
      return [
        {
          symbol: KnownSymbols.PSWAP,
          amount: ''
        } as RewardsAmountHeaderItem,
        {
          symbol: KnownSymbols.VAL,
          amount: ''
        } as RewardsAmountHeaderItem
      ]
    }

    return groupRewardsByAssetsList(getters.claimableRewards)
  }
}

const mutations = {
  [types.RESET] (state: RewardsState) {
    const s = initialState()

    Object.keys(s).forEach(key => {
      state[key] = s[key]
    })
  },

  [types.SET_TRANSACTION_STEP] (state: RewardsState, transactionStep: number) {
    state.transactionStep = transactionStep
  },
  [types.SET_REWARDS_CLAIMING] (state: RewardsState, flag: boolean) {
    state.rewardsClaiming = flag
  },
  [types.SET_TRANSACTION_ERROR] (state: RewardsState, flag: boolean) {
    state.transactionError = flag
  },
  [types.SET_REWARDS_RECIEVED] (state: RewardsState, flag: boolean) {
    state.rewardsRecieved = flag
  },
  [types.SET_SIGNATURE] (state: RewardsState, signature: string) {
    state.signature = signature
  },

  [types.GET_REWARDS_REQUEST] (state: RewardsState) {
    state.rewardsFetching = true
  },
  [types.GET_REWARDS_SUCCESS] (state: RewardsState, { internal = [], external = [], vested = null } = {}) {
    state.internalRewards = internal
    state.externalRewards = external
    state.vestedRewards = vested
    state.rewardsFetching = false
  },
  [types.GET_REWARDS_FAILURE] (state: RewardsState) {
    state.internalRewards = []
    state.externalRewards = []
    state.vestedRewards = null
    state.rewardsFetching = false
  },

  [types.GET_FEE_REQUEST] (state: RewardsState) {
    state.feeFetching = true
  },
  [types.GET_FEE_SUCCESS] (state: RewardsState, fee: CodecString) {
    state.fee = fee
    state.feeFetching = false
  },
  [types.GET_FEE_FAILURE] (state: RewardsState) {
    state.feeFetching = false
  },

  [types.SET_SELECTED_REWARDS] (state: RewardsState, { internal = [], external = [], vested = null } = {}) {
    state.selectedExternalRewards = [...external]
    state.selectedInternalRewards = [...internal]
    state.selectedVestedRewards = vested
  }
}

const actions = {
  reset ({ commit }) {
    commit(types.RESET)
  },

  setTransactionStep ({ commit }, transactionStep: number) {
    commit(types.SET_TRANSACTION_STEP, transactionStep)
  },

  async setSelectedRewards ({ commit, dispatch }, params) {
    commit(types.SET_SELECTED_REWARDS, params)
    await dispatch('getNetworkFee')
  },

  async getNetworkFee ({ commit, getters }) {
    commit(types.GET_FEE_REQUEST)
    try {
      const fee = await api.getClaimRewardsNetworkFee(getters.claimableRewards)
      commit(types.GET_FEE_SUCCESS, fee)
    } catch (error) {
      console.error(error)
      commit(types.GET_FEE_FAILURE, error)
    }
  },

  async getRewards ({ commit, dispatch }, address) {
    commit(types.GET_REWARDS_REQUEST)
    try {
      const internal = await api.checkLiquidityProvisionRewards()
      const vested = await api.checkVestedRewards()
      const external = address ? await api.checkExternalAccountRewards(address) : []

      commit(types.GET_REWARDS_SUCCESS, { internal, external, vested })

      // select all rewards by default
      await dispatch('setSelectedRewards', { internal, external, vested })
    } catch (error) {
      console.error(error)
      commit(types.GET_REWARDS_FAILURE)
    }
  },

  async claimRewards (
    { commit, state, getters, rootGetters }: { commit: any; state: RewardsState; getters: any; rootGetters: any },
    { internalAddress = '', externalAddress = '' } = {}
  ) {
    if (!internalAddress) return

    try {
      const { externalRewardsSelected, claimableRewards } = getters

      if (externalRewardsSelected && !externalAddress) return

      commit(types.SET_REWARDS_CLAIMING, true)
      commit(types.SET_TRANSACTION_ERROR, false)

      if (externalRewardsSelected && state.transactionStep === 1) {
        const web3 = await web3Util.getInstance()
        const internalAddressHex = await web3Util.accountAddressToHex(internalAddress)
        const message = web3.utils.sha3(internalAddressHex) as string

        const signature = await web3.eth.personal.sign(message, externalAddress, '')

        commit(types.SET_SIGNATURE, signature)
        commit(types.SET_TRANSACTION_STEP, 2)
      }
      if (!externalRewardsSelected || (state.transactionStep === 2 && state.signature)) {
        await api.claimRewards(
          claimableRewards,
          state.signature,
          state.fee,
          externalAddress
        )

        // update ui to success state if user not changed external account
        if (rootGetters['web3/evmAddress'] === externalAddress) {
          commit(types.SET_TRANSACTION_STEP, 1)
          commit(types.SET_REWARDS_RECIEVED, true)
          commit(types.SET_REWARDS_CLAIMING, false)
        }
      }
    } catch (error) {
      commit(types.SET_TRANSACTION_ERROR, true)
      commit(types.SET_REWARDS_CLAIMING, false)
      throw error
    }
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
