import Vue from 'vue'
import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import concat from 'lodash/fp/concat'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import { FPNumber } from '@sora-substrate/util'

import web3Util, { ABI, Contract, EthNetworkName, KnownBridgeAsset, OtherContractType } from '@/utils/web3-util'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'RESET',
    'SET_ETHEREUM_SMART_CONTRACTS',
    'SET_ETHEREUM_BALANCE',
    'SET_DEFAULT_ETH_NETWORK',
    'SET_SORA_NETWORK'
  ]),
  map(x => [x, x]),
  fromPairs
)([
  'CONNECT_ETH_WALLET',
  'SWITCH_ETH_WALLET',
  'SET_ETH_NETWORK',
  'DISCONNECT_ETH_WALLET',
  'GET_BALANCE',
  'GET_ETH_TOKEN_ADDRESS',
  'GET_ALLOWANCE'
])

function initialState () {
  return {
    soraNetwork: '',
    ethAddress: web3Util.getEthUserAddress(),
    ethBalance: 0,
    ethNetwork: web3Util.getEthNetworkFromStorage(),
    defaultEthNetwork: '',
    contractAddress: {
      XOR: '',
      VAL: '',
      OTHER: ''
    },
    smartContracts: {
      XOR: '',
      VAL: '',
      OTHER: ''
    }
  }
}

const state = initialState()

const getters = {
  contractXOR (state) {
    return state.smartContracts.XOR
  },
  contractVAL (state) {
    return state.smartContracts.VAL
  },
  contractOTHER (state) {
    return state.smartContracts.OTHER
  },
  addressXOR (state) {
    return state.contractAddress.XOR
  },
  addressVAL (state) {
    return state.contractAddress.VAL
  },
  addressOTHER (state) {
    return state.contractAddress.OTHER
  },
  isEthAccountConnected (state) {
    return !(state.ethAddress === '' || state.ethAddress === 'undefined')
  },
  ethAddress (state) {
    return state.ethAddress
  },
  ethBalance (state) {
    return state.ethBalance
  },
  ethNetwork (state) {
    return state.ethNetwork
  },
  defaultEthNetwork (state) {
    return state.defaultEthNetwork
  },
  soraNetwork (state) {
    return state.soraNetwork
  },
  isValidEthNetwork (state) {
    return state.ethNetwork === state.defaultEthNetwork
  }
}

const mutations = {
  [types.RESET] (state) {
    // we shouldn't reset networks, setted from env
    const networkSettingsKeys = ['soraNetwork', 'defaultEthNetwork']
    const s = initialState()

    Object.keys(s).filter(key => !networkSettingsKeys.includes(key)).forEach(key => {
      state[key] = s[key]
    })
  },

  [types.CONNECT_ETH_WALLET_REQUEST] () {},
  [types.CONNECT_ETH_WALLET_SUCCESS] (state, address) {
    state.ethAddress = address
  },
  [types.CONNECT_ETH_WALLET_FAILURE] () {},

  [types.SWITCH_ETH_WALLET_REQUEST] () {},
  [types.SWITCH_ETH_WALLET_SUCCESS] (state, address) {
    state.ethAddress = address
  },
  [types.SWITCH_ETH_WALLET_FAILURE] () {},

  [types.SET_ETH_NETWORK_REQUEST] () {},
  [types.SET_ETH_NETWORK_SUCCESS] (state, network) {
    state.ethNetwork = network
  },
  [types.SET_ETH_NETWORK_FAILURE] () {},

  [types.SET_DEFAULT_ETH_NETWORK] (state, network) {
    state.defaultEthNetwork = network
  },

  [types.SET_SORA_NETWORK] (state, network) {
    state.soraNetwork = network
  },

  [types.DISCONNECT_ETH_WALLET_REQUEST] () {},
  [types.DISCONNECT_ETH_WALLET_SUCCESS] (state) {
    state.ethAddress = ''
  },
  [types.DISCONNECT_ETH_WALLET_FAILURE] () {},

  [types.SET_ETHEREUM_SMART_CONTRACTS] (state, params) {
    Vue.set(state, 'smartContracts', {
      XOR: params.contracts.XOR,
      VAL: params.contracts.VAL,
      OTHER: params.contracts.OTHER
    })
    Vue.set(state, 'contractAddress', {
      XOR: params.address.XOR,
      VAL: params.address.VAL,
      OTHER: params.address.OTHER
    })
  },

  [types.SET_ETHEREUM_BALANCE] (state, balance) {
    state.ethBalance = balance
  },

  [types.GET_BALANCE_REQUEST] (state) {},
  [types.GET_BALANCE_SUCCESS] (state) {},
  [types.GET_BALANCE_FAILURE] (state) {},

  [types.GET_ETH_TOKEN_ADDRESS_REQUEST] (state) {},
  [types.GET_ETH_TOKEN_ADDRESS_SUCCESS] (state) {},
  [types.GET_ETH_TOKEN_ADDRESS_FAILURE] (state) {},

  [types.GET_ALLOWANCE_REQUEST] (state) {},
  [types.GET_ALLOWANCE_SUCCESS] (state) {},
  [types.GET_ALLOWANCE_FAILURE] (state) {}
}

const actions = {
  async connectEthWallet ({ commit, getters, dispatch }, { provider }) {
    commit(types.CONNECT_ETH_WALLET_REQUEST)
    try {
      const address = await web3Util.onConnect({ provider })
      web3Util.storeEthUserAddress(address)
      commit(types.CONNECT_ETH_WALLET_SUCCESS, address)

      // get ethereum balance
      await dispatch('getEthBalance')
    } catch (error) {
      commit(types.CONNECT_ETH_WALLET_FAILURE)
      throw error
    }
  },

  async switchEthAccount ({ commit, dispatch }, { address }) {
    commit(types.SWITCH_ETH_WALLET_REQUEST)
    try {
      web3Util.removeEthUserAddress()
      web3Util.storeEthUserAddress(address)
      commit(types.SWITCH_ETH_WALLET_SUCCESS, address)

      // get ethereum balance
      await dispatch('getEthBalance')
    } catch (error) {
      commit(types.SWITCH_ETH_WALLET_FAILURE)
      throw error
    }
  },

  async setSoraNetwork ({ commit }, network) {
    commit(types.SET_SORA_NETWORK, network)
  },

  async setDefaultEthNetwork ({ commit }, network) {
    commit(types.SET_DEFAULT_ETH_NETWORK, network)
  },

  async setEthNetwork ({ commit }, network) {
    commit(types.SET_ETH_NETWORK_REQUEST)
    try {
      const networkName = network
        ? EthNetworkName[network]
        : await web3Util.getEthNetwork()
      web3Util.storeEthNetwork(networkName)
      commit(types.SET_ETH_NETWORK_SUCCESS, networkName)
    } catch (error) {
      commit(types.SET_ETH_NETWORK_FAILURE)
      throw error
    }
  },

  async disconnectEthWallet ({ commit }) {
    commit(types.DISCONNECT_ETH_WALLET_REQUEST)
    try {
      web3Util.removeEthUserAddress()
      commit(types.DISCONNECT_ETH_WALLET_SUCCESS)
      commit(types.RESET)
    } catch (error) {
      commit(types.DISCONNECT_ETH_WALLET_FAILURE)
      throw error
    }
  },

  async setEthereumSmartContracts ({ commit }, { ETHEREUM }) {
    const INTERNAL = await web3Util.readSmartContract(Contract.Internal, 'Master.json')
    const BRIDGE = await web3Util.readSmartContract(Contract.Other, 'Bridge.json')
    const ERC20 = await web3Util.readSmartContract(Contract.Other, 'ERC20.json')
    commit(types.SET_ETHEREUM_SMART_CONTRACTS, {
      address: ETHEREUM,
      contracts: { VAL: INTERNAL, OTHER: { BRIDGE, ERC20 }, XOR: INTERNAL }
    })
  },

  async getBalance ({ commit, getters, rootGetters }, { symbol }) {
    commit(types.GET_BALANCE_REQUEST)
    try {
      const web3 = await web3Util.getInstance()
      // TODO: Flter by address instead of symbol
      const asset = rootGetters['assets/registeredAssets'].find(item => item.symbol === symbol)
      if (!asset) {
        commit(types.GET_BALANCE_SUCCESS)
        return '-'
      }
      const tokenInstance = new web3.eth.Contract(ABI.balance as any)
      const address = asset.externalAddress
      if (!address) {
        commit(types.GET_BALANCE_SUCCESS)
        return '-'
      }
      tokenInstance.options.address = address
      const account = getters.ethAddress
      const methodArgs = [account]
      const contractMethod = tokenInstance.methods.balanceOf(...methodArgs)
      const balance = await contractMethod.call()
      commit(types.GET_BALANCE_SUCCESS)
      return FPNumber.fromCodecValue(balance).toString()
    } catch (error) {
      console.error(error)
      commit(types.GET_BALANCE_FAILURE)
      return '-'
    }
  },

  async getEthBalance ({ commit, getters }) {
    try {
      const address = getters.ethAddress

      if (!address) {
        commit(types.SET_ETHEREUM_BALANCE, 0)
        return
      }

      const web3 = await web3Util.getInstance()
      const wei = await web3.eth.getBalance(address)
      const balance = web3.utils.fromWei(`${wei}`, 'ether')

      commit(types.SET_ETHEREUM_BALANCE, balance)
      return balance
    } catch (error) {
      console.error(error)
      commit(types.SET_ETHEREUM_BALANCE, 0)
    }
  },

  async getBalanceByEthAddress ({ commit, getters }, { address }) {
    commit(types.GET_BALANCE_REQUEST)
    try {
      const web3 = await web3Util.getInstance()
      const tokenInstance = new web3.eth.Contract(ABI.balance as any)
      if (!address) {
        commit(types.GET_BALANCE_SUCCESS)
        return '-'
      }
      tokenInstance.options.address = address
      const account = getters.ethAddress
      const methodArgs = [account]
      const contractMethod = tokenInstance.methods.balanceOf(...methodArgs)
      const balance = await contractMethod.call()
      commit(types.GET_BALANCE_SUCCESS)
      return `${balance}`
    } catch (error) {
      console.error(error)
      commit(types.GET_BALANCE_FAILURE)
      return '-'
    }
  },
  async getEthTokenAddressByAssetId ({ commit, getters }, { address }) {
    commit(types.GET_ETH_TOKEN_ADDRESS_REQUEST)
    try {
      const web3 = await web3Util.getInstance()
      const contract = getters[`contract${KnownBridgeAsset.Other}`]
      const contractInstance = new web3.eth.Contract(contract[OtherContractType.Bridge].abi)
      if (!address) {
        commit(types.GET_ETH_TOKEN_ADDRESS_SUCCESS)
        return '-'
      }
      const contractAddress = getters[`address${KnownBridgeAsset.Other}`]
      contractInstance.options.address = contractAddress.MASTER
      const methodArgs = [address]
      const contractMethod = contractInstance.methods._sidechainTokens(...methodArgs)
      const externalAddress = await contractMethod.call()
      commit(types.GET_ETH_TOKEN_ADDRESS_SUCCESS)
      return externalAddress
    } catch (error) {
      console.error(error)
      commit(types.GET_ETH_TOKEN_ADDRESS_FAILURE)
      return ''
    }
  },
  async getAllowanceByEthAddress ({ commit, getters, rootGetters }, { address }) {
    commit(types.GET_ALLOWANCE_REQUEST)
    try {
      const contractAddress = rootGetters[`web3/address${KnownBridgeAsset.Other}`]
      const web3 = await web3Util.getInstance()
      const tokenInstance = new web3.eth.Contract(ABI.allowance as any)
      tokenInstance.options.address = address
      const account = getters.ethAddress
      const methodArgs = [account, contractAddress.MASTER]
      const contractMethod = tokenInstance.methods.allowance(...methodArgs)
      const allowance = await contractMethod.call()
      commit(types.GET_ALLOWANCE_SUCCESS)
      return FPNumber.fromCodecValue(allowance).toString()
    } catch (error) {
      console.error(error)
      commit(types.GET_ALLOWANCE_FAILURE)
      throw error
    }
  }
}

export default {
  namespaced: true,
  types,
  state,
  getters,
  mutations,
  actions
}
