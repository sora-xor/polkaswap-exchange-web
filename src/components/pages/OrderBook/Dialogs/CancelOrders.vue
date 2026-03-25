<template>
  <dialog-base v-model:visible="visible">
    <div class="order-book-cancel-dialog">
      <s-icon name="notifications-alert-triangle-24" size="64"></s-icon>
      <h4>{{ t('orderBook.dialog.askCancel') }}</h4>
      <account-confirmation-option with-hint class="confirmation-option"></account-confirmation-option>
      <s-button type="primary" class="btn s-typography-button--medium" :disabled="!visible" @click="handleCancel">
        <span>{{ t('orderBook.dialog.cancelAll') }}</span>
      </s-button>
    </div>
  </dialog-base>
</template>

<script setup lang="ts">
import { components } from '@/shims/wallet-components';

import { useTranslation } from '@/composables/useTranslation';
import { Cancel } from '@/types/orderBook';

defineOptions({
  components: {
    DialogBase: components.DialogBase,
    AccountConfirmationOption: components.AccountConfirmationOption,
  },
});

const emit = defineEmits<{
  (e: 'confirm', value: Cancel): void;
}>();

const visible = defineModel<boolean>('visible', { default: false });
const { t } = useTranslation();

function handleCancel(): void {
  visible.value = false;
  emit('confirm', Cancel.all);
}
</script>

<style lang="scss">
.order-book-cancel-dialog {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  .s-icon-notifications-alert-triangle-24 {
    color: var(--s-color-status-error);
    margin-bottom: var(--s-size-mini);
    margin-top: -42px;
  }

  h4 {
    font-size: var(--s-font-size-large);
    margin-bottom: $basic-spacing;
    line-height: 130%;
    font-weight: 300;
    text-align: center;
    width: 85%;
  }

  .btn {
    margin-top: $basic-spacing;
    width: 100%;
  }
}
</style>
