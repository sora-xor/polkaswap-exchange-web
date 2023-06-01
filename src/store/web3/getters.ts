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
  externalAccount(...args): string {
    const { state, rootState } = web3GetterContext(args);

    if (state.networkType === BridgeNetworkType.Sub) {
      // [TODO] use state.subAddress
      return rootState.wallet.account.address;
    } else {
      return state.evmAddress;
    }
  },
  isExternalAccountConnected(...args): boolean {
    const { getters } = web3GetterContext(args);

    return !!getters.externalAccount && getters.externalAccount !== 'undefined';
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
          disabled: !state.supportedApps?.[BridgeNetworkType.Sub]?.includes(id),
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

    const networks = state.networkType === BridgeNetworkType.Sub ? SUB_NETWORKS : EVM_NETWORKS;

    return networks[state.networkProvided] ?? null;
  },
  selectedNetwork(...args): Nullable<NetworkData> {
    const { state } = web3GetterContext(args);

    if (!state.networkSelected) return null;

    const networks = state.networkType === BridgeNetworkType.Sub ? SUB_NETWORKS : EVM_NETWORKS;

    return networks[state.networkSelected] ?? null;
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
