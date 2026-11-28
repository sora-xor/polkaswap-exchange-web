import type { Node } from '@/types/nodes';

import type { CodecString } from '@/lib/substrate/sdk';
import type { BridgeTxDirection } from '@/lib/substrate/sdk/bridgeProxy/consts';
import type { SubNetwork } from '@/lib/substrate/sdk/bridgeProxy/sub/types';
import type { BridgeNetworkId } from '@/lib/substrate/sdk/bridgeProxy/types';

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
