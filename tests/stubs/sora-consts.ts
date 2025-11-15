export const XOR = { address: 'xor', symbol: 'XOR', decimals: 18 } as const;
export const VAL = { address: 'val', symbol: 'VAL', decimals: 18 } as const;
export const DAI = { address: '0xDAI', symbol: 'DAI', decimals: 18 } as const;
export const KUSD = { address: '0xKUSD', symbol: 'KUSD', decimals: 18 } as const;
export const KGOLD = { address: '0xKGOLD', symbol: 'KGOLD', decimals: 18 } as const;
export const KEN = { address: '0xKEN', symbol: 'KEN', decimals: 18 } as const;
export const KXOR = { address: '0xKXOR', symbol: 'KXOR', decimals: 18 } as const;
export const XSTUSD = { address: '0xXSTUSD', symbol: 'XSTUSD', decimals: 18 } as const;
export const TBCD = { address: 'tbcd', symbol: 'TBCD', decimals: 18 } as const;
export const KnownSymbols = { XOR: 'XOR', VAL: 'VAL', KUSD: 'KUSD' } as const;
export const BalanceType = {
  Transferable: 'Transferable',
  Total: 'Total',
  Locked: 'Locked',
  Frozen: 'Frozen',
  Reserved: 'Reserved',
  Bonded: 'Bonded',
} as const;

export default {
  XOR,
  VAL,
  DAI,
  KUSD,
  KGOLD,
  KEN,
  KXOR,
  XSTUSD,
  TBCD,
  KnownSymbols,
  BalanceType,
};
