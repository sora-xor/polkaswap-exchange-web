import { CodecString } from '@sora-substrate/util';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { defineMutations } from 'direct-vuex';

import { ZeroStringValue } from '@/consts';
import ethersUtil from '@/utils/ethers-util';

import type { Web3State, EthBridgeSettings, SubNetworkApps } from './types';
import type { EvmNetwork } from '@sora-substrate/util/build/bridgeProxy/evm/types';
import type { SupportedApps, BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';

const mutations = defineMutations<Web3State>()({
  setEvmAddress(state, address: string): void {
    state.evmAddress = address;
    ethersUtil.storeEvmUserAddress(address);
  },
  resetEvmAddress(state): void {
    state.evmAddress = '';
    ethersUtil.removeEvmUserAddress();
  },

  setSubAddress(state, address: string): void {
    state.subAddress = address;
  },

  setEvmNetworksApp(state, networksIds: EvmNetwork[]): void {
    state.evmNetworkApps = networksIds;
  },
  setSubNetworkApps(state, apps: SubNetworkApps): void {
    state.subNetworkApps = apps;
  },
  setSupportedApps(state, supportedApps: SupportedApps): void {
    state.supportedApps = supportedApps;
  },
  // by provider
  setProvidedNetwork(state, networkId: BridgeNetworkId): void {
    state.networkProvided = networkId;
  },
  resetProvidedNetwork(state): void {
    state.networkProvided = null;
  },
  // by user
  setSelectedNetwork(state, networkId: BridgeNetworkId): void {
    state.networkSelected = networkId;
    ethersUtil.storeSelectedNetwork(networkId);
  },
  setEvmBalance(state, balance: CodecString): void {
    state.evmBalance = balance;
  },
  resetEvmBalance(state): void {
    state.evmBalance = ZeroStringValue;
  },

  setNetworkType(state, networkType: BridgeNetworkType) {
    state.networkType = networkType;
    ethersUtil.storeSelectedBridgeType(networkType);
  },

  setSelectNetworkDialogVisibility(state, flag: boolean): void {
    state.selectNetworkDialogVisibility = flag;
  },

  setSelectAccountDialogVisibility(state, flag: boolean): void {
    state.selectAccountDialogVisibility = flag;
  },

  // for hashi bridge
  setEthBridgeSettings(state, { evmNetwork, address }: EthBridgeSettings): void {
    state.ethBridgeEvmNetwork = evmNetwork;
    state.ethBridgeContractAddress = {
      XOR: address.XOR,
      VAL: address.VAL,
      OTHER: address.OTHER,
    };
  },
});

export default mutations;
