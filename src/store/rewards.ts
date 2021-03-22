import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { api } from '@soramitsu/soraneo-wallet-web'
import { FPNumber, KnownSymbols, KnownAssets, RewardInfo } from '@sora-substrate/util'

export interface RewardAmountSymbol {
  amount?: string;
  symbol: KnownSymbols;
}

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'RESET',
    'SET_TRANSACTION_STEP',
    'SET_REWARDS_CLAIMING'
  ]),
  map(x => [x, x]),
  fromPairs
)([
  'GET_REWARDS'
])

function initialState () {
  return {
    rewards: null,
    rewardsFetching: false,
    rewardsClaiming: false,
    transactionStep: 0,
    transactionStepsCount: 2
  }
}

const state = initialState()

const getters = {
  rewardsChecked (state): boolean {
    return !state.rewardsFetching && Array.isArray(state.rewards)
  },
  claimableRewards (state): Array<RewardInfo> {
    if (!Array.isArray(state.rewards)) {
      return []
    }

    return state.rewards.reduce((claimableList: Array<RewardInfo>, item: RewardInfo) => {
      if (FPNumber.fromCodecValue(item.amount, item.asset.decimals).isZero()) return claimableList

      claimableList.push(item)

      return claimableList
    }, [])
  },
  rewardsAvailable (state, getters): boolean {
    return getters.claimableRewards.length !== 0
  },
  rewardsByAssetsList (state, getters): Array<RewardAmountSymbol> {
    if (!getters.claimableRewards.length) {
      return [
        {
          symbol: KnownSymbols.PSWAP,
          amount: undefined
        } as RewardAmountSymbol,
        {
          symbol: KnownSymbols.VAL,
          amount: undefined
        } as RewardAmountSymbol
      ]
    }

    const rewardsHash = getters.claimableRewards.reduce((result, { asset, amount }: RewardInfo) => {
      const { address, decimals } = asset
      const current = result[address] || new FPNumber(0, decimals)
      const addValue = FPNumber.fromCodecValue(amount, decimals)

      result[address] = current.add(addValue)

      return result
    }, {})

    return Object.entries(rewardsHash).reduce((total: Array<RewardAmountSymbol>, [address, amount]) => {
      if ((amount as FPNumber).isZero()) return total

      const item = {
        symbol: KnownAssets.get(address).symbol,
        amount: (amount as FPNumber).format()
      } as RewardAmountSymbol

      total.push(item)

      return total
    }, [])
  }
}

const mutations = {
  [types.RESET] (state) {
    const s = initialState()

    Object.keys(s).forEach(key => {
      state[key] = s[key]
    })
  },

  [types.SET_TRANSACTION_STEP] (state, transactionStep: number) {
    state.transactionStep = transactionStep
  },
  [types.SET_REWARDS_CLAIMING] (state, flag: boolean) {
    state.rewardsClaiming = flag
  },

  [types.GET_REWARDS_REQUEST] (state) {
    state.rewards = null
    state.rewardsFetching = true
  },
  [types.GET_REWARDS_SUCCESS] (state, rewards) {
    state.rewards = rewards
    state.rewardsFetching = false
  },
  [types.GET_REWARDS_FAILURE] (state) {
    state.rewards = []
    state.rewardsFetching = false
  }
}

const actions = {
  reset ({ commit }) {
    commit(types.RESET)
  },

  setTransactionStep ({ commit }, transactionStep: number) {
    commit(types.SET_TRANSACTION_STEP, transactionStep)
  },

  async getRewards ({ commit }, address) {
    commit(types.GET_REWARDS_REQUEST)
    try {
      const rewards = await api.checkExternalAccountRewards(address)

      commit(types.GET_REWARDS_SUCCESS, rewards)
    } catch (error) {
      console.log(error)
      commit(types.GET_REWARDS_FAILURE)
    }
  },

  claimRewards ({ commit }) {
    commit(types.SET_REWARDS_CLAIMING, true)
    try {

    } catch (error) {

    } finally {
      commit(types.SET_REWARDS_CLAIMING, false)
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
