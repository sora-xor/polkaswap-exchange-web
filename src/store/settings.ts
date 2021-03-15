import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { connection } from '@soramitsu/soraneo-wallet-web'

import storage from '@/utils/storage'

const defaultSlippageTolerance = 0.5
const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_SLIPPAGE_TOLERANCE',
    'SET_TRANSACTION_DEADLINE',
    'SET_FAUCET_URL',
    'SET_SORA_NETWORK'
  ]),
  map(x => [x, x]),
  fromPairs
)([])

function initialState () {
  return {
    soraNetwork: '',
    slippageTolerance: storage.get('slippageTolerance') || defaultSlippageTolerance,
    transactionDeadline: Number(storage.get('transactionDeadline')) || 20,
    nodeAddressIp: storage.get('nodeAddress.ip') || '192.168.0.0.1',
    nodeAddressPort: storage.get('nodeAddress.port') || 2,
    faucetUrl: ''
  }
}

const state = initialState()

const getters = {
  soraNetwork (state) {
    return state.soraNetwork
  },
  slippageTolerance (state) {
    return state.slippageTolerance
  },
  transactionDeadline (state) {
    return state.transactionDeadline
  },
  nodeAddress (state) {
    return {
      ip: state.nodeAddressIp,
      port: state.nodeAddressPort
    }
  },
  faucetUrl (state) {
    return state.faucetUrl
  }
}

const mutations = {
  [types.SET_SORA_NETWORK] (state, value) {
    state.soraNetwork = value
  },
  [types.SET_SLIPPAGE_TOLERANCE] (state, value) {
    state.slippageTolerance = value
    storage.set('slippageTolerance', value)
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
  setSoraNetwork ({ commit }, data) {
    connection.endpoint = data.DEFAULT_NETWORKS?.length ? data.DEFAULT_NETWORKS[0].address : ''
    if (!connection.endpoint) {
      throw new Error('DEFAULT_NETWORK is not set')
    }
    if (!data.NETWORK_TYPE) {
      throw new Error('NETWORK_TYPE is not set')
    }
    commit(types.SET_SORA_NETWORK, data.NETWORK_TYPE)
  },
  setSlippageTolerance ({ commit }, value) {
    commit(types.SET_SLIPPAGE_TOLERANCE, value)
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
