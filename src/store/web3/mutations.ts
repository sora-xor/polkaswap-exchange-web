import { defineMutations } from 'direct-vuex';
import { CodecString } from '@sora-substrate/util';

import ethersUtil from '@/utils/ethers-util';
import type { EvmNetwork } from '@sora-substrate/util/build/evm/types';

import { ZeroStringValue } from '@/consts';

import type { Web3State, EthBridgeContractsAddresses, EthBridgeSmartContracts } from './types';
import type { BridgeType } from '@/consts/evm';

const mutations = defineMutations<Web3State>()({
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
  setEthBridgeSettings(
    state,
    {
      evmNetwork,
      address,
      contracts,
    }: { evmNetwork: EvmNetwork; address: EthBridgeContractsAddresses; contracts: EthBridgeSmartContracts }
  ): void {
    state.ethBridgeEvmNetwork = evmNetwork;
    state.ethBridgeContractAddress = {
      XOR: address.XOR,
      VAL: address.VAL,
      OTHER: address.OTHER,
    };
    state.ethBridgeSmartContracts = {
      XOR: contracts.XOR,
      VAL: contracts.VAL,
      OTHER: contracts.OTHER,
    };
  },

  setMoonpayEvmNetwork(state, evmNetwork: EvmNetwork): void {
    state.moonpayEvmNetwork = evmNetwork;
  },
});

export default mutations;
