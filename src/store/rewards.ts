import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { api } from '@soramitsu/soraneo-wallet-web'
import { FPNumber, CodecString, KnownSymbols, KnownAssets } from '@sora-substrate/util'

export interface Reward {
  symbol: string; // address
  amount: number;
  title?: string;
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
  rewardsChecked (state) {
    return !state.rewardsFetching && Array.isArray(state.rewards)
  },
  rewardsAvailable (state) {
    return Array.isArray(state.rewards) && state.rewards.length !== 0
  },
  rewardsByAssetsList (state, getters) {
    if (!getters.rewardsAvailable) {
      return [
        {
          symbol: KnownSymbols.PSWAP,
          amount: '-'
        },
        {
          symbol: KnownSymbols.VAL,
          amount: '-'
        }
      ]
    }

    const rewardsHash = state.rewards.reduce((result, { asset, amount }) => {
      const { address, decimals } = asset
      const current = result[address] || new FPNumber(0, decimals)
      const addValue = FPNumber.fromCodecValue(amount, decimals)

      result[address] = current.add(addValue)

      return result
    }, {})

    return Object.entries(rewardsHash).reduce((total, [address, amount]) => {
      if (amount.isZero()) return total

      total.push({
        symbol: KnownAssets.get(address).symbol,
        amount: amount.format()
      })

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

  async getRewards ({ commit }) {
    commit(types.GET_REWARDS_REQUEST)
    try {
      const [xorERC20, farm, nft] = await api.api.rpc.rewards.claimables('0x21Bc9f4a3d9Dc86f142F802668dB7D908cF0A636')

      const valAsset = KnownAssets.get(KnownSymbols.VAL)
      const pswapAsset = KnownAssets.get(KnownSymbols.PSWAP)

      const rewards = [
        {
          asset: pswapAsset,
          amount: new FPNumber(farm, pswapAsset.decimals).toCodecString()
        },
        {
          asset: KnownAssets.get(KnownSymbols.PSWAP),
          amount: new FPNumber(nft, pswapAsset.decimals).toCodecString()
        },
        {
          asset: KnownAssets.get(KnownSymbols.VAL),
          amount: new FPNumber(xorERC20, valAsset.decimals).toCodecString()
        }
      ]

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
