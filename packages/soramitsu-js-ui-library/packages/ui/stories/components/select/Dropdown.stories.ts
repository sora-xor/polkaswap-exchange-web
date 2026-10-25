import { SDropdown } from '@/lib'
import type { Meta, StoryObj } from '@storybook/vue3'
import { COMMON_ARG_TYPES, COMMON_ARGS, OPTION_GROUPS, OPTIONS } from './common'

const meta = {
  component: defineComponent({
    components: { SDropdown },
    setup() {
      return { model: ref(['en', 'jp']) }
    },
    template: `
      <div class="flex">
        <SDropdown v-bind="$attrs" v-model="model" />
      </div>
    `,
  }),
  args: { ...COMMON_ARGS, inline: false },
  argTypes: COMMON_ARG_TYPES,
} as Meta

export default meta

type Story = StoryObj<typeof meta>

export const Simple_Options = {
  args: {
    options: OPTIONS,
  },
} as Story

export const Option_Groups = {
  args: {
    options: OPTION_GROUPS,
  },
} as Story
