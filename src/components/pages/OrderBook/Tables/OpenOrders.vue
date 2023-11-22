<template>
  <order-table :orders="userLimitOrders" :selectable="isSelectionAllowed" :parent-loading="loadingState" />
</template>

<script lang="ts">
import { OrderBookStatus } from '@sora-substrate/liquidity-proxy';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { getter, state, action } from '@/store/decorators';

import OrderTable from './OrderTable.vue';

import type { OrderBook } from '@sora-substrate/liquidity-proxy';
import type { LimitOrder } from '@sora-substrate/util/build/orderBook/types';

@Component({
  components: {
    OrderTable,
    HistoryPagination: components.HistoryPagination,
  },
})
export default class OpenOrders extends Mixins(TranslationMixin, mixins.LoadingMixin, mixins.FormattedAmountMixin) {
  @state.orderBook.userLimitOrders userLimitOrders!: Array<LimitOrder>;
  @getter.orderBook.currentOrderBook currentOrderBook!: Nullable<OrderBook>;

  // Widget subscription data
  @getter.orderBook.accountAddress private accountAddress!: string;
  @getter.orderBook.orderBookId private orderBookId!: string;
  @getter.settings.nodeIsConnected private nodeIsConnected!: boolean;
  @action.orderBook.subscribeToUserLimitOrders subscribeToUserLimitOrders!: AsyncFnWithoutArgs;
  @action.orderBook.unsubscribeFromUserLimitOrders unsubscribeFromUserLimitOrders!: FnWithoutArgs;

  // Widget subscription creation
  @Watch('orderBookId', { immediate: true })
  @Watch('accountAddress')
  @Watch('nodeIsConnected')
  private async updateSubscription(): Promise<void> {
    await this.withLoading(async () => {
      await this.withParentLoading(async () => {
        await this.subscribeToUserLimitOrders();
      });
    });
  }

  // Widget subscription close
  beforeDestroy(): void {
    this.unsubscribeFromUserLimitOrders();
  }

  get loadingState(): boolean {
    return this.parentLoading || this.loading;
  }

  get isSelectionAllowed(): boolean {
    return !!this.currentOrderBook && this.currentOrderBook.status !== OrderBookStatus.Stop;
  }
}
</script>
