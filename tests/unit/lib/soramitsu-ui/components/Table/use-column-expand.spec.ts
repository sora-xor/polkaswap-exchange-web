import { describe, expect, it } from 'vitest';

import { useColumnExpand } from '@/lib/soramitsu-ui/components/Table/use-column-expand';

describe('useColumnExpand', () => {
  it('toggles row expansion and accepts explicit expanded or collapsed states', () => {
    const firstRow = { id: 'first' };
    const secondRow = { id: 'second' };
    const { expandedRows, toggleRowExpanded } = useColumnExpand<typeof firstRow>();

    toggleRowExpanded(firstRow);
    expect(expandedRows.has(firstRow)).toBe(true);

    toggleRowExpanded(firstRow);
    expect(expandedRows.has(firstRow)).toBe(false);

    toggleRowExpanded(firstRow, true);
    toggleRowExpanded(secondRow, true);
    expect([...expandedRows]).toEqual([firstRow, secondRow]);

    toggleRowExpanded(firstRow, false);
    expect([...expandedRows]).toEqual([secondRow]);
  });
});
