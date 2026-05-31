<template>
  <dialog-base
    v-model:visible="visible"
    custom-class="network-fee-warning-dialog"
    :append-to-body="appendToBody"
    :modal-append-to-body="appendToBody"
  >
    <network-fee-warning
      class="network-fee"
      :fee="fee"
      :symbol="symbol"
      :payoff="payoff"
      @confirm="handleConfirm"
    ></network-fee-warning>
  </dialog-base>
</template>

<script setup lang="ts">
import { KnownSymbols } from '@sora-substrate/sdk/build/assets/consts';

import { useTranslation } from '@/composables/useTranslation';
import WalletComponentDialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';
import WalletComponentNetworkFeeWarning from '@/lib/soraneo-wallet/src/components/NetworkFeeWarning.vue';

defineOptions({
  components: {
    DialogBase: WalletComponentDialogBase,
    NetworkFeeWarning: WalletComponentNetworkFeeWarning,
  },
});

const props = withDefaults(
  defineProps<{
    fee: string;
    symbol?: string;
    payoff?: boolean;
    appendToBody?: boolean;
  }>(),
  {
    symbol: KnownSymbols.XOR,
    payoff: true,
    appendToBody: true,
  }
);

const visible = defineModel<boolean>('visible', { default: false });

const emit = defineEmits<{
  (e: 'confirm'): void;
}>();

useTranslation(); // keeps translation reactivity for slot content

function handleConfirm(): void {
  visible.value = false;
  emit('confirm');
}
</script>

<style lang="scss">
.network-fee-warning-dialog.dialog-card {
  position: relative;
}

.network-fee-warning-dialog {
  .dialog-card__header {
    position: absolute;
    top: $basic-spacing-medium;
    right: $basic-spacing-medium;
    z-index: 1;
    width: auto;
    padding: 0;
    border-bottom: 0;
  }

  .dialog-card__title {
    display: none;
  }

  .dialog-card__actions {
    gap: 0;
  }

  .dialog-card__content {
    padding-top: $basic-spacing-big;
  }

  .simple-notification.modal-content {
    margin-top: 0;
  }
}
</style>
