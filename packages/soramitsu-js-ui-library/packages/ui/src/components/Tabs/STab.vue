<script setup lang="ts">
import type { TabsPanelApi } from './api'
import { useTabsPanelApi } from './api'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    name: string
  }>(),
  {
    disabled: false,
  },
)

const state: TabsPanelApi = useTabsPanelApi()
const { active } = toRefs(state)
const { selectTab, background } = state
const tabIsActive = computed(() => props.name === active.value)

const activateTab = () => {
  selectTab(props.name)
}

watch(
  () => props.disabled,
  (newVal) => {
    if (newVal && tabIsActive.value) {
      selectTab('')
    }
  },
)
</script>

<template>
  <button
    role="tab"
    class="s-tab flex justify-center items-center sora-tpg-p2"
    :disabled="disabled"
    :class="[{ 's-tab_active': tabIsActive }, `s-tab_background_${background}`]"
    @click="activateTab"
  >
    <div class="s-tab__label-container flex justify-center items-center">
      <div class="s-tab__label">
        <slot />
      </div>
    </div>
  </button>
</template>

<style lang="scss">
@use '@/theme';

$font-color-inactive: theme.token-as-var('sys.color.content-primary');
$font-color-hover: theme.token-as-var('sys.color.primary-hover');
$font-color-disabled: theme.token-as-var('sys.color.content-quaternary');

.s-tab {
  @apply select-none;
  padding: 4px;
  color: $font-color-inactive;

  outline: none;

  &:not(.s-tab_active) .s-tab__label {
    opacity: 0.55;
  }

  &:focus {
    outline: none;
  }

  &__label-container {
    width: 100%;
    height: 100%;
    padding: 4px 16px;
    border-radius: 8px;
  }

  &:hover:not(.s-tab_active, .s-tab:disabled) {
    color: $font-color-hover;

    .s-tab__label {
      opacity: 1;
    }
  }

  &:disabled {
    cursor: default;

    .s-tab__label {
      color: $font-color-disabled;
      opacity: 0.7;
    }
  }

  &.s-tab_active {
    cursor: default;
  }

  &_background_primary {
    $font-color-active: theme.token-as-var('sys.color.util.body');

    $background-color: theme.token-as-var('sys.color.util.body');
    $background-color-active: theme.token-as-var('sys.color.primary');

    $border: 1px solid theme.token-as-var('sys.color.border-primary');
    $border-active: 1px solid $background-color-active;

    background: $background-color;
    border: $border;

    &.s-tab_active {
      color: $font-color-active;
      background-color: $background-color-active;
      border: $border-active;
    }
  }

  &_background_secondary {
    $font-color-active: theme.token-as-var('sys.color.content-primary');
    $background-color: theme.token-as-var('sys.color.background');
    $tab-shadow-active: theme.token-as-var('sys.shadow.active-tab');

    background: $background-color;

    &.s-tab_active {
      cursor: default;
      color: $font-color-active;

      .s-tab__label-container {
        background: white;
        box-shadow: $tab-shadow-active;
      }
    }
  }

  &_background_none {
    $font-color-active: theme.token-as-var('sys.color.primary');

    $background-color: none;
    $background-color-active: none;

    $border: 2px solid theme.token-as-var('sys.color.border-primary');
    $border-active: 2px solid theme.token-as-var('sys.color.primary');

    background: $background-color;
    border-bottom: $border;
    border-radius: 0 !important;

    &.s-tab_active {
      color: $font-color-active;
      background-color: $background-color-active;
      border-bottom: $border-active;
    }
  }
}
</style>
