import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import type { Subscription } from '@polkadot/x-rxjs'
import { api } from '@soramitsu/soraneo-wallet-web'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_ACCOUNT_LIQUIDITY_LIST',
    'SET_ACCOUNT_LIQUIDITY_UPDATES',
    'SET_ACCOUNT_LIQUIDITY'
  ]),
  map(x => [x, x]),
  fromPairs
)([])

interface PoolState {
  accountLiquidity: [];
  accountLiquidityList: Nullable<Subscription>;
  accountLiquidityUpdates: Nullable<any>;
}

function initialState (): PoolState {
  return {
    accountLiquidity: [],
    accountLiquidityList: null,
    accountLiquidityUpdates: null
  }
}

const state = initialState()

const getters = {
  accountLiquidity (state: PoolState) {
    return state.accountLiquidity
  }
}

const mutations = {
  [types.SET_ACCOUNT_LIQUIDITY_LIST] (state: PoolState, subscription) {
    state.accountLiquidityList = subscription
  },
  [types.SET_ACCOUNT_LIQUIDITY_UPDATES] (state: PoolState, subscription) {
    state.accountLiquidityUpdates = subscription
  },
  [types.SET_ACCOUNT_LIQUIDITY] (state: PoolState, liquidity) {
    state.accountLiquidity = []
    state.accountLiquidity = liquidity
  }
}

const actions = {
  subscribeOnAccountLiquidityList ({ commit }) {
    commit(types.SET_ACCOUNT_LIQUIDITY_LIST, api.getUserPoolsSubscription())
  },
  subscribeOnAccountLiquidityUpdates ({ commit }) {
    commit(
      types.SET_ACCOUNT_LIQUIDITY_UPDATES,
      api.liquidityUpdated.subscribe(() => {
        commit(types.SET_ACCOUNT_LIQUIDITY, api.accountLiquidity)
      })
    )
  },
  unsubscribeAccountLiquidityListAndUpdates ({ commit, state: PoolState }) {
    if (state.accountLiquidityList !== null && state.accountLiquidityList !== undefined) {
      state.accountLiquidityList.unsubscribe()
    }
    if (state.accountLiquidityUpdates !== null) {
      state.accountLiquidityUpdates.unsubscribe()
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
