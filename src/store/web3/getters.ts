import { defineGetters } from 'direct-vuex';

import { web3GetterContext } from '@/store/web3';
import type { Web3State } from './types';
import type { KnownBridgeAsset } from '@/utils/ethers-util';

const getters = defineGetters<Web3State>()({
  contractAbi(...args): (asset: KnownBridgeAsset) => Nullable<any> {
    return (asset: KnownBridgeAsset) => {
      const { state } = web3GetterContext(args);
      return state.smartContracts[state.evmNetwork][asset];
    };
  },
  contractAddress(...args): (asset: KnownBridgeAsset) => Nullable<string> {
    return (asset: KnownBridgeAsset) => {
      const { state } = web3GetterContext(args);
      return state.contractAddress[state.evmNetwork][asset];
    };
  },
  isExternalAccountConnected(...args): boolean {
    const { state } = web3GetterContext(args);
    return !!state.evmAddress && state.evmAddress !== 'undefined';
  },
  defaultNetworkType(...args): Nullable<string> {
    const { state } = web3GetterContext(args);
    return state.subNetworks?.find((network: any) => network.id === state.evmNetwork)?.defaultType;
  },
  isValidNetworkType(...args): boolean {
    const { state, getters } = web3GetterContext(args);
    return state.networkType === getters.defaultNetworkType;
  },
});

export default getters;
