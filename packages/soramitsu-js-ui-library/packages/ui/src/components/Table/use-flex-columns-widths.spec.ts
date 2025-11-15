import { describe, expect, test } from 'vitest'
import { useFlexColumns } from './use-flex-columns-widths'
import { ref } from 'vue'
import type { TableColumnApi, TableActionColumnApi } from './api'

const baseColumn: Omit<TableColumnApi, 'id' | 'prop' | 'type'> = {
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
}

function col(id: string, overrides: Partial<TableColumnApi> = {}): TableColumnApi {
  return {
    type: 'default',
    id,
    prop: id,
    ...baseColumn,
    ...overrides,
  }
}

function actionCol(id: string, overrides: Partial<TableActionColumnApi> = {}): TableActionColumnApi {
  return {
    type: 'selection',
    id,
    width: null,
    minWidth: 80,
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
  }
}

describe('useFlexColumns', () => {
  test('returns base widths when fit is false', () => {
    const columns = [col('a', { minWidth: 120 }), actionCol('action', { width: 80 })]
    const { columnsWidths, columnsWidthsSum } = useFlexColumns(columns, ref(500), ref(false))

    expect(columnsWidths.value).toEqual([120, 80])
    expect(columnsWidthsSum.value).toBe(200)
  })

  test('distributes free space when fit is true', () => {
    const columns = [col('a', { minWidth: 100 }), col('b', { minWidth: 100 }), col('c', { width: 120 })]
    const tableWidth = ref(400)
    const { columnsWidths } = useFlexColumns(columns, tableWidth, ref(true))

    expect(columnsWidths.value[2]).toBe(120)
    expect(columnsWidths.value[0]).toBeCloseTo(140)
    expect(columnsWidths.value[1]).toBeCloseTo(140)
  })
})
