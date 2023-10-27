<template>
  <dialog-base :visible.sync="isVisible">
    <div class="order-book-cancel-dialog">
      <s-icon name="notifications-alert-triangle-24" size="64" />
      <h4>Are you sure you want to cancel all of your open orders?</h4>
      <s-button type="primary" class="btn s-typography-button--medium" @click="handleCancel">
        <span> {{ 'Yes, cancel all' }}</span>
      </s-button>
      <s-button type="secondary" class="btn s-typography-button--medium" @click="closeDialog">
        <span> {{ 'No, don’t cancel it' }}</span>
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

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
    margin-bottom: 24px;
    margin-top: -42px;
  }

  h4 {
    font-size: 24px;
    font-weight: 300;
    line-height: 130%;
    text-align: center;
    margin-bottom: 16px;
    width: 85%;
  }

  .btn {
    margin: 0 0 16px 0;
  }
}
</style>
