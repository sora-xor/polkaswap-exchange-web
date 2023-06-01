import ethersUtil from '@/utils/ethers-util';
import { EvmNetworkId } from '@sora-substrate/util/build/bridgeProxy/evm/consts';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';

import { ZeroStringValue } from '@/consts';

import type { Web3State } from './types';

export function initialState(): Web3State {
  return {
    evmAddress: '', // ethersUtil.getEvmUserAddress()
    subAddress: '', // for future usage

    evmBalance: ZeroStringValue,

    networkType: ethersUtil.getSelectedBridgeType() ?? BridgeNetworkType.EvmLegacy,
    networkProvided: null, // evm network in provider
    networkSelected: null, // evm network selected by user

    evmNetworksApp: [], // evm networks from app config
    subNetworksApp: [], // sub netowrks from app config

    supportedApps: {
      [BridgeNetworkType.EvmLegacy]: {},
      [BridgeNetworkType.Evm]: {},
      [BridgeNetworkType.Sub]: [],
    }, // supported apps from chain

    selectNetworkDialogVisibility: false,

    // eth bridge history
    ethBridgeEvmNetwork: EvmNetworkId.EthereumSepolia,
    ethBridgeContractAddress: {
      XOR: '',
      VAL: '',
      OTHER: '',
    },
  };
}

const state = initialState();

export default state;
