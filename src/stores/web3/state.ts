import { FPNumber } from '@/lib/substrate/math';
import { BridgeNetworkType } from '@/lib/substrate/sdk/bridgeProxy/consts';
import { EvmNetworkId } from '@/lib/substrate/sdk/bridgeProxy/evm/consts';

import type { Web3State } from './types';

export function initialState(): Web3State {
  return {
    evmAddress: '',
    subAddress: '',
    subAddressName: '',
    subAddressSource: '',
    networkType: null,
    networkSelected: null,
    evmProviders: [],
    evmProvider: null,
    evmProviderLoading: null,
    evmProviderNetwork: null,
    evmProviderSubscription: null,
    evmNetworkApps: [],
    subNetworkApps: {},
    supportedApps: {
      [BridgeNetworkType.Eth]: {},
      [BridgeNetworkType.Evm]: {},
      [BridgeNetworkType.Sub]: [],
    },
    ethBridgeEvmNetwork: EvmNetworkId.EthereumSepolia,
    ethBridgeContractAddress: {
      XOR: '',
      VAL: '',
      OTHER: '',
    },
    selectSubNodeDialogVisibility: false,
    selectNetworkDialogVisibility: false,
    selectProviderDialogVisibility: false,
    subAccountDialogVisibility: false,
    soraAccountDialogVisibility: false,
    denominator: FPNumber.ONE,
  };
}

const state = initialState();

export default state;
