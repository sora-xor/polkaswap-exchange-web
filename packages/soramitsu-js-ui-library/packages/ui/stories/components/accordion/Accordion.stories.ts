import { SAccordionItem, SAccordion } from '@/lib'
import type { Meta } from '@storybook/vue3'

export default {
  component: defineComponent({
    components: { SAccordion, SAccordionItem },
    template: `
      <SAccordion>
        <SAccordionItem v-for="i in 5" :name="'item' + i">
          <template #title>Item {{ i }}</template>
          <template #subtitle>{{ i }} item</template>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
          labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi
          ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse
          cillum dolore eu fugiat nulla pariatur.
        </SAccordionItem>
        <SAccordionItem>
          <template #title>Nameless</template>
          <template #subtitle>Nameless item</template>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
          labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi
          ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse
          cillum dolore eu fugiat nulla pariatur.
        </SAccordionItem>
      </SAccordion>
    `,
  }),
  args: {
    multiple: false,
  },
} as Meta

export const Default = {}
