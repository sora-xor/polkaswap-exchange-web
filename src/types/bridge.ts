import type { Node } from '@/types/nodes';

import type { CodecString } from '@sora-substrate/util';
import type { BridgeTxDirection } from '@sora-substrate/util/build/bridgeProxy/consts';
import type { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/types';
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
  nodes?: Node[];
}

export type SubNetworksFees = Partial<Record<SubNetwork, Record<string, Record<BridgeTxDirection, CodecString>>>>;
