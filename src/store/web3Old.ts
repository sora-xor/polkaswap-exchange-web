import Vue from 'vue';
import map from 'lodash/fp/map';
import flatMap from 'lodash/fp/flatMap';
import concat from 'lodash/fp/concat';
import fromPairs from 'lodash/fp/fromPairs';
import flow from 'lodash/fp/flow';
import { ethers } from 'ethers';
import { FPNumber, BridgeNetworks } from '@sora-substrate/util';

import { bridgeApi } from '@/utils/bridge';
import ethersUtil, {
  ABI,
  Contract,
  EvmNetworkTypeName,
  KnownBridgeAsset,
  ContractNetwork,
  SubNetwork,
  OtherContractType,
} from '@/utils/ethers-util';
import { ZeroStringValue } from '@/consts';
import { isEthereumAddress } from '@/utils';

const types = flow(
  flatMap((x) => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'RESET',
    'SET_ETHEREUM_SMART_CONTRACTS',
    'SET_ENERGY_SMART_CONTRACTS',
    'SET_EVM_BALANCE',
    'SET_SUB_NETWORKS',
    'SET_ENV_NETWORK',
  ]),
  map((x) => [x, x]),
  fromPairs
)(['CONNECT_EVM_WALLET', 'SWITCH_EVM_WALLET', 'SET_NETWORK_TYPE', 'DISCONNECT_EVM_WALLET']);

function initialState() {
  return {
    evmAddress: ethersUtil.getEvmUserAddress(),
    evmBalance: ZeroStringValue,
    networkType: ethersUtil.getEvmNetworkTypeFromStorage(),
    subNetworks: [],
    evmNetwork: BridgeNetworks.ETH_NETWORK_ID,
    contractAddress: {
      [BridgeNetworks.ETH_NETWORK_ID]: {
        XOR: '',
        VAL: '',
        OTHER: '',
      },
      [BridgeNetworks.ENERGY_NETWORK_ID]: {
        OTHER: '',
      },
    },
    smartContracts: {
      [BridgeNetworks.ETH_NETWORK_ID]: {
        XOR: '',
        VAL: '',
        OTHER: '',
      },
      [BridgeNetworks.ENERGY_NETWORK_ID]: {
        OTHER: '',
      },
    },
  };
}

const state = initialState();

const getters = {
  contractAbi: (state) => (asset: KnownBridgeAsset) => {
    return state.smartContracts[state.evmNetwork][asset];
  },
  contractAddress: (state) => (asset: KnownBridgeAsset) => {
    return state.contractAddress[state.evmNetwork][asset];
  },
  isExternalAccountConnected(state) {
    return !!state.evmAddress && state.evmAddress !== 'undefined';
  },
  evmAddress(state) {
    return state.evmAddress;
  },
  defaultNetworkType(state) {
    return state.subNetworks?.find((network) => network.id === state.evmNetwork)?.defaultType;
  },
  evmNetwork(state) {
    return state.evmNetwork;
  },
  isValidNetworkType(state, getters) {
    return state.networkType === getters.defaultNetworkType;
  },
};

const mutations = {
  [types.RESET](state) {
    // we shouldn't reset networks, setted from env & contracts
    const networkSettingsKeys = ['contractAddress', 'subNetworks', 'smartContracts'];
    const s = initialState();

    Object.keys(s)
      .filter((key) => !networkSettingsKeys.includes(key))
      .forEach((key) => {
        state[key] = s[key];
      });
  },

  [types.CONNECT_EVM_WALLET_REQUEST]() {},
  [types.CONNECT_EVM_WALLET_SUCCESS](state, address) {
    state.evmAddress = address;
  },
  [types.CONNECT_EVM_WALLET_FAILURE]() {},

  [types.SWITCH_EVM_WALLET_REQUEST]() {},
  [types.SWITCH_EVM_WALLET_SUCCESS](state, address) {
    state.evmAddress = address;
  },
  [types.SWITCH_EVM_WALLET_FAILURE]() {},

  [types.SET_NETWORK_TYPE_REQUEST]() {},
  [types.SET_NETWORK_TYPE_SUCCESS](state, networkType) {
    state.networkType = networkType;
  },
  [types.SET_NETWORK_TYPE_FAILURE]() {},

  [types.SET_SUB_NETWORKS](state, networks) {
    state.subNetworks = networks;
  },

  [types.SET_ENV_NETWORK](state, network) {
    state.evmNetwork = network;
  },

  [types.DISCONNECT_EVM_WALLET_REQUEST]() {},
  [types.DISCONNECT_EVM_WALLET_SUCCESS](state) {
    state.evmAddress = '';
  },
  [types.DISCONNECT_EVM_WALLET_FAILURE]() {},

  [types.SET_ETHEREUM_SMART_CONTRACTS](state, { contracts, address }) {
    Vue.set(state.smartContracts, BridgeNetworks.ETH_NETWORK_ID, {
      XOR: contracts.XOR,
      VAL: contracts.VAL,
      OTHER: contracts.OTHER,
    });
    Vue.set(state.contractAddress, BridgeNetworks.ETH_NETWORK_ID, {
      XOR: address.XOR,
      VAL: address.VAL,
      OTHER: address.OTHER,
    });
  },

  [types.SET_ENERGY_SMART_CONTRACTS](state, { contracts, address }) {
    Vue.set(state.smartContracts, BridgeNetworks.ENERGY_NETWORK_ID, {
      OTHER: contracts.OTHER,
    });
    Vue.set(state.contractAddress, BridgeNetworks.ENERGY_NETWORK_ID, {
      OTHER: address.OTHER,
    });
  },

  [types.SET_EVM_BALANCE](state, balance) {
    state.evmBalance = balance;
  },
};

const actions = {
  async connectExternalAccount({ commit }, { provider }) {
    commit(types.CONNECT_EVM_WALLET_REQUEST);
    try {
      const address = await ethersUtil.onConnect({ provider });
      ethersUtil.storeEvmUserAddress(address);
      commit(types.CONNECT_EVM_WALLET_SUCCESS, address);
    } catch (error) {
      commit(types.CONNECT_EVM_WALLET_FAILURE);
      throw error;
    }
  },

  async switchExternalAccount({ commit }, { address = '' } = {}) {
    commit(types.SWITCH_EVM_WALLET_REQUEST);
    try {
      ethersUtil.removeEvmUserAddress();
      ethersUtil.storeEvmUserAddress(address);
      commit(types.SWITCH_EVM_WALLET_SUCCESS, address);
    } catch (error) {
      commit(types.SWITCH_EVM_WALLET_FAILURE);
      throw error;
    }
  },

  async setSubNetworks({ commit }, subNetworks: Array<SubNetwork>) {
    commit(types.SET_SUB_NETWORKS, subNetworks);
  },

  async setEvmNetwork({ commit }, networkId: BridgeNetworks) {
    bridgeApi.externalNetwork = networkId;
    commit(types.SET_ENV_NETWORK, networkId);
  },

  async setEvmNetworkType({ commit }, network) {
    commit(types.SET_NETWORK_TYPE_REQUEST);
    try {
      const networkType = network ? EvmNetworkTypeName[network] : await ethersUtil.getEvmNetworkType();
      ethersUtil.storeEvmNetworkType(networkType);
      commit(types.SET_NETWORK_TYPE_SUCCESS, networkType);
    } catch (error) {
      commit(types.SET_NETWORK_TYPE_FAILURE);
      throw error;
    }
  },

  async disconnectExternalAccount({ commit }) {
    commit(types.DISCONNECT_EVM_WALLET_REQUEST);
    try {
      ethersUtil.removeEvmUserAddress();
      commit(types.DISCONNECT_EVM_WALLET_SUCCESS);
      commit(types.RESET);
    } catch (error) {
      commit(types.DISCONNECT_EVM_WALLET_FAILURE);
      throw error;
    }
  },

  async setSmartContracts({ dispatch }, subNetworks: Array<SubNetwork>) {
    for (const network of subNetworks) {
      switch (network.id) {
        case BridgeNetworks.ETH_NETWORK_ID:
          await dispatch('setEvmSmartContracts', network);
          break;
        case BridgeNetworks.ENERGY_NETWORK_ID:
          // TODO: [BRIDGE] Reduce file size
          // await dispatch('setEnergySmartContracts', network)
          break;
      }
    }
  },

  async setEvmSmartContracts({ commit }, network: SubNetwork) {
    const INTERNAL = await ethersUtil.readSmartContract(ContractNetwork.Ethereum, `${Contract.Internal}/MASTER.json`);
    const BRIDGE = await ethersUtil.readSmartContract(
      ContractNetwork.Ethereum,
      `${Contract.Other}/${OtherContractType.Bridge}.json`
    );
    const ERC20 = await ethersUtil.readSmartContract(
      ContractNetwork.Ethereum,
      `${Contract.Other}/${OtherContractType.ERC20}.json`
    );
    commit(types.SET_ETHEREUM_SMART_CONTRACTS, {
      address: {
        XOR: network.CONTRACTS.XOR.MASTER,
        VAL: network.CONTRACTS.VAL.MASTER,
        OTHER: network.CONTRACTS.OTHER.MASTER,
      },
      contracts: {
        XOR: INTERNAL,
        VAL: INTERNAL,
        OTHER: { BRIDGE, ERC20 },
      },
    });
  },

  async setEnergySmartContracts({ commit }, network: SubNetwork) {
    const BRIDGE = await ethersUtil.readSmartContract(ContractNetwork.Other, `${OtherContractType.Bridge}.json`);
    const ERC20 = await ethersUtil.readSmartContract(ContractNetwork.Other, `${OtherContractType.ERC20}.json`);
    commit(types.SET_ENERGY_SMART_CONTRACTS, {
      address: { OTHER: network.CONTRACTS.OTHER.MASTER },
      contracts: { OTHER: { BRIDGE, ERC20 } },
    });
  },

  async getEvmBalance({ commit, getters }) {
    let value = ZeroStringValue;
    try {
      const address = getters.evmAddress;

      if (address) {
        const ethersInstance = await ethersUtil.getEthersInstance();
        const wei = await ethersInstance.getBalance(address);
        const balance = ethers.utils.formatEther(wei.toString());
        value = new FPNumber(balance).toCodecString();
      }
    } catch (error) {
      console.error(error);
    }

    commit(types.SET_EVM_BALANCE, value);
    return value;
  },

  async getBalanceByEvmAddress({ getters, dispatch }, { address }) {
    let value = ZeroStringValue;
    let decimals = 18;
    const account = getters.evmAddress;
    if (!account) {
      return { value, decimals };
    }
    try {
      const ethersInstance = await ethersUtil.getEthersInstance();
      const isNativeEvmToken = isEthereumAddress(address);
      if (isNativeEvmToken) {
        value = await dispatch('getEvmBalance');
      } else {
        const tokenInstance = new ethers.Contract(address, ABI.balance, ethersInstance.getSigner());
        const methodArgs = [account];
        const balance = await tokenInstance.balanceOf(...methodArgs);
        decimals = await tokenInstance.decimals();
        value = FPNumber.fromCodecValue(balance._hex, +decimals).toCodecString();
      }
    } catch (error) {
      console.error(`There was a problem with "${address}" token registration flow`, error);
    }

    return { value, decimals };
  },

  async getEvmTokenAddressByAssetId({ getters }, { address }) {
    try {
      if (!address) {
        return '';
      }
      const ethersInstance = await ethersUtil.getEthersInstance();
      const contractAbi = getters.contractAbi(KnownBridgeAsset.Other)[OtherContractType.Bridge].abi;
      const contractAddress = getters.contractAddress(KnownBridgeAsset.Other);
      const contractInstance = new ethers.Contract(contractAddress, contractAbi, ethersInstance.getSigner());
      const methodArgs = [address];
      const externalAddress = await contractInstance._sidechainTokens(...methodArgs);
      return externalAddress;
    } catch (error) {
      console.error(error);
      return '';
    }
  },

  async getAllowanceByEvmAddress({ getters }, { address }) {
    try {
      const contractAddress = getters.contractAddress(KnownBridgeAsset.Other);
      const ethersInstance = await ethersUtil.getEthersInstance();
      const tokenInstance = new ethers.Contract(address, ABI.allowance, ethersInstance.getSigner());
      const account = getters.evmAddress;
      const methodArgs = [account, contractAddress];
      const allowance = await tokenInstance.allowance(...methodArgs);
      return FPNumber.fromCodecValue(allowance._hex).toString();
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
};

export default {
  namespaced: true,
  types,
  state,
  getters,
  mutations,
  actions,
};
