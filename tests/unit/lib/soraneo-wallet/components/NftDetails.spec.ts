import { describe, expect, it, vi } from 'vitest';

import { mountSetup } from '@stubs/mountSetup';

vi.mock('@/lib/soraneo-wallet/src/composables/useWalletTranslation', () => ({
  useWalletTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import NftDetails from '@/lib/soraneo-wallet/src/components/NftDetails.vue';

describe('Wallet NftDetails', () => {
  it('toggles the expandable header state and re-emits the click event', () => {
    const emit = vi.fn();
    const { state } = mountSetup(NftDetails as any, { isAssetDetails: true }, { emit });

    state.handleDetailsClick();

    expect(state.nftDetailsClicked.value).toBe(true);
    expect(emit).toHaveBeenCalledWith('click-details');
  });

  it('resets the preview state before retrying the image fetch', () => {
    const { state } = mountSetup(NftDetails as any, { isAssetDetails: true, contentLink: '' }, { emit: vi.fn() });

    state.badLink.value = true;
    state.imageLoading.value = false;
    state.handleRefresh();

    expect(state.badLink.value).toBe(false);
    expect(state.imageLoading.value).toBe(true);
  });
});
