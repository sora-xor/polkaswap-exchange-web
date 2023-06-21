import type { BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';

export interface NetworkData {
  id: BridgeNetworkId;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  endpointUrls: string[];
  blockExplorerUrls: string[];
  shortName: string;
}
