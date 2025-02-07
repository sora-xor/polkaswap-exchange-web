import type { BridgeRegisteredAsset } from '@/store/assets/types';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

export const ANLOG_TIMECHAIN: Asset = {
  address: 'Balances',
  symbol: 'ANLOG',
  name: 'Analog',
  decimals: 12,
  isMintable: false,
};

export const ANLOG_ETHEREUM: BridgeRegisteredAsset = {
  address: '0x9f5ab33da3c3a7e209510a82d54aa81a94ea64a6', // address will be here
  decimals: 12,
  kind: 'Thischain',
};

export const ETH_TIMECHAIN: Asset = {
  address: 'ETH',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  isMintable: false,
};
