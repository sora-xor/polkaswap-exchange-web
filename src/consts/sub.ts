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
  // SORA Parachains
  [SubNetwork.RococoSora]: {
    id: SubNetwork.RococoSora,
    name: 'SORA Rococo Parachain',
    nativeCurrency: {
      name: 'XOR',
      symbol: 'XOR',
      decimals: 18,
    },
    endpointUrls: [],
    blockExplorerUrls: [],
    shortName: 'SORA ROC',
  },
  [SubNetwork.KusamaSora]: {
    id: SubNetwork.KusamaSora,
    name: 'SORA Kusama Parachain',
    nativeCurrency: {
      name: 'XOR',
      symbol: 'XOR',
      decimals: 18,
    },
    endpointUrls: [],
    blockExplorerUrls: [],
    shortName: 'SORA KSM',
  },
};

export const SUB_TRANSFER_FEES: SubNetworksFees = {
  [SubNetwork.Rococo]: {
    ROC: {
      [BridgeTxDirection.Outgoing]: '10124190',
      [BridgeTxDirection.Incoming]: '0',
    },
  },
  [SubNetwork.Kusama]: {
    KSM: {
      [BridgeTxDirection.Outgoing]: '92003956',
      [BridgeTxDirection.Incoming]: '0',
    },
  },
};
