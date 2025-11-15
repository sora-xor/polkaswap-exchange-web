import { SSwitch } from '@/lib'
import type { Meta, StoryObj } from '@storybook/vue3'

const meta = {
  component: SSwitch,
  args: {
    disabled: false,
    label: 'Notifications',
    labelHidden: false,
  },
} as Meta<typeof SSwitch>

export default meta

export const Default = {}

export const Without_Label = { args: { labelHidden: true } } as StoryObj<typeof meta>
