import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import findLast from 'lodash/fp/findLast'
import { RegisteredAsset, AccountAsset, FPNumber, BridgeApprovedRequest, BridgeCurrencyType, BridgeTxStatus, BridgeRequest, Operation, isBridgeOperation, History, BridgeHistory, TransactionStatus } from '@sora-substrate/util'
import { api } from '@soramitsu/soraneo-wallet-web'
import { decodeAddress } from '@polkadot/util-crypto'

import { STATES } from '@/utils/fsm'
import web3Util, { KnownBridgeAsset, OtherContractType } from '@/utils/web3-util'
import { delay, findAssetInCollection } from '@/utils'
import { EthereumGasLimits, MaxUint256 } from '@/consts'

const SORA_REQUESTS_TIMEOUT = 5 * 1000

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_SORA_TO_ETHEREUM',
    'SET_ASSET_ADDRESS',
    'SET_AMOUNT',
    'SET_SORA_TOTAL',
    'SET_ETHEREUM_TOTAL',
    'SET_TRANSACTION_CONFIRM',
    'SET_SORA_TRANSACTION_HASH',
    'SET_SORA_TRANSACTION_DATE',
    'SET_ETHEREUM_TRANSACTION_HASH',
    'SET_ETHEREUM_TRANSACTION_DATE',
    'SET_INITIAL_TRANSACTION_STATE',
    'SET_CURRENT_TRANSACTION_STATE',
    'SET_TRANSACTION_STEP',
    'SET_HISTORY_ITEM'
  ]),
  map(x => [x, x]),
  fromPairs
)([
  'GET_HISTORY',
  'GET_SORA_NETWORK_FEE',
  'GET_ETHEREUM_NETWORK_FEE',
  'SEND_TRANSACTION',
  'RECEIVE_TRANSACTION'
])

async function waitForApprovedRequest (hash: string): Promise<BridgeApprovedRequest> {
  await delay(SORA_REQUESTS_TIMEOUT)
  const approvedRequest = await api.bridge.getApprovedRequest(hash)
  if (approvedRequest) {
    // If Completed -> Done
    return approvedRequest
  }
  const request = await api.bridge.getRequest(hash)
  if (!request) {
    return await waitForApprovedRequest(hash)
  }
  if ([BridgeTxStatus.Failed, BridgeTxStatus.Frozen].includes(request.status)) {
    // Set SORA_REJECTED
    throw new Error('Transaction was failed or canceled')
  }
  return await waitForApprovedRequest(hash)
  // Sora Pending
}

async function waitForRequest (hash: string): Promise<BridgeRequest> {
  await delay(SORA_REQUESTS_TIMEOUT)
  const request = await api.bridge.getRequest(hash)
  if (!request) {
    return await waitForRequest(hash)
  }
  switch (request.status) {
    case BridgeTxStatus.Failed:
    case BridgeTxStatus.Frozen:
      throw new Error('Transaction was failed or canceled')
    case BridgeTxStatus.Done:
      return request
  }
  return await waitForRequest(hash)
}

async function waitForExtrinsicFinalization (time: number): Promise<History> {
  const tx = findLast(
    item => Math.abs(Number(item.startTime) - time) < 1000,
    api.accountHistory
  )
  if (!tx || tx.status !== TransactionStatus.Finalized) {
    await delay(250)
    return await waitForExtrinsicFinalization(time)
  }

  return tx
}

function initialState () {
  return {
    isSoraToEthereum: true,
    assetAddress: '',
    amount: 0,
    soraNetworkFee: 0,
    ethereumNetworkFee: 0,
    soraTotal: 0,
    ethereumTotal: 0,
    isTransactionConfirmed: false,
    soraTransactionHash: '',
    ethereumTransactionHash: '',
    soraTransactionDate: '',
    ethereumTransactionDate: '',
    initialTransactionState: STATES.INITIAL,
    currentTransactionState: STATES.INITIAL,
    transactionStep: 1,
    history: [],
    historyItem: null
  }
}

const state = initialState()

const getters = {
  isSoraToEthereum (state) {
    return state.isSoraToEthereum
  },
  asset (state, getters, rootState, rootGetters) {
    return rootGetters['assets/getAssetDataByAddress'](state.assetAddress)
  },
  amount (state) {
    return state.amount
  },
  soraNetworkFee (state) {
    return state.soraNetworkFee
  },
  ethereumNetworkFee (state) {
    return state.ethereumNetworkFee
  },
  soraTotal (state) {
    return state.soraTotal
  },
  ethereumTotal (state) {
    return state.ethereumTotal
  },
  isTransactionConfirmed (state) {
    return state.isTransactionConfirmed
  },
  soraTransactionHash (state) {
    return state.soraTransactionHash
  },
  ethereumTransactionHash (state) {
    return state.ethereumTransactionHash
  },
  soraTransactionDate (state) {
    return state.soraTransactionDate
  },
  ethereumTransactionDate (state) {
    return state.ethereumTransactionDate
  },
  initialTransactionState (state) {
    return state.initialTransactionState
  },
  currentTransactionState (state) {
    return state.currentTransactionState
  },
  transactionStep (state) {
    return state.transactionStep
  },
  history (state) {
    return state.history
  },
  historyItem (state) {
    return state.historyItem
  }
}

const mutations = {
  [types.SET_SORA_TO_ETHEREUM] (state, isSoraToEthereum: boolean) {
    state.isSoraToEthereum = isSoraToEthereum
  },
  [types.SET_ASSET_ADDRESS] (state, address: string) {
    state.assetAddress = address
  },
  [types.SET_AMOUNT] (state, amount: string | number) {
    state.amount = amount
  },
  [types.GET_SORA_NETWORK_FEE_REQUEST] (state) {
  },
  [types.GET_SORA_NETWORK_FEE_SUCCESS] (state, fee) {
    state.soraNetworkFee = fee
  },
  [types.GET_SORA_NETWORK_FEE_FAILURE] (state) {
    state.soraNetworkFee = ''
  },
  [types.GET_ETHEREUM_NETWORK_FEE_REQUEST] (state) {
  },
  [types.GET_ETHEREUM_NETWORK_FEE_SUCCESS] (state, fee: string | number) {
    state.ethereumNetworkFee = fee
  },
  [types.GET_ETHEREUM_NETWORK_FEE_FAILURE] (state) {
    state.ethereumNetworkFee = ''
  },
  [types.SET_SORA_TOTAL] (state, soraTotal: string | number) {
    state.soraTotal = soraTotal
  },
  [types.SET_ETHEREUM_TOTAL] (state, ethereumTotal: string | number) {
    state.ethereumTotal = ethereumTotal
  },
  [types.SET_TRANSACTION_CONFIRM] (state, isTransactionConfirmed: boolean) {
    state.isTransactionConfirmed = isTransactionConfirmed
  },
  [types.SET_SORA_TRANSACTION_HASH] (state, soraTransactionHash: string) {
    state.soraTransactionHash = soraTransactionHash
  },
  [types.SET_ETHEREUM_TRANSACTION_HASH] (state, ethereumTransactionHash: string) {
    state.ethereumTransactionHash = ethereumTransactionHash
  },
  [types.SET_SORA_TRANSACTION_DATE] (state, soraTransactionDate: string) {
    state.soraTransactionDate = soraTransactionDate
  },
  [types.SET_ETHEREUM_TRANSACTION_DATE] (state, ethereumTransactionDate: string) {
    state.ethereumTransactionDate = ethereumTransactionDate
  },
  [types.SET_CURRENT_TRANSACTION_STATE] (state, currentTransactionState: STATES) {
    state.currentTransactionState = currentTransactionState
  },
  [types.SET_INITIAL_TRANSACTION_STATE] (state, initialTransactionState: STATES) {
    state.initialTransactionState = initialTransactionState
  },
  [types.SET_TRANSACTION_STEP] (state, transactionStep: number) {
    state.transactionStep = transactionStep
  },
  [types.GET_HISTORY_REQUEST] (state) {
    state.history = null
  },
  [types.GET_HISTORY_SUCCESS] (state, history: Array<any>) {
    state.history = history
  },
  [types.GET_HISTORY_FAILURE] (state) {
    state.history = null
  },
  [types.SET_HISTORY_ITEM] (state, historyItem: BridgeHistory | null) {
    state.historyItem = historyItem
  },
  [types.SEND_TRANSACTION_REQUEST] (state) {},
  [types.SEND_TRANSACTION_SUCCESS] (state) {},
  [types.SEND_TRANSACTION_FAILURE] (state) {},
  [types.RECEIVE_TRANSACTION_REQUEST] (state) {},
  [types.RECEIVE_TRANSACTION_SUCCESS] (state) {},
  [types.RECEIVE_TRANSACTION_FAILURE] (state) {}
}

const actions = {
  setSoraToEthereum ({ commit }, isSoraToEthereum: boolean) {
    commit(types.SET_SORA_TO_ETHEREUM, isSoraToEthereum)
  },
  setAssetAddress ({ commit }, address?: string) {
    commit(types.SET_ASSET_ADDRESS, address)
  },
  setAmount ({ commit }, amount: string | number) {
    commit(types.SET_AMOUNT, amount)
  },
  setSoraNetworkFee ({ commit }, soraNetworkFee: string) {
    commit(types.GET_SORA_NETWORK_FEE_SUCCESS, soraNetworkFee)
  },
  setEthereumNetworkFee ({ commit }, ethereumNetworkFee: string) {
    commit(types.GET_ETHEREUM_NETWORK_FEE_SUCCESS, ethereumNetworkFee)
  },
  getSoraTotal ({ commit }, soraTotal: string | number) {
    commit(types.SET_SORA_TOTAL, soraTotal)
  },
  getEthereumTotal ({ commit }, ethereumTotal: string | number) {
    commit(types.SET_ETHEREUM_TOTAL, ethereumTotal)
  },
  setTransactionConfirm ({ commit }, isTransactionConfirmed: boolean) {
    commit(types.SET_TRANSACTION_CONFIRM, isTransactionConfirmed)
  },
  setSoraTransactionHash ({ commit }, soraTransactionHash: string) {
    commit(types.SET_SORA_TRANSACTION_HASH, soraTransactionHash)
  },
  setEthereumTransactionHash ({ commit }, ethereumTransactionHash: string) {
    commit(types.SET_ETHEREUM_TRANSACTION_HASH, ethereumTransactionHash)
  },
  setSoraTransactionDate ({ commit }, soraTransactionDate: string) {
    commit(types.SET_SORA_TRANSACTION_DATE, soraTransactionDate)
  },
  setEthereumTransactionDate ({ commit }, ethereumTransactionDate: string) {
    commit(types.SET_ETHEREUM_TRANSACTION_DATE, ethereumTransactionDate)
  },
  setCurrentTransactionState ({ commit }, currentTransactionState: STATES) {
    commit(types.SET_CURRENT_TRANSACTION_STATE, currentTransactionState)
  },
  setInitialTransactionState ({ commit }, initialTransactionState: STATES) {
    commit(types.SET_INITIAL_TRANSACTION_STATE, initialTransactionState)
  },
  setTransactionStep ({ commit }, transactionStep: number) {
    commit(types.SET_TRANSACTION_STEP, transactionStep)
  },
  resetBridgeForm ({ dispatch }) {
    dispatch('setSoraToEthereum', true)
    dispatch('setAssetAddress', '')
    dispatch('setTransactionConfirm', false)
    dispatch('setCurrentTransactionState', STATES.INITIAL)
    dispatch('setSoraTransactionDate', '')
    dispatch('setSoraTransactionHash', '')
    dispatch('setEthereumTransactionDate', '')
    dispatch('setEthereumTransactionHash', '')
  },
  async getHistory ({ commit }) {
    commit(types.GET_HISTORY_REQUEST)
    try {
      commit(types.GET_HISTORY_SUCCESS, api.accountHistory)
    } catch (error) {
      commit(types.GET_HISTORY_FAILURE)
      throw error
    }
  },
  saveHistory ({ commit }, history: BridgeHistory | null) {
    if (!history || !history.id) {
      return
    }
    api.saveHistory(history)
  },
  setHistoryItem ({ commit }, historyItem: BridgeHistory | null) {
    commit(types.SET_HISTORY_ITEM, historyItem)
  },
  async clearHistory ({ commit }) {
    api.bridge.clearHistory()
    commit(types.GET_HISTORY_SUCCESS, [])
  },
  findRegisteredAsset ({ commit, getters, rootGetters }) {
    return rootGetters['assets/registeredAssets'].find(item => item.symbol === getters.asset.symbol)
  },
  async getNetworkFee ({ commit, getters, dispatch }) {
    if (!getters.asset || !getters.asset.symbol) {
      return
    }
    commit(types.GET_SORA_NETWORK_FEE_REQUEST)
    try {
      const asset = await dispatch('findRegisteredAsset')
      const fee = await (
        getters.isSoraToEthereum
          ? api.bridge.getTransferToEthFee(asset, '', getters.amount)
          : api.bridge.getRequestFromEthFee('', 'Transfer' as any)
      )
      commit(types.GET_SORA_NETWORK_FEE_SUCCESS, fee)
    } catch (error) {
      console.error(error)
      commit(types.GET_SORA_NETWORK_FEE_FAILURE)
    }
  },
  async getEthNetworkFee ({ commit, getters }) {
    if (!getters.asset || !getters.asset.address) {
      return
    }
    commit(types.GET_ETHEREUM_NETWORK_FEE_REQUEST)
    try {
      const web3 = await web3Util.getInstance()
      const gasPrice = +(await web3.eth.getGasPrice())
      const gasLimit = EthereumGasLimits[+getters.isSoraToEthereum][getters.asset.symbol]
      const fee = gasPrice * gasLimit
      commit(types.GET_ETHEREUM_NETWORK_FEE_SUCCESS, web3.utils.fromWei(`${fee}`, 'ether'))
    } catch (error) {
      console.error(error)
      commit(types.GET_ETHEREUM_NETWORK_FEE_FAILURE)
    }
  },
  async generateHistoryItem ({ commit, getters, dispatch }, playground) {
    // TODO 4 alexnatalia: Check this place
    await dispatch('setHistoryItem', api.bridge.generateHistoryItem({
      type: getters.isSoraToEthereum ? Operation.EthBridgeOutgoing : Operation.EthBridgeIncoming,
      amount: getters.amount.toString(),
      symbol: getters.asset.symbol,
      // id: (+playground.date).toString(),
      startTime: +playground.date,
      endTime: +playground.date,
      signed: false,
      status: '',
      transactionStep: playground.step,
      hash: '',
      ethereumHash: '',
      // transactionState: STATES.INITIAL,
      soraNetworkFee: getters.soraNetworkFee.toString(),
      ethereumNetworkFee: getters.ethereumNetworkFee.toString()
    }))
  },
  async sendTransferSoraToEth ({ commit, getters, rootGetters, dispatch }) {
    if (!getters.asset || !getters.asset.symbol || !getters.amount || !getters.isSoraToEthereum) {
      return
    }
    const asset = await dispatch('findRegisteredAsset')
    // TODO: asset should be registered just for now
    if (!asset) {
      return
    }
    commit(types.SEND_TRANSACTION_REQUEST)
    console.log(api.bridge.accountHistory)
    let currentDate
    if (getters.historyItem) {
      currentDate = getters.historyItem.startTime
    } else {
      currentDate = new Date()
      await dispatch('generateHistoryItem', { date: currentDate })
    }
    const currentHistoryItem = getters.historyItem
    await dispatch('saveHistory', currentHistoryItem)
    await dispatch('setSoraTransactionDate', +currentDate)
    try {
      const ethAccount = rootGetters['web3/ethAddress']
      await api.bridge.transferToEth(asset, ethAccount, getters.amount)
      // TODO: Set Pending status right after signing
      currentHistoryItem.status = BridgeTxStatus.Pending
      currentHistoryItem.signed = true
      await dispatch('setHistoryItem', currentHistoryItem)
      await dispatch('saveHistory', currentHistoryItem)
      console.log('currentHistoryItem', currentHistoryItem)
      const tx = await waitForExtrinsicFinalization(+currentDate)
      console.log('tx transferToEth', tx)
      currentHistoryItem.startTime = tx.startTime
      currentHistoryItem.endTime = tx.endTime
      currentHistoryItem.status = BridgeTxStatus.Pending
      // currentHistoryItem.hash = tx.hash
      currentHistoryItem.transactionState = STATES.SORA_COMMITED
      // currentHistoryItem.transactionStep = 2
      // await dispatch('setTransactionStep', 2)
      await dispatch('setHistoryItem', currentHistoryItem)
      await dispatch('saveHistory', currentHistoryItem)
      // await dispatch('setSoraTransactionHash', tx.hash)
      console.log('success currentHistoryItem', currentHistoryItem)
      commit(types.SEND_TRANSACTION_SUCCESS)
    } catch (error) {
      currentHistoryItem.status = BridgeTxStatus.Failed
      currentHistoryItem.transactionState = STATES.SORA_REJECTED
      await dispatch('saveHistory', currentHistoryItem)
      await dispatch('setHistoryItem', currentHistoryItem)
      console.log('failure currentHistoryItem', currentHistoryItem)
      commit(types.SEND_TRANSACTION_FAILURE)
      throw new Error(error)
    }
  },
  async receiveTransferEthFromSora ({ commit, getters, rootGetters, dispatch }) {
    if (!getters.asset || !getters.asset.symbol || !getters.amount || !getters.isSoraToEthereum || !getters.soraTransactionHash) {
      return
    }
    const asset = await dispatch('findRegisteredAsset')
    // TODO: asset should be registered just for now
    if (!asset) {
      return
    }
    commit(types.RECEIVE_TRANSACTION_REQUEST)
    const currentDate = new Date()
    await dispatch('setEthereumTransactionDate', currentDate)
    let currentHistoryItem = getters.historyItem
    if (!currentHistoryItem) {
      await dispatch('generateHistoryItem', { date: currentDate })
      currentHistoryItem = getters.historyItem
    }
    // if (!(getters.historyItem.transactionStep === 2 && getters.historyItem.status === BridgeTxStatus.Pending)) {
    currentHistoryItem.transactionStep = 2
    currentHistoryItem.signed = false
    await dispatch('setTransactionStep', 2)
    await dispatch('setHistoryItem', currentHistoryItem)
    await dispatch('saveHistory', currentHistoryItem)
    try {
      const request = await waitForApprovedRequest(getters.soraTransactionHash) // If it causes an error, then -> catch -> SORA_REJECTED
      if (!rootGetters['web3/isValidEthNetwork']) {
        throw new Error('Change eth network in Metamask')
      }
      const symbol = getters.asset.symbol
      const ethAccount = rootGetters['web3/ethAddress']
      const isValOrXor = [KnownBridgeAsset.XOR, KnownBridgeAsset.VAL].includes(symbol)
      let contract: any = null
      if (isValOrXor) {
        contract = rootGetters[`web3/contract${symbol}`]
      } else {
        contract = rootGetters[`web3/contract${KnownBridgeAsset.Other}`][OtherContractType.Bridge]
      }
      const web3 = await web3Util.getInstance()
      const contractInstance = new web3.eth.Contract(contract.abi)
      const contractAddress = rootGetters[`web3/address${isValOrXor ? symbol : KnownBridgeAsset.Other}`]
      contractInstance.options.address = contractAddress.MASTER
      const method = isValOrXor
        ? 'mintTokensByPeers'
        : request.currencyType === BridgeCurrencyType.TokenAddress
          ? 'receievByEthereumAssetAddress'
          : 'receiveBySidechainAssetId'
      const methodArgs = [
        (isValOrXor || request.currencyType === BridgeCurrencyType.TokenAddress)
          ? asset.externalAddress // address tokenAddress OR
          : asset.address, // bytes32 assetId
        new FPNumber(getters.amount, asset.decimals).toCodecString(), // uint256 amount
        ethAccount // address beneficiary
      ]
      methodArgs.push(...(isValOrXor
        ? [
          getters.soraTransactionHash, // bytes32 txHash
          request.v, // uint8[] memory v
          request.r, // bytes32[] memory r
          request.s, // bytes32[] memory s
          request.from // address from
        ] : [
          request.from, // address from
          getters.soraTransactionHash, // bytes32 txHash
          request.v, // uint8[] memory v
          request.r, // bytes32[] memory r
          request.s // bytes32[] memory s
        ])
      )
      const contractMethod = contractInstance.methods[method](...methodArgs)
      const gas = await contractMethod.estimateGas()
      const { transactionHash } = await contractMethod.send({ gas, from: ethAccount })
      // api.bridge.markAsDone(hash) We've decided not to use offchain workers to show the history.
      // So we don't need DONE status of request
      // TODO: How to check if the transaction signed?
      currentHistoryItem.status = BridgeTxStatus.Pending
      currentHistoryItem.signed = true
      await dispatch('setHistoryItem', currentHistoryItem)
      await dispatch('saveHistory', currentHistoryItem)
      const tx = await web3.eth.getTransactionReceipt(transactionHash)
      currentHistoryItem.endTime = +(new Date())
      currentHistoryItem.status = BridgeTxStatus.Done
      currentHistoryItem.ethereumHash = tx.transactionHash
      currentHistoryItem.transactionState = STATES.ETHEREUM_COMMITED
      await dispatch('saveHistory', currentHistoryItem)
      await dispatch('setHistoryItem', currentHistoryItem)
      await dispatch('setEthereumTransactionHash', tx.transactionHash)
      commit(types.RECEIVE_TRANSACTION_SUCCESS)
    } catch (error) {
      currentHistoryItem.endTime = +(new Date())
      currentHistoryItem.status = BridgeTxStatus.Failed
      currentHistoryItem.transactionState = STATES.ETHEREUM_REJECTED
      await dispatch('saveHistory', currentHistoryItem)
      await dispatch('setHistoryItem', currentHistoryItem)
      commit(types.RECEIVE_TRANSACTION_FAILURE)
      throw new Error(error.message)
    }
  },
  async sendTransferEthToSora ({ commit, getters, rootGetters, dispatch }) {
    if (!getters.asset || !getters.asset.symbol || !getters.amount || getters.isSoraToEthereum) {
      return
    }
    const asset = await dispatch('findRegisteredAsset')
    // TODO: asset should be registered for now (ERC-20 tokens flow)
    if (!asset) {
      return
    }
    commit(types.SEND_TRANSACTION_REQUEST)
    const currentDate = new Date()
    await dispatch('setEthereumTransactionDate', +currentDate)
    await dispatch('generateHistoryItem', { date: currentDate })
    const currentHistoryItem = getters.historyItem
    try {
      if (!rootGetters['web3/isValidEthNetwork']) {
        throw new Error('Change eth network in Metamask')
      }
      let contractInstance: any = null
      const contract = rootGetters[`web3/contract${KnownBridgeAsset.Other}`]
      const ethAccount = rootGetters['web3/ethAddress']
      const web3 = await web3Util.getInstance()
      const contractAddress = rootGetters[`web3/address${KnownBridgeAsset.Other}`]
      const allowance = await dispatch('web3/getAllowanceByEthAddress', { address: asset.externalAddress }, { root: true })
      if (FPNumber.lte(new FPNumber(allowance), new FPNumber(getters.amount))) {
        contractInstance = new web3.eth.Contract(contract[OtherContractType.ERC20].abi)
        contractInstance.options.address = asset.externalAddress
        const methodArgs = [
          contractAddress.MASTER, // address spender
          MaxUint256 // uint256 amount
        ]
        const contractMethod = contractInstance.methods.approve(...methodArgs)
        const tx = await contractMethod.send({ from: ethAccount })
        await web3.eth.getTransactionReceipt(tx.transactionHash)
      }
      const soraAccountAddress = rootGetters.account.address
      const accountId = web3.utils.bytesToHex(Array.from(decodeAddress(soraAccountAddress).values()))
      contractInstance = new web3.eth.Contract(contract[OtherContractType.Bridge].abi)
      contractInstance.options.address = contractAddress.MASTER
      const methodArgs = [
        accountId, // bytes32 to
        new FPNumber(getters.amount, asset.decimals).toCodecString(), // uint256 amount
        asset.externalAddress // address tokenAddress
      ]
      const contractMethod = contractInstance.methods.sendERC20ToSidechain(...methodArgs)
      const tx = await contractMethod.send({ from: ethAccount })
      const res = await web3.eth.getTransactionReceipt(tx.transactionHash)
      currentHistoryItem.startTime = tx.startTime ? tx.startTime : currentHistoryItem.startTime
      currentHistoryItem.endTime = tx.endTime
      currentHistoryItem.ethereumHash = tx.transactionHash
      currentHistoryItem.status = BridgeTxStatus.Pending
      currentHistoryItem.transactionStep = 2
      currentHistoryItem.transactionState = STATES.ETHEREUM_COMMITED
      await dispatch('setTransactionStep', 2)
      await dispatch('saveHistory', currentHistoryItem)
      await dispatch('setHistoryItem', currentHistoryItem)
      await dispatch('setEthereumTransactionHash', tx.transactionHash)
      commit(types.SEND_TRANSACTION_SUCCESS)
    } catch (error) {
      currentHistoryItem.endTime = +(new Date())
      currentHistoryItem.status = BridgeTxStatus.Failed
      currentHistoryItem.transactionState = STATES.ETHEREUM_REJECTED
      // If user didn't cancel the transaction
      if (error.code !== 4001) {
        await dispatch('saveHistory', currentHistoryItem)
      }
      await dispatch('setHistoryItem', currentHistoryItem)
      commit(types.SEND_TRANSACTION_FAILURE)
      throw new Error(error)
    }
  },
  async receiveTransferSoraFromEth ({ commit, getters, rootGetters, dispatch }) {
    // TODO: hashes could be the same!
    if (!getters.asset || !getters.asset.symbol || !getters.amount || getters.isSoraToEthereum || !getters.ethereumTransactionHash) {
      return
    }
    const asset = await dispatch('findRegisteredAsset')
    // TODO: asset should be registered just for now
    if (!asset) {
      return
    }
    commit(types.RECEIVE_TRANSACTION_REQUEST)
    const currentDate = new Date()
    await dispatch('setSoraTransactionDate', +currentDate)
    let currentHistoryItem = getters.historyItem
    if (!currentHistoryItem) {
      await dispatch('generateHistoryItem', { date: currentDate })
      currentHistoryItem = getters.historyItem
    }
    // TODO: Check this part
    // currentHistoryItem.transactionStep = 2
    // await dispatch('setTransactionStep', 2)
    try {
      await api.bridge.requestFromEth(getters.ethereumTransactionHash)
      const tx = await waitForRequest(getters.ethereumTransactionHash)
      console.log('tx after requestFromEth', tx)
      currentHistoryItem.endTime = +currentDate
      currentHistoryItem.status = BridgeTxStatus.Done
      currentHistoryItem.hash = tx.hash
      currentHistoryItem.transactionState = STATES.SORA_COMMITED
      await dispatch('saveHistory', currentHistoryItem)
      await dispatch('setHistoryItem', currentHistoryItem)
      await dispatch('setSoraTransactionHash', tx.hash)
      commit(types.RECEIVE_TRANSACTION_SUCCESS)
    } catch (error) {
      currentHistoryItem.endTime = +(new Date())
      currentHistoryItem.status = BridgeTxStatus.Failed
      currentHistoryItem.transactionState = STATES.SORA_REJECTED
      await dispatch('saveHistory', currentHistoryItem)
      await dispatch('setHistoryItem', currentHistoryItem)
      commit(types.RECEIVE_TRANSACTION_FAILURE)
      throw new Error(error)
    }
  },
  async sendTransaction ({ commit, getters, dispatch }): Promise<void> {
    try {
      if (getters.isSoraToEthereum) {
        await dispatch('sendTransferSoraToEth')
      } else {
        await dispatch('sendTransferEthToSora')
      }
    } catch (error) {
      throw new Error(error.message)
    }
  },
  async receiveTransaction ({ commit, getters, dispatch }): Promise<void> {
    try {
      if (getters.isSoraToEthereum) {
        await dispatch('receiveTransferEthFromSora')
      } else {
        await dispatch('receiveTransferSoraFromEth')
      }
    } catch (error) {
      throw new Error(error.message)
    }
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
