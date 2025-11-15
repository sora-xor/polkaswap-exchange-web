import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { AccountAsset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

const registeredAssetsMock: Record<string, RegisteredAccountAsset> = {
  keep: {
    address: 'keep',
    symbol: 'KEEP',
    name: 'Keep Token',
    decimals: 18,
    balance: { transferable: '5' },
    externalAddress: '0xkeep',
    externalBalance: '0',
    externalDecimals: 18,
  },
  skip: {
    address: 'skip',
    symbol: 'SKIP',
    name: 'Skip Token',
    decimals: 18,
    balance: { transferable: '1' },
    externalAddress: '0xskip',
    externalBalance: '0',
    externalDecimals: 18,
  },
};

const accountAssetsMock: AccountAsset[] = [
  {
    address: 'AAA',
    symbol: 'AAA',
    name: 'Alpha Token',
    decimals: 18,
    balance: { transferable: '0', locked: '1000000000000000000' },
  },
  {
    address: 'BBB',
    symbol: 'BBB',
    name: 'Beta Token',
    decimals: 18,
    balance: { transferable: '2000000000000000000' },
  },
];

const assetDataByAddressMock = vi.fn((address: string) => registeredAssetsMock[address] ?? null);

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => ({
    registeredAssets: registeredAssetsMock,
    assetDataByAddress: assetDataByAddressMock,
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    accountAssets: accountAssetsMock,
  }),
}));

const sortAssetsMock = vi.hoisted(() => vi.fn((a: any, b: any) => a.symbol.localeCompare(b.symbol)));

vi.mock('@/utils/asset-sort', () => ({
  sortAssets: sortAssetsMock,
}));

import { useAssets } from '@/composables/useAssets';

describe('useAssets', () => {
  beforeEach(() => {
    assetDataByAddressMock.mockClear();
    sortAssetsMock.mockClear();
  });

  it('sorts account assets by balance and filters zero balances when requested', () => {
    const { filteredAccountAssets, sortedAccountAssets } = useAssets({ includeZeroBalance: false });

    expect(sortedAccountAssets.value.map((asset) => asset.address)).toEqual(['BBB', 'AAA']);
    expect(filteredAccountAssets.value.map((asset) => asset.address)).toEqual(['BBB']);
  });

  it('filters account assets by query', () => {
    const { filteredAccountAssets, search } = useAssets();

    search.value = 'beta';

    expect(filteredAccountAssets.value).toHaveLength(1);
    expect(filteredAccountAssets.value[0].symbol).toBe('BBB');
  });

  it('collects registered assets with balances excluding provided addresses', () => {
    const { getAssetsWithBalances } = useAssets();

    const result = getAssetsWithBalances(['keep', 'skip'], 'skip');

    expect(result).toHaveLength(1);
    expect(result[0]?.address).toBe('keep');
    expect(assetDataByAddressMock).toHaveBeenCalledWith('keep');
  });

  it('filters registered assets using external addresses by default', () => {
    const { filteredRegisteredAssets, search } = useAssets();

    search.value = '0xskip';

    expect(filteredRegisteredAssets.value).toHaveLength(1);
    expect(filteredRegisteredAssets.value[0]?.address).toBe('skip');
  });
});
