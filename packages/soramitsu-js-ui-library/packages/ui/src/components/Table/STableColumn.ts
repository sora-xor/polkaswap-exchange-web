import type { PropType } from 'vue'
import { defineComponent } from 'vue'
import type { TableActionColumnApi, TableColumnApi } from '@/components'
import { useTableApi } from '@/components'
import { uniqueElementId } from '@/util'
import { usePropTypeFilter } from '@/composables/prop-type-filter'
import { TABLE_COLUMN_ALIGN_VALUES, TABLE_COLUMN_TYPE_VALUES } from '@/components/Table/consts'
import type {
  TableColumnCellValueFormatter,
  TableColumnRowSelectableFunc,
  TableColumnSortBy,
  TableColumnSortOrder,
  TableColumnAlign,
  TableColumnType,
} from '@/components/Table/types'
import type { TableColumnWidthProps } from './api'

export default /* @__PURE__ */ defineComponent({
  name: 'STableColumn',
  props: {
    /**
     * Column type
     */
    type: {
      type: String as PropType<TableColumnType>,
      default: 'default',
    },
    /**
     * Column label (in header)
     */
    label: {
      type: String,
      default: '',
    },
    /**
     * Prop name from a data row
     */
    prop: {
      type: String,
      default: '',
    },
    /**
     * Column width
     */
    width: {
      type: String,
      default: '',
    },
    /**
     * Column minimum width. Columns with `width` prop has a fixed width, while columns with `min-width`
     * prop has a width that is distributed in proportion
     */
    minWidth: {
      type: String,
      default: '80',
    },
    /**
     * Whether column can be sorted. Remote sorting can be done by setting
     * this attribute to `custom` and listening to the `sort-change` event of the table component
     */
    sortable: {
      type: [Boolean, String] as PropType<boolean | 'custom'>,
      default: false,
    },
    /**
     * Sorting method, works when `sortable` prop is set to `true`.
     * Should return a number, just like `Array.sort` expects
     */
    sortMethod: {
      type: Function as PropType<<T>(a: T, b: T) => number>,
      default: null,
    },
    /**
     * Specify which property to sort by. Works when `sortable` prop is set to `true` and `sort-method` isn't set.
     * If set to an Array, the column will sequentially sort by the next property if the previous one is equal
     */
    sortBy: {
      type: [String, Function, Array] as PropType<TableColumnSortBy>,
      default: '',
    },
    /**
     * The order of the sorting strategies used when sorting the data, works when sortable is true.
     * Accepts an array, as the user clicks on the header, the column is sorted in order of the elements in the array
     */
    sortOrders: {
      type: Array as PropType<TableColumnSortOrder[]>,
      default: () => ['ascending', 'descending', null],
    },
    /**
     * Function that formats cell content
     */
    formatter: {
      type: Function as PropType<TableColumnCellValueFormatter>,
      default: null,
    },
    /**
     * Whether to hide extra content and show them in a tooltip when hovering on the cell
     */
    showOverflowTooltip: {
      type: Boolean,
      default: false,
    },
    /**
     * Content alignment
     */
    align: {
      type: String as PropType<TableColumnAlign>,
      default: 'left',
    },
    /**
     * Header alignment. Fallbacks to `align` prop value by default.
     */
    headerAlign: {
      type: String as PropType<TableColumnAlign | null>,
      default: null,
    },
    /**
     * Class name of cells in the column
     */
    className: {
      type: String,
      default: '',
    },
    /**
     * Class name of the label of this column
     */
    labelClassName: {
      type: String,
      default: '',
    },
    /**
     * Function that determines if a certain row can be selected, works when type is 'selection'
     */
    selectable: {
      type: Function as PropType<TableColumnRowSelectableFunc>,
      default: null,
    },
    /**
     * Whether to reserve selection after data refreshing, works when type is 'selection'.
     * Note that row-key is required for this to work
     */
    reserveSelection: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const tableApi = useTableApi()
    const slots = useSlots()

    const filterProp = usePropTypeFilter(props)
    const definitelyType = filterProp('type', TABLE_COLUMN_TYPE_VALUES, 'default')
    const definitelyAlign = filterProp('align', TABLE_COLUMN_ALIGN_VALUES, 'left')
    const definitelyHeaderAlign = filterProp('headerAlign', [null, ...TABLE_COLUMN_ALIGN_VALUES], null)

    const widthsPresets: Record<Exclude<TableColumnType, 'default'>, TableColumnWidthProps> = {
      selection: {
        width: 52,
        minWidth: 52,
      },
      expand: {
        width: 52,
        minWidth: 52,
      },
      details: {
        width: 40,
        minWidth: 40,
      },
    }

    const widthProps = computed(() => {
      if (definitelyType.value !== 'default') {
        return widthsPresets[definitelyType.value]
      }

      return {
        width: parseInt(props.width, 10) || null,
        minWidth: parseInt(props.minWidth, 10) || 80,
      }
    })

    const sortProps = computed(() => {
      return {
        sortable: props.sortable === 'custom' ? ('custom' as const) : Boolean(props.sortable),
        sortMethod: props.sortMethod,
        sortBy: props.sortBy,
        sortOrders: props.sortOrders,
      }
    })

    const api: Partial<TableColumnApi | TableActionColumnApi> = shallowReactive({
      id: uniqueElementId(),
    })

    watchEffect(() => {
      api.type = definitelyType.value
      api.cellSlot = slots.default
      api.headerSlot = slots.header
      api.prop = props.prop
      api.label = props.label
      api.showOverflowTooltip = props.showOverflowTooltip
      api.align = definitelyAlign.value
      api.headerAlign = definitelyHeaderAlign.value || definitelyAlign.value
      api.className = props.className
      api.labelClassName = props.labelClassName
      api.formatter = props.formatter
      api.selectable = props.selectable
      api.reserveSelection = props.reserveSelection
      api.width = widthProps.value.width
      api.minWidth = widthProps.value.minWidth
      api.sortable = sortProps.value.sortable
      api.sortMethod = sortProps.value.sortMethod
      api.sortBy = sortProps.value.sortBy
      api.sortOrders = sortProps.value.sortOrders
    })

    tableApi.register(api as TableColumnApi | TableActionColumnApi)

    return () => null
  },
})
