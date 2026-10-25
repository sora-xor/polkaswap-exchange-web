import type { Ref } from 'vue'
import type { TableColumnRowSelectableFunc, TableRow } from './types'

export function useRowSelect<T extends TableRow>(data: Ref<T[]>, options: { selectOnIndeterminate: boolean }) {
  const selectedRows = shallowReactive(new Set<T>())
  const isAllSelected = computed(() => selectedRows.size === data.value.length)
  const isSomeSelected = computed(() => selectedRows.size > 0)

  function toggleAllSelection(selectable: TableColumnRowSelectableFunc | null) {
    const selectableRows = selectable ? data.value.filter((row, index) => selectable(row, index)) : data.value

    if (selectedRows.size === selectableRows.length) {
      selectedRows.clear()

      return
    }

    if (selectedRows.size === 0) {
      for (let row of selectableRows) {
        selectedRows.add(row)
      }

      return
    }

    if (options.selectOnIndeterminate) {
      for (let row of selectableRows) {
        selectedRows.add(row)
      }
    } else {
      selectedRows.clear()
    }
  }

  function toggleRowSelection(row: T, value?: boolean) {
    if ((value !== undefined && !value) || (value === undefined && selectedRows.has(row))) {
      selectedRows.delete(row)

      return
    }

    selectedRows.add(row)
  }

  return {
    selectedRows,
    isAllSelected,
    isSomeSelected,
    toggleAllSelection,
    toggleRowSelection,
  }
}
