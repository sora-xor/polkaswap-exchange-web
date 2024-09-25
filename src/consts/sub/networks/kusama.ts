import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';

import type { NetworkData } from '@/types/bridge';

export const Kusama: NetworkData = {
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
};

export const KusamaAssetHub: NetworkData = {
  id: SubNetworkId.KusamaAssetHub,
  name: 'Kusama Asset Hub',
  nativeCurrency: {
    name: 'KSM',
    symbol: 'KSM',
    decimals: 12,
  },
  blockExplorerUrls: ['https://assethub-kusama.subscan.io'],
  shortName: 'KSM Asset Hub',
  nodes: [
    {
      chain: 'Kusama Asset Hub',
      name: 'Parity',
      address: 'wss://kusama-asset-hub-rpc.polkadot.io',
    },
    {
      chain: 'Kusama Asset Hub',
      name: 'Dwellir',
      address: 'wss://asset-hub-kusama-rpc.dwellir.com',
    },
  ],
};

export const KusamaCurio: NetworkData = {
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
};

export const KusamaShiden: NetworkData = {
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
};

export const KusamaSora: NetworkData = {
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
};
