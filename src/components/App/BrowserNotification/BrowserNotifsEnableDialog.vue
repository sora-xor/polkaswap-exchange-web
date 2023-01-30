<template>
  <dialog-base class="browser-notification" :title="t('browserNotificationDialog.title')" :visible.sync="isVisible">
    <div class="browser-notification-dialog">
      <img src="@/assets/img/browser-notification/chrome.png?inline" class="browser-notification-dialog__example" />
      <p class="browser-notification-dialog__info">
        {{ t('browserNotificationDialog.info') }}
      </p>
      <s-button
        type="primary"
        class="s-typography-button--large browser-notification-dialog__btn"
        :loading="loading"
        @click="handleConfirm"
      >
        {{ t('browserNotificationDialog.button') }}
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { state, mutation } from '@/store/decorators';

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class AppBrowserNotifsEnableDialog extends Mixins(
  TranslationMixin,
  mixins.LoadingMixin,
  mixins.DialogMixin
) {
  @state.settings.isBrowserNotificationApiAvailable isBrowserNotificationApiAvailable!: boolean;
  @mutation.settings.setBrowserNotifsAgreement setBrowserNotifsAgreement!: (value: NotificationPermission) => void;
  async handleConfirm(): Promise<void> {
    if (this.isBrowserNotificationApiAvailable) {
      this.closeDialog();
      this.$emit('set-dark-page', true);
      const permission = await Notification.requestPermission();
      this.setBrowserNotifsAgreement(permission);
      this.$emit('set-dark-page', false);
    }
  }
}
</script>

<style lang="scss">
.browser-notification {
  .el-dialog__title {
    margin: auto;
    padding-left: var(--s-size-mini);
  }

  .el-dialog {
    margin-top: 22vh !important;
  }
}
.browser-notification-dialog {
  display: flex;
  flex-direction: column;

  &__info {
    text-align: center;
    margin: $basic-spacing $basic-spacing * 2;
    font-size: 15px;
    font-weight: 300;
  }

  &__btn {
    margin-bottom: $basic-spacing;
  }
}
</style>
