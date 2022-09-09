import { defineGetters } from 'direct-vuex';

import { web3GetterContext } from '@/store/web3';
import { EVM_NETWORKS } from '@/consts/evm';

import type { EvmNetworkData } from '@/consts/evm';
import type { Web3State } from './types';

const getters = defineGetters<Web3State>()({
  isExternalAccountConnected(...args): boolean {
    const { state } = web3GetterContext(args);
    return !!state.evmAddress && state.evmAddress !== 'undefined';
  },
  availableEvmNetworks(...args): EvmNetworkData[] {
    const { state } = web3GetterContext(args);
    return state.evmNetworksIds.map((evmNetworkId) => EVM_NETWORKS[evmNetworkId]);
  },
  connectedEvmNetwork(...args): Nullable<EvmNetworkData> {
    const { state } = web3GetterContext(args);
    return EVM_NETWORKS[state.evmNetwork];
  },
  selectedEvmNetwork(...args): Nullable<EvmNetworkData> {
    const { state } = web3GetterContext(args);
    return EVM_NETWORKS[state.evmNetworkSelected];
  },
  isValidNetwork(...args): boolean {
    const { state } = web3GetterContext(args);
    return state.evmNetwork === state.evmNetworkSelected;
  },
});

export default getters;
