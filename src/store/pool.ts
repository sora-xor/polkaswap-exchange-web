import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { api } from '@soramitsu/soraneo-wallet-web'
import type { Subscription } from '@polkadot/x-rxjs'
import type { AccountLiquidity } from '@sora-substrate/util'

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
  [types.SET_ACCOUNT_LIQUIDITY_UPDATES] (state: PoolState, subscription: Subscription) {
    state.accountLiquidityUpdates = subscription
  },
  [types.SET_ACCOUNT_LIQUIDITY] (state: PoolState, liquidity: Array<AccountLiquidity>) {
    state.accountLiquidity = [...liquidity]
  }
}

const actions = {
  async subscribeOnAccountLiquidityList ({ commit }) {
    const userPoolsSubscription = await api.getUserPoolsSubscription()
    commit(types.SET_ACCOUNT_LIQUIDITY_LIST, userPoolsSubscription)
  },
  subscribeOnAccountLiquidityUpdates ({ commit }) {
    const liquidityUpdatedSubscription = api.liquidityUpdated.subscribe(() => {
      commit(types.SET_ACCOUNT_LIQUIDITY, api.accountLiquidity)
    })
    commit(types.SET_ACCOUNT_LIQUIDITY_UPDATES, liquidityUpdatedSubscription)
  },
  unsubscribeAccountLiquidityListAndUpdates ({ commit }) {
    if (state.accountLiquidityList) {
      state.accountLiquidityList.unsubscribe()
    }
    if (state.accountLiquidityUpdates) {
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
