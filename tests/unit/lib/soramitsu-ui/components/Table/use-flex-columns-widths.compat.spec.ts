import { describe, expect, it } from 'vitest';
import { ref } from 'vue';

import { useFlexColumns } from '@/lib/soramitsu-ui/components/Table/use-flex-columns-widths';

import type { TableColumnApi } from '@/lib/soramitsu-ui/components/Table/api';

const makeColumn = (id: string, overrides: Partial<TableColumnApi> = {}): TableColumnApi => {
  return {
    type: 'default',
    id,
    prop: id,
    width: null,
    minWidth: 100,
    align: 'left',
    headerAlign: 'left',
    sortable: false,
    sortMethod: null,
    sortBy: '',
    sortOrders: [],
    className: '',
    labelClassName: '',
    formatter: null,
    selectable: null,
    ...overrides,
  };
};

describe('useFlexColumns compatibility', () => {
  it('shrinks flexible columns when explicit widths overflow desktop table width', () => {
    const columns = [
      makeColumn('name', { width: 250 }),
      makeColumn('price', { width: 140 }),
      makeColumn('change1d', { minWidth: 180 }),
      makeColumn('change7d', { minWidth: 180 }),
      makeColumn('volume', { minWidth: 180 }),
      makeColumn('tvl', { minWidth: 180 }),
    ];

    const { columnsWidths, columnsWidthsSum } = useFlexColumns(columns, ref(920), ref(true));

    expect(columnsWidths.value[0]).toBe(250);
    expect(columnsWidths.value[1]).toBe(140);
    expect(columnsWidths.value[2]).toBeCloseTo(132.5);
    expect(columnsWidths.value[3]).toBeCloseTo(132.5);
    expect(columnsWidths.value[4]).toBeCloseTo(132.5);
    expect(columnsWidths.value[5]).toBeCloseTo(132.5);
    expect(columnsWidthsSum.value).toBeCloseTo(920);
  });

  it('keeps base widths once fitting would make flexible columns unreadable', () => {
    const columns = [
      makeColumn('name', { minWidth: 290 }),
      makeColumn('price', { minWidth: 130 }),
      makeColumn('change1d', { minWidth: 104 }),
      makeColumn('change7d', { minWidth: 104 }),
      makeColumn('volume', { minWidth: 104 }),
      makeColumn('tvl', { minWidth: 104 }),
      makeColumn('velocity', { minWidth: 88 }),
    ];

    const { columnsWidths, columnsWidthsSum } = useFlexColumns(columns, ref(310), ref(true));

    expect(columnsWidths.value).toEqual([290, 130, 104, 104, 104, 104, 88]);
    expect(columnsWidthsSum.value).toBe(924);
  });
});
