import { SCheckboxSolo, CHECKBOX_SIZE_VALUES, CHECKBOX_TYPE_VALUES } from '@/lib'
import type { Meta } from '@storybook/vue3'

export default {
  component: defineComponent({
    components: { SCheckboxSolo },
    props: ['title', 'description'],
    template: `
      <SCheckboxSolo v-bind="$attrs">
        <template #default>{{ title }}</template>
        <template #description>{{ description  }}</template>
      </SCheckboxSolo>
    `,
  }),
  args: {
    modelValue: false,
    type: CHECKBOX_TYPE_VALUES[0],
    size: CHECKBOX_SIZE_VALUES[0],
    disabled: false,
    title: 'Sora',
  },
  argTypes: {
    type: {
      control: 'inline-radio',
      options: CHECKBOX_TYPE_VALUES,
    },
    size: {
      control: 'inline-radio',
      options: CHECKBOX_SIZE_VALUES,
    },
    description: {
      control: 'text',
    },
  },
} as Meta

export const Default = {}
