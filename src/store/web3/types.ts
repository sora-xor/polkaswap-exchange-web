import type { CodecString } from '@sora-substrate/util';
import type { EvmNetwork } from '@sora-substrate/util/build/evm/types';

import type { JsonContract } from '@/utils/ethers-util';
import type { BridgeType } from '@/consts/evm';

export type EthBridgeContractsAddresses = {
  XOR: string;
  VAL: string;
  OTHER: string;
};

export type EthBridgeSmartContracts = {
  XOR: JsonContract;
  VAL: JsonContract;
  OTHER: {
    BRIDGE: JsonContract;
    ERC20: JsonContract;
  };
};

export type EthBridgeSettings = {
  evmNetwork: EvmNetwork;
  address: EthBridgeContractsAddresses;
};

export type Web3State = {
  evmAddress: string;
  evmBalance: CodecString;
  evmNetwork: Nullable<EvmNetwork>;
  evmNetworksApp: EvmNetwork[];
  evmNetworksChain: EvmNetwork[];
  evmNetworkSelected: Nullable<EvmNetwork>;
  networkType: BridgeType;

  selectNetworkDialogVisibility: boolean;

  ethBridgeEvmNetwork: EvmNetwork;
  ethBridgeContractAddress: EthBridgeContractsAddresses;
  ethBridgeSmartContracts: EthBridgeSmartContracts;
};
