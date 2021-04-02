import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { api } from '@soramitsu/soraneo-wallet-web'
import { FPNumber, KnownSymbols, KnownAssets, RewardInfo, CodecString, AccountAsset } from '@sora-substrate/util'
import web3Util from '@/utils/web3-util'
import { RewardsAmountHeaderItem } from '@/types/rewards'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'RESET',
    'SET_TRANSACTION_STEP',
    'SET_TRANSACTION_ERROR',
    'SET_REWARDS_CLAIMING',
    'SET_REWARDS_RECIEVED',
    'SET_SIGNATURE'
  ]),
  map(x => [x, x]),
  fromPairs
)([
  'GET_REWARDS',
  'GET_FEE'
])

interface RewardsState {
  fee: CodecString;
  rewards: Array<RewardInfo>;
  rewardsFetching: boolean;
  rewardsClaiming: boolean;
  rewardsRecieved: boolean;
  transactionError: boolean;
  transactionStep: number;
  transactionStepsCount: number;
  signature: string;
}

function initialState (): RewardsState {
  return {
    fee: '',
    rewards: [],
    rewardsFetching: false,
    rewardsClaiming: false,
    rewardsRecieved: false,
    transactionError: false,
    transactionStep: 1,
    transactionStepsCount: 2,
    signature: ''
  }
}

const state = initialState()

const getters = {
  claimableRewards (state: RewardsState): Array<RewardInfo> {
    return state.rewards.reduce((claimableList: Array<RewardInfo>, item: RewardInfo) => {
      if (FPNumber.fromCodecValue(item.amount, item.asset.decimals).isZero()) return claimableList

      claimableList.push(item)

      return claimableList
    }, [])
  },
  rewardsFetched (state): boolean {
    return state.rewards.length !== 0
  },
  rewardsAvailable (state, getters): boolean {
    return getters.claimableRewards.length !== 0
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

    const rewardsHash = getters.claimableRewards.reduce((result, { asset, amount }: RewardInfo) => {
      const { address, decimals } = asset
      const current = result[address] || new FPNumber(0, decimals)
      const addValue = FPNumber.fromCodecValue(amount, decimals)

      result[address] = current.add(addValue)

      return result
    }, {})

    return Object.entries(rewardsHash).reduce((total: Array<RewardsAmountHeaderItem>, [address, amount]) => {
      if ((amount as FPNumber).isZero()) return total

      const item = {
        symbol: KnownAssets.get(address).symbol,
        amount: (amount as FPNumber).format()
      } as RewardsAmountHeaderItem

      total.push(item)

      return total
    }, [])
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
    state.rewards = []
    state.rewardsFetching = true
  },
  [types.GET_REWARDS_SUCCESS] (state: RewardsState, rewards) {
    state.rewards = rewards
    state.rewardsFetching = false
  },
  [types.GET_REWARDS_FAILURE] (state: RewardsState) {
    state.rewards = []
    state.rewardsFetching = false
  },

  [types.GET_FEE_REQUEST] (state: RewardsState) {},
  [types.GET_FEE_SUCCESS] (state: RewardsState, fee: CodecString) {
    state.fee = fee
  },
  [types.GET_FEE_FAILURE] (state: RewardsState) {}
}

const actions = {
  reset ({ commit }) {
    commit(types.RESET)
  },

  setTransactionStep ({ commit }, transactionStep: number) {
    commit(types.SET_TRANSACTION_STEP, transactionStep)
  },

  async getNetworkFee ({ commit }) {
    commit(types.GET_FEE_REQUEST)
    try {
      const fee = await api.getClaimRewardsNetworkFee()
      commit(types.GET_FEE_SUCCESS, fee)
    } catch (error) {
      console.error(error)
      commit(types.GET_FEE_FAILURE, error)
    }
  },

  async getRewards ({ commit, state }, address) {
    commit(types.GET_REWARDS_REQUEST)
    try {
      const rewards = await api.checkExternalAccountRewards(address)

      commit(types.GET_REWARDS_SUCCESS, rewards)
    } catch (error) {
      console.error(error)
      commit(types.GET_REWARDS_FAILURE)
    }

    return state.rewards
  },

  async claimRewards (
    { commit, state, rootGetters }: { commit: any; state: RewardsState; rootGetters: any },
    { internalAddress = '', externalAddress = '' } = {}
  ) {
    if (!internalAddress || !externalAddress) return

    try {
      const web3 = await web3Util.getInstance()

      commit(types.SET_REWARDS_CLAIMING, true)
      commit(types.SET_TRANSACTION_ERROR, false)

      if (state.transactionStep === 1) {
        const internalAddressHex = await web3Util.accountAddressToHex(internalAddress)
        const message = web3.utils.sha3(internalAddressHex) as string

        const signature = await web3.eth.personal.sign(message, externalAddress, '')

        commit(types.SET_SIGNATURE, signature)
        commit(types.SET_TRANSACTION_STEP, 2)
      }
      if (state.transactionStep === 2 && state.signature) {
        await api.claimRewards(
          state.signature,
          externalAddress,
          state.fee,
          state.rewards
        )

        // update ui to success state if user not changed external account
        if (rootGetters['web3/ethAddress'] === externalAddress) {
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
