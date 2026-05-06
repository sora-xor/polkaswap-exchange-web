<template>
  <dialog-base
    class="browser-notification"
    :title="t('browserNotificationLocalStorageOverride.title')"
    v-model:visible="isVisible"
  >
    <div class="browser-notification-dialog">
      <p class="browser-notification-dialog__info">
        {{ t('browserNotificationLocalStorageOverride.info') }}
      </p>
      <s-button
        type="primary"
        class="s-typography-button--large browser-notification-dialog__btn"
        :loading="loading"
        @click="agree"
      >
        {{ t('browserNotificationLocalStorageOverride.agree') }}
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import WalletComponentDialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';

defineOptions({
  components: {
    DialogBase: WalletComponentDialogBase,
  },
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'delete-data-local-storage', value: boolean): void;
}>();

const isVisible = defineModel<boolean>('visible', { default: false });
const { t } = useTranslation();
const loading = ref(false);

const closeDialog = (): void => {
  emit('close');
  isVisible.value = false;
};

function agree(): void {
  closeDialog();
  emit('delete-data-local-storage', true);
}
</script>

<style lang="scss" scoped>
.browser-notification-dialog {
  @include browser-notification-dialog;
}
</style>
