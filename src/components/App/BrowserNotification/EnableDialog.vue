<template>
  <dialog-base class="browser-notification" :title="t('browserNotificationDialog.title')" v-model:visible="isVisible">
    <div class="browser-notification-dialog">
      <s-image src="browser-notification/chrome.png" lazy fit="cover" draggable="false" class="unselectable"></s-image>
      <p class="browser-notification-dialog__info">
        {{ t('browserNotificationDialog.info') }}
      </p>
      <s-button
        type="primary"
        class="browser-notification-dialog__btn s-typography-button--large"
        :loading="loading"
        @click="handleConfirm"
      >
        {{ t('browserNotificationDialog.button') }}
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts" setup>
import { components } from '@wallet';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { useSettingsStore } from '@/stores/settings';

defineOptions({
  components: {
    DialogBase: components.DialogBase,
  },
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'set-dark-page', value: boolean): void;
}>();

const isVisible = defineModel<boolean>('visible', { default: false });
const settingsStore = useSettingsStore();
const { isBrowserNotificationApiAvailable: isAvailable } = storeToRefs(settingsStore);

const { t } = useTranslation();
const loading = ref(false);

const closeDialog = (): void => {
  emit('close');
  isVisible.value = false;
};

async function handleConfirm(): Promise<void> {
  if (!isAvailable.value) return;

  loading.value = true;
  try {
    closeDialog();
    emit('set-dark-page', true);
    const permission = await Notification.requestPermission();
    settingsStore.setBrowserNotifsAgreement(permission);
  } finally {
    emit('set-dark-page', false);
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.browser-notification-dialog {
  @include browser-notification-dialog;
}
</style>
