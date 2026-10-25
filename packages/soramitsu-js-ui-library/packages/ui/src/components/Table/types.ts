import type { TABLE_COLUMN_ALIGN_VALUES, TABLE_COLUMN_TYPE_VALUES } from './consts'
import type { TableActionColumnApi, TableColumnApi } from './api'

export type TableColumnType = (typeof TABLE_COLUMN_TYPE_VALUES)[number]
export type TableColumnAlign = (typeof TABLE_COLUMN_ALIGN_VALUES)[number]

export type TableRow = Record<string, unknown>

export type TableCellEventData<T extends TableRow> = [T, TableColumnApi | TableActionColumnApi, EventTarget, MouseEvent]
export type TableRowEventData<T extends TableRow> = [T, TableColumnApi | TableActionColumnApi, MouseEvent]
export type TableHeaderEventData = [TableColumnApi | TableActionColumnApi, MouseEvent]
export interface TableSortEventData {
  column: TableColumnApi
  prop: string
  order: TableColumnSortOrder
}

export type TableColumnCellValueFormatter = (
  row: TableRow,
  column: TableColumnApi,
  cellValue: TableRow[string],
  index: number,
) => string
export type TableColumnSortByPropKeyFunc = (row: TableRow, index: number) => string
export type TableColumnRowSelectableFunc = (row: TableRow, index: number) => boolean
export type TableColumnSortBy = string | TableColumnSortByPropKeyFunc | (TableColumnSortByPropKeyFunc | string)[]
export type TableColumnSortOrder = 'ascending' | 'descending' | null

export interface TableRowConfigCallbackParams {
  row: TableRow
  rowIndex: number
}

export interface TableCellConfigCallbackParams {
  row: TableRow
  rowIndex: number
  column: TableColumnApi | TableActionColumnApi
  columnIndex: number
}

export interface TableHeaderCellConfigCallbackParams {
  column: TableColumnApi | TableActionColumnApi
  columnIndex: number
}

export interface TableCardGridBreakpoint {
  test: (width: number) => boolean
  /**
   * number of columns in card grid
   */
  value: number
}
