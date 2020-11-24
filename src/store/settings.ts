import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'

import * as storage from '@/utils/storage'

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
    slippageTolerance: Number(storage.getItem('slippageTolerance')) || 0.5,
    transactionDeadline: Number(storage.getItem('transactionDeadline')) || 20,
    nodeAddressIp: storage.getItem('nodeAddress.ip') || '192.168.0.0.1',
    nodeAddressPort: storage.getItem('nodeAddress.port') || 2
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
      state.slippageTolerance = 0.5
      storage.setItem('slippageTolerance', 0.5)
    } else {
      state.slippageTolerance = value
      storage.setItem('slippageTolerance', value)
    }
  },
  [types.SET_TRANSACTION_DEADLINE] (state, value) {
    state.transactionDeadline = value
    storage.setItem('transactionDeadline', value)
  }
}

const actions = {
  setSlippageTolerance ({ commit }, { value }) {
    commit(types.SET_SLIPPAGE_TOLERANCE, Number(value))
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
