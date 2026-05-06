import { beforeEach, describe, expect, it, vi } from 'vitest';

const { isNativeAssetMock } = vi.hoisted(() => ({
  isNativeAssetMock: vi.fn(),
}));

vi.mock('@sora-substrate/sdk/build/assets', () => ({
  isNativeAsset: isNativeAssetMock,
}));

import { sortAssets, sortPools } from '@/utils/asset-sort';

type AssetStub = {
  address: string;
  symbol: string;
  name: string;
  native?: boolean;
};

const createAsset = (overrides: Partial<AssetStub>): AssetStub => ({
  address: '0x-default',
  symbol: 'DEF',
  name: 'Default',
  native: false,
  ...overrides,
});

describe('asset sort helpers', () => {
  beforeEach(() => {
    isNativeAssetMock.mockImplementation((asset: AssetStub) => Boolean(asset.native));
  });

  it('orders native assets ahead of non-native assets', () => {
    const nativeAsset = createAsset({ address: '0x-native', symbol: 'XOR', native: true });
    const tokenAsset = createAsset({ address: '0x-token', symbol: 'VAL' });

    expect(sortAssets(nativeAsset as any, tokenAsset as any)).toBe(-1);
    expect(sortAssets(tokenAsset as any, nativeAsset as any)).toBe(1);
  });

  it('sorts native assets by address and non-native assets by symbol', () => {
    const nativeA = createAsset({ address: '0x-aaa', symbol: 'BBB', native: true });
    const nativeB = createAsset({ address: '0x-bbb', symbol: 'AAA', native: true });
    const tokenA = createAsset({ address: '0x-2', symbol: 'AAA' });
    const tokenB = createAsset({ address: '0x-1', symbol: 'BBB' });

    expect(sortAssets(nativeA as any, nativeB as any)).toBeLessThan(0);
    expect(sortAssets(tokenA as any, tokenB as any)).toBeLessThan(0);
  });

  it('sorts pools by base asset first and falls back to pool asset sorting on ties', () => {
    const baseAsset = createAsset({ address: '0x-base', symbol: 'AAA' });
    const poolA = createAsset({ address: '0x-pool-a', symbol: 'BBB' });
    const poolB = createAsset({ address: '0x-pool-b', symbol: 'CCC' });
    const laterBase = createAsset({ address: '0x-base-2', symbol: 'ZZZ' });

    expect(sortPools({ baseAsset, poolAsset: poolA } as any, { baseAsset, poolAsset: poolB } as any)).toBeLessThan(0);

    expect(
      sortPools({ baseAsset: laterBase, poolAsset: poolA } as any, { baseAsset, poolAsset: poolB } as any)
    ).toBeGreaterThan(0);
  });
});
