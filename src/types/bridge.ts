import type { Node } from '@/types/nodes';

import type { CodecString } from '@sora-substrate/sdk';
import type { BridgeTxDirection } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import type { SubNetwork } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';

export interface NetworkData {
  id: BridgeNetworkId;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  } | null;
  blockExplorerUrls: string[];
  shortName: string;
  /** Endpoints for EVM network */
  endpointUrls?: string[];
  /** Nodes for Substrate network */
  nodes?: Node[];
  /** Evm chain id for substrate network */
  evmId?: number;
}

export type SubNetworksFees = Partial<Record<SubNetwork, Record<string, Record<BridgeTxDirection, CodecString>>>>;
