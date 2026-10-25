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
  it('does not move browser focus when the card initially mounts', () => {
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    const blurSpy = vi.spyOn(HTMLElement.prototype, 'blur');

    const wrapper = mount(WalletBase, {
      attachTo: document.body,
      props: {
        resetFocus: 'step-1',
        title: 'Send',
      },
      global: {
        stubs: {
          's-card': SCardStub,
        },
      },
    });

    expect(focusSpy).not.toHaveBeenCalled();
    expect(blurSpy).not.toHaveBeenCalled();

    wrapper.unmount();
    focusSpy.mockRestore();
    blurSpy.mockRestore();
  });

  it('moves focus to the header when resetFocus changes and no field is active', async () => {
    const wrapper = mount(WalletBase, {
      attachTo: document.body,
      props: {
        resetFocus: 'step-1',
        title: 'Send',
      },
      global: {
        stubs: {
          's-card': SCardStub,
        },
      },
    });
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    const blurSpy = vi.spyOn(HTMLElement.prototype, 'blur');

    await wrapper.setProps({ resetFocus: 'step-2' });

    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(blurSpy).toHaveBeenCalledTimes(1);

    wrapper.unmount();
    focusSpy.mockRestore();
    blurSpy.mockRestore();
  });

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
