import {
  SNotificationsProvider,
  useNotifications,
  Status,
  type ToastsDisplayPlacementHorizontal,
  type ToastsDisplayPlacementVertical,
} from '@/lib'
import type { Meta } from '@storybook/vue3'

const meta = {
  component: defineComponent({
    components: {
      SNotificationsProvider,
      Trigger: defineComponent({
        setup() {
          const { show } = useNotifications()

          function click() {
            show({
              title: 'Knock-knock',
              descriptionSlot: () => ['Do ', h('b', 'not'), ' open the door'],
              timeout: 1000 + ~~(Math.random() * 2000),
              status: Status.Warning,
            })
          }

          return { click }
        },
        template: `<button @click="click">Click me</button>`,
      }),
    },
    props: ['vertical', 'horizontal'],
    template: `
      <SNotificationsProvider v-bind="{ vertical, horizontal }">
        <div class="fixed inset-0 flex items-center justify-center ">
          <Trigger />
        </div>
      </SNotificationsProvider>
    `,
  }),
  args: {
    horizontal: 'center' as ToastsDisplayPlacementHorizontal,
    vertical: 'top' as ToastsDisplayPlacementVertical,
  },
  argTypes: {
    horizontal: {
      control: 'inline-radio',
      options: ['left', 'center', 'right'] as ToastsDisplayPlacementHorizontal[],
    },
    vertical: {
      control: 'inline-radio',
      options: ['top', 'bottom'] as ToastsDisplayPlacementVertical[],
    },
  },
} as Meta

export default meta

export const Default = {}
//
