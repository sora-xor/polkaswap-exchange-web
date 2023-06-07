import { CodecString } from '@sora-substrate/util';
import { defineMutations } from 'direct-vuex';

import { ZeroStringValue } from '@/consts';
import type { BridgeType } from '@/consts/evm';
import ethersUtil from '@/utils/ethers-util';

import type { Web3State, EthBridgeSettings } from './types';
import type { EvmNetwork } from '@sora-substrate/util/build/evm/types';

const mutations = defineMutations<Web3State>()({
  setEvmAddress(state, address: string): void {
    state.evmAddress = address;
    ethersUtil.storeEvmUserAddress(address);
  },
  resetEvmAddress(state): void {
    state.evmAddress = '';
    ethersUtil.removeEvmUserAddress();
  },
  setEvmNetworksApp(state, networksIds: EvmNetwork[]): void {
    state.evmNetworksApp = networksIds;
  },
  setEvmNetworksChain(state, networksIds: EvmNetwork[]): void {
    state.evmNetworksChain = networksIds;
  },
  // by provider
  setEvmNetwork(state, networkId: EvmNetwork): void {
    state.evmNetwork = networkId;
  },
  resetEvmNetwork(state): void {
    state.evmNetwork = null;
  },
  // by user
  setSelectedEvmNetwork(state, networkId: EvmNetwork): void {
    state.evmNetworkSelected = networkId;
    ethersUtil.storeSelectedEvmNetwork(networkId);
  },
  setEvmBalance(state, balance: CodecString): void {
    state.evmBalance = balance;
  },
  resetEvmBalance(state): void {
    state.evmBalance = ZeroStringValue;
  },

  setNetworkType(state, networkType: BridgeType) {
    state.networkType = networkType;
    ethersUtil.storeSelectedBridgeType(networkType);
  },

  setSelectNetworkDialogVisibility(state, flag: boolean): void {
    state.selectNetworkDialogVisibility = flag;
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
