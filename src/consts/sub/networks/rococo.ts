import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';

import type { NetworkData } from '@/types/bridge';

export const Rococo: NetworkData = {
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
};

export const RococoSora: NetworkData = {
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
};
