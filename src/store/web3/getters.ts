import { defineGetters } from 'direct-vuex';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';

import { web3GetterContext } from '@/store/web3';
import { EVM_NETWORKS } from '@/consts/evm';

import type { EvmNetworkData, KnownEthBridgeAsset } from '@/consts/evm';
import type { Web3State } from './types';

const getters = defineGetters<Web3State>()({
  isExternalAccountConnected(...args): boolean {
    const { state } = web3GetterContext(args);
    return !!state.evmAddress && state.evmAddress !== 'undefined';
  },
  availableNetworks(...args): Record<BridgeNetworkType, { disabled: boolean; data: EvmNetworkData }[]> {
    const { state } = web3GetterContext(args);
    const hashi = [state.ethBridgeEvmNetwork].map((id) => ({
      disabled: false,
      data: EVM_NETWORKS[id],
    }));
    const evm = state.evmNetworksApp.map((id) => ({
      disabled: !state.supportedApps?.[BridgeNetworkType.Evm]?.[id],
      data: EVM_NETWORKS[id],
    }));

    return {
      [BridgeNetworkType.EvmLegacy]: hashi,
      [BridgeNetworkType.Evm]: evm,
      [BridgeNetworkType.Sub]: [],
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
