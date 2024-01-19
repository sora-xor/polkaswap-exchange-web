<template>
  <dialog-base :visible.sync="isVisible">
    <div class="order-book-cancel-dialog">
      <s-icon name="notifications-alert-triangle-24" size="64" />
      <h4>{{ t('orderBook.dialogs.askCancel') }}</h4>
      <s-button type="primary" class="btn s-typography-button--medium" @click="handleCancel">
        <span> {{ t('orderBook.dialogs.cancelAll') }}</span>
      </s-button>
      <s-button type="secondary" class="btn s-typography-button--medium" @click="closeDialog">
        <span> {{ t('orderBook.dialogs.noCancel') }}</span>
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
  },
})
export default class CancelOrders extends Mixins(mixins.DialogMixin, TranslationMixin) {
  handleCancel(): void {
    this.closeDialog();
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
    margin: 0 0 $basic-spacing 0;
  }
}
</style>
