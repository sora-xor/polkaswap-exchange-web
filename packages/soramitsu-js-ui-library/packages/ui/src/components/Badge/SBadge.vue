<script setup lang="ts">
import { SSpinner } from '../Spinner'
import type { BadgeType } from './api'

const props = withDefaults(
  defineProps<{
    type?: BadgeType
    colorBackground?: boolean
    withBorder?: boolean
    onlyMarker?: boolean
    tabular?: boolean
  }>(),
  {
    type: 'active',
    colorBackground: false,
    withBorder: false,
    onlyMarker: false,
    tabular: false,
  },
)

const showSpinner = computed(() => {
  return props.type === 'pending'
})
</script>

<template>
  <div
    class="sora-tpg-ch3 py-5px"
    :class="[
      's-badge',
      { 's-badge_border': withBorder, 'px-10px': !tabular },
      colorBackground ? `s-badge_color_${type} text-white` : ' primary-text-color',
    ]"
  >
    <div class="flex items-center justify-start">
      <div v-if="!showSpinner" class="marker" :class="!colorBackground ? `s-badge_color_${type}` : 'bg-white'" />
      <SSpinner v-else class="spinner" />
      <span v-if="!onlyMarker" class="title"><slot /></span>
    </div>
  </div>
</template>

<style lang="scss">
@use '@/theme';
.s-badge {
  @apply cursor-default select-none block;
  border-radius: 30px;
  width: fit-content;

  @each $status in ('error', 'warning', 'info', 'debug') {
    $bg: theme.token-as-var('sys.color.status.#{$status}');
    &_color_#{$status} {
      background-color: $bg;
    }
  }

  &_color_active {
    background-color: theme.token-as-var('sys.color.status.success');
  }

  &_color_pending {
    background-color: theme.token-as-var('sys.color.content-tertiary');
  }

  .primary-text-color {
    color: theme.token-as-var('sys.color.content-primary');
  }

  .marker {
    @apply rounded-full;
    width: 8px;
    min-width: 8px;
    height: 8px;
  }

  .spinner {
    width: 10px;
    min-width: 10px;
    height: 10px;
  }

  .title {
    text-transform: uppercase;
    margin-left: 8px;
  }

  &_border {
    @apply border border-1 border-base-background;
  }
}
</style>
