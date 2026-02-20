<script setup lang="ts">
import { computed } from 'vue';

defineOptions({ name: 'SImage' });

const props = withDefaults(
  defineProps<{
    src?: string;
    alt?: string;
    fit?: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';
    draggable?: boolean | string;
    lazy?: boolean;
  }>(),
  {
    src: '',
    alt: '',
    fit: 'fill',
    draggable: false,
    lazy: false,
  }
);

const imageStyles = computed(() => ({
  objectFit: props.fit,
}));

const isDraggable = computed(() => {
  if (typeof props.draggable === 'string') return props.draggable === 'true';
  return Boolean(props.draggable);
});
</script>

<template>
  <img class="s-image" :src="src || undefined" :alt="alt" :style="imageStyles" :draggable="isDraggable" />
</template>

<style lang="scss">
.s-image {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
