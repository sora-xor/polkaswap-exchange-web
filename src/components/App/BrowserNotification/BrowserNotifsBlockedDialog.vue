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
        @click="goToSettings"
      >
        {{ t('browserNotificationDialog.goToSettings') }}
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { detect } from 'detect-browser';
import { Component, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import DialogBase from '../../DialogBase.vue';
import DialogMixin from '../../mixins/DialogMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component({
  components: {
    DialogBase,
  },
})
export default class BrowserNotifsBlockedDialog extends Mixins(DialogMixin, TranslationMixin, mixins.LoadingMixin) {
  async goToSettings(): Promise<void> {
    window.open(
      'https://support.humblebundle.com/hc/ru/articles/360008513933-Enabling-and-Disabling-Browser-Notifications-in-Various-Browsers'
    );
    this.closeDialog();
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
    margin: 16px 32px;
    font-size: 15px;
    font-weight: 300;
  }

  &__btn {
    margin-bottom: 16px;
  }
}
</style>
