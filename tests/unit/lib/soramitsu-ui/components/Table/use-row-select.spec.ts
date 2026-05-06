import { ref } from 'vue';
import { describe, expect, it } from 'vitest';

import { useRowSelect } from '@/lib/soramitsu-ui/components/Table/use-row-select';

describe('useRowSelect', () => {
  it('toggles all selectable rows and clears them again when all are already selected', () => {
    const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const data = ref(rows);
    const selectable = (row: { id: string }) => row.id !== 'b';
    const selection = useRowSelect(data, { selectOnIndeterminate: false });

    selection.toggleAllSelection(selectable);
    expect(Array.from(selection.selectedRows)).toEqual([rows[0], rows[2]]);
    expect(selection.isAllSelected.value).toBe(false);
    expect(selection.isSomeSelected.value).toBe(true);

    selection.toggleAllSelection(selectable);
    expect(Array.from(selection.selectedRows)).toEqual([]);
    expect(selection.isSomeSelected.value).toBe(false);
  });

  it('respects selectOnIndeterminate when some rows are already selected', () => {
    const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const selectable = (row: { id: string }) => row.id !== 'c';

    const keepSelection = useRowSelect(ref(rows), { selectOnIndeterminate: true });
    keepSelection.toggleRowSelection(rows[0]);
    keepSelection.toggleAllSelection(selectable);
    expect(Array.from(keepSelection.selectedRows)).toEqual([rows[0], rows[1]]);

    const clearSelection = useRowSelect(ref(rows), { selectOnIndeterminate: false });
    clearSelection.toggleRowSelection(rows[0]);
    clearSelection.toggleAllSelection(selectable);
    expect(Array.from(clearSelection.selectedRows)).toEqual([]);
  });

  it('toggles individual rows and respects explicit false values', () => {
    const rows = [{ id: 'a' }, { id: 'b' }];
    const selection = useRowSelect(ref(rows), { selectOnIndeterminate: false });

    selection.toggleRowSelection(rows[0]);
    expect(Array.from(selection.selectedRows)).toEqual([rows[0]]);

    selection.toggleRowSelection(rows[0]);
    expect(Array.from(selection.selectedRows)).toEqual([]);

    selection.toggleRowSelection(rows[1], true);
    expect(Array.from(selection.selectedRows)).toEqual([rows[1]]);

    selection.toggleRowSelection(rows[1], false);
    expect(Array.from(selection.selectedRows)).toEqual([]);
  });
});
