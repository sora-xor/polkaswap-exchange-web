import { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';

import type { NetworkData } from '@/types/bridge';

export const SUB_NETWORKS: Partial<Record<SubNetwork, NetworkData>> = {
  [SubNetwork.Kusama]: {
    id: SubNetwork.Kusama,
    name: 'Kusama',
    nativeCurrency: {
      name: 'KSM',
      symbol: 'KSM',
      decimals: 18,
    },
    rpcUrls: [''],
    blockExplorerUrls: [''],
    shortName: 'Kusama',
  },
  [SubNetwork.Polkadot]: {
    id: SubNetwork.Polkadot,
    name: 'Polkadot',
    nativeCurrency: {
      name: 'DOT',
      symbol: 'DOT',
      decimals: 18,
    },
    rpcUrls: [''],
    blockExplorerUrls: [''],
    shortName: 'Polkadot',
  },
  [SubNetwork.Rococo]: {
    id: SubNetwork.Rococo,
    name: 'Rococo',
    nativeCurrency: {
      name: 'ROC',
      symbol: 'ROC',
      decimals: 18,
    },
    rpcUrls: [''],
    blockExplorerUrls: [''],
    shortName: 'Rococo',
  },
  [SubNetwork.Karura]: {
    id: SubNetwork.Karura,
    name: 'Karura',
    nativeCurrency: {
      name: 'KAR',
      symbol: 'KAR',
      decimals: 12,
    },
    rpcUrls: [''],
    blockExplorerUrls: [''],
    shortName: 'Karura',
  },
};
