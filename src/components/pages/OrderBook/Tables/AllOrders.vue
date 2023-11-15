<template>
  <div>
    <s-table v-loading="loading" class="limit-order-table" :data="filtered" :highlight-current-row="false">
      <s-table-column>
        <template #header>
          <span>Time</span>
        </template>
        <template v-slot="{ row }">
          <div>{{ row.date }}</div>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>Pair</span>
        </template>
        <template v-slot="{ row }">
          <div>
            <div>{{ row.pair }}</div>
          </div>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>Side</span>
        </template>
        <template v-slot="{ row }">
          <div>
            <div>{{ row.side }}</div>
          </div>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>Price</span>
        </template>
        <template v-slot="{ row }">
          <span>{{ row.price }}</span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>Amount</span>
        </template>
        <template v-slot="{ row }">
          <span>{{ row.amount }}</span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>Filled</span>
        </template>
        <template v-slot="{ row }">
          <span>{{ row.filled }}</span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>Status</span>
        </template>
        <template v-slot="{ row }">
          <span>{{ row.status }}</span>
        </template>
      </s-table-column>
    </s-table>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import dayjs from 'dayjs';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { fetchOrderBookAccountOrders } from '@/indexer/queries/orderBook';
import { getter } from '@/store/decorators';
import { Filter } from '@/types/orderBook';
import type { OrderData } from '@/types/orderBook';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

@Component
export default class OpenOrders extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @Prop({ default: '', type: String }) filter!: string;

  @getter.orderBook.baseAsset baseAsset!: AccountAsset;
  @getter.orderBook.quoteAsset quoteAsset!: AccountAsset;
  @getter.orderBook.accountAddress accountAddress!: string;

  public orders: OrderData[] = [];

  async mounted(): Promise<void> {
    if (!(this.baseAsset && this.quoteAsset && this.accountAddress)) {
      this.orders = [];
    } else {
      await this.withLoading(async () => {
        this.orders = await fetchOrderBookAccountOrders(this.accountAddress);
      });
    }
  }

  get items() {
    return this.orders.map((order) => {
      const date = dayjs(order.time);
      const { baseAsset, quoteAsset } = this;

      return {
        date: date.format('M/DD HH:mm:ss'),
        pair: `${baseAsset.symbol}-${quoteAsset.symbol}`,
        side: order.side,
        price: order.price.toLocaleString(),
        amount: order.originalAmount.toLocaleString(),
        filled: order.amount.toLocaleString(),
        status: order.status,
      };
    });
  }

  get filtered() {
    if (this.filter !== Filter.executed) return this.items;

    return this.items.filter((item) => item.status === 'Filled');
  }
}
</script>

<style lang="scss"></style>
