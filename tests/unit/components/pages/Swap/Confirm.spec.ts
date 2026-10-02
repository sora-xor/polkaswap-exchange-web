import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import type { SwapReview } from '@/features/swap/types/review';

vi.mock('@/composables/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    formatStringValue: (value: string) => value,
    formatCodecNumber: (value: string) => value,
  }),
}));
import Confirm from '@/features/swap/components/Confirm.vue';

const review = {
  tokenFrom: { address: 'xor', symbol: 'XOR', decimals: 18 },
  tokenTo: { address: 'val', symbol: 'VAL', decimals: 18 },
  fromValue: '1',
  toValue: '2',
  minMaxReceived: '1',
  isExchangeB: false,
} as SwapReview;
const mountConfirm = () =>
  mount(Confirm, {
    props: { visible: true, review, readiness: { ready: true } },
    global: {
      stubs: {
        DialogBase: { template: '<div><slot /><slot name="footer" /></div>' },
        SwapTransactionDetails: true,
        TokenLogo: true,
        AccountConfirmationOption: true,
        's-button': {
          emits: ['click'],
          props: ['disabled', 'loading'],
          template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
        's-icon': true,
        's-divider': true,
      },
    },
  });

describe('swap confirmation interaction', () => {
  it('emits confirmation without closing itself, then exposes invalidated-quote recovery', async () => {
    const wrapper = mountConfirm();
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('confirm')).toHaveLength(1);
    expect(wrapper.emitted('update:visible')).toBeUndefined();
    await wrapper.setProps({
      readiness: { ready: false, reason: 'quoteError', retryable: true },
      statusMessage: 'Quote unavailable',
    });
    expect(wrapper.get('[role="status"]').text()).toContain('Quote unavailable');
    const confirm = wrapper.findAll('button').find((button) => button.text() === 'confirmText')!;
    expect(confirm.attributes('disabled')).toBeDefined();
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'ux.swap.retryQuote')!
      .trigger('click');
    expect(wrapper.emitted('retry')).toHaveLength(1);
    expect(wrapper.text()).toContain('XOR');
    expect(wrapper.text()).toContain('VAL');
  });
  it('exposes explicit review refresh and blocks repeated confirms during submission', async () => {
    const wrapper = mountConfirm();
    await wrapper.setProps({
      readiness: { ready: false, reason: 'reviewChanged', retryable: false },
      statusMessage: 'Review updated quote',
    });
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'ux.swap.reviewLatest')!
      .trigger('click');
    expect(wrapper.emitted('refresh')).toHaveLength(1);
    await wrapper.setProps({ readiness: { ready: true }, submitting: true });
    const confirm = wrapper.findAll('button').find((button) => button.text() === 'confirmText')!;
    await confirm.trigger('click');
    expect(wrapper.emitted('confirm')).toBeUndefined();
  });
});
