<template>
  <dialog-base :visible.sync="isVisible">
    <div class="order-book-cancel-dialog">
      <s-icon name="notifications-alert-triangle-24" size="64" />
      <h4>{{ t('orderBook.dialog.askCancel') }}</h4>
      <account-confirmation-option with-hint class="confirmation-option" />
      <s-button type="primary" class="btn s-typography-button--medium" :disabled="!isVisible" @click="handleCancel">
        <span> {{ t('orderBook.dialog.cancelAll') }}</span>
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Cancel } from '@/types/orderBook';

@Component({
  components: {
    DialogBase: components.DialogBase,
    NetworkFeeWarning: components.NetworkFeeWarning,
    AccountConfirmationOption: components.AccountConfirmationOption,
  },
})
export default class CancelOrders extends Mixins(mixins.DialogMixin, TranslationMixin) {
  handleCancel(): void {
    this.isVisible = false;
    this.$emit('confirm', Cancel.all);
  }
}
</script>

<style lang="scss">
.order-book-cancel-dialog {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  .s-icon-notifications-alert-triangle-24 {
    color: var(--s-color-status-error);
    margin-bottom: var(--s-size-mini);
    margin-top: -42px;
  }

  h4 {
    font-size: var(--s-font-size-large);
    margin-bottom: $basic-spacing;
    line-height: 130%;
    font-weight: 300;
    text-align: center;
    width: 85%;
  }

  .btn {
    margin-top: $basic-spacing;
    width: 100%;
  }
}
</style>
