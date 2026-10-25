import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import PaymentError from '@/components/shared/Dialog/PaymentError.vue';

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      DialogBase: {
        props: ['visible'],
        emits: ['update:visible'],
        template: '<div><slot /></div>',
      },
    },
  });
});

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('PaymentError dialog', () => {
  it('syncs visibility with outer model and emits close events', async () => {
    const wrapper = mount(PaymentError, {
      props: {
        visible: true,
      },
    });

    await wrapper.vm.closeDialog();

    expect(wrapper.emitted()['update:visible']).toBeTruthy();
    expect(wrapper.emitted()['update:visible']?.[0]).toEqual([false]);
    expect(wrapper.emitted().close).toBeTruthy();
  });
});
