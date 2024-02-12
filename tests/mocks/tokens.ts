import { FPNumber } from '@sora-substrate/util';
import { KnownSymbols } from '@sora-substrate/util/build/assets/consts';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

export const tokens = [
  {
    name: 'Sora',
    symbol: 'XOR',
    address: '1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    balance: 10000,
    price: 55.1,
    priceChange: 12,
  },
  {
    name: 'Kusama',
    symbol: 'KSM',
    address: '34916349d43f65bccca11ff53a8e0382a1a594a7',
    balance: 1000,
    price: 0.0055,
    priceChange: 12,
  },
  {
    name: 'Sora Validator Token',
    symbol: 'VAL',
    address: '0xe88f8313e61a97cec1871ee37fbbe2a8bf3ed1e4',
    balance: 1000,
    price: 1.2255,
    priceChange: -2,
  },
  {
    name: 'Ether',
    symbol: 'ETH',
    address: '8adaca8ea8192656a15c88797e04c8771c4576b3',
    balance: 20000.45,
    price: 0.0099,
    priceChange: -12,
  },
];

export const MOCK_ACCOUNT_ASSETS: Array<AccountAsset> = [
  {
    address: '0x0200000000000000000000000000000000000000000000000000000000000000',
    symbol: KnownSymbols.XOR,
    name: 'SORA',
    decimals: FPNumber.DEFAULT_PRECISION,
    isMintable: true,
    balance: {
      transferable: '123400000000000000000',
      total: '123400000000000000000',
      free: '123400000000000000000',
      reserved: '0',
      frozen: '0',
      locked: '0',
      bonded: '0',
    },
  },
  {
    address: '0x0200040000000000000000000000000000000000000000000000000000000000',
    symbol: KnownSymbols.VAL,
    name: 'SORA Validator Token',
    decimals: FPNumber.DEFAULT_PRECISION,
    isMintable: true,
    balance: {
      transferable: '0',
      total: '0',
      free: '0',
      reserved: '0',
      frozen: '0',
      locked: '0',
      bonded: '0',
    },
  },
  {
    address: '0x0200050000000000000000000000000000000000000000000000000000000000',
    symbol: KnownSymbols.PSWAP,
    name: 'Polkaswap',
    decimals: FPNumber.DEFAULT_PRECISION,
    isMintable: true,
    balance: {
      transferable: '1000000000000',
      total: '1000000000000',
      free: '1000000000000',
      reserved: '0',
      frozen: '0',
      locked: '0',
      bonded: '0',
    },
  },
];
