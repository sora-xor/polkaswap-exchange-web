import type { NetworkData } from '@/types/bridge';

import type { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import type { EvmNetwork } from '@sora-substrate/util/build/bridgeProxy/evm/types';
import type { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import type { SupportedApps, BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';

export type EthBridgeContractsAddresses = {
  XOR: string;
  VAL: string;
  OTHER: string;
};

export type EthBridgeSettings = {
  evmNetwork: EvmNetwork;
  address: EthBridgeContractsAddresses;
};

export type SubNetworkApps = Partial<Record<SubNetwork, string>>;

export type AvailableNetwork = {
  disabled: boolean;
  data: NetworkData;
};

export type Web3State = {
  evmAddress: string;
  subAddress: string;

  networkType: BridgeNetworkType;
  networkSelected: Nullable<BridgeNetworkId>;
  evmNetworkProvided: Nullable<BridgeNetworkId>;

  evmNetworkApps: EvmNetwork[];
  subNetworkApps: SubNetworkApps;
  supportedApps: SupportedApps;

  ethBridgeEvmNetwork: EvmNetwork;
  ethBridgeContractAddress: EthBridgeContractsAddresses;

  selectNetworkDialogVisibility: boolean;
  selectAccountDialogVisibility: boolean;
};
