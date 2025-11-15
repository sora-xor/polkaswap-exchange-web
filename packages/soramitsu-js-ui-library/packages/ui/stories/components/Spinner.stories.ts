import { SSpinner } from '@/lib'
import type { Meta, StoryObj } from '@storybook/vue3'

const ARG_TYPE_NUM_STR = {
  // FIXME IDK how to make number + string controls
  control: 'object',
} as const

const meta = {
  component: SSpinner,
  argTypes: {
    size: ARG_TYPE_NUM_STR,
    width: ARG_TYPE_NUM_STR,
  },
} as Meta<typeof SSpinner>

export default meta

type Story = StoryObj<typeof meta>

export const Default = {}

export const Blue = {
  args: { class: 'text-blue-500' },
} as Story

export const SizePx = {
  args: { size: '50px' },
} as Story

export const SizeFontSize = {
  args: { style: { fontSize: '50px' } },
} as Story

export const Thin = { args: { size: 25, width: 2 } } as Story

export const Thick = { args: { size: 25, width: 9 } } as Story
