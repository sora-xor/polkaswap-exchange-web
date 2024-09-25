import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';

import type { NetworkData } from '@/types/bridge';

export const Alphanet: NetworkData = {
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
};

export const AlphanetMoonbase: NetworkData = {
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
};

export const AlphanetSora: NetworkData = {
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
      address: 'wss://ws.parachain-collator-1.c1.stg1.sora2.soramitsu.co.jp',
    },
  ],
};
