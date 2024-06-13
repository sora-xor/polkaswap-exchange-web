<template>
  <order-table :orders="filtered" :parent-loading="loading" />
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { fetchOrderBookAccountOrders } from '@/indexer/queries/orderBook';
import { getter, state } from '@/store/decorators';
import { Filter, OrderStatus } from '@/types/orderBook';
import type { OrderData } from '@/types/orderBook';

import OrderTable from './OrderTable.vue';

import type { OrderBook } from '@sora-substrate/liquidity-proxy';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    OrderTable,
  },
})
export default class OpenOrders extends Mixins(TranslationMixin, mixins.LoadingMixin, mixins.FormattedAmountMixin) {
  @Prop({ default: '', type: String }) filter!: string;

  @state.wallet.account.address accountAddress!: string;

  @getter.orderBook.currentOrderBook currentOrderBook!: Nullable<OrderBook>;
  @getter.assets.assetDataByAddress public getAsset!: (addr?: string) => Nullable<RegisteredAccountAsset>;

  public orders: OrderData[] = [];

  mounted(): void {
    this.fetchData();
  }

  get filtered(): OrderData[] {
    if (this.filter !== Filter.executed) return this.orders;

    return this.orders.filter((item) => item.status === OrderStatus.Filled);
  }

  private async fetchData(): Promise<void> {
    if (!this.accountAddress) return;

    await this.withLoading(async () => {
      const data = await fetchOrderBookAccountOrders(this.accountAddress, this.currentOrderBook?.orderBookId);
      this.orders = data ?? [];
    });
  }
}
</script>
