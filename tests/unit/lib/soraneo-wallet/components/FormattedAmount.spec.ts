import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

const useWalletStoreMock = vi.hoisted(() =>
  vi.fn(() => ({
    shouldBalanceBeHidden: false,
    fiatExchangeRateObject: {},
    fiatPriceObject: {},
    currency: 'DAI',
  }))
);

vi.mock('@/stores/wallet', () => ({
  useWalletStore: useWalletStoreMock,
}));

import FormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';

describe('FormattedAmount', () => {
  it('keeps the symbol visible when integer-only values render as decimal-style amounts', () => {
    const wrapper = mount(FormattedAmount, {
      props: {
        value: '0',
        assetSymbol: 'XOR',
        integerOnly: true,
        symbolAsDecimal: true,
      },
    });

    expect(wrapper.find('.formatted-amount__integer').text()).toBe('0');
    expect(wrapper.find('.formatted-amount__decimal-value').text()).toBe('');
    expect(wrapper.find('.formatted-amount__symbol').text()).toBe('XOR');
    expect(wrapper.text().replace(/\s+/g, ' ').trim()).toBe('0 XOR');
  });
});
