<script setup lang="ts">
/* eslint-disable complexity */
import { getStartDateInCalendar, nextDate } from './date-util'
import { getDaysInMonth, subMonths, startOfDay, isSameDay } from 'date-fns'

import type * as types from './types'
import type { ComputedRef } from 'vue'
import { daysNames } from './consts'
import type { DatePickerApi } from './api'
import { useDatePickerApi } from './api'
import type { RangeStateSelected, RangeStateSelecting } from './types'

const getDateTimestamp = (time: Date | number) => {
  return startOfDay(time).getTime()
}

const getFirstDayOfMonth = (date: Date) => {
  const temp = new Date(date.getTime())
  temp.setDate(1)
  return temp.getDay()
}

interface Props {
  firstDayOfWeek?: number
  showState: types.ShowState
  stateStore: types.StateStore
  hoveredDate: Date
}

const props = withDefaults(defineProps<Props>(), {
  firstDayOfWeek: 1,
})

const state: DatePickerApi = useDatePickerApi()

const emit = defineEmits(['pick', 'update:showed-state', 'update:hovered-date'])

const offsetDay = computed(() => {
  const week = props.firstDayOfWeek
  return week > 3 ? 7 - week : -week
})
const weeks = computed(() => {
  const week = props.firstDayOfWeek
  return daysNames.concat(daysNames).slice(week, week + 7)
})
const year = computed(() => {
  return props.showState.year
})
const month = computed(() => {
  return props.showState.month
})
const startDateInCalendar = computed(() => {
  return getStartDateInCalendar(year.value, month.value)
})

const timeDecoder = (num: number) => {
  return num.toString().length < 2 ? `0${num}` : num
}

const getDateTime = (date: Date) => {
  const hours = timeDecoder(date.getHours())
  const minutes = timeDecoder(date.getMinutes())
  return `${hours}:${minutes}`
}

const dateTableCells: ComputedRef<types.DateTableCell[]> = computed(() => {
  const cellsArray: types.DateTableCell[] = []
  const date = new Date(year.value, month.value, 1)
  let day = getFirstDayOfMonth(date) // day of first day
  day = day === 0 ? 7 : day
  const dateCountOfMonth = getDaysInMonth(date)
  const dateCountOfLastMonth = getDaysInMonth(subMonths(date, 1))
  const offset = offsetDay.value
  let count = 1
  const now = getDateTimestamp(new Date())
  const WEEKS_IN_CALENDAR = 6
  const DAYS_IN_CALENDAR = 7 * WEEKS_IN_CALENDAR

  for (let i = 0; i < DAYS_IN_CALENDAR; i++) {
    const cell: types.DateTableCell = {
      type: 'normal',
      inRange: false,
      start: false,
      end: false,
      time: null,
      day: 0,
      month: 0,
      text: 0,
      disabled: false,
    }

    const index = i
    const time = nextDate(startDateInCalendar.value, index - offset).getTime() // nextDate - month begins from this date
    cell.time = null

    if (state.type === 'range') {
      const rangeState = props.stateStore.rangeState

      if (rangeState.selecting) {
        const hoveredDate = startOfDay(props.hoveredDate)
        const existingDate = rangeState.startDate
        const arr = [existingDate, hoveredDate].sort((a, b) => a.getTime() - b.getTime())
        cell.inRange = time >= getDateTimestamp(arr[0]) && time <= getDateTimestamp(arr[1])
      } else {
        if (rangeState.startDate && rangeState.endDate) {
          cell.inRange = time >= getDateTimestamp(rangeState.startDate) && time <= getDateTimestamp(rangeState.endDate)
        }
      }

      if (rangeState.startDate && isSameDay(time, rangeState.startDate)) {
        cell.start = true
        cell.time = getDateTime(rangeState.startDate)
      }

      if (rangeState.endDate && isSameDay(time, rangeState.endDate)) {
        cell.end = true
        cell.time = getDateTime(rangeState.endDate)
      }
    }

    if (state.type === 'day' && props.stateStore.dayState) {
      const selectedDate = props.stateStore.dayState
      cell.start = isSameDay(time, selectedDate)
      if (cell.start) {
        cell.time = getDateTime(selectedDate)
      }
    }

    if (state.type === 'pick') {
      const selectedDates = props.stateStore.pickState
      cell.start = selectedDates.some((item: Date) => isSameDay(item, time))

      if (cell.start) {
        const timeOfDay = selectedDates.find((item: Date) => getDateTimestamp(item) === getDateTimestamp(time))

        if (timeOfDay) {
          cell.time = getDateTime(timeOfDay)
        }
      }
    }

    const isToday = time === now
    if (isToday) {
      cell.type = 'today'
    }
    if (i >= 0 && i <= 13) {
      // 13 - possible count of previous month days
      // number of showed previous month's days
      const numberOfDaysFromPreviousMonth = day + offset < 0 ? 7 + day + offset : day + offset
      if (index >= numberOfDaysFromPreviousMonth) {
        cell.text = count++
        cell.month = month.value
      } else {
        cell.text = dateCountOfLastMonth - (numberOfDaysFromPreviousMonth - (index % 7)) + 1 + Math.floor(index / 7)
        cell.month = month.value === 0 ? 11 : month.value - 1
        cell.type = 'prev-month'
      }
    } else {
      if (count <= dateCountOfMonth) {
        cell.text = count++
        cell.month = month.value
      } else {
        cell.text = count++ - dateCountOfMonth
        cell.type = 'next-month'
        cell.month = month.value === 11 ? 0 : month.value + 1
      }
    }

    cell.disabled = !state.dateFilter(new Date(year.value, cell.month, cell.text))

    cellsArray.push(cell)
  }
  return cellsArray
})

const getCellClasses = (cell: types.DateTableCell) => {
  const selectionMode = state.type
  const classes = []

  if (cell.disabled) {
    classes.push('disabled')
  }

  const isCellInCurrentMonth = cell.type === 'normal' || cell.type === 'today'

  if (isCellInCurrentMonth) {
    classes.push('available')
    if (cell.type === 'today') {
      classes.push('today')
    }
  } else {
    classes.push(cell.type)
  }
  if (selectionMode === 'day' && props.stateStore.dayState && isCellInCurrentMonth && cell.start) {
    classes.push('current')
  }
  if (selectionMode === 'pick' && isCellInCurrentMonth && cell.start) {
    classes.push('start-date')
  }
  if (cell.inRange && isCellInCurrentMonth) {
    classes.push('in-range')
    if (cell.start) {
      classes.push('start-date')
    }
    if (cell.end) {
      classes.push('end-date')
    }
  }
  return classes.join(' ')
}

const handleMouseMove = (event: any) => {
  if (!props.stateStore.rangeState.selecting) return
  let target = event.target
  if (target.tagName === 'SPAN') {
    target = target.parentNode
  }
  if (target.tagName !== 'DIV') return
  const idx = target.getAttribute('index')
  if (!idx) return
  const cell = dateTableCells.value[idx]
  const newDate = new Date(year.value, cell.month, cell.text)
  if (isSameDay(newDate, props.hoveredDate)) return
  emit('update:hovered-date', newDate)
}

const handleClick = (ev: any) => {
  let target = ev.target
  if (target.tagName === 'SPAN') {
    target = target.parentNode
  }
  if (target.tagName !== 'DIV') return
  const idx = target.getAttribute('index')
  if (!idx) return
  const cell = dateTableCells.value[idx]

  if (cell.disabled) {
    return
  }

  const newDate = new Date(year.value, cell.month, cell.text)

  if (state.type === 'range') {
    if (!props.stateStore.rangeState.selecting) {
      const rangeStateSelecting: RangeStateSelecting = {
        startDate: newDate,
        endDate: null,
        selecting: true,
        selectedField: 'startDate',
      }
      emit('pick', rangeStateSelecting)
    } else {
      const dat = props.stateStore.rangeState.startDate
      if (dat && newDate >= dat) {
        const rangeStateSelected: RangeStateSelected = {
          startDate: dat,
          endDate: newDate,
          selecting: false,
          selectedField: 'endDate',
        }
        emit('pick', rangeStateSelected)
      } else {
        const rangeStateSelected: RangeStateSelected = {
          startDate: newDate,
          endDate: dat,
          selecting: false,
          selectedField: 'startDate',
        }
        emit('pick', rangeStateSelected)
      }
    }
  } else if (state.type === 'day') {
    emit('pick', newDate)
  } else if (state.type === 'pick') {
    const currentArr = props.stateStore.pickState
    const dateSelected = currentArr.find((date: Date) => {
      return isSameDay(date, newDate)
    })
    let newArr
    if (dateSelected) {
      newArr = currentArr.filter((date: Date) => !isSameDay(date, newDate))
    } else {
      newArr = [...currentArr, newDate]
    }
    emit('pick', newArr)
  }

  if (cell.type === 'prev-month') {
    emit('update:showed-state', -1)
  }
  if (cell.type === 'next-month') {
    emit('update:showed-state', 1)
  }
}
</script>
<template>
  <div
    class="s-date-picker-date-table date-table sora-tpg-p4"
    @click="handleClick"
    @mouseover="handleMouseMove"
    @focus="handleMouseMove"
    @keydown="handleClick"
  >
    <div v-for="(day, key) in weeks" :key="key" class="date-table__title">
      {{ day }}
    </div>
    <div
      v-for="(cell, idx) in dateTableCells"
      :key="idx"
      class="date-table__cell relative"
      :class="getCellClasses(cell)"
      :index="idx"
    >
      <span class="date-table__cell-text">{{ cell.text }}</span>
      <span v-if="state.time" v-show="cell.time" class="absolute date-time">{{ cell.time }}</span>
    </div>
  </div>
</template>

<style lang="scss">
@use '@/theme';

.s-date-picker-date-table {
  font-size: 12px;
  user-select: none;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(6, 1fr);
  row-gap: 8px;
  align-items: stretch;
  justify-content: center;

  .date-table {
    &__cell {
      width: 45px;
      height: 30px;
      padding: 4px 0;
      box-sizing: border-box;
      text-align: center;
      cursor: pointer;
      position: relative;
      color: theme.token-as-var('sys.color.content-primary');
      font-feature-settings:
        'tnum' on,
        'lnum' on,
        'case' on;

      & span {
        width: 24px;
        height: 24px;
        display: block;
        margin: 0 auto;
        line-height: 24px;
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
      }

      &.next-month,
      &.prev-month {
        color: theme.token-as-var('sys.color.content-primary');
        opacity: 0.4;
      }

      &.today {
        position: relative;
        color: theme.token-as-var('sys.color.primary');
        font-weight: 700;

        &.end-date span,
        &.start-date span {
          color: theme.token-as-var('sys.color.util.surface');
        }
      }

      &.disabled {
        cursor: not-allowed;
      }

      &.disabled .date-table__cell-text {
        opacity: 0.4;
      }

      &.available:hover:not(.start-date, .end-date, .current, .disabled) {
        color: theme.token-as-var('sys.color.primary');
      }

      &.in-range {
        background-color: theme.token-as-var('sys.color.background');
      }

      &.current,
      &.end-date,
      &.start-date {
        color: theme.token-as-var('sys.color.util.surface');
        background-color: theme.token-as-var('sys.color.primary');
        border-radius: 2px;

        &.disabled .date-table__cell-text {
          opacity: 0.8;
        }
      }

      &.selected {
        background-color: theme.token-as-var('sys.color.primary');
        color: theme.token-as-var('sys.color.util.surface');
      }
    }

    &__title {
      padding: 4px;
      font-weight: 400;
      border-bottom: 1px solid theme.token-as-var('sys.color.border-primary');
      border-top: 1px solid theme.token-as-var('sys.color.border-primary');
      color: theme.token-as-var('sys.color.content-primary');
      text-align: center;
    }
  }

  .date-time {
    font-size: 7px;
    bottom: -7px;
    opacity: 0.8;
  }
}
</style>
