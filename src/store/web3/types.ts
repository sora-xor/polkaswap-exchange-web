import type { NetworkData } from '@/types/bridge';
import type { AppEIPProvider } from '@/types/evm/provider';
import type { Node } from '@/types/nodes';

import type { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import type { EvmNetwork } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';
import type { SubNetwork } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';
import type { SupportedApps, BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';

export type EthBridgeContractAddress = string;

export type EthBridgeSettings = {
  evmNetwork: EvmNetwork;
  address: EthBridgeContractAddress;
};

export type SubNetworkApps = Partial<Record<SubNetwork, boolean | Node[]>>;

export type AvailableNetwork = {
  /** disabled on networks list */
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
  ethBridgeContractAddress: EthBridgeContractAddress;

  selectSubNodeDialogVisibility: boolean;
  selectNetworkDialogVisibility: boolean;
  selectProviderDialogVisibility: boolean;

  subAccountDialogVisibility: boolean;
  soraAccountDialogVisibility: boolean;
};
