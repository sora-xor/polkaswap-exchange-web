import { BridgeTxDirection } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetworkId } from '@sora-substrate/util/build/bridgeProxy/sub/consts';

import type { NetworkData, SubNetworksFees } from '@/types/bridge';

import type { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/types';

export const SUB_NETWORKS: Partial<Record<SubNetwork, NetworkData>> = {
  [SubNetworkId.Kusama]: {
    id: SubNetworkId.Kusama,
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
  [SubNetworkId.Polkadot]: {
    id: SubNetworkId.Polkadot,
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
  [SubNetworkId.Rococo]: {
    id: SubNetworkId.Rococo,
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
  [SubNetworkId.RococoSora]: {
    id: SubNetworkId.RococoSora,
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
  [SubNetworkId.KusamaSora]: {
    id: SubNetworkId.KusamaSora,
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
  [SubNetworkId.PolkadotSora]: {
    id: SubNetworkId.PolkadotSora,
    name: 'SORA Polkadot Parachain',
    nativeCurrency: {
      name: 'XOR',
      symbol: 'XOR',
      decimals: 18,
    },
    endpointUrls: [],
    blockExplorerUrls: [],
    shortName: 'SORA DOT',
  },
};

export const SUB_TRANSFER_FEES: SubNetworksFees = {
  [SubNetworkId.Rococo]: {
    ROC: {
      [BridgeTxDirection.Outgoing]: '10124190',
      [BridgeTxDirection.Incoming]: '0',
    },
  },
  [SubNetworkId.Kusama]: {
    KSM: {
      [BridgeTxDirection.Outgoing]: '92003956',
      [BridgeTxDirection.Incoming]: '0',
    },
  },
  [SubNetworkId.Polkadot]: {
    DOT: {
      [BridgeTxDirection.Outgoing]: '0', // [TODO] Polkadot
      [BridgeTxDirection.Incoming]: '0',
    },
  },
};
