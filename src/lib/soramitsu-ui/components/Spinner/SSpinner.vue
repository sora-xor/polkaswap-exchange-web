<script setup lang="ts">
// Animated SVG comes from https://codepen.io/supah/pen/BjYLdW
// TODO(see docs/backlog.md#spinner) refactor to a functional component to avoid runtime overhead

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

const sizeNorm = eagerComputed(() => {
  if (typeof props.size === 'number' || !Number.isNaN(Number(props.size))) {
    return `${props.size}px`;
  }
  return props.size;
});
</script>

<template>
  <svg viewBox="0 0 50 50">
    <circle cx="25" cy="25" r="20" fill="none" stroke-width="5" />
  </svg>
</template>

<style lang="scss" scoped>
$size-norm: v-bind(sizeNorm);
$width: v-bind(width);

svg {
  animation: s-spinner__rotate 1.7s linear infinite;
  width: $size-norm;
  height: $size-norm;
}

circle {
  stroke: currentColor;
  stroke-linecap: round;
  animation: s-spinner__dash 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  stroke-width: $width;
}

@keyframes s-spinner__rotate {
  100% {
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
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}
</style>
