import type { BridgeRegisteredAsset } from '@/store/assets/types';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

export const ANLOG_TIMECHAIN: Asset = {
  address: 'ANLOG',
  symbol: 'ANLOG',
  name: 'Analog',
  decimals: 12,
  isMintable: false,
};

export const ANLOG_ETHEREUM: BridgeRegisteredAsset = {
  address: '0x0000000000000000000000000000000000000000', // address will be here
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

export const ETH_ETHEREUM: BridgeRegisteredAsset = {
  address: '0x0000000000000000000000000000000000000000', // address will be here
  decimals: 12,
  kind: 'Sidechain',
};
