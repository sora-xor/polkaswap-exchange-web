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

    console.log(state.transactions)

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
      // to check bridge init with mock data
      // const testTransactions = [
      //   {
      //     cryptoTransactionId: '0x67fbede96e58033fdf4656b5a6f2ed14c6a6b18ffd944e4d8e5b37848a45f307',
      //     createdAt: (new Date(Date.now())).toISOString(),
      //     status: 'completed'
      //   }
      // ]
      // commit(types.UPDATE_TRANSACTIONS_SUCCESS, testTransactions)
      const transactions = await state.api.getTransactionsByExtId(rootGetters.account.address)
      console.log(transactions)
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
      console.log('getTransactionTranserData')
      const confirmations = 1
      const timeout = 0
      const ethersInstance = await ethersUtil.getEthersInstance()

      console.log('start wait')

      // wait until transaction complete
      // ISSUE: moonpay sending eth in ropsten, erc20 in rinkeby
      await ethersInstance.waitForTransaction(
        hash,
        confirmations,
        timeout
      )

      console.log('end wait')

      const tx = await ethersInstance.getTransaction(hash)

      console.log('tx', tx)

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
