import { describe, expect, it, vi } from 'vitest';
import { api } from '@sora-substrate/sdk';

import WalletAssets from '@/lib/soraneo-wallet/src/components/WalletAssets.vue';

describe('Wallet WalletAssets', () => {
  it('keeps pinned and unpinned assets in separate draggable groups', () => {
    const isAssetPinned = vi.fn((asset: { address: string }) => asset.address === 'pinned');

    const canMove = (WalletAssets as any).methods.onMove.call(
      { isAssetPinned },
      {
        draggedContext: { element: { address: 'pinned' } },
        relatedContext: { element: { address: 'free' } },
      }
    );

    expect(canMove).toBe(false);
  });

  it('persists the reordered list through the computed assetList setter', () => {
    const setMultiplePinnedAssets = vi.fn();
    const setAccountAssets = vi.fn();
    const originalAssets = api.assets;
    const fakeAssets = {
      ...(originalAssets ?? {}),
      updateAccountAssets: vi.fn(),
      accountAssetsAddresses: [] as string[],
    };
    (api as any).assets = fakeAssets;

    (WalletAssets as any).computed.assetList.set.call(
      {
        isAssetPinned: (asset: { address: string }) => asset.address === 'pinned',
        setMultiplePinnedAssets,
        setAccountAssets,
      },
      [{ address: 'pinned' }, { address: 'free' }]
    );

    expect(setMultiplePinnedAssets).toHaveBeenCalledWith(['pinned']);
    expect(setAccountAssets).toHaveBeenCalledWith([{ address: 'pinned' }, { address: 'free' }]);
    expect(fakeAssets.accountAssetsAddresses).toEqual(['pinned', 'free']);
    expect(fakeAssets.updateAccountAssets).toHaveBeenCalledTimes(1);

    (api as any).assets = originalAssets;
  });
});
