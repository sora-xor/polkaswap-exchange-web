<template>
  <dialog-base v-model:visible="visible" :append-to-body="appendToBody" :modal-append-to-body="appendToBody">
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
import { components } from '@/shims/wallet-components';

import { useTranslation } from '@/composables/useTranslation';

defineOptions({
  components: {
    DialogBase: components.DialogBase,
    NetworkFeeWarning: components.NetworkFeeWarning,
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
