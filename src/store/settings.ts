import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { connection, updateAccountAssetsSubscription, isWalletLoaded, initWallet } from '@soramitsu/soraneo-wallet-web'

import storage, { settingsStorage } from '@/utils/storage'
import { AppHandledError } from '@/utils/error'
import { DefaultSlippageTolerance, DefaultMarketAlgorithm, LiquiditySourceForMarketAlgorithm, WalletPermissions } from '@/consts'
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

const actions = {
  async connectToInitialNode ({ commit, dispatch, state }) {
    const defaultNode = state.defaultNodes[0]
    const node = state.node?.address ? state.node : defaultNode

    try {
      await dispatch('setNode', node)
    } catch (error) {
      if (node.address !== defaultNode.address) {
        commit(types.RESET_NODE)
      }
      await dispatch('connectToInitialNode')
    }
  },
  async connectToNode ({ dispatch }, node) {
    try {
      await dispatch('setNode', node)
    } catch (error) {
      dispatch('connectToInitialNode')
      throw error
    }
  },
  async setNode ({ commit, dispatch, state }, node) {
    const endpoint = node?.address ?? ''
    const connectingNodeChanged = () => endpoint !== state.nodeAddressConnecting

    try {
      if (!endpoint) {
        throw new Error('Node address is not set')
      }

      if (!state.chainGenesisHash) {
        throw new Error('Network chain genesis hash is not set')
      }

      commit(types.SET_NODE_REQUEST, node)

      console.info('Connection request to node', endpoint)

      const { endpoint: currentEndpoint, opened } = connection

      if (currentEndpoint && opened) {
        await connection.close()
        console.info('Disconnected from node', currentEndpoint)
      }

      await connection.open(endpoint, true)

      if (connectingNodeChanged()) return

      console.info('Connected to node', connection.endpoint)

      const nodeChainGenesisHash = connection.api.genesisHash.toHex()

      if (nodeChainGenesisHash !== state.chainGenesisHash) {
        throw new AppHandledError({ key: 'node.errors.network' }, `Chain genesis hash doesn't match: "${nodeChainGenesisHash}" recieved, should be "${state.chainGenesisHash}"`)
      }

      if (isWalletLoaded) {
        if (updateAccountAssetsSubscription) {
          updateAccountAssetsSubscription.unsubscribe()
        }
        dispatch('updateAccountAssets', undefined, { root: true }) // to update subscription
      }

      commit(types.SET_NODE_SUCCESS, node)
    } catch (error) {
      console.error(error)
      if (!connectingNodeChanged()) {
        commit(types.SET_NODE_FAILURE)
      }
      throw error
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
  async getNetworkChainGenesisHash ({ commit, state }) {
    const endpoint = state.defaultNodes?.[0]?.address

    if (!endpoint) {
      throw new Error('Address of default node is required')
    }

    const genesisHash = await fetchRpc(getRpcEndpoint(endpoint), 'chain_getBlockHash', [0]) ?? ''

    if (!genesisHash) {
      throw new Error('Failed to fetch network chain genesis hash')
    }

    commit(types.SET_NETWORK_CHAIN_GENESIS_HASH, genesisHash)
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
