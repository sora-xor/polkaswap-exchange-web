import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { describe, expect, it, vi } from 'vitest';

const useWalletStoreMock = vi.hoisted(() =>
  vi.fn(() => ({
    shouldBalanceBeHidden: false,
  }))
);

vi.mock('@/stores/wallet', () => ({
  useWalletStore: useWalletStoreMock,
}));

import InfoLine from '@/lib/soraneo-wallet/src/components/InfoLine.vue';

const FormattedAmountStub = defineComponent({
  name: 'FormattedAmountStub',
  props: {
    integerOnly: {
      type: Boolean,
      default: false,
    },
  },
  template: '<div class="formatted-amount-stub" :data-integer-only="String(integerOnly)" />',
});

describe('InfoLine', () => {
  it('treats numeric values as displayable strings', () => {
    const wrapper = mount(InfoLine, {
      props: {
        value: 42,
      },
      global: {
        stubs: {
          FormattedAmount: true,
          STooltip: { template: '<div><slot /></div>' },
          SIcon: true,
        },
      },
    });

    expect((wrapper.vm as any).normalizedValue).toBe('42');
    expect((wrapper.vm as any).isValueExists).toBe(true);
  });

  it('filters invalid numeric sentinel strings from display', () => {
    const wrapper = mount(InfoLine, {
      props: {
        value: 'NaN',
      },
      global: {
        stubs: {
          FormattedAmount: true,
          STooltip: { template: '<div><slot /></div>' },
          SIcon: true,
        },
      },
    });

    expect((wrapper.vm as any).hasInvalidValue).toBe(true);
    expect((wrapper.vm as any).isValueExists).toBe(false);
  });

  it('passes integer-only formatting through to the formatted amount renderer', () => {
    const wrapper = mount(InfoLine, {
      props: {
        value: '0',
        isFormatted: true,
        integerOnly: true,
      },
      global: {
        stubs: {
          FormattedAmount: FormattedAmountStub,
          STooltip: { template: '<div><slot /></div>' },
          SIcon: true,
        },
      },
    });

    expect(wrapper.find('.formatted-amount-stub').attributes('data-integer-only')).toBe('true');
  });
});
