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
        @click="agree"
      >
        {{ t('browserNotificationDialog.agree') }}
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import { app } from '../../../consts';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class AppBrowserNotifsBlockedDialog extends Mixins(
  TranslationMixin,
  mixins.DialogMixin,
  mixins.LoadingMixin
) {
  app = app;

  agree(): void {
    this.closeDialog();
  }
}
</script>
