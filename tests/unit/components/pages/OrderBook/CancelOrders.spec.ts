import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import { Cancel } from '@/types/orderBook';

const dialogBaseStub = vi.hoisted(() => ({
  name: 'DialogBaseStub',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:visible'],
  template: '<div class="dialog-base-stub" :data-visible="visible"><slot /><slot name="footer" /></div>',
}));

const accountConfirmationOptionStub = vi.hoisted(() => ({
  name: 'AccountConfirmationOptionStub',
  template: '<div class="account-confirmation-option-stub"></div>',
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      DialogBase: dialogBaseStub,
      AccountConfirmationOption: accountConfirmationOptionStub,
    },
  });
});

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('CancelOrders.vue', () => {
  it('emits confirm event with Cancel.all and hides dialog', async () => {
    const module = await import('@/components/pages/OrderBook/Dialogs/CancelOrders.vue');
    const wrapper = mount(module.default, {
      props: {
        visible: true,
      },
      slots: {
        default: '<div class="slot-content">Body</div>',
      },
      global: {
        stubs: {
          's-button': {
            name: 'SButtonStub',
            emits: ['click'],
            template: '<button class="s-button-stub" @click="$emit(\'click\')"><slot /></button>',
          },
          's-icon': {
            name: 'SIconStub',
            template: '<i class="s-icon-stub"></i>',
          },
        },
      },
    });

    await (wrapper.vm as unknown as { handleCancel: () => void }).handleCancel();

    expect(wrapper.emitted('confirm')?.[0]?.[0]).toBe(Cancel.all);
    expect(wrapper.emitted('update:visible')?.[0]?.[0]).toBe(false);
  });
});
