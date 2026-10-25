import { describe, expect, test } from 'vitest';
import { useColumnExpand } from './use-column-expand';

describe('useColumnExpand', () => {
  test('toggles rows', () => {
    const { expandedRows, toggleRowExpanded } = useColumnExpand<{ id: number }>();

    const row = { id: 1 };
    toggleRowExpanded(row);
    expect(expandedRows.has(row)).toBe(true);

    toggleRowExpanded(row);
    expect(expandedRows.has(row)).toBe(false);
  });

  test('respects explicit value overrides', () => {
    const { expandedRows, toggleRowExpanded } = useColumnExpand<{ id: number }>();

    const row = { id: 2 };
    toggleRowExpanded(row, true);
    expect(expandedRows.has(row)).toBe(true);

    toggleRowExpanded(row, false);
    expect(expandedRows.has(row)).toBe(false);
  });
});
