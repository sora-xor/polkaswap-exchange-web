import { SButton, BUTTON_TYPE_VALUES, BUTTON_SIZE_VALUES, BUTTON_ICON_POSITION_VALUES } from '@/lib'
import { IconClose } from '@/components/icons'
import type { Meta } from '@storybook/vue3'

export default {
  component: defineComponent({
    components: { SButton, IconClose },
    template: `
      <div class="flex flex-col items-start space-y-4">
        <SButton v-bind="$attrs">
          <template #icon>
            <IconClose style="width: 1em; height: 1em;"/>
          </template>
          {{ $attrs.type }}
        </SButton>
        <SButton v-bind="$attrs">
          <template #icon>
            <IconClose
              v-if="$attrs.type === 'action'"
              style="width: 1em; height: 1em;"
            />
          </template>
          {{ $attrs.type }}
        </SButton>
      </div>
    `,
  }),
  args: {
    type: 'primary',
    size: 'md',
    icon: '',
    iconPosition: 'left',
    disabled: false,
    rounded: false,
    loading: false,
    uppercase: false,
  },
  argTypes: {
    type: {
      control: 'inline-radio',
      options: BUTTON_TYPE_VALUES,
    },
    size: {
      control: 'inline-radio',
      options: BUTTON_SIZE_VALUES,
    },
    icon: { control: 'text' },
    iconPosition: {
      control: 'inline-radio',
      options: BUTTON_ICON_POSITION_VALUES,
    },
    disabled: { control: 'boolean' },
    rounded: { control: 'boolean' },
    loading: { control: 'boolean' },
    uppercase: { control: 'boolean' },
  },
} as Meta

export const Default = {}
