import type { DeepReadonly, InjectionKey, Slot } from 'vue'
import { forceInject } from '@/util'
import type {
  TableColumnCellValueFormatter,
  TableColumnRowSelectableFunc,
  TableColumnSortBy,
  TableColumnSortOrder,
  TableColumnAlign,
  TableRow,
} from './types'

export interface TableColumnWidthProps {
  width: null | number
  minWidth: number
}

export interface TableColumnAlignProps {
  align: TableColumnAlign
  headerAlign: TableColumnAlign
}

export interface TableColumnSortProps {
  sortable: boolean | 'custom'
  sortMethod: (<T extends TableRow>(a: T, b: T) => number) | null
  sortBy: TableColumnSortBy
  sortOrders: TableColumnSortOrder[]
}

export interface TableCommonColumnApi extends TableColumnWidthProps, TableColumnAlignProps, TableColumnSortProps {
  id: string
  label?: string
  cellSlot?: Slot
  headerSlot?: Slot
  showOverflowTooltip?: boolean
  className: string
  labelClassName: string
  formatter: TableColumnCellValueFormatter | null
  selectable: TableColumnRowSelectableFunc | null
  reserveSelection?: boolean
}

export interface TableColumnApi extends TableCommonColumnApi {
  type: 'default'
  prop: string
}

export interface TableActionColumnApi extends TableCommonColumnApi {
  type: 'selection' | 'expand' | 'details'
  prop?: string
}

export interface TableApi {
  /**
   * Should be called inside item on setup. Unregister on scope dispose automatically
   */
  register: (options: TableColumnApi | TableActionColumnApi) => void
}

export const TABLE_API_KEY: InjectionKey<DeepReadonly<TableApi>> = Symbol('TableAPI')
export const useTableApi = () => forceInject(TABLE_API_KEY)
