import { defineGetters } from 'direct-vuex';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';

import { web3GetterContext } from '@/store/web3';
import { EVM_NETWORKS } from '@/consts/evm';
import { SUB_NETWORKS } from '@/consts/sub';

import type { KnownEthBridgeAsset } from '@/consts/evm';
import type { NetworkData } from '@/types/bridge';
import type { Web3State } from './types';

type AvailableNetwork = {
  disabled: boolean;
  data: NetworkData;
};

const getters = defineGetters<Web3State>()({
  isExternalAccountConnected(...args): boolean {
    const { state } = web3GetterContext(args);
    return !!state.evmAddress && state.evmAddress !== 'undefined';
  },
  availableNetworks(...args): Record<BridgeNetworkType, AvailableNetwork[]> {
    const { state } = web3GetterContext(args);

    const hashi = [state.ethBridgeEvmNetwork].map((id) => ({
      disabled: false,
      data: EVM_NETWORKS[id],
    }));

    const evm = state.evmNetworksApp.reduce<AvailableNetwork[]>((buffer, id) => {
      const data = EVM_NETWORKS[id];

      if (data) {
        buffer.push({
          disabled: !state.supportedApps?.[BridgeNetworkType.Evm]?.[id],
          data: EVM_NETWORKS[id],
        });
      }

      return buffer;
    }, []);

    const sub = state.subNetworksApp.reduce<AvailableNetwork[]>((buffer, id) => {
      const data = SUB_NETWORKS[id];

      if (data) {
        buffer.push({
          disabled: !state.supportedApps?.[BridgeNetworkType.Sub]?.[id],
          data,
        });
      }

      return buffer;
    }, []);

    return {
      [BridgeNetworkType.EvmLegacy]: hashi,
      [BridgeNetworkType.Evm]: evm,
      [BridgeNetworkType.Sub]: sub,
    };
  },
  providedNetwork(...args): Nullable<NetworkData> {
    const { state } = web3GetterContext(args);

    if (!state.networkProvided) return null;

    if (state.networkType === BridgeNetworkType.Sub) {
      // [TODO]: sub networks
      return EVM_NETWORKS[state.networkProvided] ?? null;
    } else {
      return EVM_NETWORKS[state.networkProvided] ?? null;
    }
  },
  selectedNetwork(...args): Nullable<NetworkData> {
    const { state } = web3GetterContext(args);
    if (!state.networkSelected) return null;

    if (state.networkType === BridgeNetworkType.Sub) {
      // [TODO]: sub networks
      return EVM_NETWORKS[state.networkSelected] ?? null;
    } else {
      return EVM_NETWORKS[state.networkSelected] ?? null;
    }
  },
  isValidNetwork(...args): boolean {
    const { state } = web3GetterContext(args);
    return state.networkProvided === state.networkSelected;
  },
  contractAddress(...args): (asset: KnownEthBridgeAsset) => Nullable<string> {
    return (asset: KnownEthBridgeAsset) => {
      const { state } = web3GetterContext(args);
      return state.ethBridgeContractAddress[asset];
    };
  },
});

export default getters;
