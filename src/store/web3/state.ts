import { ZeroStringValue } from '@/consts';
import { EvmNetworkId } from '@/consts/evm';
import type { Web3State } from './types';

export function initialState(): Web3State {
  return {
    evmAddress: '',
    evmBalance: ZeroStringValue,
    evmNetwork: EvmNetworkId.EthereumClassicMordor, // evm network in provider
    evmNetworksIds: [],
    evmNetworkSelected: EvmNetworkId.EthereumClassicMordor, // evm network selected by user

    ethBridgeEvmNetwork: EvmNetworkId.EthereumRinkeby,
    ethBridgeContractAddress: {
      XOR: '',
      VAL: '',
      OTHER: '',
    },
  };
}

const state = initialState();

export default state;
