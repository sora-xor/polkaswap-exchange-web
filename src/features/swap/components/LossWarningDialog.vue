<template>
  <dialog-base
    v-model:visible="isVisible"
    custom-class="loss-warning-dialog"
    :append-to-body="appendToBody"
    :modal-append-to-body="appendToBody"
  >
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
import { ref, computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { ZeroStringValue } from '@/consts';
import { useSwapStore } from '@/features/swap/stores/useSwapStore';
import WalletComponentDialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';
import WalletComponentSimpleNotification from '@/lib/soraneo-wallet/src/components/SimpleNotification.vue';

const DialogBase = WalletComponentDialogBase;
const SimpleNotification = WalletComponentSimpleNotification;

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

<style lang="scss" scoped>
:deep(.dialog-card.loss-warning-dialog) {
  position: relative;
  overflow: hidden;
}

:deep(.dialog-card.loss-warning-dialog .dialog-card__header) {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 2;
  justify-content: flex-end;
  padding: $basic-spacing-medium $basic-spacing-medium 0;
  border-bottom: 0;
  pointer-events: none;
}

:deep(.dialog-card.loss-warning-dialog .dialog-card__title) {
  display: none;
}

:deep(.dialog-card.loss-warning-dialog .dialog-card__actions) {
  margin-left: auto;
  pointer-events: auto;
}

:deep(.dialog-card.loss-warning-dialog .dialog-card__content) {
  position: relative;
  z-index: 1;
  padding: $inner-spacing-large clamp(#{$basic-spacing-medium}, 7vw, #{$inner-spacing-large}) $inner-spacing-large;
  max-height: none;
  overflow-x: hidden;
  overflow-y: auto;
}

:deep(.dialog-card.loss-warning-dialog .simple-notification.modal-content) {
  margin-top: 0;
}

:deep(.dialog-card.loss-warning-dialog .simple-notification-icon) {
  margin-bottom: 0;
}

:deep(.dialog-card.loss-warning-dialog .simple-notification__text) {
  max-width: 100%;
}

:deep(.dialog-card.loss-warning-dialog .simple-notification__switch) {
  justify-content: center;
  max-width: 100%;
}

:deep(.dialog-card.loss-warning-dialog .simple-notification__switch > span) {
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

:deep(.dialog-card.loss-warning-dialog .simple-notification__button) {
  min-height: var(--s-size-big);
  white-space: normal;
}

:deep(.dialog-card.loss-warning-dialog .simple-notification__button span) {
  white-space: normal;
  overflow-wrap: anywhere;
}
</style>
