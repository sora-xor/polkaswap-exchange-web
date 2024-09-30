import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { EvmNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/evm/consts';

import type { Web3State } from './types';

export function initialState(): Web3State {
  return {
    evmAddress: '', // external evm address

    subAddress: '', // external sub address
    subAddressName: '',
    subAddressSource: '',

    networkType: null, // network type for selected network
    networkSelected: null, // network selected by user

    evmProviders: [],
    evmProvider: null,
    evmProviderLoading: null,
    evmProviderNetwork: null, // evm network in provider
    evmProviderSubscription: null, // provider event listeners

    evmNetworkApps: [], // evm networks from app config
    subNetworkApps: {}, // sub netowrks from app config

    supportedApps: {
      [BridgeNetworkType.Eth]: {},
      [BridgeNetworkType.Evm]: {},
      [BridgeNetworkType.Sub]: [],
    }, // supported apps from chain

    // eth bridge history
    ethBridgeEvmNetwork: EvmNetworkId.EthereumSepolia,
    ethBridgeContractAddress: {
      XOR: '',
      VAL: '',
      OTHER: '',
    },

    // dialogs
    selectSubNodeDialogVisibility: false,
    selectNetworkDialogVisibility: false,
    selectProviderDialogVisibility: false,

    subAccountDialogVisibility: false,
    soraAccountDialogVisibility: false,
  };
}

const state = initialState();

export default state;
