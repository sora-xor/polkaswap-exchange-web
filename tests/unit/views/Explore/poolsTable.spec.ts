import { FPNumber } from '@sora-substrate/sdk';
import { describe, expect, it, vi } from 'vitest';

const formatDecimalPlacesMock = vi.hoisted(() =>
  vi.fn((value, asPercent?: boolean) => {
    if (value instanceof FPNumber) {
      const num = value.toNumber();
      return asPercent ? `${num * 100}%` : num.toString();
    }
    return typeof value === 'number' ? value.toString() : (value ?? '').toString();
  })
);
const formatAmountWithSuffixMock = vi.hoisted(() =>
  vi.fn((value) => ({
    amount: value instanceof FPNumber ? value.toNumber().toString() : String(value ?? 0),
    suffix: '',
  }))
);
const sortPoolsMock = vi.hoisted(() =>
  vi.fn(
    (
      a: { baseAsset: { symbol: string }; poolAsset: { symbol: string } },
      b: { baseAsset: { symbol: string }; poolAsset: { symbol: string } }
    ) => {
      const nameA = `${a.baseAsset.symbol}-${a.poolAsset.symbol}`;
      const nameB = `${b.baseAsset.symbol}-${b.poolAsset.symbol}`;
      return nameA.localeCompare(nameB);
    }
  )
);

vi.mock('@/utils', () => ({
  formatDecimalPlaces: formatDecimalPlacesMock,
  formatAmountWithSuffix: formatAmountWithSuffixMock,
  sortPools: sortPoolsMock,
}));
import type { PoolData } from '@/indexer/queries/pool/pools';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';
import { buildPoolTableItems, filterPoolTableItems, type PoolExploreTableItem } from '@/views/Explore/poolsTable';

const createAsset = (address: string, symbol: string): RegisteredAccountAsset =>
  ({
    address,
    symbol,
    name: symbol,
    decimals: 18,
    balance: { transferable: '0' },
    externalAddress: address,
    externalBalance: '0',
    externalDecimals: 18,
  }) as RegisteredAccountAsset;

const mockAccountLiquidity: AccountLiquidity[] = [
  {
    address: 'lp',
    balance: '0',
    firstAddress: 'base',
    firstBalance: '500000000000000000',
    secondAddress: 'target',
    secondBalance: '900000000000000000',
    poolShare: '1',
    reserveA: '1',
    reserveB: '1',
    totalSupply: '1',
  } as AccountLiquidity,
];

const mockPools: PoolData[] = [
  {
    baseAssetId: 'base',
    targetAssetId: 'target',
    baseAssetReserves: '1000000000000000000',
    targetAssetReserves: '2000000000000000000',
    priceUSD: new FPNumber(2),
    apy: new FPNumber(0.25),
  },
  {
    baseAssetId: 'missing',
    targetAssetId: 'target',
    baseAssetReserves: '0',
    targetAssetReserves: '0',
    priceUSD: new FPNumber(1),
    apy: new FPNumber(0),
  },
];

describe('poolsTable helpers', () => {
  it('normalises pools into table rows and marks account liquidity entries', () => {
    const baseAsset = createAsset('base', 'BAS');
    const targetAsset = createAsset('target', 'TAR');
    const getAsset = (address?: string) => {
      if (address === 'base') return baseAsset;
      if (address === 'target') return targetAsset;
      return null;
    };

    const items = buildPoolTableItems({
      pools: mockPools,
      accountLiquidity: mockAccountLiquidity,
      getAsset,
    });

    expect(items).toHaveLength(1);
    const [row] = items;
    expect(row.name).toBe('BAS-TAR');
    expect(row.baseAsset).toBe(baseAsset);
    expect(row.targetAsset).toBe(targetAsset);
    expect(row.priceUSD).toBe(2);
    expect(row.apy).toBeCloseTo(0.25);
    expect(row.tvl).toBeCloseTo(8);
    expect(row.poolTokens[0]?.asset).toBe(baseAsset);
    expect(row.poolTokens[1]?.asset).toBe(targetAsset);
    expect(formatDecimalPlacesMock).toHaveBeenCalledWith(FPNumber.fromCodecValue(mockAccountLiquidity[0].firstBalance));
    expect(row.isAccountItem).toBe(true);
  });

  it('filters pool rows by name and token metadata', () => {
    const asset = createAsset('base', 'BAS');
    const otherAsset = createAsset('other', 'OTR');
    const items: PoolExploreTableItem[] = [
      {
        name: 'BAS-AAA',
        baseAsset: asset,
        targetAsset: otherAsset,
        priceUSD: 0,
        priceUSDFormatted: '',
        apy: 0,
        apyFormatted: '',
        tvl: 0,
        tvlFormatted: { amount: '0', suffix: '' },
        isAccountItem: false,
        poolTokens: [],
        accountTokens: [],
      },
      {
        name: 'XYZ',
        baseAsset: otherAsset,
        targetAsset: asset,
        priceUSD: 0,
        priceUSDFormatted: '',
        apy: 0,
        apyFormatted: '',
        tvl: 0,
        tvlFormatted: { amount: '0', suffix: '' },
        isAccountItem: false,
        poolTokens: [],
        accountTokens: [],
      },
    ];

    expect(filterPoolTableItems(items, 'bas')).toHaveLength(2);
    expect(filterPoolTableItems(items, 'xyz')).toHaveLength(1);
    expect(filterPoolTableItems(items, 'OTR')).toHaveLength(2);
    expect(filterPoolTableItems(items, 'other')).toHaveLength(2);
    expect(filterPoolTableItems(items, 'zzz')).toHaveLength(0);
  });
});
