<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /**
     * HTML tag or Vue component used as root
     *
     * @default 'div'
     */
    tag?: string | object
    /**
     * Applies special styles for items located in submenu
     *
     * @default false
     */
    submenuItem?: boolean
    /**
     * Applies special styles like primary color mark (includes highlighting)
     *
     * @default false
     */
    active?: boolean
    /**
     * Highlight with another background color
     *
     * @default false
     */
    highlighted?: boolean
    /**
     * Removes everything except icon
     *
     * @default false
     */
    minified?: boolean
  }>(),
  {
    tag: 'div',
    submenuItem: false,
    active: false,
    minified: false,
  },
)
</script>

<template>
  <component
    :is="tag"
    class="s-navigation-menu-item-body flex items-center cursor-pointer pl-24px pr-16px"
    :class="{
      's-navigation-menu-item-body_submenu-item': submenuItem,
      's-navigation-menu-item-body_active': active,
      's-navigation-menu-item-body_highlighted': highlighted,
      'py-8px': submenuItem,
      'py-14px': !submenuItem,
    }"
  >
    <div class="s-navigation-menu-item-body__prepend flex-shrink-0 flex items-center justify-end h-16px w-16px mr-8px">
      <slot v-if="!submenuItem" name="icon" :class="'s-navigation-menu-item-body__icon'" />
    </div>

    <div
      class="s-navigation-menu-item-body__content truncate"
      :class="{
        invisible: minified,
      }"
    >
      <slot />
    </div>

    <div v-show="!minified" class="ml-auto pl-8px">
      <slot name="append" :class="'s-navigation-menu-item-body__append'" />
    </div>
  </component>
</template>

<style lang="scss">
@use '@/theme';

.s-navigation-menu-item-body {
  $root: &;
  min-height: 54px;
  background-color: #2e2e36; // Base [night] / Background
  box-shadow: inset 5px 0 transparent;
  transition: 100ms ease-in-out;
  transition-property: background-color, box-shadow;

  &_submenu-item {
    min-height: 50px;
    background-color: #26262d; // Utility [night] / Surface
  }

  &_active,
  &:hover {
    background-color: #26262d; // Utility [night] / Surface
    box-shadow: inset 5px 0 theme.token-as-var('sys.color.primary');
  }

  &_highlighted {
    background-color: #26262d; // Utility [night] / Surface
  }

  &_submenu-item#{$root}_active,
  &_submenu-item:hover {
    box-shadow: none;

    #{$root}__prepend::before {
      content: '';
      background-color: theme.token-as-var('sys.color.primary');
      width: 5px;
      height: 5px;
    }
  }

  &__icon {
    width: 100%;
    height: 100%;
    fill: currentColor;
  }

  &__append {
    fill: currentColor;
  }
}
</style>
