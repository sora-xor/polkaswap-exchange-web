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
import { ConnectToNodeOptions } from '@/types/nodes'

const NODE_CONNECTION_TIMEOUT = 60000

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
    'SET_NODE_CONNECTION_ALLOWANCE',
    'SET_SELECT_NODE_DIALOG_VISIBILIY'
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
    faucetUrl: '',
    selectNodeDialogVisibility: false
  }
}

const state = initialState()

const getters = {
  chainAndNetworkText (state) {
    return state.node.chain || state.soraNetwork
  },
  defaultNodesHashTable (state) {
    return state.defaultNodes.reduce((result, node) => ({ ...result, [node.address]: node }), {})
  },
  customNodes (state, getters) {
    return state.customNodes.filter(node => !(node.address in getters.defaultNodesHashTable))
  },
  nodeList (state, getters) {
    return [...state.defaultNodes, ...getters.customNodes]
  },
  nodeIsConnected (state) {
    return state.node?.address && state.nodeConnectionAllowance
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
  liquiditySource (state) {
    return LiquiditySourceForMarketAlgorithm[state.marketAlgorithm]
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
  },
  [types.SET_SELECT_NODE_DIALOG_VISIBILIY] (state, flag) {
    state.selectNodeDialogVisibility = flag
  }
}

const actions = {
  async connectToNode ({ commit, dispatch, state }, options: ConnectToNodeOptions = {}) {
    if (!state.nodeConnectionAllowance) return

    const { node, onError } = options
    const defaultNode = state.defaultNodes[0]
    const requestedNode = node || (state.node.address ? state.node : defaultNode)

    try {
      await dispatch('setNode', { node: requestedNode, onError })

      // wallet init & update flow
      if (!isWalletLoaded) {
        await initWallet({ permissions: WalletPermissions })
        await dispatch('assets/getAssets', undefined, { root: true })
      } else {
        if (updateAccountAssetsSubscription) {
          updateAccountAssetsSubscription.unsubscribe()
        }
        dispatch('updateAccountAssets', undefined, { root: true }) // to update subscription
      }
    } catch (error) {
      if (requestedNode && (requestedNode.address === state.node.address)) {
        commit(types.RESET_NODE)
      }

      if (defaultNode && (requestedNode?.address !== defaultNode.address)) {
        await dispatch('connectToNode', { onError })
      }

      if (onError && typeof onError === 'function') {
        onError(error)
      }

      throw error
    }
  },
  async setNode ({ commit, dispatch, state, getters }, options: ConnectToNodeOptions = {}) {
    const { node, onError } = options
    const endpoint = node?.address ?? ''
    const connectionOnDisconnected = () => {
      connection.unsubscribeEventHandlers()
      dispatch('connectToNode', { onError })
    }

    try {
      if (!endpoint) {
        throw new Error('Node address is not set')
      }

      commit(types.SET_NODE_REQUEST, node)

      console.info('Connection request to node', endpoint)

      const { endpoint: currentEndpoint, opened } = connection

      if (currentEndpoint && opened) {
        try {
          await connection.close()
        } catch (error) {
          console.error('Disconnection error', error)
        }
        console.info('Disconnected from node', currentEndpoint)
      }

      await connection.open(endpoint, {
        once: true,
        timeout: NODE_CONNECTION_TIMEOUT,
        eventListeners: [
          ['disconnected', connectionOnDisconnected]
        ]
      })

      console.info('Connected to node', connection.endpoint)

      const nodeChainGenesisHash = connection.api.genesisHash.toHex()

      // if connected node is custom node, we should check genesis hash
      if (!(endpoint in getters.defaultNodesHashTable)) {
        // if genesis hash is not set in state, fetch it
        if (!state.chainGenesisHash) {
          await dispatch('getNetworkChainGenesisHash')
        }

        if (nodeChainGenesisHash !== state.chainGenesisHash) {
          throw new AppHandledError({
            key: 'node.errors.network',
            payload: { address: endpoint }
          },
            `Chain genesis hash doesn't match: "${nodeChainGenesisHash}" recieved, should be "${state.chainGenesisHash}"`
          )
        }
      } else {
        // just update genesis hash (needed for dev, test stands after their reset)
        commit(types.SET_NETWORK_CHAIN_GENESIS_HASH, nodeChainGenesisHash)
      }

      commit(types.SET_NODE_SUCCESS, node)
    } catch (error) {
      console.error(error)

      const err = error instanceof AppHandledError
        ? error
        : new AppHandledError({
          key: 'node.errors.connection',
          payload: { address: endpoint }
        })

      commit(types.SET_NODE_FAILURE)

      throw err
    }
  },
  setDefaultNodes ({ commit }, nodes) {
    commit(types.SET_DEFAULT_NODES, nodes)
  },
  setSoraNetwork ({ commit }, data) {
    if (!data.NETWORK_TYPE) {
      throw new Error('NETWORK_TYPE is not set')
    }
    if (data.CHAIN_GENESIS_HASH) {
      commit(types.SET_NETWORK_CHAIN_GENESIS_HASH, data.CHAIN_GENESIS_HASH)
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
    try {
      const genesisHash = await Promise.any(state.defaultNodes.map(node => fetchRpc(getRpcEndpoint(node.address), 'chain_getBlockHash', [0])))
      commit(types.SET_NETWORK_CHAIN_GENESIS_HASH, genesisHash)
    } catch (error) {
      commit(types.SET_NETWORK_CHAIN_GENESIS_HASH, '')
      throw error
    }
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
  },
  setSelectNodeDialogVisibility ({ commit }, flag: boolean) {
    commit(types.SET_SELECT_NODE_DIALOG_VISIBILIY, flag)
  }
}

export default {
  types,
  state,
  getters,
  mutations,
  actions
}
