<script setup lang="ts" generic="DataType extends TableRow">
import type { TableActionColumnApi, TableColumnApi } from '@/components/Table/api'
import type { TableRow } from '@/components/Table/types'
import { IconArrowsChevronDownRounded24, IconArrowRight16 } from '@/components/icons'
import {
  isDefaultColumn,
  isExpandColumn,
  isDetailsColumn,
  getDefaultCellValue,
  getCellTooltipContent,
  isSelectionColumn,
} from '@/components/Table/utils'
import SButton from '@/components/Button/SButton.vue'

const props = withDefaults(
  defineProps<{
    row: { data: DataType; index: number }
    columns?: (TableColumnApi | TableActionColumnApi)[]
    activeExpandColumn?: (TableActionColumnApi & { type: 'expand' }) | null
    expanded?: boolean
    selected?: boolean
    selectable?: boolean
  }>(),
  {
    columns: () => [],
    activeExpandColumn: null,
    expanded: false,
    selected: false,
    selectable: false,
  },
)

const emit = defineEmits<{
  select: []
  expand: []
  'click:details': []
  'mouse-event:label': [{ column: TableColumnApi | TableActionColumnApi; event: MouseEvent }]
  'mouse-event:value': [{ row: DataType; column: TableColumnApi | TableActionColumnApi; event: MouseEvent }]
}>()

const visibleColumns = computed(() => props.columns.filter((x) => !isSelectionColumn(x)))

function select() {
  if (!props.selectable) {
    return
  }

  emit('select')
}
</script>

<template>
  <div
    class="s-table-card"
    :class="{
      'cursor-pointer': selectable,
      's-table-card_selected': selected,
    }"
    :tabindex="selectable ? 0 : -1"
    @click="select"
    @keypress.space.prevent.enter="select"
  >
    <div class="p-8px grid grid-cols-[min-content_1fr] items-baseline">
      <template v-for="(column, columnIndex) in visibleColumns" :key="column.id">
        <!-- legacy event proxy -->
        <!-- eslint-disable-next-line vuejs-accessibility/mouse-events-have-key-events vuejs-accessibility/click-events-have-key-events -->
        <div
          class="s-table-card__label flex flex-col justify-center h-40px pl-32px pr-8px sora-tpg-ch3 whitespace-nowrap"
          @click="emit('mouse-event:label', { column, event: $event })"
          @contextmenu="emit('mouse-event:label', { column, event: $event })"
        >
          <template v-if="isDefaultColumn(column)">
            <component :is="column.headerSlot" v-if="column.headerSlot" v-bind="{ column, columnIndex }" />
            <template v-else>
              {{ column.label }}
            </template>
          </template>
        </div>

        <!-- legacy event proxy + every key event handled by button behaviour -->
        <!-- eslint-disable-next-line vuejs-accessibility/mouse-events-have-key-events vuejs-accessibility/click-events-have-key-events -->
        <div
          class="flex flex-col justify-center items-start px-16px h-40px sora-tpg-p3 min-w-0"
          :title="getCellTooltipContent(row.data, column)"
          @mouseenter="emit('mouse-event:value', { row: row.data, column, event: $event })"
          @mouseleave="emit('mouse-event:value', { row: row.data, column, event: $event })"
          @click="emit('mouse-event:value', { row: row.data, column, event: $event })"
          @dblclick="emit('mouse-event:value', { row: row.data, column, event: $event })"
          @contextmenu="emit('mouse-event:value', { row: row.data, column, event: $event })"
        >
          <div v-if="isDefaultColumn(column)" :class="{ 'truncate w-full': getCellTooltipContent(row.data, column) }">
            <component
              :is="column.cellSlot"
              v-if="column.cellSlot"
              v-bind="{ row: row.data, column, rowIndex: row.index }"
            />
            <template v-else>
              {{ getDefaultCellValue(row.data, column, row.index) }}
            </template>
          </div>

          <SButton
            v-else-if="isExpandColumn(column)"
            data-testid="table-expand-button"
            type="outline"
            size="sm"
            icon-position="right"
            @click.stop="emit('expand')"
            @keypress.space.stop
          >
            Expand
            <template #icon>
              <IconArrowsChevronDownRounded24
                class="s-table-card__expand-icon"
                :class="{ 's-table-card__expand-icon_active': expanded }"
              />
            </template>
          </SButton>

          <SButton
            v-else-if="isDetailsColumn(column)"
            type="outline"
            size="sm"
            icon-position="right"
            @click.stop="emit('click:details')"
            @keypress.space.stop
          >
            Page details
            <template #icon>
              <IconArrowRight16 />
            </template>
          </SButton>
        </div>
      </template>
    </div>

    <div
      v-if="activeExpandColumn && expanded"
      class="s-table-card__expanded-block p-16px"
      data-testid="table-expanded-block"
    >
      <component
        :is="activeExpandColumn.cellSlot"
        v-if="activeExpandColumn.cellSlot"
        v-bind="{ row: row.data, column: activeExpandColumn, rowIndex: row.index }"
      />
    </div>
  </div>
</template>

<style lang="scss">
@use '@/theme';

.s-table-card {
  &_selected {
    background: theme.token-as-var('sys.color.background');
  }

  &__label {
    color: theme.token-as-var('sys.color.content-tertiary');
  }

  &__expand-icon {
    fill: currentColor;
    transition: 0.15s ease-in-out transform;

    &_active {
      transform: rotateZ(180deg);
    }
  }

  &__expanded-block {
    background-color: theme.token-as-var('sys.color.background');
  }
}
</style>
