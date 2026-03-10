import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@soramitsu-ui/ui/composables/passive-model', () => ({
  usePassiveModel: <T>(model: { value: T }) => model,
}));

vi.mock('@soramitsu-ui/ui/components/icons', async () => {
  const { defineComponent, h } = await import('vue');
  const IconStub = defineComponent({
    name: 'PaginationIconStub',
    setup() {
      return () => h('i', { class: 'pagination-icon-stub' });
    },
  });

  return {
    IconArrowsChevronRightXs24: IconStub,
    IconArrowsChevronLeftXs24: IconStub,
    IconChevronsLeft16: IconStub,
    IconChevronsRight16: IconStub,
  };
});

vi.mock('@soramitsu-ui/ui/components', async () => {
  const { defineComponent, h } = await import('vue');
  const IconStub = defineComponent({
    name: 'PaginationIconStub',
    setup() {
      return () => h('i', { class: 'pagination-icon-stub' });
    },
  });

  return {
    SDropdown: defineComponent({
      name: 'SDropdownStub',
      setup() {
        return () => h('div', { class: 's-dropdown-stub' });
      },
    }),
    IconArrowsChevronRightXs24: IconStub,
    IconArrowsChevronLeftXs24: IconStub,
    IconChevronsLeft16: IconStub,
    IconChevronsRight16: IconStub,
    usePassiveModel: <T>(model: { value: T }) => model,
  };
});

import SPagination from '@/lib/soramitsu-ui/components/Pagination/SPagination.vue';

describe('SPagination compatibility', () => {
  it('renders legacy slot layout when layout=slot is used', () => {
    const wrapper = mount(SPagination, {
      props: {
        layout: 'slot',
        total: 42,
        currentPage: 1,
        pageSize: 10,
      },
      slots: {
        default: '<span class="legacy-pagination-slot">Legacy Pagination</span>',
      },
    });

    expect(wrapper.classes()).toContain('el-pagination');
    expect(wrapper.find('.legacy-pagination-slot').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Rows per page');
  });

  it('keeps modern pagination layout by default', () => {
    const wrapper = mount(SPagination, {
      props: {
        total: 42,
        currentPage: 1,
        pageSize: 10,
      },
    });

    expect(wrapper.classes()).not.toContain('el-pagination');
    expect(wrapper.text()).toContain('Rows per page');
  });
});
