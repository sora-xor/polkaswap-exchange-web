import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const setAllowFeePopup = vi.hoisted(() => vi.fn());

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    setAllowFeePopup,
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import NetworkFeeWarning from '@/lib/soraneo-wallet/src/components/NetworkFeeWarning.vue';

describe('NetworkFeeWarning', () => {
  beforeEach(() => {
    setAllowFeePopup.mockClear();
  });

  it('persists the fee-popup preference through the Pinia wallet store', async () => {
    const wrapper = mount(NetworkFeeWarning, {
      global: {
        stubs: {
          SimpleNotification: {
            template: '<div><slot name="title" /><slot name="text" /></div>',
          },
        },
      },
    });

    (wrapper.vm as any).hidePopup = true;
    await (wrapper.vm as any).handleConfirm();

    expect(setAllowFeePopup).toHaveBeenCalledWith(false);
    expect(wrapper.emitted('confirm')).toHaveLength(1);
  });
});
