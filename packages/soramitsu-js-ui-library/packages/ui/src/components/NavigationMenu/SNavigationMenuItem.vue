<script setup lang="ts">
import { computed, onUnmounted } from 'vue'
import { useNavigationMenuApi, useNavigationSubmenuApi } from '@/components/NavigationMenu/api'
import SNavigationMenuItemBody from '@/components/NavigationMenu/SNavigationMenuItemBody.vue'

const props = withDefaults(
  defineProps<{
    /**
     * Item identifier
     */
    value: string
  }>(),
  {},
)

const menuApi = useNavigationMenuApi()

const isSelected = computed(() => menuApi.active === props.value)
const isMenuCollapsed = computed(() => menuApi.collapsed)

function handleClick() {
  menuApi.select(props.value)
}

let isInSubmenu = false
const submenuApi = useNavigationSubmenuApi()

if (submenuApi) {
  const value = computed(() => props.value)
  isInSubmenu = true
  submenuApi.register(value)
}
</script>

<template>
  <li role="none">
    <SNavigationMenuItemBody
      data-testid="navigation-menu-item"
      role="treeitem"
      :aria-selected="isSelected"
      :active="isSelected"
      :submenu-item="isInSubmenu"
      :minified="isMenuCollapsed"
      @click="handleClick"
    >
      <template #icon="iconProps">
        <slot name="icon" v-bind="iconProps" />
      </template>

      <slot />
    </SNavigationMenuItemBody>
  </li>
</template>
