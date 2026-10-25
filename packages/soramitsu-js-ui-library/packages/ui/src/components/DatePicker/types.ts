import type { CUSTOM_OPTION_VALUE } from '@/components/DatePicker/consts'

export type DatePickerType = 'day' | 'range' | 'pick'

type DayModelValue = Date | null
type RangeModelValue = [Date, Date] | null
type PickModelValue = Date[]
export type ModelValueType = DayModelValue | RangeModelValue | PickModelValue | undefined

interface RangeStateBase {
  selecting: boolean
  startDate: Date | null
  endDate: Date | null
  selectedField: 'startDate' | 'endDate' | null
}

export interface RangeStateSelecting extends RangeStateBase {
  selecting: true
  startDate: Date
  endDate: null
  selectedField: 'startDate' | 'endDate'
}

export interface RangeStateSelected extends RangeStateBase {
  selecting: false
  startDate: Date
  endDate: Date
  selectedField: 'startDate' | 'endDate'
}

export interface RangeStateEmpty extends RangeStateBase {
  selecting: false
  startDate: null
  endDate: null
  selectedField: null
}

export type RangeState = RangeStateEmpty | RangeStateSelecting | RangeStateSelected

export type DateState = DayModelValue
export type PickState = PickModelValue

export interface StateStore {
  dayState: DateState
  pickState: PickState
  rangeState: RangeState
}

export interface PresetOption<T> {
  label: string
  value: T
}
type PresetOptionCustom = PresetOption<typeof CUSTOM_OPTION_VALUE>
export type PossiblePresetOption =
  | PresetOption<DayModelValue>
  | PresetOption<RangeModelValue>
  | PresetOption<PickModelValue>
  | PresetOptionCustom

export interface DatePickerOptionsProp {
  day?: PresetOption<DayModelValue>[]
  range?: PresetOption<RangeModelValue>[]
  pick?: PresetOption<PickModelValue>[]
}

export interface DatePickerOptions {
  day: [...PresetOption<DayModelValue>[], PresetOptionCustom] | []
  range: [...PresetOption<RangeModelValue>[], PresetOptionCustom] | []
  pick: [...PresetOption<PickModelValue>[], PresetOptionCustom] | []
}

export interface ShowState {
  month: number
  year: number
}

export type DateTableCellType = 'normal' | 'today' | 'prev-month' | 'next-month'

export interface DateTableCell {
  type: DateTableCellType
  inRange: boolean
  start: boolean
  end: boolean
  time: string | null
  day: number
  month: number
  text: number
  disabled: boolean
}
