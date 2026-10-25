import { SDatePicker, type DatePickerType } from '@/lib'
import type { Meta } from '@storybook/vue3'

const meta = {
  component: defineComponent({
    components: { SDatePicker },
    setup() {
      return { model: ref(null) }
    },
    template: `
      <s-date-picker v-bind="$attrs" v-model="model"  />
      `,
  }),
  argTypes: {
    type: {
      control: 'inline-radio',
      options: ['day', 'range', 'pick'] as DatePickerType[],
    },
    time: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
  args: {
    type: 'day',
    time: true,
  },
} as Meta

export default meta

export const Default = {}
