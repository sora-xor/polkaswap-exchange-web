import ethersUtil from '@/utils/ethers-util';

import { ZeroStringValue } from '@/consts';
import { EvmNetworkId } from '@/consts/evm';

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
    ethBridgeEvmNetwork: EvmNetworkId.EthereumRinkeby,
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
