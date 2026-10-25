import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
const { copy } = vi.hoisted(() => ({ copy: vi.fn(async () => {}) }));
vi.mock('@/composables/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/stores/wallet', () => ({ useWalletStore: () => ({ address: 'sora-receiving-account' }) }));
vi.mock('@/utils', () => ({ copyToClipboard: copy }));
import ReceiveXorDialog from '@/features/swap/components/ReceiveXorDialog.vue';

describe('in-place native fee funding', () => {
  it('shows the current SORA address, copies it, and returns without navigating', async () => {
    const wrapper = mount(ReceiveXorDialog, {
      props: { visible: true },
      global: {
        stubs: {
          DialogBase: { template: '<div><slot /><slot name="footer" /></div>' },
          QrCode: { props: ['value'], template: '<div class="qr" :data-value="value" />' },
          WalletAccount: true,
          's-button': {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    });
    expect(wrapper.get('code').text()).toBe('sora-receiving-account');
    expect(wrapper.get('.qr').attributes('data-value')).toBe('sora-receiving-account');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'ux.swap.copyAddress')!
      .trigger('click');
    await flushPromises();
    expect(copy).toHaveBeenCalledWith('sora-receiving-account');
    expect(wrapper.text()).toContain('ux.swap.copied');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'ux.swap.backToSwap')!
      .trigger('click');
    expect(wrapper.emitted('update:visible')).toEqual([[false]]);
  });
});
