<script setup lang="ts">
import { NAVIGATION_MENU_API_KEY } from '@/components/NavigationMenu/api'
import { usePassiveModel } from '@/composables/passive-model'

const props = withDefaults(
  defineProps<{
    /**
     * Selected item value
     *
     * @default ''
     */
    modelValue?: string
    /**
     * Sets collapsed state, which makes menu narrow if true
     *
     * @default false
     */
    collapsed?: boolean
  }>(),
  {
    modelValue: '',
    collapsed: false,
  },
)

const rawModel = defineModel<string>('modelValue', { default: '' })
const model = usePassiveModel(rawModel)

const collapsed = computed(() => props.collapsed)

const api = readonly({
  active: model,
  select,
  collapsed,
})

function select(value: string) {
  model.value = value
}

provide(NAVIGATION_MENU_API_KEY, api)
</script>

<template>
  <nav
    data-testid="navigation-menu"
    class="s-navigation-menu flex flex-col"
    :class="{
      's-navigation-menu_collapsed': collapsed,
    }"
  >
    <div class="s-navigation-menu__header">
      <slot name="header" />
    </div>

    <ul class="flex-grow" role="tree">
      <slot />
    </ul>

    <slot name="footer" />
  </nav>
</template>

<style lang="scss">
@use '@/theme';

.s-navigation-menu {
  background-color: #2e2e36; // Base [night] / Background
  color: theme.token-as-var('sys.color.content-on-background-inverted');
  width: 220px;
  height: 100%;
  transition: 150ms ease-in-out width;

  &_collapsed {
    width: 64px;
  }

  &__header {
    background-color: #26262d; // Utility [night] / Surface
  }
}
</style>
