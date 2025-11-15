import { computed, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import { SortDirection } from '@soramitsu-ui/ui/types';
import { useExploreTable } from '@/composables/useExploreTable';
import { PaginationButton } from '@/consts/pagination';

type TestItem = {
  id: string;
  name: string;
  value: number;
};

const createItems = (): TestItem[] => [
  { id: 'a', name: 'Alpha', value: 10 },
  { id: 'b', name: 'Beta', value: 20 },
  { id: 'c', name: 'Gamma', value: 15 },
];

describe('useExploreTable', () => {
  it('sorts, paginates, and filters explore data', async () => {
    const wrapper = mount({
      template: '<div />',
      setup() {
        const items = ref<readonly TestItem[]>(createItems());
        const query = ref('');
        const table = useExploreTable<TestItem>({
          items: computed(() => items.value),
          query,
          filter: (list, search) => list.filter((item) => item.name.toLowerCase().includes(search)),
          defaultOrder: SortDirection.DESC,
          defaultProperty: 'value',
          pageAmount: 2,
        });

        const setQuery = (value: string) => {
          query.value = value;
        };

        return { table, setQuery };
      },
    });

    const table = (wrapper.vm as any).table;
    const setQuery = (wrapper.vm as any).setQuery as (value: string) => void;

    expect(table.tableItems.value.map((item) => item.name)).toEqual(['Beta', 'Gamma']);
    expect(table.startIndex.value).toBe(0);
    expect(table.lastPage.value).toBe(2);

    table.handlePaginationClick(PaginationButton.Next);
    await nextTick();

    expect(table.currentPage.value).toBe(2);
    expect(table.tableItems.value.map((item) => item.name)).toEqual(['Alpha']);
    expect(table.startIndex.value).toBe(2);

    setQuery('alpha');
    await nextTick();

    expect(table.currentPage.value).toBe(1);
    expect(table.tableItems.value.map((item) => item.name)).toEqual(['Alpha']);

    setQuery('');
    await nextTick();
    expect(table.tableItems.value.map((item) => item.name)).toEqual(['Beta', 'Gamma']);

    table.changeSort({ order: SortDirection.ASC, property: 'name' });
    await nextTick();
    expect(table.tableItems.value.map((item) => item.name)).toEqual(['Alpha', 'Beta']);

    table.handleResetSort();
    await nextTick();
    expect(table.property.value).toBe('');
    expect(table.isDefaultSort.value).toBe(true);

    wrapper.unmount();
  });
});
