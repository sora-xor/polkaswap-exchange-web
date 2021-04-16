import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { connection } from '@soramitsu/soraneo-wallet-web'

import storage from '@/utils/storage'
import { DefaultSlippageTolerance, DefaultMarketAlgorithm, LiquiditySourceForMarketAlgorithm } from '@/consts'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_SLIPPAGE_TOLERANCE',
    'SET_MARKET_ALGORITHM',
    'SET_TRANSACTION_DEADLINE',
    'SET_FAUCET_URL',
    'SET_SORA_NETWORK',
    'SET_DEFAULT_NODES',
    'SET_NODE'
  ]),
  map(x => [x, x]),
  fromPairs
)([])

function initialState () {
  return {
    soraNetwork: '',
    slippageTolerance: storage.get('slippageTolerance') || DefaultSlippageTolerance,
    marketAlgorithm: storage.get('marketAlgorithm') || DefaultMarketAlgorithm,
    transactionDeadline: Number(storage.get('transactionDeadline')) || 20,
    node: {},
    defaultNodes: [],
    faucetUrl: ''
  }
}

const state = initialState()

const getters = {
  node (state) {
    return state.node
  },
  defaultNodes (state) {
    return state.defaultNodes
  },
  soraNetwork (state) {
    return state.soraNetwork
  },
  slippageTolerance (state) {
    return state.slippageTolerance
  },
  transactionDeadline (state) {
    return state.transactionDeadline
  },
  faucetUrl (state) {
    return state.faucetUrl
  },
  liquiditySource (state) {
    return LiquiditySourceForMarketAlgorithm[state.marketAlgorithm]
  }
}

const mutations = {
  [types.SET_NODE] (state, node = {}) {
    state.node = { ...node }
  },
  [types.SET_DEFAULT_NODES] (state, nodes) {
    state.defaultNodes = [...nodes]
  },
  [types.SET_SORA_NETWORK] (state, value) {
    state.soraNetwork = value
  },
  [types.SET_SLIPPAGE_TOLERANCE] (state, value) {
    state.slippageTolerance = value
    storage.set('slippageTolerance', value)
  },
  [types.SET_MARKET_ALGORITHM] (state, value) {
    state.marketAlgorithm = value
    storage.set('marketAlgorithm', value)
  },
  [types.SET_TRANSACTION_DEADLINE] (state, value) {
    state.transactionDeadline = value
    storage.set('transactionDeadline', value)
  },
  [types.SET_FAUCET_URL] (state, url) {
    state.faucetUrl = url
  }
}

const actions = {
  async setNode ({ commit, dispatch }, node) {
    const endpoint = node?.address ?? ''

    if (!endpoint) {
      throw new Error('node address is not set')
    }

    commit(types.SET_NODE, node)

    if (!connection.endpoint) {
      connection.endpoint = endpoint
    } else {
      await connection.restart(endpoint)
      // to update subscription
      dispatch('updateAccountAssets', undefined, { root: true })
    }
  },
  setDefaultNodes ({ commit }, nodes) {
    commit(types.SET_DEFAULT_NODES, nodes)
  },
  setSoraNetwork ({ commit }, data) {
    if (!data.NETWORK_TYPE) {
      throw new Error('NETWORK_TYPE is not set')
    }
    commit(types.SET_SORA_NETWORK, data.NETWORK_TYPE)
  },
  setSlippageTolerance ({ commit }, value) {
    commit(types.SET_SLIPPAGE_TOLERANCE, value)
  },
  setMarketAlgorithm ({ commit }, value = DefaultMarketAlgorithm) {
    commit(types.SET_MARKET_ALGORITHM, value)
  },
  setTransactionDeadline ({ commit }, value) {
    commit(types.SET_TRANSACTION_DEADLINE, Number(value))
  },
  setFaucetUrl ({ commit }, url) {
    commit(types.SET_FAUCET_URL, url)
  }
}

export default {
  types,
  state,
  getters,
  mutations,
  actions
}
