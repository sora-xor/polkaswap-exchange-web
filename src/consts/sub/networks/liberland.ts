import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';

import type { NetworkData } from '@/types/bridge';

export const Liberland: NetworkData = {
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
};
