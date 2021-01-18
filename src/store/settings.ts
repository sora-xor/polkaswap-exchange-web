import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'

import storage from '@/utils/storage'

const defaultSlippageTolerance = 0.5
const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_SLIPPAGE_TOLERANCE',
    'SET_TRANSACTION_DEADLINE'
  ]),
  map(x => [x, x]),
  fromPairs
)([])

function initialState () {
  return {
    slippageTolerance: storage.get('slippageTolerance') || defaultSlippageTolerance,
    transactionDeadline: Number(storage.get('transactionDeadline')) || 20,
    nodeAddressIp: storage.get('nodeAddress.ip') || '192.168.0.0.1',
    nodeAddressPort: storage.get('nodeAddress.port') || 2
  }
}

const state = initialState()

const getters = {
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
  }
}

const mutations = {
  [types.SET_SLIPPAGE_TOLERANCE] (state, value) {
    if (!value) {
      state.slippageTolerance = defaultSlippageTolerance
      storage.set('slippageTolerance', defaultSlippageTolerance)
    } else {
      state.slippageTolerance = value
      storage.set('slippageTolerance', value)
    }
  },
  [types.SET_TRANSACTION_DEADLINE] (state, value) {
    state.transactionDeadline = value
    storage.set('transactionDeadline', value)
  }
}

const actions = {
  setSlippageTolerance ({ commit }, { value }) {
    commit(types.SET_SLIPPAGE_TOLERANCE, value)
  },
  setTransactionDeadline ({ commit }, { value }) {
    commit(types.SET_TRANSACTION_DEADLINE, Number(value))
  }
}

export default {
  types,
  state,
  getters,
  mutations,
  actions
}
