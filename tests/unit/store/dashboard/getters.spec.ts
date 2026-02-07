import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/store/dashboard', () => ({
  __esModule: true,
  dashboardGetterContext: vi.fn(),
}));

import getters from '@/store/dashboard/getters';
import { dashboardGetterContext } from '@/store/dashboard';

const dashboardGetterContextMock = vi.mocked(dashboardGetterContext);

describe('store/dashboard/getters', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (globalThis as any).__PS_APP_STORE__;
  });

  it('uses legacy wallet account when root state is missing', () => {
    const legacyWallet = {
      account: {
        assetsDataTable: { A1: { address: 'A1', symbol: 'A1' } },
        fiatPriceObject: { A1: '1' },
      },
    };

    (globalThis as any).__PS_APP_STORE__ = {
      state: { wallet: legacyWallet },
      getters: { wallet: legacyWallet },
    } as any;

    dashboardGetterContextMock.mockReturnValue({
      state: { ownedAssetIds: ['A1'] },
      rootState: {},
      rootGetters: {},
    } as any);

    const result = getters.ownedAssets({} as any);

    expect(result).toHaveLength(1);
    expect(result[0]?.address).toBe('A1');
  });
});
