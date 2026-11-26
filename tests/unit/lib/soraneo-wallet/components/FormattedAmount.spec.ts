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

  it('renders a sub-cent exact fiat quote and a genuine zero as distinct values', async () => {
    const wrapper = mount(FormattedAmount, {
      props: {
        value: '0.000000000340941693',
        isFiatValue: true,
        fiatDefaultRounding: true,
      },
    });
    expect(wrapper.get('.formatted-amount__decimal-value').text()).toBe('.000000000340941693');
    await wrapper.setProps({ value: '0.000000000000000000125' });
    expect(wrapper.get('.formatted-amount__decimal-value').text()).toBe('.000000000000000000125');
    await wrapper.setProps({ value: '0' });
    expect(wrapper.get('.formatted-amount__decimal-value').text()).toBe('.00');
  });
  it('marks overflowing values so row styles can reveal the full amount on hover', async () => {
    const wrapper = mount(FormattedAmount, {
      props: {
        value: '998,999,999,999,999.1234',
      },
    });
    const amount = wrapper.get('.formatted-amount');
    const value = wrapper.get('.formatted-amount__value');

    Object.defineProperty(amount.element, 'offsetWidth', { configurable: true, value: 100 });
    Object.defineProperty(value.element, 'offsetWidth', { configurable: true, value: 180 });

    await amount.trigger('mouseenter');

    expect(amount.classes()).toContain('formatted-amount--value-wider');

    await amount.trigger('mouseleave');

    expect(amount.classes()).not.toContain('formatted-amount--value-wider');
  });
});
