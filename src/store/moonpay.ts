import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'

import { MoonpayApi } from '@/utils/moonpay'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_POLLING_TIMESTAMP',
    'SET_DIALOG_VISIBILITY'
  ]),
  map(x => [x, x]),
  fromPairs
)([
  'UPDATE_TRANSACTIONS'
])

const POLLING_INTERVAL = 5 * 1000

interface MoonpayState {
  api: MoonpayApi;
  dialogVisibility: boolean;
  pollingTimestamp: number;
  transactions: Array<any>;
  transactionsFetching: boolean;
}

function initialState (): MoonpayState {
  return {
    api: new MoonpayApi(),
    dialogVisibility: false,
    pollingTimestamp: 0,
    transactions: [],
    transactionsFetching: false
  }
}

const state = initialState()

const getters = {
  lastCompletedTransaction (state: MoonpayState) {
    if (state.pollingTimestamp === 0) return undefined

    return state.transactions.find(tx => Date.parse(tx.createdAt) >= state.pollingTimestamp && tx.status === 'completed')
  }
}

const mutations = {
  [types.SET_POLLING_TIMESTAMP] (state: MoonpayState, timestamp: number) {
    state.pollingTimestamp = timestamp
  },
  [types.SET_DIALOG_VISIBILITY] (state, flag: boolean) {
    state.dialogVisibility = flag
  },
  [types.UPDATE_TRANSACTIONS_REQUEST] (state: MoonpayState, clearTransactions: boolean) {
    if (clearTransactions) {
      state.transactions = []
    }
    state.transactionsFetching = true
  },
  [types.UPDATE_TRANSACTIONS_SUCCESS] (state: MoonpayState, transactions: Array<any>) {
    state.transactions = [...transactions]
    state.transactionsFetching = false
  },
  [types.UPDATE_TRANSACTIONS_FAILURE] (state: MoonpayState) {
    state.transactions = []
    state.transactionsFetching = false
  }
}

const actions = {
  setDialogVisibility ({ commit }, flag: boolean) {
    commit(types.SET_DIALOG_VISIBILITY, flag)
  },

  updatePollingTimestamp ({ commit }, timestamp = Date.now()) {
    commit(types.SET_POLLING_TIMESTAMP, timestamp)
  },

  async getTransactions ({ commit, state, rootGetters }, clearTransactions = false) {
    if (!rootGetters.isLoggedIn || state.transactionsFetching || !state.api.publicKey) return

    commit(types.UPDATE_TRANSACTIONS_REQUEST, clearTransactions)

    try {
      console.log('getTransactions')
      const transactions = await state.api.getTransactionsByExtId(rootGetters.account.address)
      commit(types.UPDATE_TRANSACTIONS_SUCCESS, transactions)
    } catch (error) {
      console.error(error)
      commit(types.UPDATE_TRANSACTIONS_FAILURE)
    }
  },

  createTransactionsPolling ({ dispatch }) {
    dispatch('updatePollingTimestamp')

    let polling: NodeJS.Timeout | null = setInterval(() => dispatch('getTransactions'), POLLING_INTERVAL)

    const stopPolling = () => {
      if (polling !== null) {
        clearInterval(polling)
        dispatch('updatePollingTimestamp', 0)
        polling = null
      }
    }

    return stopPolling
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
