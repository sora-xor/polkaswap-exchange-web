<script setup lang="ts">
import { useSelectApi } from './api'
import type { SelectApi } from './api'
import { SelectButtonType, SelectSize } from './types'
import SSelectChevron from './SSelectChevron'

const props = withDefaults(
  defineProps<{
    type?: SelectButtonType
  }>(),
  {
    type: SelectButtonType.Default,
  },
)

const api = useSelectApi()

function toggle() {
  api.menuToggle()
}

const formattedSelectedValue = computed<string | null>(() => {
  const opts = api.selectedOptions
  if (opts.length) {
    if (opts.length === 1) {
      return opts[0].label
    }
    return `${opts.length} selected`
  }
  return null
})

function typography(): string {
  switch (api.size) {
    case SelectSize.Xl:
      return 'sora-tpg-p1'
    case SelectSize.Lg:
      return 'sora-tpg-p3'
    default:
      return 'sora-tpg-p4'
  }
}

const slots = defineSlots<{
  label?: (api: SelectApi<any>) => any
}>()
</script>

<template>
  <div
    :class="[
      's-select-btn',
      `s-select-btn_${type}`,
      `s-select-btn_size_${api.size}`,
      typography(),
      {
        's-select-btn_empty': !api.isSomethingSelected,
        's-select-btn_disabled': api.disabled,
      },
    ]"
    @click="toggle"
  >
    <span v-if="!!slots.label || api.label" class="s-select-btn__label">
      <slot name="label" v-bind="api">
        {{ api.label }}
      </slot>
      <template v-if="api.isSomethingSelected">:</template>
    </span>

    <span v-if="api.isSomethingSelected" class="s-select-btn__selection">
      {{ formattedSelectedValue }}
    </span>

    <SSelectChevron :rotate="api.isMenuOpened" />
  </div>
</template>

<style lang="scss" scoped>
@use '@/theme';
@use './sizes-mixin.scss';

.s-select-btn {
  $root: &;

  @apply select-none inline-flex items-center space-x-2 cursor-pointer;

  &_default {
    background: theme.token-as-var('sys.color.background');
    color: theme.token-as-var('sys.color.content-primary');
    @apply rounded px-4;

    &:hover {
      background: theme.token-as-var('sys.color.background-hover');
    }
  }

  &_inline {
    #{$root}__selection {
      @apply underline underline-solid;
      text-decoration-color: theme.token-as-var('sys.color.content-primary');
    }

    &:hover#{$root}_empty #{$root}__label {
      text-decoration: underline;
    }
  }

  &_disabled {
    @apply pointer-events-none opacity-75;
  }

  &:not(&_empty) &__label {
    color: theme.token-as-var('sys.color.content-tertiary');
  }

  &_size {
    @include sizes-mixin.s-select-sizes;

    @mixin chevron-size($size, $px) {
      &_#{$size} .s-select-chevron {
        font-size: $px;
      }
    }

    @include chevron-size('sm', 8px);
    @include chevron-size('md', 8px);
    @include chevron-size('lg', 10px);
    @include chevron-size('xl', 16px);

    @mixin x-paddings($size, $px) {
      &_#{$size} {
        @apply px-#{$px};
      }
    }

    @include x-paddings('sm', 6px);
    @include x-paddings('md', 10px);
    @include x-paddings('lg', 16px);
    @include x-paddings('xl', 24px);
  }
}
</style>
