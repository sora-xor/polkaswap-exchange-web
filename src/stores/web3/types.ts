import type { NetworkData } from '@/types/bridge';
import type { AppEIPProvider } from '@/types/evm/provider';
import type { Node } from '@/types/nodes';

import type { FPNumber } from '@/lib/substrate/sdk';
import type { BridgeNetworkType } from '@/lib/substrate/sdk/bridgeProxy/consts';
import type { EvmNetwork } from '@/lib/substrate/sdk/bridgeProxy/evm/types';
import type { SubNetwork } from '@/lib/substrate/sdk/bridgeProxy/sub/types';
import type { SupportedApps, BridgeNetworkId } from '@/lib/substrate/sdk/bridgeProxy/types';

export type EthBridgeContractsAddresses = {
  XOR: string;
  VAL: string;
  OTHER: string;
};

export type EthBridgeSettings = {
  evmNetwork: EvmNetwork;
  address: EthBridgeContractsAddresses;
};

export type SubNetworkApps = Partial<Record<SubNetwork, boolean | Node[]>>;

export type AvailableNetwork = {
  disabled: boolean;
  data: NetworkData;
};

export type Web3State = {
  evmAddress: string;
  subAddress: string;
  subAddressName: string;
  subAddressSource: string;
  networkType: Nullable<BridgeNetworkType>;
  networkSelected: Nullable<BridgeNetworkId>;
  evmProviders: AppEIPProvider[];
  evmProvider: Nullable<AppEIPProvider>;
  evmProviderLoading: Nullable<AppEIPProvider>;
  evmProviderNetwork: Nullable<BridgeNetworkId>;
  evmProviderSubscription: Nullable<FnWithoutArgs>;
  evmNetworkApps: readonly EvmNetwork[];
  subNetworkApps: SubNetworkApps;
  supportedApps: SupportedApps;
  ethBridgeEvmNetwork: EvmNetwork;
  ethBridgeContractAddress: EthBridgeContractsAddresses;
  selectSubNodeDialogVisibility: boolean;
  selectNetworkDialogVisibility: boolean;
  selectProviderDialogVisibility: boolean;
  subAccountDialogVisibility: boolean;
  soraAccountDialogVisibility: boolean;
  denominator: FPNumber;
};
