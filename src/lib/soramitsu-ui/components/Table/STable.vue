<script setup lang="ts" generic="DataType extends TableRow">
import type { CSSProperties, ShallowRef } from 'vue';
import type { MaybeElementRef } from '@vueuse/core';
import { not } from '@vueuse/math';
import { findLast } from 'lodash-es';
import { IconArrowTop16 } from '@soramitsu-ui/ui/components/icons';
import { TABLE_DEFAULT_ADAPT_BREAKPOINT, TABLE_CARDS_GRID_DEFAULT_BREAKPOINTS } from './consts';
import { useColumnSort } from './use-column-sort';
import type {
  TableCardGridBreakpoint,
  TableCellConfigCallbackParams,
  TableCellEventData,
  TableColumnSortOrder,
  TableHeaderCellConfigCallbackParams,
  TableHeaderEventData,
  TableRow,
  TableRowConfigCallbackParams,
  TableRowEventData,
  TableSortEventData,
} from './types';
import { useFlexColumns } from './use-flex-columns-widths';
import { useRowSelect } from './use-row-select';
import { useColumnExpand } from './use-column-expand';
import {
  isDefaultColumn,
  isDetailsColumn,
  isExpandColumn,
  isRecord,
  isSelectionColumn,
  getDefaultCellValue,
  getCellTooltipContent,
} from './utils';
import type { TableActionColumnApi, TableColumnApi } from './api';
import { TABLE_API_KEY } from './api';
import { useTableHeights } from './use-table-heights';
import STableCellDefault from '@soramitsu-ui/ui/components/Table/STableCellDefault.vue';
import STableCellSelection from '@soramitsu-ui/ui/components/Table/STableCellSelection.vue';
import STableCellExpand from '@soramitsu-ui/ui/components/Table/STableCellExpand.vue';
import STableCellDetails from '@soramitsu-ui/ui/components/Table/STableCellDetails.vue';
import STableCard from '@soramitsu-ui/ui/components/Table/STableCard.vue';

// vue can't infer Object prop type from CSSProperties and logs warnings and this helps
type CSSObject = Partial<CSSProperties>;

const props = withDefaults(
  defineProps<{
    /**
     * Table data
     * */
    data?: DataType[];
    /**
     * Set the default sort column and order.
     * The `prop` is used to set default sort column, the `order` - to set default sort order.
     * If `prop` and `order` aren't set, then order defaults to `ascending`.
     * */
    defaultSort?: { prop: string; order: TableColumnSortOrder } | null;
    /**
     * Table's height. By default, it has an `auto` height.
     * If its value is a number, the height is measured in pixels;
     * if its value is a string, the height is affected by external styles
     * */
    height?: string | number;
    /**
     * Table's max-height. The height of the table starts from auto until it reaches the maxHeight limit.
     * The `maxHeight` is measured in pixels, same as height
     * */
    maxHeight?: string | number;
    /**
     * Whether width of column automatically fits its container
     * */
    fit?: boolean;
    /**
     * Whether table header is visible
     * */
    showHeader?: boolean;
    /**
     * Whether current row is highlighted
     * */
    highlightCurrentRow?: boolean;
    /**
     * Key of current row, a set only prop
     * */
    currentRowKey?: string | number;
    /**
     * Function that returns custom class names for a row, or a string assigning class names for every row
     * */
    rowClassName?: string | ((param: TableRowConfigCallbackParams) => string);
    /**
     * Function that returns custom style for a row, or an object assigning custom style for every row
     * */
    rowStyle?: CSSObject | ((param: TableRowConfigCallbackParams) => CSSObject);
    /**
     * Function that returns custom class names for a cell, or a string assigning class names for every cell
     * */
    cellClassName?: string | ((param: TableCellConfigCallbackParams) => string);
    /**
     * Function that returns custom style for a cell, or an object assigning custom style for every cell
     * */
    cellStyle?: CSSObject | ((param: TableCellConfigCallbackParams) => CSSObject);
    /**
     * Function that returns custom class names for a row in table header, or a string assigning class names for every row in table header
     * */
    headerRowClassName?: string | (() => string);
    /**
     * Function that returns custom style for a row in table header, or an object assigning custom style for every row in table header
     * */
    headerRowStyle?: CSSObject | (() => CSSObject);
    /**
     * Function that returns custom class names for a cell in table header, or a string assigning class names for every cell in table header
     * */
    headerCellClassName?: string | ((param: TableHeaderCellConfigCallbackParams) => string);
    /**
     * Function that returns custom style for a cell in table header, or an object assigning custom style for every cell in table header
     * */
    headerCellStyle?: CSSObject | ((param: TableHeaderCellConfigCallbackParams) => CSSObject);
    /**
     * Data row key extraction to optimize rendering. Required if `reserve-selection` is on.
     * When it is a string, multi-level access is supported, e.g. `user.info.id`,
     * but `user.info[0].id` is not supported, in which case a function should be used.
     * */
    rowKey?: string | ((row: DataType) => unknown) | null;
    /**
     * Displayed text when data is empty. You can customize this area by using `empty` slot.
     * */
    emptyText?: string;
    /**
     * Whether to expand all rows by default.
     * Works when the table has a column with `type="expand"`
     * */
    defaultExpandAll?: boolean;
    /**
     * Which rows to expand. Keys passed into this prop are the ones that
     * are computed by the `row-key` prop.
     * */
    expandRowKeys?: unknown[];

    /** TODO(see docs/backlog.md#table): integrate shared tooltip helper once available */
    // tooltipEffect: 'dark' | 'light'

    /**
     * Controls the behavior of master checkbox in multi-select tables when only some rows are selected
     * */
    selectOnIndeterminate?: boolean;
    /**
     * Table width when it becomes card grid
     * */
    adaptBreakpoint?: number;
    /**
     * Array of predicates, receiving table width, and values. First true predicate defines selected value
     * */
    cardGridBreakpoints?: TableCardGridBreakpoint[];
  }>(),
  {
    data: () => [],
    defaultSort: null,
    height: '',
    maxHeight: '',
    emptyText: '',
    defaultExpandAll: false,
    rowKey: null,
    fit: true,
    expandRowKeys: () => [],
    showHeader: true,
    rowClassName: '',
    rowStyle: () => ({}),
    cellClassName: '',
    cellStyle: () => ({}),
    headerRowClassName: '',
    headerRowStyle: () => ({}),
    headerCellClassName: '',
    headerCellStyle: () => ({}),
    selectOnIndeterminate: true,
    highlightCurrentRow: false,
    currentRowKey: '',
    adaptBreakpoint: TABLE_DEFAULT_ADAPT_BREAKPOINT,
    cardGridBreakpoints: () => TABLE_CARDS_GRID_DEFAULT_BREAKPOINTS,
  }
);

const emit = defineEmits<{
  'mouse-enter:cell': TableCellEventData<DataType>;
  'mouse-leave:cell': TableCellEventData<DataType>;
  'click:cell': TableCellEventData<DataType>;
  'dblclick:cell': TableCellEventData<DataType>;
  'click:header': TableHeaderEventData;
  'contextmenu:header': TableHeaderEventData;
  'click:row': TableRowEventData<DataType>;
  'dblclick:row': TableRowEventData<DataType>;
  'contextmenu:row': TableRowEventData<DataType>;
  'change:sort': [TableSortEventData];
  'change:selection': [DataType[]];
  'select-all': [DataType[]];
  select: [DataType[], DataType];
  'change:expand': [DataType, DataType[]];
  'change:current': [DataType | null, DataType | null];
  'click:row-details': [DataType];
}>();

const columns: (TableColumnApi | TableActionColumnApi)[] = shallowReactive([]);
const { data, selectOnIndeterminate, fit, showHeader, height, maxHeight, expandRowKeys, currentRowKey } = toRefs(props);
const rowKeys = shallowReactive(new Map<DataType, unknown>());
const keyRows = shallowReactive(new Map<unknown, DataType>());
const activeExpandColumn = computed(() => findLast(columns, isExpandColumn));
const activeSelectionColumn = computed(() => findLast(columns, isSelectionColumn));

const tableWrapper: MaybeElementRef = ref(null);
const tableSizes = reactive({
  height: 0,
  width: 0,
});
watchOnce(
  tableWrapper,
  () => {
    if (!tableWrapper.value || !(tableWrapper.value instanceof HTMLElement)) {
      return;
    }

    const { width, height } = tableWrapper.value.getBoundingClientRect();
    tableSizes.width = width;
    tableSizes.height = height;
  },
  { immediate: true }
);
useResizeObserver(tableWrapper, (entries) => {
  setTimeout(() => {
    tableSizes.width = entries[0].contentRect.width;
    tableSizes.height = entries[0].contentRect.height;
  });
});

const isAdapted = eagerComputed(() => {
  return tableSizes.width <= props.adaptBreakpoint;
});

const cardsGridColumnNumber = eagerComputed(() => {
  return props.cardGridBreakpoints.find((x) => x.test(tableSizes.width))?.value ?? 1;
});

const headerWrapper: MaybeElementRef = ref(null);
const headerHeight = ref(0);
useResizeObserver(headerWrapper, (entries) => {
  setTimeout(() => {
    headerHeight.value = entries[0].contentRect.height;
  });
});
whenever(not(showHeader), () => {
  headerHeight.value = 0;
});

const { columnsWidths, columnsWidthsSum } = useFlexColumns(columns, toRef(tableSizes, 'width'), fit);
const { tableHeightStyles, bodyHeightStyles } = useTableHeights({
  propHeight: height,
  propMaxHeight: maxHeight,
  headerHeight,
  tableHeight: toRef(tableSizes, 'height'),
});
const { expandedRows, toggleRowExpanded } = useColumnExpand<DataType>();
const { sortState, sortedData, sortExplicitly, handleSortChange, getNextOrder, applyCurrentSort, clearSort } =
  useColumnSort<DataType>(data);
const { selectedRows, isAllSelected, isSomeSelected, toggleAllSelection, toggleRowSelection } = useRowSelect<DataType>(
  sortedData,
  reactive({ selectOnIndeterminate })
);

const currentRow: ShallowRef<DataType | null> = shallowRef(null);

function isCurrentRow(row: DataType) {
  return currentRow.value === toRaw(row);
}

function setCurrentRow(row: DataType | null) {
  currentRow.value = toRaw(row);
}

watch([keyRows, currentRowKey], () => {
  setCurrentRow(keyRows.get(currentRowKey.value) ?? null);
});

const isSortedOnce = ref(false);

if (props.defaultSort) {
  watchOnce(toRef(sortState, 'column'), () => {
    isSortedOnce.value = true;
  });
}

if (props.defaultExpandAll) {
  data.value.forEach((row) => toggleRowExpanded(row));
}

watch([data, columns], () => {
  if (props.defaultSort && !isSortedOnce.value) {
    sort(props.defaultSort);

    return;
  }

  applyCurrentSort();
});

watch(
  data,
  () => {
    rowKeys.clear();
    keyRows.clear();

    if (props.rowKey) {
      data.value.forEach((row) => {
        const key = getRowKey(row);
        rowKeys.set(row, key);
        keyRows.set(key, row);
      });
    }
  },
  { immediate: true }
);

watch([keyRows, expandRowKeys], () => {
  expandedRows.clear();

  expandRowKeys.value.forEach((key) => {
    const row = keyRows.get(key);

    if (row) {
      toggleRowExpanded(row, true);
    }
  });
});

let storedSelectedRowsKeys: unknown[] = [];
watch(keyRows, () => {
  selectedRows.clear();

  if (activeSelectionColumn.value?.reserveSelection) {
    const newStoredSelectedRowsKeys: typeof storedSelectedRowsKeys = [];

    storedSelectedRowsKeys.forEach((key) => {
      const row = keyRows.get(key);

      if (row) {
        toggleRowSelection(row);
        newStoredSelectedRowsKeys.push(key);
      }
    });

    storedSelectedRowsKeys = newStoredSelectedRowsKeys;
  }
});

function manualToggleAllSelection() {
  if (activeSelectionColumn.value) {
    toggleAllSelection(activeSelectionColumn.value.selectable);
    storedSelectedRowsKeys = [...selectedRows].map((row) => rowKeys.get(row));
  }
}

function manualToggleRowSelection(row: DataType, value?: boolean) {
  toggleRowSelection(row, value);
  storedSelectedRowsKeys = [...selectedRows].map((row) => rowKeys.get(row));
}

function manualClearSelection() {
  selectedRows.clear();
  storedSelectedRowsKeys = [];
}

function register(column: TableColumnApi | TableActionColumnApi) {
  const index = columns.push(column);

  onScopeDispose(() => {
    columns.splice(index, 1);
  });
}

const api = readonly({ register });
provide(TABLE_API_KEY, api);

function getColumnByProp(prop: string) {
  return columns.filter(isDefaultColumn).find((column) => column.prop === prop);
}

function sort({ prop, order }: { prop: string; order: TableColumnSortOrder }) {
  const column = getColumnByProp(prop);

  if (column) {
    sortExplicitly(column, order);
  }
}

defineExpose({
  /**
   * used in multiple selection Table, clear user selection
   * */
  clearSelection: manualClearSelection,
  /**
   * used in multiple selection Table, toggle if a certain row is selected.
   * With the second parameter, you can directly set if this row is selected
   * */
  toggleRowSelection: manualToggleRowSelection,
  /**
   * used in multiple selection Table, toggle the selected state of all rows
   * */
  toggleAllSelection: manualToggleAllSelection,
  /**
   * used in expandable Table or tree Table, toggle if a certain row is expanded.
   * With the second parameter, you can directly set if this row is expanded or collapsed
   * */
  toggleRowExpansion: toggleRowExpanded,
  /**
   * sort Table manually. Property prop is used to set sort column, property order is used to set sort order
   * */
  sort,
  /**
   * clear sorting, restore data to the original order
   * */
  clearSort,
  /**
   * used in single selection Table, set a certain row selected.
   * If called without any parameter, it will clear selection.
   * */
  setCurrentRow,
});

function getRowKey(row: DataType) {
  if (typeof props.rowKey === 'string') {
    if (props.rowKey.includes('.')) {
      return row[props.rowKey];
    }

    let keys = props.rowKey.split('.');
    let current: unknown = row;

    for (let key of keys) {
      if (isRecord(current) && key in current) {
        current = current[key];
      }
    }

    return current;
  }

  if (typeof props.rowKey === 'function') {
    return props.rowKey(row);
  }
}

function getStyleOrClass<T extends object | string>(prop: T | (() => T), args?: undefined): T | undefined;
function getStyleOrClass<T extends object | string, S>(prop: T | ((args: S) => T), args: S): T | undefined;
function getStyleOrClass<T extends object | string, S>(prop: T | ((args: S) => T), args: S): T | undefined {
  if (typeof prop === 'function') {
    return prop(args);
  }

  return prop || undefined;
}

function isRowSelectable(row: DataType, index: number) {
  return !!(
    activeSelectionColumn?.value &&
    (!activeSelectionColumn.value.selectable || activeSelectionColumn.value.selectable(row, index))
  );
}

function getTemplateRowKey(row: DataType, rowIndex: number): number | string | symbol {
  const res = props.rowKey ? rowKeys.get(row) : rowIndex;
  if (typeof res === 'string' || typeof res === 'number' || typeof res === 'symbol') {
    return res;
  }

  return JSON.stringify(res);
}

function getSortIconStateClasses(column: TableColumnApi) {
  let order = null;

  if (column === sortState.column) {
    order = sortState.order;
  }

  if (order !== null) {
    return ['s-table__sort-icon_active', order === 'ascending' ? 's-table__sort-icon_asc' : 's-table__sort-icon_desc'];
  }

  return [getNextOrder(column, order) === 'ascending' ? 's-table__sort-icon_asc' : 's-table__sort-icon_desc'];
}

function handleSortClick(column: TableColumnApi) {
  handleSortChange(column);
  emit('change:sort', { column, prop: column.prop, order: sortState.order });
}

function handleAllSelect() {
  manualToggleAllSelection();
  const selectedArray = [...selectedRows];
  emit('select-all', selectedArray);
  emit('change:selection', selectedArray);
}

function handleRowSelect(row: DataType) {
  manualToggleRowSelection(row);
  const selectedArray = [...selectedRows];
  emit('select', selectedArray, row);
  emit('change:selection', selectedArray);
}

function handleRowExpand(row: DataType) {
  toggleRowExpanded(row);
  emit('change:expand', row, [...expandedRows]);
}

function handleRowDetails(row: DataType) {
  emit('click:row-details', row);
}

function handleCellMouseEvent(ctx: {
  row: DataType;
  column: TableColumnApi | TableActionColumnApi;
  event: MouseEvent;
}) {
  if (!ctx.event.target) {
    return;
  }

  const rawRow = toRaw(ctx.row);

  switch (ctx.event.type) {
    case 'mouseleave': {
      emit('mouse-leave:cell', rawRow, ctx.column, ctx.event.target, ctx.event);
      break;
    }
    case 'mouseenter': {
      emit('mouse-enter:cell', rawRow, ctx.column, ctx.event.target, ctx.event);
      break;
    }
    case 'click': {
      if (!isAdapted.value && isExpandColumn(ctx.column)) {
        handleRowExpand(rawRow);
        break;
      }

      if (!isAdapted.value && isDetailsColumn(ctx.column)) {
        handleRowDetails(rawRow);
        break;
      }

      const oldCurrentRow = currentRow;
      setCurrentRow(rawRow);

      emit('click:cell', rawRow, ctx.column, ctx.event.target, ctx.event);
      emit('click:row', rawRow, ctx.column, ctx.event);
      emit('change:current', currentRow.value, oldCurrentRow.value);
      break;
    }
    case 'dblclick': {
      emit('dblclick:cell', rawRow, ctx.column, ctx.event.target, ctx.event);
      emit('dblclick:row', rawRow, ctx.column, ctx.event);
      break;
    }
    case 'contextmenu': {
      emit('contextmenu:row', rawRow, ctx.column, ctx.event);
      break;
    }
  }
}

function handleHeaderMouseEvent(ctx: { column: TableColumnApi | TableActionColumnApi; event: MouseEvent }) {
  if (!ctx.event.target) {
    return;
  }

  switch (ctx.event.type) {
    case 'click': {
      if (!isAdapted.value && isDefaultColumn(ctx.column) && ctx.column.sortable) {
        handleSortClick(ctx.column);
      }

      emit('click:header', ctx.column, ctx.event);
      break;
    }
    case 'contextmenu': {
      emit('contextmenu:header', ctx.column, ctx.event);
      break;
    }
  }
}

const instance = getCurrentInstance();
const hasClickRowHandler = computed(() => !!instance?.vnode?.props?.['onClick:row']);
</script>

<template>
  <div ref="tableWrapper" class="s-table" data-testid="table" :style="tableHeightStyles">
    <div v-if="!isAdapted && showHeader" ref="headerWrapper" class="s-table__header-wrapper">
      <table class="s-table__header w-full" :style="`width: ${columnsWidthsSum}px`">
        <thead>
          <tr
            class="s-table__tr"
            data-testid="table-header-row"
            :class="getStyleOrClass(headerRowClassName)"
            :style="getStyleOrClass(headerRowStyle)"
          >
            <th
              v-for="(column, columnIndex) in columns"
              :key="column.id"
              class="s-table__th px-0 sora-tpg-ch3"
              :class="[
                `s-table__th_align_${column.headerAlign}`,
                column.className,
                column.labelClassName,
                column.id,
                {
                  's-table__th_sortable': column.sortable,
                  'cursor-pointer': column.sortable,
                },
                getStyleOrClass(headerCellClassName, { column, columnIndex }),
              ]"
              :style="{
                width: `${columnsWidths[columnIndex]}px`,
                ...getStyleOrClass(headerCellStyle, { column, columnIndex }),
              }"
              data-testid="table-header-cell"
              @click="handleHeaderMouseEvent({ column, event: $event })"
              @contextmenu="handleHeaderMouseEvent({ column, event: $event })"
            >
              <component
                :is="column.sortable ? 'button' : 'div'"
                v-if="isDefaultColumn(column)"
                class="s-table__header-cell inline-flex items-center sora-tpg-ch3 px-16px"
              >
                <component :is="column.headerSlot" v-if="column.headerSlot" v-bind="{ column, columnIndex }" />
                <template v-else>
                  {{ column.label }}
                </template>
                <IconArrowTop16
                  v-if="column.sortable"
                  class="s-table__sort-icon flex-shrink-0 inline ml-10px"
                  :class="getSortIconStateClasses(column)"
                />
              </component>

              <STableCellSelection
                v-if="isSelectionColumn(column)"
                data-testid="table-header-selection-checkbox"
                :disabled="!data.length"
                :checked="isSomeSelected ? (isAllSelected ? true : 'mixed') : false"
                @select="handleAllSelect()"
              />
            </th>
          </tr>
        </thead>
      </table>
    </div>
    <div class="s-table__body-wrapper" :style="bodyHeightStyles">
      <div v-if="isAdapted" class="s-table__cards-grid">
        <STableCard
          v-for="(row, rowIndex) in sortedData"
          :key="getTemplateRowKey(row, rowIndex)"
          data-testid="table-row"
          class="s-table__card"
          :class="{
            's-table__card_first-row': rowIndex < cardsGridColumnNumber,
            's-table__card_last-column': !((rowIndex + 1) % cardsGridColumnNumber),
          }"
          :row="{ data: row, index: rowIndex }"
          :columns="columns"
          :active-expand-column="activeExpandColumn"
          :active-selection-column="activeSelectionColumn"
          :expanded="expandedRows.has(row)"
          :selectable="isRowSelectable(row, rowIndex)"
          :selected="selectedRows.has(row)"
          @mouse-event:label="handleHeaderMouseEvent"
          @mouse-event:value="handleCellMouseEvent"
          @select="handleRowSelect(row)"
          @expand="handleRowExpand(row)"
          @click:details="handleRowDetails(row)"
        />
      </div>

      <table v-else class="s-table__body w-full" :style="{ width: `${columnsWidthsSum}px` }" data-testid="table-body">
        <tbody>
          <template v-for="(row, rowIndex) in sortedData" :key="getTemplateRowKey(row, rowIndex)">
            <tr
              class="s-table__tr"
              :class="[
                getStyleOrClass(rowClassName, { row, rowIndex }),
                { 's-table__tr_current': highlightCurrentRow && isCurrentRow(row) },
              ]"
              :style="getStyleOrClass(rowStyle, { row, rowIndex })"
              data-testid="table-row"
            >
              <!-- legacy event proxy + every key event handled by button behaviour -->
              <!-- eslint-disable-next-line vuejs-accessibility/mouse-events-have-key-events vuejs-accessibility/click-events-have-key-events -->
              <td
                v-for="(column, columnIndex) in columns"
                :key="column.id"
                class="s-table__td p-0 sora-tpg-p3"
                :class="[
                  `s-table__td_align_${column.align}`,
                  column.id,
                  column.className,
                  getStyleOrClass(cellClassName, { row, rowIndex, column, columnIndex }),
                ]"
                :style="{
                  width: rowIndex === 0 ? `${columnsWidths[columnIndex]}px` : '',
                  ...getStyleOrClass(cellStyle, { row, rowIndex, column, columnIndex }),
                  cursor: hasClickRowHandler ? 'pointer' : 'default',
                }"
                data-testid="table-cell"
                @mouseenter="handleCellMouseEvent({ row, column, event: $event })"
                @mouseleave="handleCellMouseEvent({ row, column, event: $event })"
                @click="handleCellMouseEvent({ row, column, event: $event })"
                @dblclick="handleCellMouseEvent({ row, column, event: $event })"
                @contextmenu="handleCellMouseEvent({ row, column, event: $event })"
              >
                <STableCellDefault v-if="isDefaultColumn(column)" :tooltip="getCellTooltipContent(row, column)">
                  <component :is="column.cellSlot" v-if="column.cellSlot" v-bind="{ row, column, rowIndex }" />
                  <template v-else>
                    {{ getDefaultCellValue(row, column, rowIndex) }}
                  </template>
                </STableCellDefault>

                <STableCellSelection
                  v-else-if="isSelectionColumn(column)"
                  :disabled="!isRowSelectable(row, rowIndex)"
                  :checked="selectedRows.has(row)"
                  @select="handleRowSelect(row)"
                />

                <STableCellExpand v-else-if="isExpandColumn(column)" :active="expandedRows.has(row)" />

                <STableCellDetails v-else-if="isDetailsColumn(column)" />
              </td>
            </tr>

            <tr
              v-if="activeExpandColumn && expandedRows.has(row)"
              class="s-table__expanded-block"
              data-testid="table-expanded-block"
            >
              <td class="s-table__expanded-cell py-16px px-32px" :colspan="columns.length">
                <component
                  :is="activeExpandColumn.cellSlot"
                  v-if="activeExpandColumn.cellSlot"
                  v-bind="{ row, column: activeExpandColumn, rowIndex }"
                />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <div v-if="!data.length" data-testid="table-empty-block" class="s-table__empty-block">
        <slot name="empty">
          <div class="s-table__empty-text flex justify-center items-center min-h-60px sora-tpg-p3">
            <slot name="empty-text">
              {{ emptyText || 'No Data' }}
            </slot>
          </div>
        </slot>
      </div>
      <div v-if="$slots.append" class="s-table__append-wrapper">
        <slot name="append" />
      </div>
    </div>
    <slot />
  </div>
</template>

<style lang="scss">
@use '@soramitsu-ui/theme';

$col-number: v-bind(cardsGridColumnNumber);

.s-table {
  overflow-y: auto;

  &__cards-grid {
    display: grid;
    grid-template-columns: repeat($col-number, 1fr);
  }

  &__card {
    border-right: 1px solid theme.token-as-var('sys.color.border-secondary');
    border-top: 1px solid theme.token-as-var('sys.color.border-secondary');

    &_last-column {
      border-right: none;
    }

    &_first-row {
      border-top: none;
    }
  }

  &__body,
  &__header {
    table-layout: fixed;
    border-collapse: separate;
    border-spacing: 0;
    border: none;
  }

  &__header-cell {
    box-sizing: border-box;
    overflow: hidden;
    word-break: break-all;
  }

  &__tr:hover > &__td,
  &__tr_current > &__td {
    background-color: theme.token-as-var('sys.color.background');
  }

  &__td,
  &__th {
    height: 48px;
    border-bottom: 1px solid theme.token-as-var('sys.color.border-secondary');
    transition: background-color 0.25s ease;
    min-width: 0;
    box-sizing: border-box;
    text-overflow: ellipsis;
    vertical-align: middle;
    position: relative;

    &_align_center {
      text-align: center;
    }

    &_align_left {
      text-align: left;
    }

    &_align_right {
      text-align: right;
    }
  }

  &__tr:last-child &__td,
  &__expanded-block:last-child &__expanded-cell {
    border-bottom: none;
  }

  &__th {
    color: theme.token-as-var('sys.color.content-tertiary');
  }

  &__expanded-cell {
    background-color: theme.token-as-var('sys.color.background');
    border-bottom: 1px solid theme.token-as-var('sys.color.border-secondary');
    min-height: 40px;
  }

  &__sort-icon {
    visibility: hidden;
    fill: currentColor;

    &_active {
      visibility: visible;
      fill: theme.token-as-var('sys.color.primary');
    }

    &_asc {
      transform: rotateZ(180deg);
    }
  }

  &__th_sortable:hover &__sort-icon,
  &__header-cell:focus &__sort-icon {
    visibility: visible;
  }

  &__empty-text {
    color: theme.token-as-var('sys.color.content-tertiary');
  }

  &__append-wrapper {
    overflow: hidden;
  }
}
</style>
