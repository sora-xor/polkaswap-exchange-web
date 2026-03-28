import { describe, expect, it, vi } from 'vitest';

const useAddAssetMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/soraneo-wallet/src/composables/useAddAsset', () => ({
  useAddAsset: () => useAddAssetMock(),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    assetsFilter: null,
    whitelist: {},
  }),
}));

import AddAssetNFT from '@/lib/soraneo-wallet/src/components/AddAsset/AddAssetNftTab.vue';
import AddAssetToken from '@/lib/soraneo-wallet/src/components/AddAsset/AddAssetTokenTab.vue';

describe('Wallet AddAsset tabs', () => {
  it('shows the add button when token assets are selected', () => {
    useAddAssetMock.mockReturnValue({
      t: (key: string) => key,
      search: { value: '' },
      searchValue: { value: '' },
      resetSearch: vi.fn(),
      selectedAssets: { value: [{ address: 'asset-1' }] },
      parentLoading: { value: false },
      loading: { value: false },
      assets: { value: [] },
      accountAssetsAddressTable: { value: {} },
      accountAssets: { value: [] },
      getSoughtAssets: vi.fn(),
      handleSelectAsset: vi.fn(),
    });
    const state = (AddAssetToken as any).setup(
      {},
      {
        attrs: {},
        emit: vi.fn(),
        expose: vi.fn(),
        slots: {},
      }
    );

    expect(state.showAddButton.value).toBe(true);
  });

  it('re-emits the visibility change from the nft tab', () => {
    const emit = vi.fn();
    useAddAssetMock.mockReturnValue({
      t: (key: string) => key,
      search: { value: '' },
      searchValue: { value: '' },
      resetSearch: vi.fn(),
      selectedAssets: { value: [] },
      parentLoading: { value: false },
      loading: { value: false },
      assets: { value: [] },
      accountAssetsAddressTable: { value: {} },
      accountAssets: { value: [] },
      getSoughtAssets: vi.fn(),
      handleSelectAsset: vi.fn(),
    });
    const state = (AddAssetNFT as any).setup(
      {},
      {
        attrs: {},
        emit,
        expose: vi.fn(),
        slots: {},
      }
    );

    state.handleAdd();

    expect(emit).toHaveBeenCalledWith('change-visibility');
  });
});
