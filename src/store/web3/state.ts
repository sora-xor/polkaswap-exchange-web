import ethersUtil from '@/utils/ethers-util';
import { EvmNetworkId } from '@sora-substrate/util/build/bridgeProxy/evm/consts';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';

import { ZeroStringValue } from '@/consts';

import type { Web3State } from './types';

export function initialState(): Web3State {
  return {
    evmAddress: '', // external evm address
    subAddress: '', // external sub address

    evmBalance: ZeroStringValue,

    networkType: ethersUtil.getSelectedBridgeType() ?? BridgeNetworkType.EvmLegacy,
    networkProvided: null, // evm network in provider
    networkSelected: null, // evm network selected by user

    evmNetworkApps: [], // evm networks from app config
    subNetworkApps: {}, // sub netowrks from app config

    supportedApps: {
      [BridgeNetworkType.EvmLegacy]: {},
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
    selectNetworkDialogVisibility: false,
    selectAccountDialogVisibility: false,
  };
}

const state = initialState();

export default state;
