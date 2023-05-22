import ethersUtil from '@/utils/ethers-util';
import { EvmNetworkId } from '@sora-substrate/util/build/evm/consts';

import { ZeroStringValue } from '@/consts';
import { BridgeType } from '@/consts/evm';

import type { Web3State } from './types';

export function initialState(): Web3State {
  return {
    evmAddress: '', // ethersUtil.getEvmUserAddress()
    evmBalance: ZeroStringValue,
    evmNetwork: null, // evm network in provider
    evmNetworksApp: [], // evm networks from app config
    evmNetworksChain: [], // evm networks from chain config
    evmNetworkSelected: null, // evm network selected by user
    networkType: ethersUtil.getSelectedBridgeType() ?? BridgeType.ETH,

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
