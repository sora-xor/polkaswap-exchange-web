<template>
  <dialog-base class="browser-notification" :visible.sync="visibility">
    <div class="browser-notification-dialog">
      <p class="browser-notification-dialog__title">Enable acceleration access in your settings.</p>
      <p class="browser-notification-dialog__info">
        Our technology uses your phone's built-in gyroscope to instantly hide your balance when you tilt your device.
      </p>
      <!-- <s-button
        type="secondary"
        class="s-typography-button--large browser-notification-dialog__btn"
        @click="openDeviceSettings"
      >
        Open Settings
      </s-button> -->
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { state, mutation } from '@/store/decorators';

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class AccelerationAccessDialog extends Mixins(TranslationMixin) {
  @state.settings.rotatePhoneDialogVisibility private rotatePhoneDialogVisibility!: boolean;
  @state.settings.isAccessMotionEventDeclined private isAccessMotionEventDeclined!: boolean;
  @state.settings.isAccessRotationListener private isAccessRotationListener!: boolean;

  @mutation.settings.setIsAccessMotionEventDeclined private setIsAccessMotionEventDeclined!: (flag: boolean) => void;
  @mutation.settings.setRotatePhoneDialogVisibility private setRotatePhoneDialogVisibility!: (flag: boolean) => void;

  get visibility(): boolean {
    console.info('this.isAccessRotationListener');
    return this.rotatePhoneDialogVisibility && !this.isAccessRotationListener && this.isAccessMotionEventDeclined;
  }

  set visibility(flag: boolean) {
    this.setRotatePhoneDialogVisibility(flag);
  }
}
</script>

<style lang="scss" scoped>
::v-deep .el-dialog__header {
  padding: 0 !important;
}

::v-deep .el-dialog__close {
  position: absolute;
  top: calc($inner-spacing-big * 2);
  right: $inner-spacing-small;
}
.browser-notification-dialog {
  text-align: center;
  align-items: center;
  display: flex;
  flex-direction: column;
  margin-top: $inner-spacing-big;
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
    max-width: 260px;
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
