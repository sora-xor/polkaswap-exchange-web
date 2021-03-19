import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { api } from '@soramitsu/soraneo-wallet-web'

const mockRewards = [
  {
    title: 'SORA.farm harvest',
    amount: 12137.1304,
    symbol: 'PSWAP'
  },
  {
    title: 'NFT Airdrop',
    amount: 442.450,
    symbol: 'PSWAP'
  },
  {
    title: 'XOR ERC-20',
    amount: 234.1322,
    symbol: 'VAL'
  }
]

export interface Reward {
  symbol: string;
  amount: number;
  title?: string;
}

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'RESET',
    'SET_TRANSACTION_STEP'
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
  rewardsChecked (state) {
    return !state.rewardsFetching && Array.isArray(state.rewards)
  },
  rewardsAvailable (state) {
    return Array.isArray(state.rewards) && state.rewards.length !== 0
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

  async getRewards ({ commit }) {
    commit(types.GET_REWARDS_REQUEST)
    try {
      const rewards = await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() < 0.5) {
            resolve(mockRewards)
          } else {
            reject(new Error())
          }
        }, 3000)
      })

      commit(types.GET_REWARDS_SUCCESS, rewards)
    } catch (error) {
      commit(types.GET_REWARDS_FAILURE)
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
