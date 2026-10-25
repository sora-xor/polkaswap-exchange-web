import type { TableActionColumnApi, TableColumnApi } from './api'
import type { TableRow } from '@/components'
import { get } from 'lodash-es'

export function isDefaultColumn(column: TableColumnApi | TableActionColumnApi): column is TableColumnApi {
  return column.type === 'default'
}

export function isSelectionColumn(
  column: TableColumnApi | TableActionColumnApi,
): column is TableActionColumnApi & { type: 'selection' } {
  return column.type === 'selection'
}

export function isExpandColumn(
  column: TableColumnApi | TableActionColumnApi,
): column is TableActionColumnApi & { type: 'expand' } {
  return column.type === 'expand'
}

export function isDetailsColumn(
  column: TableColumnApi | TableActionColumnApi,
): column is TableActionColumnApi & { type: 'details' } {
  return column.type === 'details'
}

// Without type predicate checked like this object becomes object without keys
export function isRecord(obj: unknown): obj is Record<string, unknown> {
  return obj !== null && typeof obj === 'object'
}

export function getDefaultCellValue(row: TableRow, column: TableColumnApi, index: number) {
  return column.formatter ? column.formatter(row, column, get(row, column.prop), index) : get(row, column.prop)
}

export function getCellTooltipContent(row: TableRow, column: TableColumnApi | TableActionColumnApi) {
  if (!column.showOverflowTooltip || !isDefaultColumn(column)) {
    return ''
  }

  return String(get(row, column.prop))
}
