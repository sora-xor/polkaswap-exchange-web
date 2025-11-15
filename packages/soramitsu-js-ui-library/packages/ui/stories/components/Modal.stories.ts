import { SModalCard, SModal, SButton } from '@/lib'
import type { Meta, StoryObj } from '@storybook/vue3'

const meta = {
  component: defineComponent({
    components: {
      SModal,
      SModalCard,
      SButton,
      Counter: defineComponent({
        setup() {
          return { count: useInterval(300) }
        },
        template: `{{ count }}`,
      }),
    },
    setup() {
      return {
        show: ref(false),
      }
    },
    template: `
      <SButton @click="show = true">
        Show modal
      </SButton>

      <SModal
          v-model:show="show"
          v-bind="$attrs"
      >
        <SModalCard class="flex flex-col max-h-90vh">
          <template #title>
            Modal <i>title</i>
          </template>

          <div class="space-y-4 overflow-auto">
            <p :class="{ 'h-800px': $attrs.bigContentHeight }">
              Pay attention to focus trap! (button is focused!)
            </p>

            <p>Counter (eagerness check): <Counter /></p>

            <SButton @click="show = false">
              Close
            </SButton>
          </div>
        </SModalCard>
      </SModal>
    `,
  }),
  args: {
    closeOnOverlayClick: true,
    closeOnEsc: true,
    focusTrap: true,
    eager: false,
  },
} as Meta

type Story = StoryObj<typeof meta>

export default meta

export const Default = {}

export const BigContentHeight = { args: { bigContentHeight: true } } as Story
