import { SNavigationMenu, SNavigationMenuItem, SNavigationSubmenu } from '@/lib'
import { IconStatusInfo } from '@/components/icons'

import type { Meta } from '@storybook/vue3'

const meta = {
  component: defineComponent({
    components: {
      SNavigationMenuItem,
      SNavigationMenu,
      SNavigationSubmenu,
      IconStatusInfo,
    },
    props: ['collapsed'],
    template: `
      <SNavigationMenu  v-model="selectedItem" :collapsed="collapsed">
        <template #header>
          <div class="sora-tpg-h2 px-14px py-16px text-center divide-y divide-current">
            <div v-if="!collapsed">Header</div>
            <div v-else>H</div>
          </div>
        </template>

        <SNavigationMenuItem v-for="i in 5" :value="String(i)">
          <template #icon="iconProps">
            <IconStatusInfo v-bind="iconProps"  />
          </template>
          Option {{ String(i) }}
        </SNavigationMenuItem>
  
        <SNavigationSubmenu>
          <template #title>Submenu</template>
          <SNavigationMenuItem v-for="i in 5" :value="String(i) + 0">
            Option {{ String(i) + 0 }}
          </SNavigationMenuItem>
        </SNavigationSubmenu>
  
        <SNavigationMenuItem value="01">
          <template #icon="iconProps">
            <IconStatusInfo v-bind="iconProps" />
          </template>
          Long long truncated text
        </SNavigationMenuItem>

        <SNavigationMenuItem value="02">
          <template #icon="iconProps">
            <IconStatusInfo v-bind="iconProps" />
          </template>
          Long long Text with<br>line break
        </SNavigationMenuItem>

        <template #footer>
          <div class="px-30px whitespace-nowrap text-center divide-y divide-current" :class="{ 'invisible': collapsed }">
            <div class="py-16px">Footer content</div>
            <div class="py-16px">Footer content</div>
          </div>
        </template>
      </SNavigationMenu>
    `,
  }),
  argTypes: {
    collapsed: {
      control: 'boolean',
    },
  },
  args: {
    collapsed: false,
  },
} as Meta

export default meta

export const Default = {}
