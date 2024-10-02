<template>
  <dialog-base class="browser-notification" :visible.sync="visibility">
    <template #title>
      <div class="browser-notification-dialog__header">
        <s-image
          src="browser-notification/rotate-phone-tg.png"
          class="browser-notification-dialog__image"
          fit="cover"
        />
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
      <s-button
        type="primary"
        class="s-typography-button--large browser-notification-dialog__btn"
        @click="declinedAccess()"
      >
        decline access
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Ref } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { state, mutation } from '@/store/decorators';
import { tmaSdkService } from '@/utils/telegram';

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class RotatePhoneDialog extends Mixins(TranslationMixin) {
  @state.settings.rotatePhoneDialogVisibility private rotatePhoneDialogVisibility!: boolean;
  @state.settings.isRotatePhoneHideBalanceFeatureEnabled private isRotatePhoneHideBalanceFeatureEnabled!: boolean;
  @state.settings.isAccessAccelerometrEventDeclined private isAccessAccelerometrEventDeclined!: boolean;
  @state.settings.isAccessRotationListener private isAccessRotationListener!: boolean;

  @mutation.settings.setRotatePhoneDialogVisibility private setRotatePhoneDialogVisibility!: (flag: boolean) => void;
  @mutation.settings.setIsRotatePhoneHideBalanceFeatureEnabled private setIsRotatePhoneHideBalanceFeatureEnabled!: (
    flag: boolean
  ) => void;

  @mutation.settings.setIsAccessAccelerometrEventDeclined private setIsAccessAccelerometrEventDeclined!: (
    flag: boolean
  ) => void;

  @mutation.settings.setAccessGranted private setAccessGranted!: (flag: boolean) => void;

  get visibility(): boolean {
    return (
      this.rotatePhoneDialogVisibility &&
      !this.isRotatePhoneHideBalanceFeatureEnabled &&
      !this.isAccessAccelerometrEventDeclined &&
      !this.isAccessRotationListener
    );
  }

  set visibility(flag: boolean) {
    this.setRotatePhoneDialogVisibility(flag);
  }

  enableRotatePhoneHideBalanceFeature() {
    if (tmaSdkService.checkAccelerometerSupport()) {
      if (
        typeof DeviceMotionEvent !== 'undefined' &&
        typeof (DeviceMotionEvent as any).requestPermission === 'function'
      ) {
        (DeviceMotionEvent as any)
          .requestPermission()
          .then((permissionState: PermissionState) => {
            if (permissionState === 'granted') {
              this.setAccessGranted(true);
              this.setIsRotatePhoneHideBalanceFeatureEnabled(true);
              tmaSdkService.listenForDeviceRotation();
            } else {
              this.setAccessGranted(false);
              this.setIsAccessAccelerometrEventDeclined(true);
              console.warn('Device motion permission denied.');
            }
          })
          .catch((error: any) => {
            console.error('Error requesting device motion permission:', error);
          });
      } else {
        console.info('no need permission request');
        this.setAccessGranted(true);
        this.setIsRotatePhoneHideBalanceFeatureEnabled(true);
        tmaSdkService.listenForDeviceRotation();
      }
    } else {
      console.warn('Device does not support motion events.');
    }
    this.visibility = false;
  }

  declinedAccess() {
    this.setAccessGranted(false);
    this.setIsAccessAccelerometrEventDeclined(true);
  }
}
</script>

<style lang="scss" scoped>
::v-deep .el-dialog__header {
  padding: 0 !important;
}

::v-deep .el-dialog__close {
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
