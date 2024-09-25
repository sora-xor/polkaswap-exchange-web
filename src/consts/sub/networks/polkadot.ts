import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';

import type { NetworkData } from '@/types/bridge';

export const Polkadot: NetworkData = {
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
};

export const PolkadotAcala: NetworkData = {
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
};

export const PolkadotAstar: NetworkData = {
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
};

export const PolkadotMoonbeam: NetworkData = {
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
};

export const PolkadotSora: NetworkData = {
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
};
