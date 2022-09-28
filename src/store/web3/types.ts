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
  evmNetwork: Nullable<EvmNetworkId>;
  evmNetworksIds: EvmNetworkId[];
  evmNetworkSelected: Nullable<EvmNetworkId>;

  selectNetworkDialogVisibility: boolean;

  ethBridgeEvmNetwork: EvmNetworkId;
  ethBridgeContractAddress: EthBridgeContracts;
};
