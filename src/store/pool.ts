import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { api } from '@soramitsu/soraneo-wallet-web'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'USER_POOLS_SUBSCRIPTION',
    'LIQUIDITY_UPDATE_SUBSCRIPTION',
    'ACCOUNT_LIQUIDITY'
  ]),
  map(x => [x, x]),
  fromPairs
)([])

function initialState () {
  return {
    accountLiquidity: [],
    userPoolsSubscription: null,
    liquidityUpdateSubscription: null
  }
}

const state = initialState()

const getters = {
  accountLiquidity (state) {
    return state.accountLiquidity
  }
}

const mutations = {
  [types.USER_POOLS_SUBSCRIPTION] (state, subscription) {
    state.userPoolsSubscription = subscription
  },
  [types.LIQUIDITY_UPDATE_SUBSCRIPTION] (state, subscription) {
    state.liquidityUpdateSubscription = subscription
  },
  [types.ACCOUNT_LIQUIDITY] (state, liquidity) {
    state.accountLiquidity = liquidity
  }
}

const actions = {
  subscribeUserPoolsSubscription ({ commit }) {
    commit(types.USER_POOLS_SUBSCRIPTION, api.getUserPoolsSubscription())
  },
  subscribeLiquidityUpdateSubscription ({ commit }) {
    commit(
      types.LIQUIDITY_UPDATE_SUBSCRIPTION,
      api.liquidityUpdated.subscribe(() => {
        commit(types.ACCOUNT_LIQUIDITY, api.accountLiquidity)
      })
    )
  },
  unsubscribePoolAndLiquidityUpdate ({ commit, state }) {
    if (state.userPoolsSubscription !== null) {
      state.userPoolsSubscription.unsubscribe()
    }
    if (state.liquidityUpdateSubscription !== null) {
      state.liquidityUpdateSubscription.unsubscribe()
    }
    api.unsubscribeFromAllLiquidityUpdates()
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
