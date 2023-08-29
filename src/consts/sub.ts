import { BridgeTxDirection } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';

import type { NetworkData, SubNetworksFees } from '@/types/bridge';

export const SUB_NETWORKS: Partial<Record<SubNetwork, NetworkData>> = {
  [SubNetwork.Kusama]: {
    id: SubNetwork.Kusama,
    name: 'Kusama',
    nativeCurrency: {
      name: 'KSM',
      symbol: 'KSM',
      decimals: 12,
    },
    endpointUrls: [],
    blockExplorerUrls: [],
    shortName: 'Kusama',
  },
  [SubNetwork.Polkadot]: {
    id: SubNetwork.Polkadot,
    name: 'Polkadot',
    nativeCurrency: {
      name: 'DOT',
      symbol: 'DOT',
      decimals: 10,
    },
    endpointUrls: [],
    blockExplorerUrls: [],
    shortName: 'Polkadot',
  },
  [SubNetwork.Rococo]: {
    id: SubNetwork.Rococo,
    name: 'Rococo',
    nativeCurrency: {
      name: 'ROC',
      symbol: 'ROC',
      decimals: 12,
    },
    endpointUrls: [],
    blockExplorerUrls: [],
    shortName: 'Rococo',
  },
  [SubNetwork.KusamaKarura]: {
    id: SubNetwork.KusamaKarura,
    name: 'Karura',
    nativeCurrency: {
      name: 'KAR',
      symbol: 'KAR',
      decimals: 12,
    },
    endpointUrls: [],
    blockExplorerUrls: [],
    shortName: 'Karura',
  },
  // SORA Parachains
  [SubNetwork.RococoSora]: {
    id: SubNetwork.RococoSora,
    name: 'SORA Parachain',
    nativeCurrency: {
      name: 'XOR',
      symbol: 'XOR',
      decimals: 12,
    },
    endpointUrls: [],
    blockExplorerUrls: [],
    shortName: 'SORA Parachain',
  },
};

export const SUB_TRANSFER_FEES: SubNetworksFees = {
  [SubNetwork.Rococo]: {
    ROC: {
      [BridgeTxDirection.Outgoing]: '10124190',
      [BridgeTxDirection.Incoming]: '0',
    },
  },
};
