import Vue from 'vue'
import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import concat from 'lodash/fp/concat'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import { api, FPNumber, BridgeNetworks } from '@sora-substrate/util'

import web3Util, { ABI, Contract, EvmNetworkTypeName, KnownBridgeAsset, OtherContractType, ContractNetwork, EvmNetworkType, EvmNetwork, SubNetwork } from '@/utils/web3-util'
import { ZeroStringValue } from '@/consts'
import { isEthereumAddress } from '@/utils'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'RESET',
    'SET_ETHEREUM_SMART_CONTRACTS',
    'SET_ENERGY_SMART_CONTRACTS',
    'SET_EVM_BALANCE',
    'SET_DEFAULT_NETWORK_TYPE',
    'SET_SORA_NETWORK',
    'SET_SUB_NETWORKS',
    'SET_ENV_NETWORK'
  ]),
  map(x => [x, x]),
  fromPairs
)([
  'CONNECT_EVM_WALLET',
  'SWITCH_EVM_WALLET',
  'SET_NETWORK_TYPE',
  'DISCONNECT_EVM_WALLET',
  'GET_BALANCE',
  'GET_EVM_TOKEN_ADDRESS',
  'GET_ALLOWANCE'
])

function initialState () {
  return {
    soraNetwork: '',
    evmAddress: web3Util.getEvmUserAddress(),
    evmBalance: ZeroStringValue,
    networkType: web3Util.getNetworkTypeFromStorage(),
    defaultNetworkType: '',
    subNetworks: [],
    evmNetwork: 0,
    contractAddress: {
      ethereum: {
        XOR: '',
        VAL: '',
        OTHER: ''
      },
      energy: {
        OTHER: ''
      }
    },
    smartContracts: {
      ethereum: {
        XOR: '',
        VAL: '',
        OTHER: ''
      },
      energy: {
        OTHER: ''
      }
    }
  }
}

const state = initialState()

const getters = {
  contractAbi (state, asset: KnownBridgeAsset) {
    return state.smartContracts[state.evmNetwork][asset].abi
  },
  contractAddress (state, asset: KnownBridgeAsset) {
    return state.contractAddress[state.evmNetwork][asset]
  },
  isExternalAccountConnected (state) {
    return !!state.evmAddress && state.evmAddress !== 'undefined'
  },
  evmAddress (state) {
    return state.evmAddress
  },
  evmBalance (state) {
    return state.evmBalance
  },
  networkType (state) {
    return state.networkType
  },
  defaultNetworkType (state) {
    return state.defaultNetworkType
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
  isValidNetworkType (state) {
    return state.networkType === state.defaultNetworkType
  }
}

const mutations = {
  [types.RESET] (state) {
    // we shouldn't reset networks, setted from env & contracts
    const networkSettingsKeys = ['soraNetwork', 'defaultNetworkType', 'contractAddress', 'subNetworks', 'smartContracts']
    const s = initialState()

    Object.keys(s).filter(key => !networkSettingsKeys.includes(key)).forEach(key => {
      state[key] = s[key]
    })
  },

  [types.CONNECT_EVM_WALLET_REQUEST] () {},
  [types.CONNECT_EVM_WALLET_SUCCESS] (state, address) {
    state.evmAddress = address
  },
  [types.CONNECT_EVM_WALLET_FAILURE] () {},

  [types.SWITCH_EVM_WALLET_REQUEST] () {},
  [types.SWITCH_EVM_WALLET_SUCCESS] (state, address) {
    state.evmAddress = address
  },
  [types.SWITCH_EVM_WALLET_FAILURE] () {},

  [types.SET_NETWORK_TYPE_REQUEST] () {},
  [types.SET_NETWORK_TYPE_SUCCESS] (state, networkType) {
    state.networkType = networkType
  },
  [types.SET_NETWORK_TYPE_FAILURE] () {},

  [types.SET_DEFAULT_NETWORK_TYPE] (state, networkType) {
    state.defaultNetworkType = networkType
  },

  [types.SET_SUB_NETWORKS] (state, networks) {
    state.subNetworks = networks
  },

  [types.SET_ENV_NETWORK] (state, network) {
    state.evmNetwork = network
  },

  [types.SET_SORA_NETWORK] (state, network) {
    state.soraNetwork = network
  },
  [types.SET_NETWORK_TYPE_REQUEST] () {},
  [types.SET_NETWORK_TYPE_SUCCESS] (state, network) {
    state.networkType = network
  },
  [types.SET_NETWORK_TYPE_FAILURE] () {},

  [types.SET_SORA_NETWORK] (state, network) {
    state.soraNetwork = network
  },

  [types.DISCONNECT_EVM_WALLET_REQUEST] () {},
  [types.DISCONNECT_EVM_WALLET_SUCCESS] (state) {
    state.evmAddress = ''
  },
  [types.DISCONNECT_EVM_WALLET_FAILURE] () {},

  [types.SET_ETHEREUM_SMART_CONTRACTS] (state, { contracts, address }) {
    Vue.set(state.smartContracts, EvmNetwork.Ethereum, {
      XOR: contracts.XOR,
      VAL: contracts.VAL,
      OTHER: contracts.OTHER
    })
    Vue.set(state.contractAddress, EvmNetwork.Ethereum, {
      XOR: address.XOR,
      VAL: address.VAL,
      OTHER: address.OTHER
    })
  },

  [types.SET_ENERGY_SMART_CONTRACTS] (state, { contracts, address }) {
    Vue.set(state.smartContracts, EvmNetwork.Energy, {
      OTHER: contracts.OTHER
    })
    Vue.set(state.contractAddress, EvmNetwork.Energy, {
      OTHER: address.OTHER
    })
  },

  [types.SET_EVM_BALANCE] (state, balance) {
    state.evmBalance = balance
  },

  [types.GET_BALANCE_REQUEST] (state) {},
  [types.GET_BALANCE_SUCCESS] (state) {},
  [types.GET_BALANCE_FAILURE] (state) {},

  [types.GET_EVM_TOKEN_ADDRESS_REQUEST] (state) {},
  [types.GET_EVM_TOKEN_ADDRESS_SUCCESS] (state) {},
  [types.GET_EVM_TOKEN_ADDRESS_FAILURE] (state) {},

  [types.GET_ALLOWANCE_REQUEST] (state) {},
  [types.GET_ALLOWANCE_SUCCESS] (state) {},
  [types.GET_ALLOWANCE_FAILURE] (state) {}
}

const actions = {
  async connectExternalAccount ({ commit, getters, dispatch }, { provider }) {
    commit(types.CONNECT_EVM_WALLET_REQUEST)
    try {
      const address = await web3Util.onConnect({ provider })
      web3Util.storeEvmUserAddress(address)
      commit(types.CONNECT_EVM_WALLET_SUCCESS, address)

      // get ethereum balance
      await dispatch('getEvmBalance')
    } catch (error) {
      commit(types.CONNECT_EVM_WALLET_FAILURE)
      throw error
    }
  },

  async switchExternalAccount ({ commit, dispatch }, { address = '' } = {}) {
    commit(types.SWITCH_EVM_WALLET_REQUEST)
    try {
      web3Util.removeEvmUserAddress()
      web3Util.storeEvmUserAddress(address)
      commit(types.SWITCH_EVM_WALLET_SUCCESS, address)

      // get ethereum balance
      await dispatch('getEvmBalance')
    } catch (error) {
      commit(types.SWITCH_EVM_WALLET_FAILURE)
      throw error
    }
  },

  async setSoraNetwork ({ commit }, network) {
    commit(types.SET_SORA_NETWORK, network)
  },

  async setSubNetworks ({ commit }, subNetworks: Array<SubNetwork>) {
    commit(types.SET_SUB_NETWORKS, subNetworks)
  },

  async setEvmNetwork ({ commit, dispatch }, networkId: BridgeNetworks) {
    api.bridge.externalNetwork = networkId
    await dispatch('setDefaultNetworkType', networkId)
    commit(types.SET_ENV_NETWORK, networkId)
  },

  async setDefaultNetworkType ({ commit, getters }, networkId: BridgeNetworks) {
    const network: SubNetwork | undefined = getters.subNetworks.find(
      (network: SubNetwork) => network.id === networkId
    )
    commit(types.SET_DEFAULT_NETWORK_TYPE, network?.defaultType)
  },

  async setNetworkType ({ commit }, network) {
    commit(types.SET_NETWORK_TYPE_REQUEST)
    try {
      const networkType = network
        ? EvmNetworkTypeName[network]
        : await web3Util.getNetworkType()
      web3Util.storeNetworkType(networkType)
      commit(types.SET_NETWORK_TYPE_SUCCESS, networkType)
    } catch (error) {
      commit(types.SET_NETWORK_TYPE_FAILURE)
      throw error
    }
  },

  async disconnectExternalAccount ({ commit }) {
    commit(types.DISCONNECT_EVM_WALLET_REQUEST)
    try {
      web3Util.removeEvmUserAddress()
      commit(types.DISCONNECT_EVM_WALLET_SUCCESS)
      commit(types.RESET)
    } catch (error) {
      commit(types.DISCONNECT_EVM_WALLET_FAILURE)
      throw error
    }
  },

  async setSmartContracts ({ commit, dispatch }, subNetworks: Array<SubNetwork>) {
    for (const network of subNetworks) {
      if (network.id === BridgeNetworks.ETH_NETWORK_ID) {
        dispatch('setEvmSmartContracts', network)
      }
      if (network.id === BridgeNetworks.ENERGY_NETWORK_ID) {
        dispatch('setEnergySmartContracts', network)
      }
    }
  },

  async setEvmSmartContracts ({ commit }, network: SubNetwork) {
    const INTERNAL = await web3Util.readSmartContract(
      ContractNetwork.Ethereum,
      `${Contract.Internal}/Master.json`
    )
    const BRIDGE = await web3Util.readSmartContract(
      ContractNetwork.Ethereum,
      `${Contract.Other}/Bridge.json`
    )
    const ERC20 = await web3Util.readSmartContract(
      ContractNetwork.Ethereum,
      `${Contract.Other}/ERC20.json`
    )
    commit(types.SET_ETHEREUM_SMART_CONTRACTS, {
      address: {
        XOR: network.CONTRACTS.XOR.MASTER,
        VAL: network.CONTRACTS.VAL.MASTER,
        OTHER: network.CONTRACTS.OTHER.MASTER
      },
      contracts: {
        XOR: INTERNAL,
        VAL: INTERNAL,
        OTHER: { BRIDGE, ERC20 }
      }
    })
  },

  async setEnergySmartContracts ({ commit }, network: SubNetwork) {
    const BRIDGE = await web3Util.readSmartContract(
      ContractNetwork.Other,
      'BridgeEVM.json'
    )
    commit(types.SET_ENERGY_SMART_CONTRACTS, {
      address: { OTHER: network.CONTRACTS.OTHER.MASTER },
      contracts: { OTHER: { BRIDGE } }
    })
  },

  async getEvmBalance ({ commit, getters }) {
    let value = ZeroStringValue
    try {
      const address = getters.evmAddress

      if (address) {
        const web3 = await web3Util.getInstance()
        const wei = await web3.eth.getBalance(address)
        const balance = web3.utils.fromWei(`${wei}`, 'ether')
        value = new FPNumber(balance).toCodecString()
      }
    } catch (error) {
      console.error(error)
    }

    commit(types.SET_EVM_BALANCE, value)
    return value
  },

  async getBalanceByEvmAddress ({ commit, getters, dispatch }, { address }) {
    let value = ZeroStringValue
    commit(types.GET_BALANCE_REQUEST)
    try {
      const web3 = await web3Util.getInstance()
      const isEther = isEthereumAddress(address)
      if (isEther) {
        value = await dispatch('getEvmBalance')
      } else {
        const tokenInstance = new web3.eth.Contract(ABI.balance as any)
        tokenInstance.options.address = address
        const account = getters.evmAddress
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
  async getEvmTokenAddressByAssetId ({ commit, getters }, { address }) {
    commit(types.GET_EVM_TOKEN_ADDRESS_REQUEST)
    try {
      if (!address) {
        commit(types.GET_EVM_TOKEN_ADDRESS_SUCCESS)
        return ''
      }
      const web3 = await web3Util.getInstance()
      const contractAbi = getters.contractAbi(KnownBridgeAsset.Other)
      const contractInstance = new web3.eth.Contract(contractAbi)
      const contractAddress = getters.contractAddress(KnownBridgeAsset.Other)
      contractInstance.options.address = contractAddress.MASTER
      const methodArgs = [address]
      const contractMethod = contractInstance.methods._sidechainTokens(...methodArgs)
      const externalAddress = await contractMethod.call()
      commit(types.GET_EVM_TOKEN_ADDRESS_SUCCESS)
      return externalAddress
    } catch (error) {
      console.error(error)
      commit(types.GET_EVM_TOKEN_ADDRESS_FAILURE)
      return ''
    }
  },
  async getAllowanceByEvmAddress ({ commit, getters }, { address }) {
    commit(types.GET_ALLOWANCE_REQUEST)
    try {
      const contractAddress = getters.contractAddress(KnownBridgeAsset.Other)
      const web3 = await web3Util.getInstance()
      const tokenInstance = new web3.eth.Contract(ABI.allowance as any)
      tokenInstance.options.address = address
      const account = getters.evmAddress
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
