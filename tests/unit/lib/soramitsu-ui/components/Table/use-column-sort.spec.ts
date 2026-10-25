import { ref } from 'vue';
import { describe, expect, it } from 'vitest';

import { useColumnSort } from '@/lib/soramitsu-ui/components/Table/use-column-sort';

const createColumn = (overrides: Record<string, unknown> = {}) =>
  ({
    prop: 'value',
    type: 'default',
    sortable: true,
    sortMethod: null,
    sortBy: null,
    sortOrders: [null, 'ascending', 'descending'],
    ...overrides,
  }) as any;

describe('useColumnSort', () => {
  it('cycles sort orders and restores the original data when order returns to null', () => {
    const data = ref([{ value: 2 }, { value: 1 }, { value: 3 }]);
    const column = createColumn();
    const { sortedData, sortState, handleSortChange } = useColumnSort(data);

    handleSortChange(column);
    expect(sortState.order).toBe('ascending');
    expect(sortedData.value).toEqual([{ value: 1 }, { value: 2 }, { value: 3 }]);

    handleSortChange(column);
    expect(sortState.order).toBe('descending');
    expect(sortedData.value).toEqual([{ value: 3 }, { value: 2 }, { value: 1 }]);

    handleSortChange(column);
    expect(sortState.order).toBe(null);
    expect(sortedData.value).toBe(data.value);
  });

  it('supports explicit multi-key sortBy definitions', () => {
    const data = ref([
      { id: 'b', meta: { priority: 1 } },
      { id: 'a', meta: { priority: 1 } },
      { id: 'z', meta: { priority: 0 } },
    ]);
    const column = createColumn({
      prop: 'id',
      sortBy: ['meta.priority', (row: { id: string }) => row.id],
    });
    const { sortedData, sortExplicitly } = useColumnSort(data);

    sortExplicitly(column, 'ascending');

    expect(sortedData.value).toEqual([
      { id: 'z', meta: { priority: 0 } },
      { id: 'a', meta: { priority: 1 } },
      { id: 'b', meta: { priority: 1 } },
    ]);
  });

  it('uses a custom sort method when provided', () => {
    const data = ref([{ value: 1 }, { value: 3 }, { value: 2 }]);
    const column = createColumn({
      sortMethod: (a: { value: number }, b: { value: number }) => a.value - b.value,
    });
    const { sortedData, sortExplicitly } = useColumnSort(data);

    sortExplicitly(column, 'descending');

    expect(sortedData.value).toEqual([{ value: 3 }, { value: 2 }, { value: 1 }]);
  });

  it('keeps data in source order for custom-sort columns and when clearing sort state', () => {
    const data = ref([{ value: 3 }, { value: 1 }, { value: 2 }]);
    const column = createColumn({ sortable: 'custom' });
    const { sortedData, handleSortChange, applyCurrentSort, clearSort, getNextOrder } = useColumnSort(data);

    expect(getNextOrder(column, null)).toBe('ascending');

    handleSortChange(column);
    expect(sortedData.value).toBe(data.value);

    data.value = [{ value: 9 }, { value: 7 }];
    applyCurrentSort();
    expect(sortedData.value).toBe(data.value);

    clearSort();
    expect(sortedData.value).toBe(data.value);
  });
});
