import { mount } from '@vue/test-utils';
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
});
