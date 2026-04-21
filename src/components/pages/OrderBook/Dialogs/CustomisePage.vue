import WalletComponentDialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';
<template>
  <dialog-base v-model:visible="visible">
    <slot></slot>
  </dialog-base>
</template>

<script setup lang="ts">

const visible = defineModel<boolean>('visible', { default: false });

defineOptions({
  components: {
    DialogBase: WalletComponentDialogBase,
  },
});
</script>
