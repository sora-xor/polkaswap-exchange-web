import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import { describe, expect, it } from 'vitest';

import InfoLine from '@/lib/soraneo-wallet/src/components/InfoLine.vue';

const createStoreMock = (shouldBalanceBeHidden = false) =>
  createStore({
    modules: {
      wallet: {
        namespaced: true,
        modules: {
          settings: {
            namespaced: true,
            state: () => ({
              shouldBalanceBeHidden,
            }),
          },
        },
      },
    },
  });

describe('InfoLine', () => {
  it('treats numeric values as displayable strings', () => {
    const wrapper = mount(InfoLine, {
      props: {
        value: 42,
      },
      global: {
        plugins: [createStoreMock()],
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
        plugins: [createStoreMock(true)],
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
