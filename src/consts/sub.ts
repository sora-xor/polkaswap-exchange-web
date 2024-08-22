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
    blockExplorerUrls: ['https://kusama.subscan.io'],
    shortName: 'Kusama',
    nodes: [
      {
        chain: 'Kusama',
        name: 'Parity',
        address: 'wss://kusama-rpc.polkadot.io',
      },
      {
        chain: 'Kusama',
        name: 'Dwellir',
        address: 'wss://kusama-rpc.dwellir.com',
      },
    ],
  },
  [SubNetworkId.Polkadot]: {
    id: SubNetworkId.Polkadot,
    name: 'Polkadot',
    nativeCurrency: {
      name: 'DOT',
      symbol: 'DOT',
      decimals: 10,
    },
    blockExplorerUrls: ['https://polkadot.subscan.io'],
    shortName: 'Polkadot',
    nodes: [
      {
        chain: 'Polkadot',
        name: 'Parity',
        address: 'wss://rpc.polkadot.io',
      },
      {
        chain: 'Polkadot',
        name: 'Dwellir',
        address: 'wss://polkadot-rpc.dwellir.com',
      },
    ],
  },
  [SubNetworkId.PolkadotAcala]: {
    id: SubNetworkId.PolkadotAcala,
    name: 'Acala',
    nativeCurrency: {
      name: 'ACA',
      symbol: 'ACA',
      decimals: 12,
    },
    blockExplorerUrls: ['https://acala.subscan.io'],
    shortName: 'Acala',
    nodes: [
      {
        chain: 'Acala',
        name: 'Acala Foundation',
        address: 'wss://acala-rpc-0.aca-api.network',
      },
      {
        chain: 'Acala',
        name: 'Dwellir',
        address: 'wss://acala-rpc.dwellir.com',
      },
    ],
  },
  [SubNetworkId.PolkadotAstar]: {
    id: SubNetworkId.PolkadotAstar,
    name: 'Astar',
    nativeCurrency: {
      name: 'ASTR',
      symbol: 'ASTR',
      decimals: 18,
    },
    blockExplorerUrls: ['https://astar.subscan.io'],
    shortName: 'Astar',
    nodes: [
      {
        chain: 'Astar',
        name: 'Astar',
        address: 'wss://rpc.astar.network',
      },
      {
        chain: 'Astar',
        name: 'Dwellir',
        address: 'wss://astar-rpc.dwellir.com',
      },
    ],
  },
  [SubNetworkId.PolkadotMoonbeam]: {
    id: SubNetworkId.PolkadotMoonbeam,
    name: 'Moonbeam',
    nativeCurrency: {
      name: 'GLMR',
      symbol: 'GLMR',
      decimals: 18,
    },
    endpointUrls: ['https://rpc.api.moonbeam.network', 'https://moonbeam-rpc.dwellir.com'],
    blockExplorerUrls: ['https://moonbeam.subscan.io'],
    shortName: 'Moonbeam',
    nodes: [
      {
        chain: 'Moonbeam',
        name: 'Moonbeam Foundation',
        address: 'wss://wss.api.moonbeam.network',
      },
      {
        chain: 'Moonbeam',
        name: 'Dwellir',
        address: 'wss://moonbeam-rpc.dwellir.com',
      },
    ],
    evmId: 1284,
  },
  [SubNetworkId.Rococo]: {
    id: SubNetworkId.Rococo,
    name: 'Rococo',
    nativeCurrency: {
      name: 'ROC',
      symbol: 'ROC',
      decimals: 12,
    },
    blockExplorerUrls: [],
    shortName: 'Rococo',
    nodes: [
      {
        chain: 'Rococo',
        name: 'Parity',
        address: 'wss://rococo-rpc.polkadot.io',
      },
    ],
  },
  [SubNetworkId.Alphanet]: {
    id: SubNetworkId.Alphanet,
    name: 'Moonbase Relay Testnet',
    nativeCurrency: {
      name: 'ALPHA',
      symbol: 'ALPHA', // "DEV"
      decimals: 12,
    },
    blockExplorerUrls: [],
    shortName: 'Alphanet',
    nodes: [
      {
        chain: 'Moonbase Relay Testnet',
        name: 'Parity',
        address: 'wss://fro-moon-rpc-1-moonbase-relay-rpc-1.moonbase.ol-infra.network',
      },
    ],
  },
  [SubNetworkId.AlphanetMoonbase]: {
    id: SubNetworkId.AlphanetMoonbase,
    name: 'Moonbase Alpha',
    nativeCurrency: {
      name: 'GLMR',
      symbol: 'GLMR', // "DEV"
      decimals: 18,
    },
    endpointUrls: ['https://rpc.api.moonbase.moonbeam.network', 'https://moonbase-rpc.dwellir.com'],
    blockExplorerUrls: ['https://moonbase.subscan.io'],
    shortName: 'Moonbase',
    nodes: [
      {
        chain: 'Moonbase Alpha',
        name: 'Parity',
        address: 'wss://wss.api.moonbase.moonbeam.network',
      },
    ],
    evmId: 1287,
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
    blockExplorerUrls: [],
    shortName: 'SORA ROC',
    nodes: [
      {
        chain: 'SORA Rococo Parachain Testnet',
        name: 'Soramitsu',
        address: 'wss://ws.parachain-collator-1.c1.stg1.sora2.soramitsu.co.jp',
      },
    ],
  },
  [SubNetworkId.KusamaCurio]: {
    id: SubNetworkId.KusamaCurio,
    name: 'Curio',
    nativeCurrency: {
      name: 'CGT',
      symbol: 'CGT',
      decimals: 18,
    },
    blockExplorerUrls: [],
    shortName: 'Curio',
    nodes: [
      {
        chain: 'Curio',
        name: 'Curio',
        address: 'wss://parachain.curioinvest.com',
      },
    ],
  },
  [SubNetworkId.KusamaShiden]: {
    id: SubNetworkId.KusamaShiden,
    name: 'Shiden',
    nativeCurrency: {
      name: 'SDN',
      symbol: 'SDN',
      decimals: 18,
    },
    blockExplorerUrls: ['https://shiden.subscan.io'],
    shortName: 'Shiden',
    nodes: [
      {
        chain: 'Shiden',
        name: 'Astar',
        address: 'wss://rpc.shiden.astar.network',
      },
      {
        chain: 'Shiden',
        name: 'Dwellir',
        address: 'wss://shiden-rpc.dwellir.com',
      },
    ],
  },
  [SubNetworkId.KusamaSora]: {
    id: SubNetworkId.KusamaSora,
    name: 'SORA Kusama Parachain',
    nativeCurrency: {
      name: 'XOR',
      symbol: 'XOR',
      decimals: 18,
    },
    blockExplorerUrls: [],
    shortName: 'SORA KSM',
    nodes: [
      {
        chain: 'SORA Kusama Parachain',
        name: 'Soramitsu',
        address: 'wss://ws.parachain-collator-2.c2.sora2.soramitsu.co.jp',
      },
    ],
  },
  [SubNetworkId.PolkadotSora]: {
    id: SubNetworkId.PolkadotSora,
    name: 'SORA Polkadot Parachain',
    nativeCurrency: {
      name: 'XOR',
      symbol: 'XOR',
      decimals: 18,
    },
    blockExplorerUrls: [],
    shortName: 'SORA DOT',
    nodes: [
      {
        chain: 'SORA Polkadot Parachain',
        name: 'Soramitsu',
        address: 'wss://ws.parachain-collator-3.pc3.sora2.soramitsu.co.jp',
      },
    ],
  },
  [SubNetworkId.AlphanetSora]: {
    id: SubNetworkId.AlphanetSora,
    name: 'SORA Alphanet Parachain',
    nativeCurrency: {
      name: 'XOR',
      symbol: 'XOR',
      decimals: 18,
    },
    blockExplorerUrls: [],
    shortName: 'SORA Alphanet',
    nodes: [
      {
        chain: 'SORA Alphanet Parachain',
        name: 'Soramitsu',
        address: 'wss://ws.parachain-collator-2.c1.stg1.sora2.soramitsu.co.jp',
      },
    ],
  },
  // Standalones
  [SubNetworkId.Liberland]: {
    id: SubNetworkId.Liberland,
    name: 'Liberland',
    nativeCurrency: {
      name: 'LLD',
      symbol: 'LLD',
      decimals: 12,
    },
    nodes: [
      {
        chain: 'Liberland',
        name: 'Dwellir',
        address: 'wss://liberland-rpc.dwellir.com',
      },
    ],
    blockExplorerUrls: ['https://chainscan.mainnet.liberland.org'],
    shortName: 'Liberland',
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
      [BridgeTxDirection.Outgoing]: '78327426',
      [BridgeTxDirection.Incoming]: '0',
    },
  },
  [SubNetworkId.Polkadot]: {
    DOT: {
      [BridgeTxDirection.Outgoing]: '19978738',
      [BridgeTxDirection.Incoming]: '0',
    },
  },
  [SubNetworkId.PolkadotAcala]: {
    ACA: {
      [BridgeTxDirection.Outgoing]: '6429600000',
      [BridgeTxDirection.Incoming]: '0',
    },
  },
  [SubNetworkId.PolkadotAstar]: {
    ASTR: {
      [BridgeTxDirection.Outgoing]: '36000000000000000',
      [BridgeTxDirection.Incoming]: '0',
    },
  },
  [SubNetworkId.Alphanet]: {
    ALPHA: {
      [BridgeTxDirection.Outgoing]: '2700000000',
      [BridgeTxDirection.Incoming]: '0',
    },
  },
  [SubNetworkId.AlphanetMoonbase]: {
    GLMR: {
      [BridgeTxDirection.Outgoing]: '34313700000000',
      [BridgeTxDirection.Incoming]: '0',
    },
    ALPHA: {
      [BridgeTxDirection.Outgoing]: '44415350668',
      [BridgeTxDirection.Incoming]: '46453162841',
    },
    XOR: {
      [BridgeTxDirection.Outgoing]: '8140448382622083802',
      [BridgeTxDirection.Incoming]: '0',
    },
  },
  [SubNetworkId.KusamaCurio]: {
    XOR: {
      [BridgeTxDirection.Outgoing]: '500000000000000000000',
      [BridgeTxDirection.Incoming]: '0',
    },
  },
};
