<template>
  <dialog-base v-model:visible="isVisible" :append-to-body="appendToBody" :modal-append-to-body="appendToBody">
    <simple-notification
      optional
      modal-content
      v-model="hidePopup"
      :button-text="t('confirmNextTxFailure.button')"
      @submit="handleConfirm"
    >
      <template #title>{{ t('confirmNextTxFailure.header') }}</template>
      <template #text>{{ t('exchange.lossWarning', { value }) }}</template>
    </simple-notification>
  </dialog-base>
</template>

<script setup lang="ts">
import { components } from '@/shims/wallet-components';
import { ref, watch, computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { ZeroStringValue } from '@/consts';
import { useSwapStore } from '@/stores/swap';

const DialogBase = components.DialogBase;
const SimpleNotification = components.SimpleNotification;

const props = withDefaults(
  defineProps<{
    value?: string;
    appendToBody?: boolean;
  }>(),
  {
    value: ZeroStringValue,
    appendToBody: false,
  }
);

const emit = defineEmits<{
  (event: 'confirm'): void;
}>();

const { t } = useTranslation();
const swapStore = useSwapStore();

const isVisible = defineModel<boolean>('visible', { required: true });

const appendToBody = computed(() => props.appendToBody);
const value = computed(() => props.value);
const hidePopup = ref(false);

const handleConfirm = async () => {
  swapStore.setAllowLossPopup(!hidePopup.value);
  isVisible.value = false;
  emit('confirm');
};
</script>
