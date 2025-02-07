import { FPNumber } from '@sora-substrate/sdk';

import type { BridgeRegisteredAsset } from '@/store/assets/types';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

export const BRIDGE_TIMECHAIN_OUTGOING_FEE = '2900000000';

export const BRIDGE_INCOMING_MIN_AMOUNT = FPNumber.ONE;

export const ANLOG_TIMECHAIN: Asset & { externalSymbol?: string } = {
  address: 'Balances',
  symbol: 'ANLOG',
  name: 'Analog',
  decimals: 12,
  isMintable: false,
  externalSymbol: 'WANLOG',
};

export const ANLOG_ETHEREUM: BridgeRegisteredAsset = {
  address: '', // address will be here
  decimals: 12,
  kind: 'Sidechain', // to check contract balance
};

export const ETH_TIMECHAIN: Asset = {
  address: 'ETH',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  isMintable: false,
};
