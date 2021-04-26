import Vue from 'vue'
import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import concat from 'lodash/fp/concat'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import { FPNumber } from '@sora-substrate/util'

import web3Util, { ABI, Contract, EvmNetwork, EvmNetworkName, KnownBridgeAsset, OtherContractType } from '@/utils/web3-util'
import { ZeroStringValue } from '@/consts'
import { isEthereumAddress } from '@/utils'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'RESET',
    'SET_ETHEREUM_SMART_CONTRACTS',
    'SET_ETHEREUM_BALANCE',
    'SET_DEFAULT_ETH_NETWORK',
    'SET_SUB_NETWORKS',
    'SET_CURRENT_SUB_NETWORK',
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
    ethBalance: ZeroStringValue,
    ethNetwork: web3Util.getEthNetworkFromStorage(),
    defaultEthNetwork: '',
    subNetworks: [],
    evmNetwork: '',
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
  isExternalAccountConnected (state) {
    return !!state.ethAddress && state.ethAddress !== 'undefined'
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
  subNetworks (state) {
    return state.subNetworks
  },
  evmNetwork (state) {
    return state.evmNetwork
  },
  soraNetwork (state) {
    return state.soraNetwork
  },
  isValidEthNetwork (state) {
    if (state.evmNetwork === EvmNetwork.Energy) {
      return state.ethNetwork === EvmNetwork.Energy
    }
    return state.ethNetwork === state.defaultEthNetwork
  }
}

const mutations = {
  [types.RESET] (state) {
    // we shouldn't reset networks, setted from env & contracts
    const networkSettingsKeys = ['soraNetwork', 'defaultEthNetwork', 'contractAddress', 'smartContracts']
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

  [types.SET_SUB_NETWORKS] (state, networks) {
    state.subNetworks = networks
  },

  [types.SET_CURRENT_SUB_NETWORK] (state, network) {
    state.evmNetwork = network
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
  async connectExternalAccount ({ commit, getters, dispatch }, { provider }) {
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

  async switchExternalAccount ({ commit, dispatch }, { address = '' } = {}) {
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

  async setSubNetworks ({ commit }, subNetworks) {
    commit(types.SET_SUB_NETWORKS, subNetworks)
  },

  async setEvmNetwork ({ commit }, network) {
    commit(types.SET_CURRENT_SUB_NETWORK, network)
  },

  async setEthNetwork ({ commit }, network) {
    commit(types.SET_ETH_NETWORK_REQUEST)
    try {
      const networkName = network
        ? EvmNetworkName[network]
        : await web3Util.getEthNetwork()
      web3Util.storeEthNetwork(networkName)
      commit(types.SET_ETH_NETWORK_SUCCESS, networkName)
    } catch (error) {
      commit(types.SET_ETH_NETWORK_FAILURE)
      throw error
    }
  },

  async disconnectExternalAccount ({ commit }) {
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

  async getEthBalance ({ commit, getters }) {
    let value = ZeroStringValue
    try {
      const address = getters.ethAddress

      if (address) {
        const web3 = await web3Util.getInstance()
        const wei = await web3.eth.getBalance(address)
        const balance = web3.utils.fromWei(`${wei}`, 'ether')
        value = new FPNumber(balance).toCodecString()
      }
    } catch (error) {
      console.error(error)
    }

    commit(types.SET_ETHEREUM_BALANCE, value)
    return value
  },

  async getBalanceByEthAddress ({ commit, getters, dispatch }, { address }) {
    let value = ZeroStringValue
    commit(types.GET_BALANCE_REQUEST)
    try {
      const web3 = await web3Util.getInstance()
      const isEther = isEthereumAddress(address)
      if (isEther) {
        value = await dispatch('getEthBalance')
      } else {
        const tokenInstance = new web3.eth.Contract(ABI.balance as any)
        tokenInstance.options.address = address
        const account = getters.ethAddress
        const methodArgs = [account]
        const balanceOfMethod = tokenInstance.methods.balanceOf(...methodArgs)
        const decimalsMethod = tokenInstance.methods.decimals()
        const balance = await balanceOfMethod.call()
        const decimals = await decimalsMethod.call()
        const precision18 = new FPNumber(0)
        value = precision18.add(FPNumber.fromCodecValue(`${balance}`, +decimals)).toCodecString()
      }
      commit(types.GET_BALANCE_SUCCESS)
    } catch (error) {
      console.error(error)
      commit(types.GET_BALANCE_FAILURE)
    }

    return value
  },
  async getEthTokenAddressByAssetId ({ commit, getters }, { address }) {
    commit(types.GET_ETH_TOKEN_ADDRESS_REQUEST)
    try {
      if (!address) {
        commit(types.GET_ETH_TOKEN_ADDRESS_SUCCESS)
        return ''
      }
      const web3 = await web3Util.getInstance()
      const contract = getters[`contract${KnownBridgeAsset.Other}`]
      const contractInstance = new web3.eth.Contract(contract[OtherContractType.Bridge].abi)
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
  async getAllowanceByEthAddress ({ commit, getters }, { address }) {
    commit(types.GET_ALLOWANCE_REQUEST)
    try {
      const contractAddress = getters[`address${KnownBridgeAsset.Other}`]
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
