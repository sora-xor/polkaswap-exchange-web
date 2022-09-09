import type { CodecString } from '@sora-substrate/util';

import type { EvmNetworkId } from '@/consts/evm';
import type { EthBridgeContracts } from '@/utils/bridge/eth/types';

export type EthBridgeSettings = {
  evmNetwork: EvmNetworkId;
  contractAddress: EthBridgeContracts;
};

export type Web3State = {
  evmAddress: string;
  evmBalance: CodecString;
  evmNetwork: EvmNetworkId;
  evmNetworksIds: EvmNetworkId[];
  evmNetworkSelected: EvmNetworkId;

  ethBridgeEvmNetwork: EvmNetworkId;
  ethBridgeContractAddress: EthBridgeContracts;
};
