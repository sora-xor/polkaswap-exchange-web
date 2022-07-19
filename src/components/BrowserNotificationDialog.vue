<template>
  <dialog-base class="browser-notification" :title="t('browserNotificationDialog.title')" :visible.sync="isVisible">
    <div class="browser-notification-dialog">
      <!-- <img src="@/assets/img/mobile/sora-app-left.png?inline" class="browser-notification-dialog__example" /> -->
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

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class ConfirmBridgeTransactionDialog extends Mixins(
  TranslationMixin,
  mixins.LoadingMixin,
  mixins.DialogMixin
) {
  handleConfirm(): void {
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
