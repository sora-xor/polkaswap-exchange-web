import { LINK_ICON_POSITION_VALUES, LINK_UNDERLINE_TYPE_VALUES, SLink } from '@/lib'
import { IconStatusInfo } from '@/components/icons'
import type { Meta, StoryObj } from '@storybook/vue3'

const meta = {
  component: defineComponent({
    components: {
      SLink,
      IconStatusInfo,
    },
    template: `
      <SLink
        href="https://soramitsu.co.jp/"
        target="_blank"
      >
        Link
        <template #icon="iconProps">
          <IconStatusInfo :class="iconProps.class" />
        </template>
      </SLink>
    `,
  }),
  args: {
    underline: 'solid',
    icon: true,
    iconPosition: 'left',
  },
  argTypes: {
    underline: {
      control: 'inline-radio',
      options: LINK_UNDERLINE_TYPE_VALUES,
    },
    iconPosition: {
      control: 'inline-radio',
      options: LINK_ICON_POSITION_VALUES,
    },
    icon: {
      control: 'boolean',
    },
  },
} as Meta

type Story = StoryObj<typeof meta>

export default meta

export const Default = {}

export const IconRight = { args: { iconPosition: 'right' } } as Story

export const NoIconDotted = { args: { icon: false, underline: 'dotted' } } as Story
