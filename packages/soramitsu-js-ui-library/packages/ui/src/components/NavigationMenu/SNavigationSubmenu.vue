<script setup lang="ts">
import type { Ref } from 'vue'
import SNavigationMenuItemBody from '@/components/NavigationMenu/SNavigationMenuItemBody.vue'
import { SCollapseTransition } from '@/components/Transitions'
import { NAVIGATION_SUBMENU_API_KEY, useNavigationMenuApi } from '@/components/NavigationMenu/api'
import { IconChevronBottom16 } from '@/components/icons'
import { and, not } from '@vueuse/math'

const includedItems = shallowReactive(new Set<Ref<string>>([]))

const api = readonly({
  register,
})
provide(NAVIGATION_SUBMENU_API_KEY, api)

function register(index: Ref<string>) {
  includedItems.add(index)

  onScopeDispose(() => includedItems.delete(index))
}

const [opened, toggle] = useToggle(false)

function handleTriggerClick() {
  if (!isMenuCollapsed.value) {
    toggle()
  }
}

const menuApi = useNavigationMenuApi()

let isMenuCollapsed = computed(() => menuApi.collapsed)
let hasActiveItem = computed(() => {
  for (const item of includedItems) {
    if (item.value === menuApi.active) {
      return true
    }
  }

  return false
})

whenever(and(not(isMenuCollapsed), hasActiveItem), () => toggle(true), { immediate: true })
whenever(isMenuCollapsed, () => toggle(false), { immediate: true })
</script>

<template>
  <li
    data-testid="navigation-submenu"
    role="treeitem"
    :aria-expanded="opened"
    :aria-selected="opened"
    class="s-navigation-submenu"
    :class="{ 's-navigation-submenu_opened': opened }"
  >
    <SNavigationMenuItemBody
      data-testid="navigation-submenu-trigger"
      :active="hasActiveItem"
      :highlighted="opened"
      :minified="isMenuCollapsed"
      @click="handleTriggerClick"
    >
      <template #icon="iconProps">
        <slot name="icon" v-bind="iconProps" />
      </template>

      <slot name="title" />

      <template #append="appendProps">
        <IconChevronBottom16
          v-bind="appendProps"
          class="s-navigation-submenu__chevron"
          aria-hidden="true"
          width="10"
          height="10"
        />
      </template>
    </SNavigationMenuItemBody>

    <SCollapseTransition>
      <div v-show="opened">
        <ul class="s-navigation-submenu__items" data-testid="navigation-submenu-items">
          <slot />
        </ul>
      </div>
    </SCollapseTransition>
  </li>
</template>

<style lang="scss">
.s-navigation-submenu {
  &__chevron {
    transition: 150ms ease-in-out transform;
  }

  &_opened &__chevron {
    transform: rotateZ(-180deg);
  }

  &_opened &__items .s-navigation-menu-item-body__content,
  &_opened &__items .s-navigation-menu-item-body__prepend {
    animation: 150ms ease-in-out slide;
  }

  @keyframes slide {
    0% {
      transform: translateX(-16px);
    }
    100% {
      transform: translateX(0);
    }
  }
}
</style>
