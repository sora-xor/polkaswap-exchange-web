import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import { defineGetters } from 'direct-vuex';

import { EVM_NETWORKS } from '@/consts/evm';
import type { KnownEthBridgeAsset } from '@/consts/evm';
import { SUB_NETWORKS } from '@/consts/sub';
import { web3GetterContext } from '@/store/web3';
import type { NetworkData } from '@/types/bridge';
import { subBridgeApi } from '@/utils/bridge/sub/api';

import type { Web3State, AvailableNetwork } from './types';
import type { BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';

const getters = defineGetters<Web3State>()({
  externalAccount(...args): string {
    const { state } = web3GetterContext(args);

    if (state.networkType === BridgeNetworkType.Sub) {
      return state.subAddress;
    } else {
      return state.evmAddress;
    }
  },

  availableNetworks(...args): Record<BridgeNetworkType, Partial<Record<BridgeNetworkId, AvailableNetwork>>> {
    const { state } = web3GetterContext(args);

    const hashi = [state.ethBridgeEvmNetwork].reduce((buffer, id) => {
      const data = EVM_NETWORKS[id];

      if (data) {
        buffer[id] = {
          available: true,
          disabled: false,
          data: EVM_NETWORKS[id],
        };
      }

      return buffer;
    }, {});

    const evm = state.evmNetworkApps.reduce((buffer, id) => {
      const data = EVM_NETWORKS[id];

      if (data) {
        buffer[id] = {
          available: true,
          disabled: !state.supportedApps?.[BridgeNetworkType.Evm]?.[id],
          data: EVM_NETWORKS[id],
        };
      }

      return buffer;
    }, {});

    const sub = Object.entries(state.subNetworkApps).reduce((buffer, [id, address]) => {
      const data = SUB_NETWORKS[id];

      if (data) {
        // add wss endpoints to endpointUrls
        data.endpointUrls.push(address);
        data.blockExplorerUrls.push(address);

        const available = !subBridgeApi.isSoraParachain(id as SubNetwork);

        buffer[id] = {
          available,
          disabled: !state.supportedApps?.[BridgeNetworkType.Sub]?.includes(id as SubNetwork),
          data,
        };
      }

      return buffer;
    }, {});

    return {
      [BridgeNetworkType.EvmLegacy]: hashi,
      [BridgeNetworkType.Evm]: evm,
      [BridgeNetworkType.Sub]: sub,
    };
  },

  selectedNetwork(...args): Nullable<NetworkData> {
    const { state, getters } = web3GetterContext(args);
    const { networkSelected, networkType } = state;

    if (!(networkType && networkSelected)) return null;

    return getters.availableNetworks[networkType][networkSelected]?.data ?? null;
  },

  isValidNetwork(...args): boolean {
    const { state } = web3GetterContext(args);

    if (state.networkType === BridgeNetworkType.Sub) return true;

    return state.evmNetworkProvided === state.networkSelected;
  },

  contractAddress(...args): (asset: KnownEthBridgeAsset) => Nullable<string> {
    return (asset: KnownEthBridgeAsset) => {
      const { state } = web3GetterContext(args);
      return state.ethBridgeContractAddress[asset];
    };
  },
});

export default getters;
