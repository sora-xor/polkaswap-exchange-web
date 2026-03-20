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
</script>

<template>
  <span class="s-spinner" aria-hidden="true"></span>
</template>

<style lang="scss" scoped>
$size-norm: v-bind(sizeNorm);

.s-spinner {
  display: inline-block;
  width: $size-norm;
  height: $size-norm;
  background-image: url('@/assets/img/pswap-loader.svg');
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  animation: s-spinner__rotate 1s linear infinite;
}

@keyframes s-spinner__rotate {
  100% {
    transform: rotate(360deg);
  }
}
</style>
