import { defineMutations } from 'direct-vuex';
import { CodecString } from '@sora-substrate/util';

import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { initialState } from './state';

import type { EvmNetworkId } from '@/consts/evm';
import type { EthBridgeContracts } from '@/utils/bridge/eth/types';
import type { Web3State } from './types';

const mutations = defineMutations<Web3State>()({
  reset(state): void {
    // we shouldn't reset networks, which were set from env & contracts
    const networkSettingsKeys = ['evmNetwork', 'evmNetworksIds', 'evmNetworkSelected', 'ethBridge'];
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
  setEvmNetworksIds(state, networksIds: EvmNetworkId[]): void {
    state.evmNetworksIds = networksIds;
  },
  // by provider
  setEvmNetwork(state, networkId: EvmNetworkId): void {
    state.evmNetwork = networkId;
  },
  // by user
  setSelectedEvmNetwork(state, networkId: EvmNetworkId): void {
    state.evmNetwork = networkId;
    evmBridgeApi.externalNetwork = networkId;
  },
  setEvmBalance(state, balance: CodecString): void {
    state.evmBalance = balance;
  },
  // for eth bridge history
  setEthBridgeSettings(
    state,
    { evmNetwork, address }: { evmNetwork: EvmNetworkId; address: EthBridgeContracts }
  ): void {
    state.ethBridge.evmNetwork = evmNetwork;
    state.ethBridge.contractAddress = {
      XOR: address.XOR,
      VAL: address.VAL,
      OTHER: address.OTHER,
    };
  },
});

export default mutations;
