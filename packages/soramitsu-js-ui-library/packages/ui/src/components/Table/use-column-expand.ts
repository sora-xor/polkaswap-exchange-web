import type { TableRow } from '@/components/Table/types'

export function useColumnExpand<T extends TableRow>() {
  const expandedRows = shallowReactive(new Set<T>())

  function toggleRowExpanded(row: T, value?: boolean) {
    if ((value !== undefined && !value) || (value === undefined && expandedRows.has(row))) {
      expandedRows.delete(row)

      return
    }

    expandedRows.add(row)
  }

  return {
    expandedRows,
    toggleRowExpanded,
  }
}
