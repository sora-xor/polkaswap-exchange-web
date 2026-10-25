<script setup lang="ts">
import { SSpinner } from '../Spinner';
import type { BadgeType } from './api';

const props = withDefaults(
  defineProps<{
    type?: BadgeType;
    colorBackground?: boolean;
    withBorder?: boolean;
    onlyMarker?: boolean;
    tabular?: boolean;
  }>(),
  {
    type: 'active',
    colorBackground: false,
    withBorder: false,
    onlyMarker: false,
    tabular: false,
  }
);

const showSpinner = computed(() => {
  return props.type === 'pending';
});
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
