import type { Meta, StoryObj } from '@storybook/vue3'
import { SProgressBar } from '@/lib'

const meta = {
  component: SProgressBar,
  argTypes: {
    percent: { control: { type: 'range', min: 0, max: 100, step: 1 } },
  },
} as Meta<typeof SProgressBar>

export default meta

export const Default = {
  args: { percent: 42 },
} as StoryObj<typeof meta>
