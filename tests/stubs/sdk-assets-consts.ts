type MockAsset = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  isMintable: boolean;
  type: string;
};

const createAsset = (address: string, symbol: string, name = symbol): MockAsset => ({
  address,
  symbol,
  name,
  decimals: 18,
  isMintable: true,
  type: 'Regular',
});

export class ArrayLike<T extends { address: string; symbol: string }> extends Array<T> {
  constructor(items?: Array<T>) {
    super();
    if (Array.isArray(items)) {
      items.forEach((item) => this.push(item));
    }
  }

  public contains(info: string): boolean {
    return this.some((asset) => asset.address === info || asset.symbol === info);
  }

  public get(info: string): T | undefined {
    return this.find((asset) => asset.address === info || asset.symbol === info);
  }
}

const nativeAssetItems: Array<MockAsset> = [
  createAsset('xor', 'XOR', 'SORA'),
  createAsset('val', 'VAL', 'SORA Validator Token'),
  createAsset('pswap', 'PSWAP', 'Polkaswap'),
  createAsset('kusd', 'KUSD', 'Kensetsu Dollar'),
  createAsset('tbcd', 'TBCD', 'SORA TBC Dollar'),
  createAsset('xstusd', 'XSTUSD', 'SORA Synthetic USD'),
  createAsset('xst', 'XST', 'SORA Synthetics'),
];

const knownAssetItems: Array<MockAsset> = [
  ...nativeAssetItems,
  createAsset('dai', 'DAI', 'Dai Stablecoin'),
  createAsset('eth', 'ETH', 'Ether'),
  createAsset('ken', 'KEN', 'Kensetsu'),
  createAsset('kgold', 'KGOLD', 'Kensetsu Gold'),
  createAsset('kxor', 'KXOR', 'Kensetsu XOR'),
  createAsset('karma', 'KARMA', 'Chameleon'),
  createAsset('vxor', 'VXOR', 'Vested SORA'),
];

export const NativeAssets = new ArrayLike(nativeAssetItems);
export const KnownAssets = new ArrayLike(knownAssetItems);

export const XOR = KnownAssets.get('XOR')!;
export const VAL = KnownAssets.get('VAL')!;
export const PSWAP = KnownAssets.get('PSWAP')!;
export const XSTUSD = KnownAssets.get('XSTUSD')!;
export const DAI = KnownAssets.get('DAI')!;
export const ETH = KnownAssets.get('ETH')!;
export const KUSD = KnownAssets.get('KUSD')!;
export const TBCD = KnownAssets.get('TBCD')!;
export const XST = KnownAssets.get('XST')!;
export const KEN = KnownAssets.get('KEN')!;
export const KGOLD = KnownAssets.get('KGOLD')!;
export const KXOR = KnownAssets.get('KXOR')!;
export const KARMA = KnownAssets.get('KARMA')!;
export const VXOR = KnownAssets.get('VXOR')!;

export const KnownSymbols = {
  XOR: 'XOR',
  VAL: 'VAL',
  PSWAP: 'PSWAP',
  DAI: 'DAI',
  ETH: 'ETH',
  XSTUSD: 'XSTUSD',
  XST: 'XST',
  TBCD: 'TBCD',
  KUSD: 'KUSD',
  KEN: 'KEN',
  KGOLD: 'KGOLD',
  KXOR: 'KXOR',
  KARMA: 'KARMA',
  VXOR: 'VXOR',
} as const;

export const BalanceType = {
  Transferable: 'Transferable',
  Total: 'Total',
  Locked: 'Locked',
  Frozen: 'Frozen',
  Reserved: 'Reserved',
  Bonded: 'Bonded',
} as const;

export const MaxRustNumber = '0';
export const MaxTotalSupply = '340282366920938463463374607431768211455';

export const DAY_IN_BLOCKS = 24 * 600;

export default {
  ArrayLike,
  NativeAssets,
  KnownAssets,
  XOR,
  VAL,
  PSWAP,
  XSTUSD,
  DAI,
  ETH,
  KUSD,
  TBCD,
  XST,
  KEN,
  KGOLD,
  KXOR,
  KARMA,
  VXOR,
  KnownSymbols,
  BalanceType,
  MaxRustNumber,
  MaxTotalSupply,
  DAY_IN_BLOCKS,
};
