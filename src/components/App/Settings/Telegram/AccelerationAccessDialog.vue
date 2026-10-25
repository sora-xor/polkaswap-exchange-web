<template>
  <dialog-base v-model:visible="isVisible" class="browser-notification">
    <div class="browser-notification-dialog">
      <p class="browser-notification-dialog__title">{{ t('rotatePhoneNotification.enableAcceleration') }}</p>
      <p class="browser-notification-dialog__info">
        {{ t('rotatePhoneNotification.gyroscropePhone') }}
      </p>
      <s-button
        type="secondary"
        class="s-typography-button--large browser-notification-dialog__btn"
        @click="reloadPage"
      >
        {{ t('provider.messages.reloadPage') }}
      </s-button>
    </div>
  </dialog-base>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { useSettingsStore } from '@/stores/settings';
import WalletComponentDialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';

defineOptions({
  name: 'AccelerationAccessDialog',
  components: {
    DialogBase: WalletComponentDialogBase,
  },
});
const { t } = useTranslation();
const settingsStore = useSettingsStore();

const rotatePhoneDialogVisibility = computed(() => settingsStore.rotatePhoneDialogVisibility);
const isAccessAccelerometrEventDeclined = computed(() => settingsStore.isAccessAccelerometrEventDeclined);
const isAccessRotationListener = computed(() => settingsStore.isAccessRotationListener);

const isVisible = computed({
  get: () =>
    rotatePhoneDialogVisibility.value && !isAccessRotationListener.value && isAccessAccelerometrEventDeclined.value,
  set: (flag: boolean) => settingsStore.setRotatePhoneDialogVisibility(flag),
});

function reloadPage(): void {
  window.location.reload();
}
</script>
