import { beforeEach, describe, expect, it, vi } from 'vitest';

const getOwnedAssetIdsMock = vi.hoisted(() => vi.fn());

vi.mock('@wallet', () => ({
  api: {
    assets: {
      getOwnedAssetIds: getOwnedAssetIdsMock,
    },
  },
}));

vi.mock('direct-vuex', () => ({
  defineActions: (actions: Record<string, unknown>) => actions,
}));

vi.mock('@/store/dashboard', () => ({
  dashboardActionContext: (context: Record<string, unknown>) => context,
}));

import actions from '@/store/dashboard/actions';

describe('dashboard actions', () => {
  beforeEach(() => {
    getOwnedAssetIdsMock.mockReset();
  });

  it('skips owned-assets fetch when wallet is not logged in', async () => {
    const context = {
      commit: {
        resetOwnedAssetIds: vi.fn(),
        setOwnedAssetIds: vi.fn(),
      },
      rootGetters: {
        wallet: {
          account: {
            isLoggedIn: false,
            account: null,
          },
        },
      },
    };

    await expect(actions.requestOwnedAssetIds(context as any)).resolves.toBeUndefined();

    expect(getOwnedAssetIdsMock).not.toHaveBeenCalled();
    expect(context.commit.resetOwnedAssetIds).toHaveBeenCalledTimes(1);
    expect(context.commit.setOwnedAssetIds).not.toHaveBeenCalled();
  });

  it('requests and commits owned assets when wallet is logged in', async () => {
    getOwnedAssetIdsMock.mockResolvedValue(['asset-1', 'asset-2']);

    const context = {
      commit: {
        resetOwnedAssetIds: vi.fn(),
        setOwnedAssetIds: vi.fn(),
      },
      rootGetters: {
        wallet: {
          account: {
            isLoggedIn: true,
            account: { address: 'cn-account' },
          },
        },
      },
    };

    await expect(actions.requestOwnedAssetIds(context as any)).resolves.toBeUndefined();

    expect(getOwnedAssetIdsMock).toHaveBeenCalledWith('cn-account');
    expect(context.commit.setOwnedAssetIds).toHaveBeenCalledWith(['asset-1', 'asset-2']);
    expect(context.commit.resetOwnedAssetIds).not.toHaveBeenCalled();
  });
});
