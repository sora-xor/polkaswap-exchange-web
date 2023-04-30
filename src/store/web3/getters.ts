import { defineGetters } from 'direct-vuex';

import { web3GetterContext } from '@/store/web3';
import { EVM_NETWORKS, BridgeType } from '@/consts/evm';

import type { EvmNetworkData } from '@/consts/evm';
import type { Web3State } from './types';

const getters = defineGetters<Web3State>()({
  isExternalAccountConnected(...args): boolean {
    const { state } = web3GetterContext(args);
    return !!state.evmAddress && state.evmAddress !== 'undefined';
  },
  availableNetworks(...args): Record<BridgeType, EvmNetworkData[]> {
    const { state } = web3GetterContext(args);
    const hashi = [state.ethBridgeEvmNetwork].map((evmNetworkId) => EVM_NETWORKS[evmNetworkId]);
    const evm = state.evmNetworksIds.map((evmNetworkId) => EVM_NETWORKS[evmNetworkId]);

    return {
      [BridgeType.HASHI]: hashi,
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
});

export default getters;
