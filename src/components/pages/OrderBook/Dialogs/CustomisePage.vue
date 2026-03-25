<template>
  <dialog-base v-model:visible="visible">
    <slot></slot>
  </dialog-base>
</template>

<script setup lang="ts">
import { components } from '@/shims/wallet-components';

const visible = defineModel<boolean>('visible', { default: false });

defineOptions({
  components: {
    DialogBase: components.DialogBase,
  },
});
</script>
