import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { WALLET_CONSTS, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';
import { defineGetters } from 'direct-vuex';

import { EVM_NETWORKS } from '@/consts/evm';
import type { KnownEthBridgeAsset } from '@/consts/evm';
import { SUB_NETWORKS } from '@/consts/sub';
import { web3GetterContext } from '@/store/web3';
import type { NetworkData } from '@/types/bridge';

import type { Web3State, AvailableNetwork } from './types';
import type { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/types';
import type { BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';

const getters = defineGetters<Web3State>()({
  availableNetworks(...args): Record<BridgeNetworkType, Partial<Record<BridgeNetworkId, AvailableNetwork>>> {
    const { state } = web3GetterContext(args);

    const hashi = [state.ethBridgeEvmNetwork].reduce((buffer, id) => {
      const data = EVM_NETWORKS[id];

      if (data) {
        buffer[id] = {
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
          disabled: !state.supportedApps?.[BridgeNetworkType.Evm]?.[id],
          data: EVM_NETWORKS[id],
        };
      }

      return buffer;
    }, {});

    const sub = Object.entries(state.subNetworkApps).reduce((buffer, [id, nodesOrFlag]) => {
      const data = SUB_NETWORKS[id];

      if (data) {
        const disabled = !(nodesOrFlag && state.supportedApps?.[BridgeNetworkType.Sub]?.includes(id as SubNetwork));

        // override from config
        if (Array.isArray(nodesOrFlag)) {
          data.nodes = nodesOrFlag;
        }

        buffer[id] = {
          disabled,
          data,
        };
      }

      return buffer;
    }, {});

    return {
      [BridgeNetworkType.Eth]: hashi,
      [BridgeNetworkType.Sub]: sub,
      [BridgeNetworkType.Evm]: evm,
    };
  },

  selectedNetwork(...args): Nullable<NetworkData> {
    const { state, getters } = web3GetterContext(args);
    const { networkSelected, networkType } = state;

    if (!(networkType && networkSelected)) return null;

    return getters.availableNetworks[networkType][networkSelected]?.data ?? null;
  },

  isValidNetwork(...args): boolean {
    const { state, getters } = web3GetterContext(args);
    const { evmProviderNetwork } = state;
    const { selectedNetwork } = getters;

    if (!selectedNetwork) return false;

    if (state.networkType === BridgeNetworkType.Sub) {
      if (selectedNetwork.evmId) {
        return evmProviderNetwork === selectedNetwork.evmId;
      } else {
        return true;
      }
    }

    return evmProviderNetwork === selectedNetwork.id;
  },

  contractAddress(...args): (asset: KnownEthBridgeAsset) => Nullable<string> {
    return (asset: KnownEthBridgeAsset) => {
      const { state } = web3GetterContext(args);
      return state.ethBridgeContractAddress[asset];
    };
  },

  subAccount(...args): WALLET_TYPES.PolkadotJsAccount {
    const { state } = web3GetterContext(args);

    return {
      address: state.subAddress,
      name: state.subAddressName,
      source: state.subAddressSource as WALLET_CONSTS.AppWallet,
    };
  },
});

export default getters;
