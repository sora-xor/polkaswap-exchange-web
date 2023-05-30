import type { CodecString } from '@sora-substrate/util';
import type { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import type { SupportedApps } from '@sora-substrate/util/build/bridgeProxy/types';
import type { EvmNetwork } from '@sora-substrate/util/build/bridgeProxy/evm/types';

export type EthBridgeContractsAddresses = {
  XOR: string;
  VAL: string;
  OTHER: string;
};

export type EthBridgeSettings = {
  evmNetwork: EvmNetwork;
  address: EthBridgeContractsAddresses;
};

export type Web3State = {
  evmAddress: string;
  evmBalance: CodecString;
  networkType: BridgeNetworkType;
  evmNetwork: Nullable<EvmNetwork>;
  evmNetworkSelected: Nullable<EvmNetwork>;
  evmNetworksApp: EvmNetwork[];
  supportedApps: SupportedApps;

  selectNetworkDialogVisibility: boolean;

  ethBridgeEvmNetwork: EvmNetwork;
  ethBridgeContractAddress: EthBridgeContractsAddresses;
};
