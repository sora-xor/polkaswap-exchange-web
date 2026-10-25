import { Status } from '@/types'
import { placements } from '@popperjs/core'

export const STATUS_ARG_TYPE = {
  control: 'inline-radio',
  options: [Status.Info, Status.Success, Status.Warning, Status.Error],
} as const

export const PLACEMENT_ARG_TYPE = {
  control: 'select',
  options: placements,
} as const
