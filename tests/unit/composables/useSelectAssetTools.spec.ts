import { describe, expect, it, vi } from 'vitest';

const sortByBalanceMock = vi.fn();
const getAssetsWithBalancesMock = vi.fn();

vi.mock('@/composables/useAssets', () => ({
  useAssets: vi.fn(() => ({
    sortByBalance: sortByBalanceMock,
    getAssetsWithBalances: getAssetsWithBalancesMock,
  })),
}));

import { useSelectAssetTools } from '@/composables/useSelectAssetTools';

describe('useSelectAssetTools', () => {
  it('proxies helpers from useAssets', () => {
    const tools = useSelectAssetTools();
    expect(tools.sortByBalance).toBe(sortByBalanceMock);
    expect(tools.getAssetsWithBalances).toBe(getAssetsWithBalancesMock);
  });
});
