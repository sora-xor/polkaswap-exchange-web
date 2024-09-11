import type { NetworkData } from '@/types/bridge';
import type { Node } from '@/types/nodes';
import type { Provider } from '@/utils/ethers-util';

import type { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import type { EvmNetwork } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';
import type { SubNetwork } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';
import type { SupportedApps, BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';

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

  evmProvider: Nullable<Provider>;
  evmProviderLoading: Nullable<Provider>;
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
};
