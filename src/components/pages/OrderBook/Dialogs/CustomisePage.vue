<template>
  <dialog-base v-model:visible="visible">
    <slot></slot>
  </dialog-base>
</template>

<script setup lang="ts">
import { components } from '@wallet';

const visible = defineModel<boolean>('visible', { default: false });

defineOptions({
  components: {
    DialogBase: components.DialogBase,
  },
});
</script>
