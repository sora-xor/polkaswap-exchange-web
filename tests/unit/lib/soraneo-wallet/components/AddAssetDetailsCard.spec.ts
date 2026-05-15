import { beforeEach, describe, expect, it, vi } from 'vitest';

const addAccountAsset = vi.hoisted(() => vi.fn());
const walletStoreState = vi.hoisted(() => ({
  libraryTheme: undefined as string | undefined,
  whitelist: {},
  whitelistIdsBySymbol: {},
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useAddAsset', () => ({
  useAddAsset: () => ({
    t: (key: string) => key,
    tc: (key: string) => key,
    loading: { value: false },
    addAccountAsset,
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreState,
}));

import AddAssetDetailsCard from '@/lib/soraneo-wallet/src/components/AddAsset/AddAssetDetailsCard.vue';

describe('Wallet AddAssetDetailsCard', () => {
  beforeEach(() => {
    addAccountAsset.mockClear();
    walletStoreState.libraryTheme = undefined;
  });

  it('emits add once and adds every selected asset to the account', async () => {
    const emit = vi.fn();
    const selectAssets = [{ address: 'asset-1' }, { address: 'asset-2' }];
    const state = (AddAssetDetailsCard as any).setup(
      {
        selectAssets,
        assetTypeKey: 'token',
      },
      {
        attrs: {},
        emit,
        expose: vi.fn(),
        slots: {},
      }
    );

    await state.handleAddAssets();

    expect(emit).toHaveBeenCalledWith('add');
    expect(addAccountAsset).toHaveBeenNthCalledWith(1, selectAssets[0]);
    expect(addAccountAsset).toHaveBeenNthCalledWith(2, selectAssets[1]);
  });

  it('uses the wallet dark theme when add-asset route props do not provide one', () => {
    walletStoreState.libraryTheme = 'dark';

    const state = (AddAssetDetailsCard as any).setup(
      {
        selectAssets: [{ address: 'asset-1' }],
        assetTypeKey: 'token',
      },
      {
        attrs: {},
        emit: vi.fn(),
        expose: vi.fn(),
        slots: {},
      }
    );

    expect(state.isDarkTheme.value).toBe(true);
    expect(state.isCardPrimary.value).toBe(false);
  });

  it('binds the composable loading state used by confirmation controls', () => {
    const state = (AddAssetDetailsCard as any).setup(
      {
        selectAssets: [{ address: 'asset-1' }],
        assetTypeKey: 'token',
      },
      {
        attrs: {},
        emit: vi.fn(),
        expose: vi.fn(),
        slots: {},
      }
    );

    expect(state.loading.value).toBe(false);
  });

  it('keeps dark status cards on a contrasting text color', async () => {
    const source = (await import('@/lib/soraneo-wallet/src/components/AddAsset/AddAssetDetailsCard.vue?raw'))
      .default as string;

    expect(source).toContain("'add-asset-details--dark': isDarkTheme");
    expect(source).toContain(':deep(.s-card.s-status-success)');
    expect(source).toContain(':deep(.s-card.s-status-warning)');
    expect(source).toContain(':deep(.s-card.s-status-error)');
    expect(source).toContain('color: var(--s-color-base-on-accent);');
  });
});
