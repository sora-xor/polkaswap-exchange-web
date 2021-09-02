import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { ethers } from 'ethers'
import { FPNumber, RegisteredAccountAsset } from '@sora-substrate/util'

import { MoonpayApi, MoonpayEVMTransferAssetData } from '@/utils/moonpay'
import ethersUtil from '@/utils/ethers-util'
import { EthAddress } from '@/consts'
import { MoonpayDialogState } from '@/components/Moonpay/consts'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_POLLING_TIMESTAMP',
    'SET_DIALOG_VISIBILITY',
    'SET_DIALOG_STATE'
  ]),
  map(x => [x, x]),
  fromPairs
)([
  'UPDATE_TRANSACTIONS',
  'GET_CURRENCIES'
])

const POLLING_INTERVAL = 5 * 1000

interface MoonpayState {
  api: MoonpayApi;
  dialogVisibility: boolean;
  dialogState: MoonpayDialogState;
  pollingTimestamp: number;
  transactions: Array<any>;
  transactionsFetching: boolean;
  currencies: Array<any>;
}

function initialState (): MoonpayState {
  return {
    api: new MoonpayApi(),
    dialogVisibility: false,
    dialogState: MoonpayDialogState.Purchase,
    pollingTimestamp: 0,
    transactions: [],
    transactionsFetching: false,
    currencies: []
  }
}

const state = initialState()

const getters = {
  lastCompletedTransaction (state: MoonpayState) {
    if (state.pollingTimestamp === 0) return undefined

    return state.transactions.find(tx => Date.parse(tx.createdAt) >= state.pollingTimestamp && tx.status === 'completed')
  },
  currenciesById (state: MoonpayState) {
    return state.currencies.reduce((result, item) => ({
      ...result,
      [item.id]: item
    }), {})
  }
}

const mutations = {
  [types.SET_POLLING_TIMESTAMP] (state: MoonpayState, timestamp: number) {
    state.pollingTimestamp = timestamp
  },
  [types.SET_DIALOG_VISIBILITY] (state, flag: boolean) {
    state.dialogVisibility = flag
  },
  [types.SET_DIALOG_STATE] (state, value: MoonpayDialogState) {
    state.dialogState = value
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
  },
  [types.GET_CURRENCIES_REQUEST] (state: MoonpayState) {
    state.currencies = []
  },
  [types.GET_CURRENCIES_SUCCESS] (state: MoonpayState, currencies: Array<any>) {
    state.currencies = [...currencies]
  },
  [types.GET_CURRENCIES_FAILURE] (state: MoonpayState) {
    state.currencies = []
  }
}

const actions = {
  setDialogVisibility ({ commit }, flag: boolean) {
    commit(types.SET_DIALOG_VISIBILITY, flag)
  },

  setDialogState ({ commit }, value: MoonpayDialogState) {
    commit(types.SET_DIALOG_STATE, value)
  },

  updatePollingTimestamp ({ commit }, timestamp = Date.now()) {
    commit(types.SET_POLLING_TIMESTAMP, timestamp)
  },

  async getCurrencies ({ commit, state }) {
    commit(types.GET_CURRENCIES_REQUEST)

    try {
      const currencies = await state.api.getCurrencies()
      commit(types.GET_CURRENCIES_SUCCESS, currencies)
    } catch (error) {
      console.error(error)
      commit(types.GET_CURRENCIES_FAILURE)
    }
  },

  async getTransactions ({ commit, state, rootGetters }, clearTransactions = false) {
    if (!rootGetters.isLoggedIn || state.transactionsFetching || !state.api.publicKey) return

    commit(types.UPDATE_TRANSACTIONS_REQUEST, clearTransactions)

    try {
      const transactions = await state.api.getTransactionsByExtId(rootGetters.account.address)
      console.info('Moonpay: user transactions request')
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
  },

  async getTransactionTranserData (_, hash: string): Promise<Nullable<MoonpayEVMTransferAssetData>> {
    try {
      const confirmations = 1
      const timeout = 0
      const ethersInstance = await ethersUtil.getEthersInstance()

      console.info(`Moonpay: found latest moonpay transaction.\nChecking ethereum transaction by hash:\n${hash}`)

      // wait until transaction complete
      // ISSUE: moonpay sending eth in ropsten, erc20 in rinkeby
      await ethersInstance.waitForTransaction(
        hash,
        confirmations,
        timeout
      )

      const tx = await ethersInstance.getTransaction(hash)

      console.info('Moonpay: ethereum transaction data recieved:', tx)

      if (tx.data === '0x') {
        // Parse ETH transfer
        const { to = '', value } = tx
        const amount = new FPNumber(value as any).toString() // transferred amount
        const address = EthAddress

        return {
          amount,
          address,
          to
        }
      } else {
        // Parse ERC-20 transfer
        const abi = ['function transfer(address to, uint256 value)']
        const inter = new ethers.utils.Interface(abi)
        const decodedInput = inter.parseTransaction({ data: tx.data })
        const address = tx.to ?? '' // asset address
        const {
          value, // BigNumber
          to = '' // ethereum address
        } = decodedInput.args
        const amount = new FPNumber(value).toString() // transferred amount

        return {
          amount,
          address,
          to
        }
      }
    } catch (error) {
      console.error(error)
      return null
    }
  },

  async findRegisteredAssetByExternalAddress ({ dispatch, rootGetters }, externalAddress: string): Promise<Nullable<RegisteredAccountAsset>> {
    if (!externalAddress) return undefined

    await dispatch('assets/updateRegisteredAssets', undefined, { root: true })

    const registeredAssets = rootGetters['assets/registeredAssets']
    const searchAddress = externalAddress.toLowerCase()
    const asset = registeredAssets.find(asset => asset.externalAddress.toLowerCase() === searchAddress)

    return asset
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
