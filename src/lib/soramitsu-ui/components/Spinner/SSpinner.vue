<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  /**
   * Size of circle. Pure numbers & numeric strings will be interpreted as `px`
   *
   * @default '1em'
   */
  size?: number | string;
  /**
   * Stroke width
   *
   * @default 4
   */
  width?: number | string;
}

const props = withDefaults(defineProps<Props>(), {
  size: '1em',
  width: 5,
});

const sizeNorm = computed(() => {
  if (typeof props.size === 'number' || !Number.isNaN(Number(props.size))) {
    return `${props.size}px`;
  }
  return props.size;
});

const widthNorm = computed(() => {
  if (typeof props.width === 'number' || !Number.isNaN(Number(props.width))) {
    return `${props.width}px`;
  }
  return props.width;
});
</script>

<template>
  <svg class="s-spinner" aria-hidden="true" viewBox="25 25 50 50">
    <circle class="s-spinner__path" cx="50" cy="50" r="20" fill="none"></circle>
  </svg>
</template>

<style lang="scss" scoped>
$size-norm: v-bind(sizeNorm);
$width-norm: v-bind(widthNorm);

.s-spinner {
  display: block;
  width: $size-norm;
  height: $size-norm;
  animation: s-spinner__rotate 1.7s linear infinite;
}

.s-spinner__path {
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: $width-norm;
  animation: s-spinner__dash 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes s-spinner__rotate {
  to {
    transform: rotate(360deg);
  }
}

@keyframes s-spinner__dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }

  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }

  to {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}
</style>
