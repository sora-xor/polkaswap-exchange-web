import { defineMutations } from 'direct-vuex';
import { CodecString } from '@sora-substrate/util';

import ethersUtil from '@/utils/ethers-util';
import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { initialState } from './state';
import type { EvmNetwork } from '@sora-substrate/util/build/evm/types';

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
    ethersUtil.storeEvmUserAddress(address);
  },
  resetEvmAddress(state): void {
    state.evmAddress = '';
    ethersUtil.removeEvmUserAddress();
  },
  setEvmNetworksIds(state, networksIds: EvmNetwork[]): void {
    state.evmNetworksIds = networksIds;
  },
  // by provider
  setEvmNetwork(state, networkId: EvmNetwork): void {
    state.evmNetwork = networkId;
  },
  // by user
  setSelectedEvmNetwork(state, networkId: EvmNetwork): void {
    state.evmNetworkSelected = networkId;
    ethersUtil.storeSelectedEvmNetwork(networkId);
    evmBridgeApi.externalNetwork = networkId;
  },
  setEvmBalance(state, balance: CodecString): void {
    state.evmBalance = balance;
  },

  setSelectNetworkDialogVisibility(state, flag: boolean): void {
    state.selectNetworkDialogVisibility = flag;
  },

  // for eth bridge history
  setEthBridgeSettings(state, { evmNetwork, address }: { evmNetwork: EvmNetwork; address: EthBridgeContracts }): void {
    state.ethBridgeEvmNetwork = evmNetwork;
    state.ethBridgeContractAddress = {
      XOR: address.XOR,
      VAL: address.VAL,
      OTHER: address.OTHER,
    };
  },

  setMoonpayEvmNetwork(state, evmNetwork: EvmNetwork): void {
    state.moonpayEvmNetwork = evmNetwork;
  },
});

export default mutations;
