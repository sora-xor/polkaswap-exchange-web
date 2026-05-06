<template>
  <dialog-base class="browser-notification" v-model:visible="visibility">
    <template #title>
      <div class="browser-notification-dialog__header">
        <s-image
          src="browser-notification/rotate-phone-tg.png"
          class="browser-notification-dialog__image"
          fit="cover"
        ></s-image>
      </div>
    </template>
    <div class="browser-notification-dialog">
      <p class="browser-notification-dialog__title">{{ t('rotatePhoneNotification.title') }}</p>
      <p class="browser-notification-dialog__info">
        {{ t('rotatePhoneNotification.info') }}
      </p>
      <s-button
        type="primary"
        class="s-typography-button--large browser-notification-dialog__btn"
        @click="enableRotatePhoneHideBalanceFeature()"
      >
        {{ t('browserPermission.btnAllow') }}
      </s-button>
    </div>
  </dialog-base>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { useSettingsStore } from '@/stores/settings';
import { tmaSdkService } from '@/utils/telegram';
import WalletComponentDialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';

defineOptions({ name: 'RotatePhoneDialog' });

const DialogBase = WalletComponentDialogBase;

const { t } = useTranslation();
const settingsStore = useSettingsStore();

const visibility = computed({
  get: () => {
    const dialogVisible = Boolean(settingsStore.rotatePhoneDialogVisibility);
    const hideFeatureEnabled = Boolean(settingsStore.isRotatePhoneHideBalanceFeatureEnabled);
    const accessDeclined = Boolean(settingsStore.isAccessAccelerometrEventDeclined);
    const rotationListener = Boolean(settingsStore.isAccessRotationListener);

    return dialogVisible && !hideFeatureEnabled && !accessDeclined && !rotationListener;
  },
  set: (flag: boolean) => {
    settingsStore.setRotatePhoneDialogVisibility(flag);
  },
});

const closeDialog = () => {
  visibility.value = false;
};

const enableRotatePhoneHideBalanceFeature = (): void => {
  const grantAccess = () => {
    settingsStore.setAccessGranted(true);
    settingsStore.setIsRotatePhoneHideBalanceFeatureEnabled(true);
    tmaSdkService.listenForDeviceRotation();
  };

  const denyAccess = () => {
    settingsStore.setAccessGranted(false);
    settingsStore.setIsAccessAccelerometrEventDeclined(true);
    console.warn('Device motion permission denied.');
  };

  if (!tmaSdkService.checkAccelerometerSupport()) {
    console.warn('Device does not support motion events.');
    closeDialog();
    return;
  }

  if (typeof DeviceMotionEvent !== 'undefined' && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
    (DeviceMotionEvent as any)
      .requestPermission()
      .then((permissionState: PermissionState) => {
        if (permissionState === 'granted') {
          grantAccess();
        } else {
          denyAccess();
        }
      })
      .catch((error: unknown) => {
        console.error('Error requesting device motion permission:', error);
      })
      .finally(closeDialog);
    return;
  }

  grantAccess();
  closeDialog();
};
</script>

<style lang="scss" scoped>
:deep(.el-dialog__header) {
  padding: 0 !important;
}

:deep(.el-dialog__close) {
  position: absolute;
  top: $inner-spacing-small;
  right: $inner-spacing-small;
  z-index: 2;
  box-shadow: unset !important;
  background-color: rgba(0, 0, 0, 0.4) !important;
  i {
    color: #fff;
  }
}

.browser-notification-dialog {
  text-align: center;
  button,
  &__header {
    width: 100%;
  }
  &__image {
    width: 100%;
    height: auto;
    object-fit: cover;
    border-top-left-radius: var(--s-border-radius-medium);
    border-top-right-radius: var(--s-border-radius-medium);
  }
  &__title {
    font-size: 20px;
    color: var(--s-color-base-content-primary);
    margin-top: calc($inner-spacing-big + $inner-spacing-tiny);
    margin-bottom: $inner-spacing-small;
    font-weight: 300;
  }
  &__info {
    font-size: 14px;
    color: var(--s-color-base-content-secondary);
    margin-bottom: calc($inner-spacing-medium + $inner-spacing-tiny / 2);
  }
}
</style>
