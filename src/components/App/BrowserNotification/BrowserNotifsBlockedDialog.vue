<template>
  <dialog-base class="browser-notification" :title="t('browserNotificationDialog.title')" :visible.sync="isVisible">
    <div class="browser-notification-dialog">
      <p class="browser-notification-dialog__info">
        {{ t('browserNotificationDialog.notificationBlocked') }}
      </p>
      <s-button
        type="primary"
        class="s-typography-button--large browser-notification-dialog__btn"
        :loading="loading"
        @click="goToInstructions"
      >
        {{ t('browserNotificationDialog.goToSettings') }}
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { mixins, components } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class BrowserNotifsBlockedDialog extends Mixins(
  TranslationMixin,
  mixins.DialogMixin,
  mixins.LoadingMixin
) {
  async goToInstructions(): Promise<void> {
    window.open(
      'https://support.humblebundle.com/hc/ru/articles/360008513933-Enabling-and-Disabling-Browser-Notifications-in-Various-Browsers'
    );
    this.closeDialog();
  }
}
</script>
