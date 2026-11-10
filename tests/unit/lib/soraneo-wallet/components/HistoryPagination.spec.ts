import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import HistoryPagination from '@/lib/soraneo-wallet/src/components/HistoryPagination.vue';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, args?: { first: string; second: number }) => (args ? `${args.first} of ${args.second}` : key),
  }),
}));

describe('history pagination range', () => {
  it('shows zero for an empty result and the actual item range for a partial page', async () => {
    const wrapper = mount(HistoryPagination, {
      props: { total: 0, lastPage: 0 },
      global: {
        stubs: {
          SPagination: { template: '<nav><slot /></nav>' },
          SButton: { template: '<button><slot /></button>' },
          SIcon: true,
        },
      },
    });
    expect(wrapper.get('.el-pagination__total').text()).toBe('0 of 0');
    expect(wrapper.findAll('button').every((button) => button.attributes('disabled') !== undefined)).toBe(true);
    await wrapper.setProps({ total: 13, currentPage: 2, lastPage: 2 });
    expect(wrapper.get('.el-pagination__total').text()).toBe('11-13 of 13');
  });
});
