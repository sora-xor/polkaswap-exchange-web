<script setup lang="ts">
import MonthPanel from './SDatePickerPanelMonths.vue'
import DateTable from './SDatePickerTableDate.vue'

import type { ShowState, StateStore } from './types'

interface Props {
  showState: ShowState
  hideArrows?: boolean
  stateStore: StateStore
  hoveredDate: Date
}

const props = withDefaults(defineProps<Props>(), {
  hideArrows: false,
})

const emit = defineEmits(['update:showed-state', 'change-view', 'pick', 'update:hovered-date'])

const updateShowedState = (deltaMonth: number) => {
  emit('update:showed-state', deltaMonth)
}

const changeView = (viewName: string) => {
  emit('change-view', viewName)
}

const onDatePick = (data: any) => {
  emit('pick', data)
}

const updateHoveredDate = (date: Date) => {
  emit('update:hovered-date', date)
}
</script>

<template>
  <div class="flex flex-col justify-start items-center">
    <MonthPanel
      class="w-full"
      :show-state="showState"
      :hide-arrows="hideArrows"
      :hovered-date="hoveredDate"
      @update:showed-state="updateShowedState"
      @change-view="changeView"
    />
    <DateTable
      :show-state="showState"
      :state-store="stateStore"
      :hovered-date="hoveredDate"
      @pick="onDatePick"
      @update:showed-state="updateShowedState"
      @update:hovered-date="updateHoveredDate"
    />
  </div>
</template>
