import type { CodecString } from '@sora-substrate/util';
import type { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import type { SupportedApps, BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';
import type { EvmNetwork } from '@sora-substrate/util/build/bridgeProxy/evm/types';
import type { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';

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
  subAddress: string;
  soraAddress: string;

  evmBalance: CodecString;

  networkType: BridgeNetworkType;
  networkProvided: Nullable<BridgeNetworkId>;
  networkSelected: Nullable<BridgeNetworkId>;

  evmNetworksApp: EvmNetwork[];
  subNetworksApp: SubNetwork[];
  supportedApps: SupportedApps;

  ethBridgeEvmNetwork: EvmNetwork;
  ethBridgeContractAddress: EthBridgeContractsAddresses;

  selectNetworkDialogVisibility: boolean;
  selectAccountDialogVisibility: boolean;
};
