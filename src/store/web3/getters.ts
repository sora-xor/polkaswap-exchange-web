import { defineGetters } from 'direct-vuex';

import { EVM_NETWORKS, BridgeType } from '@/consts/evm';
import type { EvmNetworkData, KnownEthBridgeAsset } from '@/consts/evm';
import { web3GetterContext } from '@/store/web3';

import type { Web3State } from './types';

const getters = defineGetters<Web3State>()({
  isExternalAccountConnected(...args): boolean {
    const { state } = web3GetterContext(args);
    return !!state.evmAddress && state.evmAddress !== 'undefined';
  },
  availableNetworks(...args): Record<BridgeType, { disabled: boolean; data: EvmNetworkData }[]> {
    const { state } = web3GetterContext(args);
    const format = (id: number) => ({ disabled: !state.evmNetworksChain.includes(id), data: EVM_NETWORKS[id] });
    const hashi = [state.ethBridgeEvmNetwork].map((evmNetworkId) => ({
      disabled: false,
      data: EVM_NETWORKS[evmNetworkId],
    }));
    const evm = state.evmNetworksApp.map(format);

    return {
      [BridgeType.ETH]: hashi,
      [BridgeType.EVM]: evm,
      [BridgeType.SUB]: [],
    };
  },
  connectedEvmNetwork(...args): Nullable<EvmNetworkData> {
    const { state } = web3GetterContext(args);
    return state.evmNetwork ? EVM_NETWORKS[state.evmNetwork] : null;
  },
  selectedEvmNetwork(...args): Nullable<EvmNetworkData> {
    const { state } = web3GetterContext(args);
    return state.evmNetworkSelected ? EVM_NETWORKS[state.evmNetworkSelected] : null;
  },
  isValidNetwork(...args): boolean {
    const { state } = web3GetterContext(args);
    return state.evmNetwork === state.evmNetworkSelected;
  },
  contractAddress(...args): (asset: KnownEthBridgeAsset) => Nullable<string> {
    return (asset: KnownEthBridgeAsset) => {
      const { state } = web3GetterContext(args);
      return state.ethBridgeContractAddress[asset];
    };
  },
});

export default getters;
