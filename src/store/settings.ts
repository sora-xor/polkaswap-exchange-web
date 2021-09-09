import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { connection, isWalletLoaded, initWallet } from '@soramitsu/soraneo-wallet-web'

import storage, { settingsStorage } from '@/utils/storage'
import { AppHandledError } from '@/utils/error'
import { DefaultSlippageTolerance, DefaultMarketAlgorithm, LiquiditySourceForMarketAlgorithm, WalletPermissions, Language } from '@/consts'
import { getRpcEndpoint, fetchRpc } from '@/utils/rpc'
import { ConnectToNodeOptions } from '@/types/nodes'
import { getLocale, getSupportedLocale, setI18nLocale } from '@/lang'
import { updateFpNumberLocale, updateDocumentTitle } from '@/utils'

const NODE_CONNECTION_TIMEOUT = 60000

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_SLIPPAGE_TOLERANCE',
    'SET_MARKET_ALGORITHM',
    'SET_TRANSACTION_DEADLINE',
    'SET_FAUCET_URL',
    'SET_DEFAULT_NODES',
    'SET_CUSTOM_NODES',
    'RESET_NODE',
    'SET_NETWORK_CHAIN_GENESIS_HASH',
    'SET_SELECT_NODE_DIALOG_VISIBILIY',
    'SET_LANGUAGE',
    'SET_API_KEYS'
  ]),
  map(x => [x, x]),
  fromPairs
)([
  'SET_NODE'
])

function initialState () {
  return {
    apiKeys: {},
    slippageTolerance: storage.get('slippageTolerance') || DefaultSlippageTolerance,
    marketAlgorithm: storage.get('marketAlgorithm') || DefaultMarketAlgorithm,
    transactionDeadline: Number(storage.get('transactionDeadline')) || 20,
    node: JSON.parse(settingsStorage.get('node')) || {},
    language: getLocale(),
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
  chainAndNetworkText (state, getters, rootState, rootGetters) {
    return state.node.chain || rootGetters.soraNetwork
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
    return state.node?.address && !state.nodeAddressConnecting && connection.opened
  },
  slippageTolerance (state) {
    return state.slippageTolerance
  },
  transactionDeadline (state) {
    return state.transactionDeadline
  },
  liquiditySource (state) {
    return LiquiditySourceForMarketAlgorithm[state.marketAlgorithm]
  },
  language (state) {
    return state.language
  }
}

const mutations = {
  [types.SET_NODE_REQUEST] (state, { node, isReconnection = false }) {
    state.nodeAddressConnecting = node?.address ?? ''
    state.nodeConnectionAllowance = isReconnection
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
  },
  [types.SET_LANGUAGE] (state, lang: Language) {
    state.language = lang
    settingsStorage.set('language', lang)
  },
  [types.SET_API_KEYS] (state, keys = {}) {
    state.apiKeys = { ...state.apiKeys, ...keys }
  }
}

const actions = {
  async connectToNode ({ commit, dispatch, state }, options: ConnectToNodeOptions = {}) {
    if (!state.nodeConnectionAllowance) return

    const { node, onError, ...restOptions } = options
    const defaultNode = state.defaultNodes[0]
    const requestedNode = node || (state.node.address ? state.node : defaultNode)

    try {
      await dispatch('setNode', { node: requestedNode, onError, ...restOptions })

      // wallet init & update flow
      if (!isWalletLoaded) {
        try {
          await initWallet({ permissions: WalletPermissions })
          // TODO [tech]: maybe we should replace it, cuz it executes twice except bridge screens
          await dispatch('assets/getAssets', undefined, { root: true })
        } catch (error) {
          console.error(error)
          throw error
        }
      }
    } catch (error) {
      if (requestedNode && (requestedNode.address === state.node.address)) {
        commit(types.RESET_NODE)
      }

      if (state.node.address || (defaultNode && (requestedNode?.address !== defaultNode.address))) {
        await dispatch('connectToNode', { onError, ...restOptions })
      }

      if (onError && typeof onError === 'function') {
        onError(error)
      }

      throw error
    }
  },
  async setNode ({ commit, dispatch, state, getters }, options: ConnectToNodeOptions = {}) {
    const {
      node,
      connectionOptions = {},
      onError,
      onDisconnect,
      onReconnect
    } = options

    const endpoint = node?.address ?? ''
    const isTrustedEndpoint = endpoint in getters.defaultNodesHashTable

    const connectionOpenOptions = {
      once: true, // by default we are trying to connect once, but keep trying after disconnect from connected node
      timeout: isTrustedEndpoint ? undefined : NODE_CONNECTION_TIMEOUT, // connect to trusted node without connection timeout
      ...connectionOptions
    }
    const isReconnection = !connectionOpenOptions.once
    const connectingNodeChanged = () => endpoint !== state.nodeAddressConnecting

    const connectionOnDisconnected = async () => {
      await connection.close()

      if (typeof onDisconnect === 'function') {
        onDisconnect(node)
      }

      dispatch('connectToNode', { node, onError, onDisconnect, onReconnect, connectionOptions: { once: false } })
    }

    try {
      if (!endpoint) {
        throw new Error('Node address is not set')
      }

      commit(types.SET_NODE_REQUEST, { node, isReconnection })

      console.info('Connection request to node', endpoint)

      const { endpoint: currentEndpoint, opened } = connection

      if (currentEndpoint && opened) {
        await connection.close()
        console.info('Disconnected from node', currentEndpoint)
      }

      await connection.open(endpoint, {
        ...connectionOpenOptions,
        eventListeners: [
          ['disconnected', connectionOnDisconnected]
        ]
      })

      if (connectingNodeChanged()) return

      console.info('Connected to node', connection.endpoint)

      const nodeChainGenesisHash = connection.api.genesisHash.toHex()

      // if connected node is custom node, we should check genesis hash
      if (!isTrustedEndpoint) {
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

      if (isReconnection && typeof onReconnect === 'function') {
        onReconnect(node)
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

      if (!connectingNodeChanged()) {
        commit(types.SET_NODE_FAILURE)
      }

      throw err
    }
  },
  setDefaultNodes ({ commit }, nodes) {
    commit(types.SET_DEFAULT_NODES, nodes)
  },
  addCustomNode ({ commit, getters }, node) {
    const nodes = [...getters.customNodes, node]
    commit(types.SET_CUSTOM_NODES, nodes)
  },
  updateCustomNode ({ commit, getters }, { address, node }) {
    const nodes = getters.customNodes.filter(item => item.address !== address)
    commit(types.SET_CUSTOM_NODES, [...nodes, node])
  },
  removeCustomNode ({ commit, getters }, node) {
    const nodes = getters.customNodes.filter(item => item.address !== node.address)
    commit(types.SET_CUSTOM_NODES, nodes)
  },
  setNetworkChainGenesisHash ({ commit }, data) {
    commit(types.SET_NETWORK_CHAIN_GENESIS_HASH, data.CHAIN_GENESIS_HASH)
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
  },
  async setLanguage ({ commit }, lang: Language) {
    const locale = getSupportedLocale(lang)
    await setI18nLocale(locale as any)
    updateDocumentTitle()
    updateFpNumberLocale(locale)
    commit(types.SET_LANGUAGE, locale)
  },
  setApiKeys ({ commit }, keys) {
    commit(types.SET_API_KEYS, keys)
  }
}

export default {
  types,
  state,
  getters,
  mutations,
  actions
}
