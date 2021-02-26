import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import { api } from '@soramitsu/soraneo-wallet-web'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  map(x => [x, x]),
  fromPairs
)([
  'GET_PRICE',
  'GET_PRICE_REVERSED'
])

function initialState () {
  return {
    price: 0,
    priceReversed: 0
  }
}

const state = initialState()

const getters = {
  price (state) {
    return state.price
  },
  priceReversed (state) {
    return state.priceReversed
  }
}

const mutations = {
  [types.GET_PRICE_REQUEST] (state) {
    state.price = 0
  },
  [types.GET_PRICE_SUCCESS] (state, price: string | number) {
    state.price = price
  },
  [types.GET_PRICE_FAILURE] (state, error) {
    state.price = 0
  },
  [types.GET_PRICE_REVERSED_REQUEST] (state) {
    state.priceReversed = 0
  },
  [types.GET_PRICE_REVERSED_SUCCESS] (state, priceReversed: string | number) {
    state.priceReversed = priceReversed
  },
  [types.GET_PRICE_REVERSED_FAILURE] (state, error) {
    state.priceReversed = 0
  }
}

const actions = {
  async getPrices ({ commit }, payload) {
    if (payload && payload.assetAAddress && payload.assetBAddress && payload.amountA && payload.amountB) {
      commit(types.GET_PRICE_REQUEST)
      commit(types.GET_PRICE_REVERSED_REQUEST)
      try {
        const price = await api.divideAssets(payload.assetAAddress, payload.assetBAddress, payload.amountA, payload.amountB, false)
        commit(types.GET_PRICE_SUCCESS, price)
        const priceReversed = await api.divideAssets(payload.assetAAddress, payload.assetBAddress, payload.amountA, payload.amountB, true)
        commit(types.GET_PRICE_REVERSED_SUCCESS, priceReversed)
      } catch (error) {
        commit(types.GET_PRICE_FAILURE, error)
        commit(types.GET_PRICE_REVERSED_FAILURE, error)
      }
    } else {
      commit(types.GET_PRICE_SUCCESS, 0)
      commit(types.GET_PRICE_REVERSED_SUCCESS, 0)
    }
  },
  resetPrices ({ commit }) {
    commit(types.GET_PRICE_SUCCESS, 0)
    commit(types.GET_PRICE_REVERSED_SUCCESS, 0)
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
