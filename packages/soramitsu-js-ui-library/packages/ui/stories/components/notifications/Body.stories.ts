import { SNotificationBody, Status } from '@/lib'
import type { Meta } from '@storybook/vue3'
import { STATUS_ARG_TYPE } from '../../util'

const meta = {
  component: defineComponent({
    components: { SNotificationBody },
    template: `
        <SNotificationBody>
          <template #title>
            Hey there
          </template>
          <template #description>
            You can render <u>any<i>thing</i> here</u>.
          </template>
        </SNotificationBody>
      `,
  }),
  args: {
    status: Status.Info,
    showCloseBtn: true,
    timeout: 0,
  },
  argTypes: {
    status: STATUS_ARG_TYPE,
    timeout: {
      control: {
        type: 'range',
        min: 0,
        // in fact, there is no limit
        max: 10_000,
        step: 300,
      },
    },
  },
} as Meta

export default meta

export const Default = {}
