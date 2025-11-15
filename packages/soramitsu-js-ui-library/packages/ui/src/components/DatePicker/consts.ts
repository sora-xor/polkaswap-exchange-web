import {
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfMonth,
  startOfToday,
  startOfTomorrow,
  startOfWeek,
  startOfYear,
  startOfYesterday,
  subMonths,
  subWeeks,
} from 'date-fns'
import type { DatePickerOptionsProp } from '@/components/DatePicker/types'

export const CUSTOM_OPTION_VALUE = Symbol('customOptionValue')
export const CUSTOM_OPTION = {
  label: 'Custom',
  value: CUSTOM_OPTION_VALUE,
} as const

export const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const monthsShort = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AuG', 'SEP', 'OCT', 'NOV', 'DEC']

export const daysNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export const TIME_POINTS: string[] = (() => {
  const res = []

  for (let i = 0; i < 24; i++) {
    const hour = i < 10 ? `0${i}` : i
    res.push(`${hour}:00`)
    res.push(`${hour}:30`)
  }

  return res
})()

export const DEFAULT_SHORTCUTS = /* @__PURE__ */ ((): DatePickerOptionsProp => {
  const START_OF_TODAY = startOfToday()
  const START_OF_YESTERDAY = startOfYesterday()
  const START_OF_TOMORROW = startOfTomorrow()

  const START_OF_WEEK = startOfWeek(START_OF_TODAY, { weekStartsOn: 1 })
  const END_OF_WEEK = endOfWeek(START_OF_TODAY, { weekStartsOn: 1 })
  const START_OF_LAST_WEEK = subWeeks(START_OF_WEEK, 1)
  const END_OF_LAST_WEEK = subWeeks(END_OF_WEEK, 1)
  const START_OF_NEXT_WEEK = addWeeks(START_OF_WEEK, 1)
  const END_OF_NEXT_WEEK = addWeeks(END_OF_WEEK, 1)

  const START_OF_MONTH = startOfMonth(START_OF_TODAY)
  const END_OF_MONTH = endOfMonth(START_OF_TODAY)
  const START_OF_LAST_MONTH = subMonths(START_OF_MONTH, 1)
  const END_OF_LAST_MONTH = subMonths(END_OF_MONTH, 1)
  const START_OF_NEXT_MONTH = addMonths(START_OF_MONTH, 1)
  const END_OF_NEXT_MONTH = addMonths(END_OF_MONTH, 1)

  const START_OF_YEAR = startOfYear(START_OF_TODAY)
  const END_OF_YEAR = endOfYear(START_OF_TODAY)

  return {
    day: [
      {
        label: 'Any time',
        value: null,
      },
      {
        label: 'Today',
        value: START_OF_TODAY,
      },
      {
        label: 'Yesterday',
        value: START_OF_YESTERDAY,
      },
      {
        label: 'Tomorrow',
        value: START_OF_TOMORROW,
      },
      {
        label: 'Next week',
        value: START_OF_NEXT_WEEK,
      },
      {
        label: 'Next month',
        value: START_OF_NEXT_MONTH,
      },
    ],
    range: [
      {
        label: 'All time',
        value: null,
      },
      {
        label: 'This week',
        value: [START_OF_WEEK, END_OF_WEEK],
      },
      {
        label: 'Last week',
        value: [START_OF_LAST_WEEK, END_OF_LAST_WEEK],
      },
      {
        label: 'Next week',
        value: [START_OF_NEXT_WEEK, END_OF_NEXT_WEEK],
      },
      {
        label: 'This month',
        value: [START_OF_MONTH, END_OF_MONTH],
      },
      {
        label: 'Last month',
        value: [START_OF_LAST_MONTH, END_OF_LAST_MONTH],
      },
      {
        label: 'Next month',
        value: [START_OF_NEXT_MONTH, END_OF_NEXT_MONTH],
      },
      {
        label: 'This year',
        value: [START_OF_YEAR, END_OF_YEAR],
      },
    ],
  }
})()
