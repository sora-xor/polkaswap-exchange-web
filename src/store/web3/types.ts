import type { CodecString } from '@sora-substrate/util';
import type { EvmNetwork } from '@sora-substrate/util/build/evm/types';

import type { JsonContract } from '@/utils/ethers-util';
import type { BridgeType } from '@/consts/evm';

export type EthBridgeContractsAddresses = Partial<{
  XOR: string;
  VAL: string;
  OTHER: string;
}>;

export type EthBridgeSmartContracts = Partial<{
  XOR: JsonContract;
  VAL: JsonContract;
  OTHER: {
    BRIDGE: JsonContract;
    ERC20: JsonContract;
  };
}>;

export type EthBridgeSettings = {
  evmNetwork: EvmNetwork;
  address: EthBridgeContractsAddresses;
};

export type Web3State = {
  evmAddress: string;
  evmBalance: CodecString;
  evmNetwork: Nullable<EvmNetwork>;
  evmNetworksIds: EvmNetwork[];
  evmNetworkSelected: Nullable<EvmNetwork>;
  networkType: BridgeType;

  selectNetworkDialogVisibility: boolean;

  ethBridgeEvmNetwork: EvmNetwork;
  ethBridgeContractAddress: EthBridgeContractsAddresses;
  ethBridgeSmartContracts: EthBridgeSmartContracts;
  moonpayEvmNetwork: Nullable<EvmNetwork>;
};
