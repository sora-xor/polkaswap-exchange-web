import { describe, expect, it, vi } from 'vitest';

import AddAssetNFT from '@/lib/soraneo-wallet/src/components/AddAsset/AddAssetNftTab.vue';
import AddAssetToken from '@/lib/soraneo-wallet/src/components/AddAsset/AddAssetTokenTab.vue';

describe('Wallet AddAsset tabs', () => {
  it('shows the add button when token assets are selected', () => {
    const showAddButton = (AddAssetToken as any).computed.showAddButton.call({
      selectedAssets: [{ address: 'asset-1' }],
    });

    expect(showAddButton).toBe(true);
  });

  it('re-emits the visibility change from the nft tab', () => {
    const emit = vi.fn();

    (AddAssetNFT as any).methods.handleAdd.call({ $emit: emit });

    expect(emit).toHaveBeenCalledWith('change-visibility');
  });
});
