import { describe, expect, it, vi } from 'vitest';

import AddAssetDetailsCard from '@/lib/soraneo-wallet/src/components/AddAsset/AddAssetDetailsCard.vue';

describe('Wallet AddAssetDetailsCard', () => {
  it('emits add once and adds every selected asset to the account', async () => {
    const emit = vi.fn();
    const addAccountAsset = vi.fn();
    const selectAssets = [{ address: 'asset-1' }, { address: 'asset-2' }];

    await (AddAssetDetailsCard as any).methods.handleAddAssets.call({
      $emit: emit,
      addAccountAsset,
      selectAssets,
    });

    expect(emit).toHaveBeenCalledWith('add');
    expect(addAccountAsset).toHaveBeenNthCalledWith(1, selectAssets[0]);
    expect(addAccountAsset).toHaveBeenNthCalledWith(2, selectAssets[1]);
  });
});
