import { describe, expect, it, vi } from 'vitest';
import { api } from '@sora-substrate/sdk';
import { ref } from 'vue';

const navigate = vi.hoisted(() => vi.fn());
const setMultiplePinnedAssets = vi.hoisted(() => vi.fn());
const setAccountAssets = vi.hoisted(() => vi.fn());

vi.mock('@/lib/soraneo-wallet/src/composables/useLoading', () => ({
  useLoading: () => ({
    loading: ref(false),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    getAssetFiatPrice: vi.fn(),
    getFPNumberFromCodec: vi.fn((value: string) => ({ mul: () => ({ toLocaleString: () => value }) })),
    formatCodecNumber: vi.fn((value: string) => value),
    isCodecZero: vi.fn(() => false),
    getFiatBalance: vi.fn(),
    FontSizeRate: {},
    FontWeightRate: {},
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useWalletTranslation', () => ({
  useWalletTranslation: () => ({
    t: (key: string) => key,
    shouldBalanceBeHidden: ref(false),
    TranslationConsts: {},
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    accountAssets: [],
    fiatPriceObject: {},
    permissions: { addAssets: true },
    filters: { option: 'all', verifiedOnly: false, zeroBalance: false },
    whitelist: {},
    isAssetPinned: (asset: { address: string }) => asset.address === 'pinned',
    setPinnedAsset: vi.fn(),
    removePinnedAsset: vi.fn(),
    setMultiplePinnedAssets,
    setAccountAssets,
    navigate,
  }),
}));

import WalletAssets from '@/lib/soraneo-wallet/src/components/WalletAssets.vue';

describe('Wallet WalletAssets', () => {
  it('does not depend on translation or fiat refs coming from useFormattedAmount', () => {
    const state = (WalletAssets as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    expect(state.assetsFiatAmount.value).toBe(null);
    expect(state.permissions.value.addAssets).toBe(true);
  });

  it('keeps pinned and unpinned assets in separate draggable groups', () => {
    const state = (WalletAssets as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });
    const canMove = state.onMove({
      draggedContext: { element: { address: 'pinned' } },
      relatedContext: { element: { address: 'free' } },
    });

    expect(canMove).toBe(false);
  });

  it('persists the reordered list through the computed assetList setter', () => {
    const originalAssets = api.assets;
    const fakeAssets = {
      ...(originalAssets ?? {}),
      updateAccountAssets: vi.fn(),
      accountAssetsAddresses: [] as string[],
    };
    (api as any).assets = fakeAssets;
    const state = (WalletAssets as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });
    state.assetList.value = [{ address: 'pinned' }, { address: 'free' }];

    expect(setMultiplePinnedAssets).toHaveBeenCalledWith(['pinned']);
    expect(setAccountAssets).toHaveBeenCalledWith([{ address: 'pinned' }, { address: 'free' }]);
    expect(fakeAssets.accountAssetsAddresses).toEqual(['pinned', 'free']);
    expect(fakeAssets.updateAccountAssets).toHaveBeenCalledTimes(1);

    (api as any).assets = originalAssets;
  });

  it('routes add-asset navigation through the wallet store boundary', () => {
    const state = (WalletAssets as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    state.handleOpenAddAsset();

    expect(navigate).toHaveBeenCalledWith({ name: 'AddAsset' });
  });
});
