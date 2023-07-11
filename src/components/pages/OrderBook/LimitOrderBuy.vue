<template>
  <div>
    <s-tabs class="order-book__tab" v-model="currentTypeTab" type="rounded" @click="handleTabClick">
      <s-tab v-for="tab in OrderBookTabs" :key="tab" :label="t(`orderBook.${tab}`)" :name="tab" />
    </s-tabs>
    <s-button type="primary" class="buy-btn s-typography-button--medium" @click="handleConfirm">
      <span> {{ t(buttonText) }}</span>
    </s-button>
    <book-transaction-details :info-only="false" class="info-line-container" />
  </div>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { getter } from '@/store/decorators';
import { AlertTypeTabs, OrderBookTabs } from '@/types/tabs';

@Component({
  components: {
    BookTransactionDetails: lazyComponent(Components.BookTransactionDetails),
  },
})
export default class LimitOrderBuy extends Mixins(TranslationMixin) {
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  currentTypeTab: OrderBookTabs = OrderBookTabs.Limit;

  readonly OrderBookTabs = OrderBookTabs;

  get buttonText(): string {
    if (!this.isLoggedIn) {
      return 'connectWalletText';
    }

    return 'buy xst';
  }

  handleTabClick(): void {}

  handleConfirm(): void {}
}
</script>

<style lang="scss">
.setup-price-alert {
  @include custom-tabs;

  &__tab {
    margin-bottom: #{$basic-spacing-medium};
  }
}

.buy-btn {
  width: 100%;
  background-color: #34ad87 !important;
}
</style>
