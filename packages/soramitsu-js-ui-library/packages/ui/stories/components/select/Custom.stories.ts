import { SSelectBase, SSelectButton, useSelectApi } from '@/lib'
import type { Meta } from '@storybook/vue3'
import { OPTIONS } from './common'

const meta = {
  component: defineComponent({
    components: {
      SSelectBase,
      SSelectButton,
      CustomDropdown: {
        setup() {
          const api = useSelectApi()

          return { api }
        },
        template: `
          <div class="bg-blue-300 text-xs">
            <pre>{{ api }}</pre>
          </div>
        `,
      },
    },
    setup() {
      return { OPTIONS, model: ref('en') }
    },
    template: `
      <SSelectBase
        v-model="model"
        label="I am very custom"
        :options="OPTIONS"
      >
        <template #control>
          <SSelectButton />
        </template>
    
        <template #dropdown>
          <CustomDropdown />
        </template>
      </SSelectBase>
    `,
  }),
} as Meta

export default meta

export const Default = {}
