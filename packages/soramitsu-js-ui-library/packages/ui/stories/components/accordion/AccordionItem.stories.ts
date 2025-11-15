import { SAccordionItem } from '@/lib'
import type { Meta } from '@storybook/vue3'

export default {
  component: defineComponent({
    components: {
      SAccordionItem,
    },
    template: `
      <SAccordionItem>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
        labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi
        ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse
        cillum dolore eu fugiat nulla pariatur.
      </SAccordionItem>
    `,
  }),
  args: {
    title: 'Accordion item',
    subtitle: 'Accordion item description',
  },
} as Meta

export const Default = {}
