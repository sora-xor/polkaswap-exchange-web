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
      <p class="browser-notification-dialog__info">
        {{ t('browserNotificationDialog.notificationBlocked') }}
      </p>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Ref } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { state, mutation } from '@/store/decorators';

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class RotatePhoneDialog extends Mixins(TranslationMixin) {
  @Ref('selectedEl') selectedEl!: Nullable<[HTMLDivElement]>;

  @state.settings.rotatePhoneDialogVisibility private rotatePhoneDialogVisibility!: boolean;
  @mutation.settings.setRotatePhoneDialogVisibility private setRotatePhoneDialogVisibility!: (flag: boolean) => void;

  get visibility(): boolean {
    return this.rotatePhoneDialogVisibility;
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
  top: 12px;
  right: 12px;
  z-index: 2;
  box-shadow: unset !important;
  background-color: rgba(0, 0, 0, 0.4) !important;
  i {
    color: #fff;
  }
}

.browser-notification-dialog__header {
  width: 100%;
  position: relative;
  padding: 0;
  height: auto;
}

.browser-notification-dialog__image {
  width: 100%;
  height: auto;
  object-fit: cover;
  border-top-left-radius: var(--s-border-radius-medium);
  border-top-right-radius: var(--s-border-radius-medium);
}

.browser-notification-dialog {
  text-align: center;
  padding: 16px;
}
</style>
