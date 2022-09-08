import Vue from 'vue';
import { defineMutations } from 'direct-vuex';
import { BridgeNetworks, CodecString } from '@sora-substrate/util';

import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { initialState } from './state';
import type { SubNetwork } from '@/utils/ethers-util';
import type { Web3State } from './types';

const mutations = defineMutations<Web3State>()({
  reset(state): void {
    // we shouldn't reset networks, which were set from env & contracts
    const networkSettingsKeys = ['contractAddress', 'evmNetwork', 'networkType', 'subNetworks', 'smartContracts'];
    const s = initialState();

    Object.keys(s)
      .filter((key) => !networkSettingsKeys.includes(key))
      .forEach((key) => {
        state[key] = s[key];
      });
  },
  setEvmAddress(state, address: string): void {
    state.evmAddress = address;
  },
  resetEvmAddress(state): void {
    state.evmAddress = '';
  },
  setNetworkType(state, networkType: string): void {
    state.networkType = networkType;
  },
  setSubNetworks(state, subNetworks: Array<SubNetwork>): void {
    state.subNetworks = subNetworks;
  },
  setEvmNetwork(state, network: BridgeNetworks): void {
    state.evmNetwork = network;
    ethBridgeApi.externalNetwork = network;
  },
  setEvmBalance(state, balance: CodecString): void {
    state.evmBalance = balance;
  },
  setEthSmartContracts(state, { contracts, address }): void {
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
  setEnergySmartContracts(state, { contracts, address }): void {
    Vue.set(state.smartContracts, BridgeNetworks.ENERGY_NETWORK_ID, {
      OTHER: contracts.OTHER,
    });
    Vue.set(state.contractAddress, BridgeNetworks.ENERGY_NETWORK_ID, {
      OTHER: address.OTHER,
    });
  },
});

export default mutations;
