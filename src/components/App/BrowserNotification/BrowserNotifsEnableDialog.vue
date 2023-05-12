<template>
  <dialog-base class="browser-notification" :title="t('browserNotificationDialog.title')" :visible.sync="isVisible">
    <div class="browser-notification-dialog">
      <s-image src="browser-notification/chrome.png" lazy fit="cover" draggable="false" class="unselectable" />
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
  @state.settings.isBrowserNotificationApiAvailable private isAvailable!: boolean;
  @mutation.settings.setBrowserNotifsAgreement private setNotifsAgreement!: (value: NotificationPermission) => void;

  async handleConfirm(): Promise<void> {
    if (this.isAvailable) {
      this.closeDialog();
      this.$emit('set-dark-page', true);
      const permission = await Notification.requestPermission();
      this.setNotifsAgreement(permission);
      this.$emit('set-dark-page', false);
    }
  }
}
</script>

<style lang="scss" scoped>
.browser-notification-dialog {
  @include browser-notification-dialog;
}
</style>
