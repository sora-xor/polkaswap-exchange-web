import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { api } from '@soramitsu/soraneo-wallet-web'
import type { Subscription } from '@polkadot/x-rxjs'
import type { AccountLiquidity } from '@sora-substrate/util'

import { delay } from '@/utils'

const waitForAccountPair = async (func: Function): Promise<any> => {
  if (!api.accountPair) {
    await delay()
    return await waitForAccountPair(func)
  } else {
    return await func()
  }
}

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_ACCOUNT_LIQUIDITY_LIST',
    'SET_ACCOUNT_LIQUIDITY_UPDATES',
    'RESET_ACCOUNT_LIQUIDITY_LIST',
    'RESET_ACCOUNT_LIQUIDITY_UPDATES',
    'SET_ACCOUNT_LIQUIDITY'
  ]),
  map(x => [x, x]),
  fromPairs
)([])

interface PoolState {
  accountLiquidity: Array<AccountLiquidity>;
  accountLiquidityList: Nullable<Subscription>;
  accountLiquidityUpdates: Nullable<Subscription>;
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
  accountLiquidity (state: PoolState): Array<AccountLiquidity> {
    return state.accountLiquidity
  }
}

const mutations = {
  [types.SET_ACCOUNT_LIQUIDITY_LIST] (state: PoolState, subscription: Subscription) {
    state.accountLiquidityList = subscription
  },
  [types.RESET_ACCOUNT_LIQUIDITY_LIST] (state: PoolState) {
    if (state.accountLiquidityList) {
      state.accountLiquidityList.unsubscribe()
    }
    state.accountLiquidityList = null
  },
  [types.SET_ACCOUNT_LIQUIDITY_UPDATES] (state: PoolState, subscription: Subscription) {
    state.accountLiquidityUpdates = subscription
  },
  [types.RESET_ACCOUNT_LIQUIDITY_UPDATES] (state: PoolState) {
    if (state.accountLiquidityUpdates) {
      state.accountLiquidityUpdates.unsubscribe()
    }
    state.accountLiquidityUpdates = null
  },
  [types.SET_ACCOUNT_LIQUIDITY] (state: PoolState, liquidity: Array<AccountLiquidity>) {
    state.accountLiquidity = [...liquidity] // update vuex state by creating new copy of array
  }
}

const actions = {
  async subscribeOnAccountLiquidityList ({ commit, rootGetters }) {
    commit(types.RESET_ACCOUNT_LIQUIDITY_LIST)

    if (!rootGetters.isLoggedIn) return

    await waitForAccountPair(() => {
      const userPoolsSubscription = api.getUserPoolsSubscription()
      commit(types.SET_ACCOUNT_LIQUIDITY_LIST, userPoolsSubscription)
    })
  },
  async subscribeOnAccountLiquidityUpdates ({ commit, rootGetters }) {
    commit(types.RESET_ACCOUNT_LIQUIDITY_UPDATES)

    if (!rootGetters.isLoggedIn) return

    await waitForAccountPair(() => {
      const liquidityUpdatedSubscription = api.liquidityUpdated.subscribe(() => {
        commit(types.SET_ACCOUNT_LIQUIDITY, api.accountLiquidity)
      })

      commit(types.SET_ACCOUNT_LIQUIDITY_UPDATES, liquidityUpdatedSubscription)
    })
  },
  unsubscribeAccountLiquidityListAndUpdates ({ commit }) {
    commit(types.RESET_ACCOUNT_LIQUIDITY_LIST)
    commit(types.RESET_ACCOUNT_LIQUIDITY_UPDATES)
    commit(types.SET_ACCOUNT_LIQUIDITY, []) // reset account liquidity
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
