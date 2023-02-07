import type { CodecString } from '@sora-substrate/util';
import type { EvmNetwork } from '@sora-substrate/util/build/evm/types';

import type { EthBridgeContracts } from '@/utils/bridge/eth/types';

export type EthBridgeSettings = {
  evmNetwork: EvmNetwork;
  contractAddress: EthBridgeContracts;
};

export type Web3State = {
  evmAddress: string;
  evmBalance: CodecString;
  evmNetwork: Nullable<EvmNetwork>;
  evmNetworksIds: EvmNetwork[];
  evmNetworkSelected: Nullable<EvmNetwork>;

  selectNetworkDialogVisibility: boolean;

  ethBridgeEvmNetwork: EvmNetwork;
  ethBridgeContractAddress: EthBridgeContracts;
  moonpayEvmNetwork: Nullable<EvmNetwork>;
};
