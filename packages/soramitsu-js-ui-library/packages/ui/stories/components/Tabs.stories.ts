import { STab, STabsPanel, TABS_PANEL_BACKGROUND_TYPES } from '@/lib'
import type { Meta, StoryObj } from '@storybook/vue3'

const SAMPLE_TABS = ['first', 'second', 'third'] as const

const meta = {
  component: defineComponent({
    components: { STabsPanel, STab },
    props: {
      background: {
        type: String,
        default: 'primary',
      },
      disableSecond: Boolean,
    },
    setup() {
      return {
        tabs: SAMPLE_TABS,
      }
    },
    template: `
      <STabsPanel model-value="first" :background="background">
      <STab
          v-for="x in tabs"
          :key="x"
          :name="x"
          style="text-transform: capitalize"
          :disabled="x === 'second' && disableSecond"
      >
        {{ x }}
      </STab>
      </STabsPanel>
    `,
  }),
  args: {
    disableSecond: false,
    background: 'primary',
  },
  argTypes: {
    background: {
      control: { type: 'inline-radio' },
      options: TABS_PANEL_BACKGROUND_TYPES,
    },
  },
} as Meta

export default meta

export const Primary = {}

export const Secondary = { args: { background: 'secondary' } } as StoryObj<typeof meta>
