import ethersUtil from '@/utils/ethers-util';
import { EvmNetworkId } from '@sora-substrate/util/build/evm/consts';

import { ZeroStringValue } from '@/consts';

import type { Web3State } from './types';

export function initialState(): Web3State {
  return {
    evmAddress: ethersUtil.getEvmUserAddress(),
    evmBalance: ZeroStringValue,
    evmNetwork: null, // evm network in provider
    evmNetworksIds: [],
    evmNetworkSelected: null, // evm network selected by user

    selectNetworkDialogVisibility: false,

    // eth bridge history
    ethBridgeEvmNetwork: EvmNetworkId.EthereumSepolia,
    ethBridgeContractAddress: {
      XOR: '',
      VAL: '',
      OTHER: '',
    },
    // moonpay
    moonpayEvmNetwork: null,
  };
}

const state = initialState();

export default state;
