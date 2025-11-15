import { FPNumber } from '@sora-substrate/math';

import { AssetTypes, type AccountBalance, type Asset, type KnownSymbol, type NativeSymbol } from './types';

export const MaxRustNumber = '170141183460469231731.687303715884105727';
export const MaxTotalSupply = '100000000000000000000'; // It's better to round it for UX
/** VAL supply difference between circulating and total supply */
export const VAL_CIRCULATING_DIFF = new FPNumber('33449609.3779');
/** PSWAP supply difference between circulating and total supply */
export const PSWAP_CIRCULATING_DIFF = new FPNumber('6345014420.6195');
/** Day in blocks (600 blocks per hour | 1 block per 6 seconds) */
export const DAY_IN_BLOCKS = 24 * 600;

export enum KnownSymbols {
  XOR = 'XOR',
  VAL = 'VAL',
  PSWAP = 'PSWAP',
  DAI = 'DAI',
  ETH = 'ETH',
  XSTUSD = 'XSTUSD',
  XST = 'XST',
  TBCD = 'TBCD',
  KEN = 'KEN',
  KUSD = 'KUSD',
  KGOLD = 'KGOLD',
  KXOR = 'KXOR',
  KARMA = 'KARMA',
  VXOR = 'VXOR',
}

const ZERO_STR = '0';

export const ZeroBalance: AccountBalance = {
  free: ZERO_STR,
  reserved: ZERO_STR,
  frozen: ZERO_STR,
  bonded: ZERO_STR,
  locked: ZERO_STR,
  total: ZERO_STR,
  transferable: ZERO_STR,
};

export enum BalanceType {
  Free = 'free',
  Reserved = 'reserved',
  Frozen = 'frozen',
  Bonded = 'bonded',
  Locked = 'locked',
  Total = 'total',
  Transferable = 'transferable',
}

export class ArrayLike<T, U> extends Array<T> {
  constructor(items?: Array<T>) {
    super();
    items && this.addItems(items);
  }
  private addItems(items: Array<T>): void {
    if (!(items instanceof Array)) {
      return;
    }
    this.push(...items);
  }
  public contains(info: string): boolean {
    return !!this.find((asset: any) => [asset.address, asset.symbol].includes(info));
  }
  /**
   * **ONLY** for known assets
   */
  public get(info: U): T;
  public get(info: string): T | undefined;
  public get(info: U | string): T | undefined {
    return this.find((asset: any) => [asset.address, asset.symbol].includes(info));
  }
}

export const NativeAssets = new ArrayLike<Asset, NativeSymbol>([
  {
    address: '0x0200000000000000000000000000000000000000000000000000000000000000',
    symbol: KnownSymbols.XOR,
    name: 'SORA',
    decimals: FPNumber.DEFAULT_PRECISION,
    isMintable: true,
    type: AssetTypes.Regular,
  },
  {
    address: '0x0200040000000000000000000000000000000000000000000000000000000000',
    symbol: KnownSymbols.VAL,
    name: 'SORA Validator Token',
    decimals: FPNumber.DEFAULT_PRECISION,
    isMintable: true,
    type: AssetTypes.Regular,
  },
  {
    address: '0x0200050000000000000000000000000000000000000000000000000000000000',
    symbol: KnownSymbols.PSWAP,
    name: 'Polkaswap',
    decimals: FPNumber.DEFAULT_PRECISION,
    isMintable: true,
    type: AssetTypes.Regular,
  },
  {
    address: '0x02000c0000000000000000000000000000000000000000000000000000000000',
    symbol: KnownSymbols.KUSD,
    name: 'Kensetsu Dollar',
    decimals: FPNumber.DEFAULT_PRECISION,
    isMintable: true,
    type: AssetTypes.Regular,
  },
  {
    address: '0x02000a0000000000000000000000000000000000000000000000000000000000',
    symbol: KnownSymbols.TBCD,
    name: 'SORA TBC Dollar',
    decimals: FPNumber.DEFAULT_PRECISION,
    isMintable: true,
    type: AssetTypes.Regular,
  },
  {
    address: '0x0200080000000000000000000000000000000000000000000000000000000000',
    symbol: KnownSymbols.XSTUSD,
    name: 'SORA Synthetic USD',
    decimals: FPNumber.DEFAULT_PRECISION,
    isMintable: true,
    type: AssetTypes.Regular,
  },
  {
    address: '0x0200090000000000000000000000000000000000000000000000000000000000',
    symbol: KnownSymbols.XST,
    name: 'SORA Synthetics',
    decimals: FPNumber.DEFAULT_PRECISION,
    isMintable: true,
    type: AssetTypes.Regular,
  },
]);

export const KnownAssets = new ArrayLike<Asset, KnownSymbol>([
  ...NativeAssets,
  {
    address: '0x0200060000000000000000000000000000000000000000000000000000000000',
    symbol: KnownSymbols.DAI,
    name: 'Dai Stablecoin',
    decimals: FPNumber.DEFAULT_PRECISION,
    isMintable: true,
    type: AssetTypes.Regular,
  },
  {
    address: '0x0200070000000000000000000000000000000000000000000000000000000000',
    symbol: KnownSymbols.ETH,
    name: 'Ether',
    decimals: FPNumber.DEFAULT_PRECISION,
    isMintable: true,
    type: AssetTypes.Regular,
  },
  {
    address: '0x02000b0000000000000000000000000000000000000000000000000000000000',
    symbol: KnownSymbols.KEN,
    name: 'Kensetsu',
    decimals: FPNumber.DEFAULT_PRECISION,
    isMintable: true,
    type: AssetTypes.Regular,
  },
  {
    address: '0x02000d0000000000000000000000000000000000000000000000000000000000',
    symbol: KnownSymbols.KGOLD,
    name: 'Kensetsu Gold',
    decimals: FPNumber.DEFAULT_PRECISION,
    isMintable: true,
    type: AssetTypes.Regular,
  },
  {
    address: '0x02000e0000000000000000000000000000000000000000000000000000000000',
    symbol: KnownSymbols.KXOR,
    name: 'Kensetsu XOR',
    decimals: FPNumber.DEFAULT_PRECISION,
    isMintable: true,
    type: AssetTypes.Regular,
  },
  {
    address: '0x02000f0000000000000000000000000000000000000000000000000000000000',
    symbol: KnownSymbols.KARMA,
    name: 'Chameleon',
    decimals: FPNumber.DEFAULT_PRECISION,
    isMintable: true,
    type: AssetTypes.Regular,
  },
  {
    address: '0x006a271832f44c93bd8692584d85415f0f3dccef9748fecd129442c8edcb4361',
    symbol: KnownSymbols.VXOR,
    name: 'Vested SORA',
    decimals: FPNumber.DEFAULT_PRECISION,
    isMintable: true,
    type: AssetTypes.Regular,
  },
]);

export const XOR = KnownAssets.get(KnownSymbols.XOR);
export const VAL = KnownAssets.get(KnownSymbols.VAL);
export const PSWAP = KnownAssets.get(KnownSymbols.PSWAP);
export const XSTUSD = KnownAssets.get(KnownSymbols.XSTUSD);
export const DAI = KnownAssets.get(KnownSymbols.DAI);
export const ETH = KnownAssets.get(KnownSymbols.ETH);
export const XST = KnownAssets.get(KnownSymbols.XST);
export const TBCD = KnownAssets.get(KnownSymbols.TBCD);
export const KEN = KnownAssets.get(KnownSymbols.KEN);
export const KUSD = KnownAssets.get(KnownSymbols.KUSD);
export const KGOLD = KnownAssets.get(KnownSymbols.KGOLD);
export const KXOR = KnownAssets.get(KnownSymbols.KXOR);
export const KARMA = KnownAssets.get(KnownSymbols.KARMA);
export const VXOR = KnownAssets.get(KnownSymbols.VXOR);
