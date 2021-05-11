import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { connection } from '@soramitsu/soraneo-wallet-web'

import { disconnectWallet } from '@/utils'
import storage, { settingsStorage } from '@/utils/storage'
import { AppHandledError } from '@/utils/error'
import { DefaultSlippageTolerance, DefaultMarketAlgorithm, LiquiditySourceForMarketAlgorithm } from '@/consts'
import { getRpcEndpoint, fetchRpc } from '@/utils/rpc'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_SLIPPAGE_TOLERANCE',
    'SET_MARKET_ALGORITHM',
    'SET_TRANSACTION_DEADLINE',
    'SET_FAUCET_URL',
    'SET_SORA_NETWORK',
    'SET_DEFAULT_NODES',
    'SET_CUSTOM_NODES',
    'RESET_NODE',
    'SET_NETWORK_CHAIN_GENESIS_HASH',
    'SET_NODE_CONNECTION_ALLOWANCE'
  ]),
  map(x => [x, x]),
  fromPairs
)([
  'SET_NODE'
])

function initialState () {
  return {
    soraNetwork: '',
    slippageTolerance: storage.get('slippageTolerance') || DefaultSlippageTolerance,
    marketAlgorithm: storage.get('marketAlgorithm') || DefaultMarketAlgorithm,
    transactionDeadline: Number(storage.get('transactionDeadline')) || 20,
    node: JSON.parse(settingsStorage.get('node')) || {},
    defaultNodes: [],
    customNodes: JSON.parse(settingsStorage.get('customNodes')) || [],
    nodeAddressConnecting: '',
    nodeConnectionAllowance: true,
    chainGenesisHash: '',
    faucetUrl: ''
  }
}

const state = initialState()

const getters = {
  node (state) {
    return state.node
  },
  chainAndNetworkText (state) {
    return state.node.chain || state.soraNetwork
  },
  defaultNodes (state) {
    return state.defaultNodes
  },
  defaultNodesHashTable (state, getters) {
    return getters.defaultNodes.reduce((result, node) => ({ ...result, [node.address]: node }), {})
  },
  customNodes (state, getters) {
    return state.customNodes.filter(node => !(node.address in getters.defaultNodesHashTable))
  },
  nodeAddressConnecting (state) {
    return state.nodeAddressConnecting
  },
  nodeConnectionAllowance (state) {
    return state.nodeConnectionAllowance
  },
  soraNetwork (state) {
    return state.soraNetwork
  },
  chainGenesisHash (state) {
    return state.chainGenesisHash
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
  },
  marketAlgorithm (state) {
    return state.marketAlgorithm
  }
}

const mutations = {
  [types.SET_NODE_REQUEST] (state, node) {
    state.nodeAddressConnecting = node?.address ?? ''
    state.nodeConnectionAllowance = false
  },
  [types.SET_NODE_SUCCESS] (state, node = {}) {
    state.node = { ...node }
    state.nodeAddressConnecting = ''
    state.nodeConnectionAllowance = true
    settingsStorage.set('node', JSON.stringify(node))
  },
  [types.SET_NODE_FAILURE] (state) {
    state.nodeAddressConnecting = ''
    state.nodeConnectionAllowance = true
  },
  [types.SET_NODE_CONNECTION_ALLOWANCE] (state, flag: boolean) {
    state.nodeConnectionAllowance = flag
  },
  [types.SET_DEFAULT_NODES] (state, nodes) {
    state.defaultNodes = [...nodes]
  },
  [types.SET_CUSTOM_NODES] (state, nodes) {
    state.customNodes = [...nodes]
    settingsStorage.set('customNodes', JSON.stringify(nodes))
  },
  [types.RESET_NODE] (state) {
    state.node = {}
    settingsStorage.remove('node')
  },
  [types.SET_SORA_NETWORK] (state, value) {
    state.soraNetwork = value
  },
  [types.SET_NETWORK_CHAIN_GENESIS_HASH] (state, value) {
    state.chainGenesisHash = value
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

const NodeConnectionTimeout = 30000

const actions = {
  async connectToInitialNode ({ commit, dispatch, state }) {
    const node = state.node?.address ? state.node : state.defaultNodes[0]

    try {
      await dispatch('setNode', node)
    } catch (error) {
      if (node.address !== state.defaultNodes[0].address) {
        commit(types.RESET_NODE)
        await dispatch('connectToInitialNode')
      }
    }
  },
  async setNode ({ commit, dispatch, state }, node) {
    const endpoint = node?.address ?? ''
    const connectingNodeChanged = () => endpoint !== state.nodeAddressConnecting

    const connectionTimeout = setTimeout(() => {
      commit(types.SET_NODE_CONNECTION_ALLOWANCE, true)
    }, NodeConnectionTimeout)

    try {
      if (!endpoint) {
        throw new Error('Node address is not set')
      }

      if (!state.chainGenesisHash) {
        throw new Error('Network chain genesis hash is not set')
      }

      commit(types.SET_NODE_REQUEST, node)

      const [nodeIsAvailable, nodeChainGenesisHash] = await Promise.all([
        dispatch('getNodeNetworkStatus', endpoint),
        dispatch('getNodeChainGenesisHash', endpoint)
      ])

      if (!nodeIsAvailable) {
        throw new AppHandledError({ key: 'node.errors.connection' }, `Couldn't connect to node by address: ${endpoint}`)
      }

      if (nodeChainGenesisHash !== state.chainGenesisHash) {
        throw new AppHandledError({ key: 'node.errors.network' }, `Chain genesis hash doesn't match: "${nodeChainGenesisHash}" recieved, should be "${state.chainGenesisHash}"`)
      }

      if (!connection.endpoint && !connection.loading) {
        connection.endpoint = endpoint
      } else {
        if (connection.opened) {
          await disconnectWallet()
        }
        await connection.open(endpoint)

        if (!connectingNodeChanged()) {
          dispatch('updateAccountAssets', undefined, { root: true }) // to update subscription
        }
      }

      if (!connectingNodeChanged()) {
        commit(types.SET_NODE_SUCCESS, node)
      }
    } catch (error) {
      console.error(error)
      if (!connectingNodeChanged()) {
        commit(types.SET_NODE_FAILURE)
      }
      throw error
    } finally {
      clearTimeout(connectionTimeout)
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
  addCustomNode ({ commit, getters }, node) {
    const nodes = [...getters.customNodes, node]
    commit(types.SET_CUSTOM_NODES, nodes)
  },
  removeCustomNode ({ commit, getters }, node) {
    const nodes = getters.customNodes.filter(item => item.address !== node.address)
    commit(types.SET_CUSTOM_NODES, nodes)
  },
  async getNetworkChainGenesisHash ({ commit, state, dispatch }) {
    const endpoint = state.defaultNodes?.[0]?.address
    const genesisHash = await dispatch('getNodeChainGenesisHash', endpoint)

    if (!genesisHash) {
      throw new Error('Failed to fetch network chain genesis hash')
    }

    commit(types.SET_NETWORK_CHAIN_GENESIS_HASH, genesisHash)
  },
  async getNodeChainGenesisHash (_, nodeAddress: string): Promise<string> {
    if (!nodeAddress) {
      throw new Error('nodeAddress is required')
    }

    const rpc = getRpcEndpoint(nodeAddress)
    const genesisHash = await fetchRpc(rpc, 'chain_getBlockHash', [0]) ?? ''

    return genesisHash
  },
  async getNodeNetworkStatus (_, nodeAddress: string): Promise<boolean> {
    if (!nodeAddress) {
      console.error('nodeAddress is required')
      return false
    }

    const rpc = getRpcEndpoint(nodeAddress)
    const response = await fetchRpc(rpc, 'system_health')

    return !!response
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
