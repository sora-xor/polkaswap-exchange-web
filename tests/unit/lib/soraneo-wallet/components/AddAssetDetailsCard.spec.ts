import { describe, expect, it, vi } from 'vitest';

const addAccountAsset = vi.hoisted(() => vi.fn());

vi.mock('@/lib/soraneo-wallet/src/composables/useAddAsset', () => ({
  useAddAsset: () => ({
    t: (key: string) => key,
    tc: (key: string) => key,
    addAccountAsset,
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    whitelist: {},
    whitelistIdsBySymbol: {},
  }),
}));

import AddAssetDetailsCard from '@/lib/soraneo-wallet/src/components/AddAsset/AddAssetDetailsCard.vue';

describe('Wallet AddAssetDetailsCard', () => {
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
});
