import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import WalletBase from '@/lib/soraneo-wallet/src/components/WalletBase.vue';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const SCardStub = defineComponent({
  name: 'SCardStub',
  template: '<section class="s-card-stub"><header><slot name="header" /></header><main><slot /></main></section>',
});

describe('WalletBase', () => {
  it('does not steal focus from an active editable field when resetFocus changes', async () => {
    const wrapper = mount(WalletBase, {
      attachTo: document.body,
      props: {
        resetFocus: 'step-1',
        title: 'Send',
      },
      slots: {
        default: '<input class="wallet-base-editable" />',
      },
      global: {
        stubs: {
          's-card': SCardStub,
        },
      },
    });

    const input = wrapper.get<HTMLInputElement>('.wallet-base-editable').element;
    input.focus();

    await wrapper.setProps({ resetFocus: 'step-2' });

    expect(document.activeElement).toBe(input);

    wrapper.unmount();
  });
});
