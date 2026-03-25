import { FPNumber } from '@sora-substrate/sdk';
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { EvmNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/evm/consts';

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
