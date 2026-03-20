import { describe, expect, it, vi } from 'vitest';

import NftDetails from '@/lib/soraneo-wallet/src/components/NftDetails.vue';

describe('Wallet NftDetails', () => {
  it('toggles the expandable header state and re-emits the click event', () => {
    const emit = vi.fn();
    const context = {
      nftDetailsClicked: false,
      $emit: emit,
    };

    (NftDetails as any).methods.handleDetailsClick.call(context);

    expect(context.nftDetailsClicked).toBe(true);
    expect(emit).toHaveBeenCalledWith('click-details');
  });

  it('resets the preview state before retrying the image fetch', () => {
    const checkImageAvailability = vi.fn();
    const context = {
      badLink: true,
      imageLoading: false,
      checkImageAvailability,
    };

    (NftDetails as any).methods.handleRefresh.call(context);

    expect(context.badLink).toBe(false);
    expect(context.imageLoading).toBe(true);
    expect(checkImageAvailability).toHaveBeenCalledTimes(1);
  });
});
