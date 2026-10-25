import type { Ref, ShallowRef } from 'vue'
import type { TableColumnApi } from './api'
import type { TableColumnSortOrder, TableRow } from './types'
import { get } from 'lodash-es'

export function useColumnSort<T extends TableRow>(data: Ref<T[]>) {
  const sortState: { column: TableColumnApi | null; order: TableColumnSortOrder } = shallowReactive({
    column: null,
    order: null,
  })
  let sortedData: ShallowRef<T[]> = shallowRef(data.value)

  function startSortWithNewColumn(column: TableColumnApi | null) {
    sortState.column = column
    sortState.order = null
  }

  function getNextOrder(column: TableColumnApi, order: TableColumnSortOrder) {
    const index = column.sortOrders.indexOf(order)
    return column.sortOrders[(index + 1) % column.sortOrders.length]
  }

  function getKey(column: TableColumnApi, { value, index }: { value: TableRow; index: number }) {
    if (!column.sortBy) {
      return [get(value, column.prop)]
    }

    let sortByArray = Array.isArray(column.sortBy) ? column.sortBy : [column.sortBy]

    return sortByArray.map((by) => {
      if (typeof by === 'string') {
        return get(value, by)
      }

      return by(value, index)
    })
  }

  function compareByKey<T extends { key: any[] }>(a: T, b: T) {
    for (let i = 0; i < a.key.length; i++) {
      if (a.key[i] < b.key[i]) {
        return -1
      }

      if (a.key[i] > b.key[i]) {
        return 1
      }
    }

    return 0
  }

  function sortData(order: TableColumnSortOrder, column: TableColumnApi) {
    if (column.sortable === 'custom') {
      return
    }

    if (order === null) {
      sortedData.value = data.value

      return
    }

    const orderModifier = order === 'ascending' ? 1 : -1
    const sortMethod = column.sortMethod

    if (sortMethod) {
      sortedData.value = [...data.value].sort((a, b) => orderModifier * sortMethod(a, b))

      return
    }

    sortedData.value = data.value
      .map((value, index) => ({ value, key: getKey(column, { value, index }) }))
      .sort((a, b) => orderModifier * compareByKey(a, b))
      .map((x) => x.value)
  }

  function handleSortChange(column: TableColumnApi) {
    if (!column.sortable) {
      return
    }

    if (sortState.column !== column) {
      startSortWithNewColumn(column)
    }

    sortState.order = getNextOrder(column, sortState.order)
    sortData(sortState.order, column)
  }

  function sortExplicitly(column: TableColumnApi, newOrder: TableColumnSortOrder) {
    if (sortState.column !== column) {
      startSortWithNewColumn(column)
    }

    sortState.order = newOrder
    sortData(newOrder, column)
  }

  function applyCurrentSort() {
    if (!sortState.column || sortState.column.sortable === 'custom') {
      sortedData.value = data.value

      return
    }

    sortData(sortState.order, sortState.column)
  }

  function clearSort() {
    startSortWithNewColumn(null)
    sortedData.value = data.value
  }

  return {
    sortedData,
    sortState,
    sortExplicitly,
    applyCurrentSort,
    handleSortChange,
    clearSort,
    getNextOrder,
  }
}
