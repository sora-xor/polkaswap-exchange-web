import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/soraneo-wallet/src/composables/useWalletTranslation', () => ({
  useWalletTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import NftDetails from '@/lib/soraneo-wallet/src/components/NftDetails.vue';

describe('Wallet NftDetails', () => {
  it('toggles the expandable header state and re-emits the click event', () => {
    const emit = vi.fn();
    const state = (NftDetails as any).setup({ isAssetDetails: true }, { attrs: {}, emit, expose: vi.fn(), slots: {} });

    state.handleDetailsClick();

    expect(state.nftDetailsClicked.value).toBe(true);
    expect(emit).toHaveBeenCalledWith('click-details');
  });

  it('resets the preview state before retrying the image fetch', () => {
    const state = (NftDetails as any).setup(
      { isAssetDetails: true, contentLink: '' },
      { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} }
    );

    state.badLink.value = true;
    state.imageLoading.value = false;
    state.handleRefresh();

    expect(state.badLink.value).toBe(false);
    expect(state.imageLoading.value).toBe(true);
  });
});
