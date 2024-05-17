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
        address: 'wss://frag-moonbase-relay-rpc-ws.g.moonbase.moonbeam.network',
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
    blockExplorerUrls: [],
    shortName: 'Alpha',
    nodes: [
      {
        chain: 'Moonbase Alpha',
        name: 'Parity',
        address: 'wss://wss.api.moonbase.moonbeam.network',
      },
    ],
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
  [SubNetworkId.AlphanetMoonbase]: {
    ACA: {
      [BridgeTxDirection.Outgoing]: '34313700000000',
      [BridgeTxDirection.Incoming]: '0',
    },
  },
};
