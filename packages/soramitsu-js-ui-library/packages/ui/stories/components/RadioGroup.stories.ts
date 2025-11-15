import { SRadio, SRadioGroup, RADIO_TYPE_VALUES, RADIO_SIZE_VALUES } from '@/lib'
import type { Meta } from '@storybook/vue3'

const meta = {
  component: defineComponent({
    components: {
      SRadio,
      SRadioGroup,
    },
    setup: () => ({
      opts: ['Sorimitsu', 'Soramatsu', 'Tiramisu', 'Soramitsu'] as const,
    }),
    template: `
      <SRadioGroup class="flex space-x-4">
        <SRadio
          v-for="x in opts"
          :key="x"
          :value="x"
          :type="$attrs.type"
          :size="$attrs.size"
          :disabled="$attrs.disabled && x === 'Soramitsu'"
        >
          {{ x }}
  
          <template #description>
            Would you pick the correct one?
          </template>
        </SRadio>
      </SRadioGroup>
    `,
  }),
  args: {
    type: 'default',
    size: 'md',
    disabled: false,
  },
  argTypes: {
    type: {
      control: 'inline-radio',
      options: RADIO_TYPE_VALUES,
    },
    size: {
      control: 'inline-radio',
      options: RADIO_SIZE_VALUES,
    },
    disabled: {
      control: 'boolean',
    },
  },
} as Meta

export default meta

export const Default = {}
