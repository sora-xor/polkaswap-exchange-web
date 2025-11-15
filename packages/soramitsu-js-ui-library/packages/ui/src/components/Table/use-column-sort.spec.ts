import { describe, test, expect, beforeEach } from 'vitest'
import { useColumnSort } from '@/components/Table/use-column-sort'
import type { TableColumnApi, TableRow } from '@/components'
import type { Ref } from 'vue'

const ROW_1 = { prop1: 2, prop2: 4, prop3: 's1' }
const ROW_2 = { prop1: 1, prop2: 3, prop3: 'o1234' }
const ROW_3 = { prop1: 2, prop2: 2, prop3: 'r12' }
const ROW_4 = { prop1: 4, prop2: 1, prop3: 'a123' }

const DATA = [ROW_1, ROW_2, ROW_3, ROW_4]
const DATA_PROP1_ASCENDING = [ROW_2, ROW_1, ROW_3, ROW_4]
const DATA_PROP1_DESCENDING = [ROW_4, ROW_1, ROW_3, ROW_2]
const DATA_PROP1_PROP2_ASCENDING = [ROW_2, ROW_3, ROW_1, ROW_4]
const DATA_PROP3_ASCENDING = [ROW_1, ROW_3, ROW_4, ROW_2]

describe('Given column sort composable', () => {
  const data: Ref<TableRow[]> = ref([])
  const column1 = shallowReactive({
    prop: 'prop1',
    sortable: true,
    sortBy: '',
    sortMethod: null,
    sortOrders: ['ascending', 'descending', null],
  })

  const column2 = shallowReactive({
    prop: 'prop2',
    sortable: true,
    sortBy: ['prop1', 'prop2'],
    sortMethod: null,
    sortOrders: ['ascending', 'descending', null],
  })

  const column3 = shallowReactive({
    prop: 'prop3',
    sortable: true,
    sortBy: '',
    sortMethod: (a: (typeof DATA)[number], b: (typeof DATA)[number]) => a.prop3.length - b.prop3.length,
    sortOrders: ['ascending', 'descending', null],
  })

  beforeEach(() => {
    data.value = DATA
  })

  describe(`When composable initialized`, () => {
    test(`Then 'sortedData' equal 'data'`, () => {
      const { sortedData } = useColumnSort(data)
      sortedData.value.forEach((row, i) => expect(toRaw(row)).toBe(DATA[i]))
    })
  })

  describe(`When 'handleSortChange' called with first column`, () => {
    test(`Then 'sortedData' becomes 'data' sorted with next sort order for this column`, () => {
      const { sortState, sortedData, handleSortChange } = useColumnSort(data)
      handleSortChange(column1 as TableColumnApi)
      expect(sortState.column).toBe(column1)
      expect(sortState.order).toBe('ascending')
      sortedData.value.forEach((row, i) => expect(toRaw(row)).toBe(DATA_PROP1_ASCENDING[i]))
      handleSortChange(column1 as TableColumnApi)
      expect(sortState.column).toBe(column1)
      expect(sortState.order).toBe('descending')
      sortedData.value.forEach((row, i) => expect(toRaw(row)).toBe(DATA_PROP1_DESCENDING[i]))
      handleSortChange(column1 as TableColumnApi)
      expect(sortState.column).toBe(column1)
      expect(sortState.order).toBe(null)
      sortedData.value.forEach((row, i) => expect(toRaw(row)).toBe(DATA[i]))
    })
  })

  describe(`When 'handleSortChange' called with second column with array in 'sortBy' prop`, () => {
    test(`Then 'sortedData' becomes 'data' sorted with all props in array`, () => {
      const { sortState, sortedData, handleSortChange } = useColumnSort(data)
      handleSortChange(column2 as TableColumnApi)
      expect(sortState.column).toBe(column2)
      expect(sortState.order).toBe('ascending')
      sortedData.value.forEach((row, i) => expect(toRaw(row)).toBe(DATA_PROP1_PROP2_ASCENDING[i]))
    })
  })

  describe(`When 'handleSortChange' called with third column with special 'sortMethod'`, () => {
    test(`Then 'sortedData' becomes 'data' sorted with this method`, () => {
      const { sortState, sortedData, handleSortChange } = useColumnSort(data)
      handleSortChange(column3 as TableColumnApi)
      expect(sortState.column).toBe(column3)
      expect(sortState.order).toBe('ascending')
      expect(toRaw(sortedData.value[0])).toBe(DATA_PROP3_ASCENDING[0])
      expect(toRaw(sortedData.value[1])).toBe(DATA_PROP3_ASCENDING[1])
      expect(toRaw(sortedData.value[2])).toBe(DATA_PROP3_ASCENDING[2])
      expect(toRaw(sortedData.value[3])).toBe(DATA_PROP3_ASCENDING[3])
      sortedData.value.forEach((row, i) => expect(toRaw(row)).toBe(DATA_PROP3_ASCENDING[i]))
    })
  })

  describe(`When 'clearSort' called`, () => {
    test('Then data sorting resets', () => {
      const { sortState, sortedData, handleSortChange, clearSort } = useColumnSort(data)
      handleSortChange(column1 as TableColumnApi)
      clearSort()
      expect(sortState.column).toBe(null)
      expect(sortState.order).toBe(null)
      sortedData.value.forEach((row, i) => expect(toRaw(row)).toBe(DATA[i]))
    })
  })

  describe(`When 'applyCurrentSort' called`, () => {
    test('Then new data sorted with applied earlier sort', () => {
      const { sortedData, handleSortChange, applyCurrentSort } = useColumnSort(data)
      handleSortChange(column1 as TableColumnApi)
      data.value = DATA_PROP3_ASCENDING
      applyCurrentSort()
      sortedData.value.forEach((row, i) => expect(toRaw(row)).toBe(DATA_PROP1_ASCENDING[i]))
    })
  })

  describe(`When 'sortExplicitly' called`, () => {
    test('Then data sorted with specified sort order', () => {
      const { sortedData, sortExplicitly } = useColumnSort(data)
      sortExplicitly(column1 as TableColumnApi, 'descending')
      sortedData.value.forEach((row, i) => expect(toRaw(row)).toBe(DATA_PROP1_DESCENDING[i]))
    })
  })

  describe(`When 'getNextOrder' called`, () => {
    test('Then returns next sort order for column after specified one', () => {
      const { getNextOrder } = useColumnSort(data)
      expect(getNextOrder(column1 as TableColumnApi, 'ascending')).toBe('descending')
      expect(getNextOrder(column1 as TableColumnApi, 'descending')).toBe(null)
      expect(getNextOrder(column1 as TableColumnApi, null)).toBe('ascending')
    })
  })
})
