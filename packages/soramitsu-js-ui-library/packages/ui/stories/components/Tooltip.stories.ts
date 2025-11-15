import { STooltip, SButton, SNotificationsProvider, SUseNotification } from '@/lib'
import type { Meta } from '@storybook/vue3'
import type { Placement } from '@popperjs/core'
import { PLACEMENT_ARG_TYPE } from '../util'

const meta = {
  component: defineComponent({
    components: {
      STooltip,
      SButton,
      SNotificationsProvider,
      SUseNotification,
    },
    setup() {
      let count = 0
      const log = reactive<{ msg: string; i: number }[]>([])
      const notify = (msg: string) => log.push({ msg, i: count++ })
      const deleteLog = (i: number) =>
        log.splice(
          log.findIndex((x) => x.i === i),
          1,
        )

      return {
        log,
        notify,
        deleteLog,
      }
    },
    template: `
      <SNotificationsProvider>
        <SUseNotification
          v-for="{ msg, i } in log"
          :key="i"
          show
          show-close-btn
          :timeout="1500"
          @update:show="deleteLog(i)"
        >
          <template #title>
            {{ msg }}
          </template>
        </SUseNotification>
      </SNotificationsProvider>
      
      <div class="p-32 flex justify-center">
        <STooltip
            v-bind="$attrs"
            wrapper-tag="span"
            @click:primary-button="notify('Primary button click')"
            @click:secondary-button="notify('Secondary button click')"
        >
          <SButton type="primary">Hover me?</SButton>
        </STooltip>
      </div>
  
    `,
  }),
  args: {
    placement: 'auto' as Placement,
    primaryButtonText: undefined,
    secondaryButtonText: undefined,
    header: 'Header',
    content: 'Content',
  },
  argTypes: {
    placement: PLACEMENT_ARG_TYPE,
    primaryButtonText: { control: 'text' },
    secondaryButtonText: { control: 'text' },
  },
} as Meta

export default meta

export const Configurable = {}
