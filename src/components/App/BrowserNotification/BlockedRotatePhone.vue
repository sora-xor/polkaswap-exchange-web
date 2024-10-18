<template>
  <dialog-base class="browser-notification" :visible.sync="isVisible">
    <div class="browser-notification-dialog">
      <img src="@/assets/img/mobile/rotate_phone.svg?inline" alt="mobile-rotate-phone" />
      <p class="notification-title">{{ t('browserNotificationDialog.rotatetitle') }}</p>
      <p class="notification-message">{{ t('browserNotificationDialog.rotateMessage') }}</p>
      <s-button
        type="primary"
        class="s-typography-button--large browser-notification-dialog__btn"
        :loading="loading"
        @click="agree"
      >
        {{ t('browserNotificationDialog.agree') }}
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class AppBrowserNotifsBlockedRotatePhone extends Mixins(
  TranslationMixin,
  mixins.DialogMixin,
  mixins.LoadingMixin
) {
  agree(): void {
    this.closeDialog();
  }
}
</script>

<style lang="scss" scoped>
.browser-notification-dialog {
  @include browser-notification-dialog;
  justify-content: center;
  align-items: center;
  max-height: 230px;
}

img {
  height: 113px;
  width: 113px;
}

.notification-title {
  margin-top: 33px;
  margin-bottom: 14px;
  font-size: 24px;
  font-weight: 600;
  color: var(--s-color-base-content-primary);
}

.notification-message {
  font-size: 13px;
  font-weight: 500;
  color: var(--s-color-base-content-secondary);
  max-width: 200px;
  text-align: center;
  margin-bottom: 14px;
}
</style>
