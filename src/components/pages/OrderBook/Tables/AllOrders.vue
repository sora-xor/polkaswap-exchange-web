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
          <span>{{ row.price }}</span>&nbsp;
          <span>{{ row.quoteAssetSymbol }}</span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>Amount</span>
        </template>
        <template v-slot="{ row }">
          <span>{{ row.amount }}</span>&nbsp;
          <span>{{ row.baseAssetSymbol }}</span>
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
      <s-table-column>
        <template #header>
          <span>Total</span>
        </template>
        <template v-slot="{ row }">
          <span>${{ row.total }}</span>
        </template>
      </s-table-column>
    </s-table>
  </div>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import dayjs from 'dayjs';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { fetchOrderBookAccountOrders } from '@/indexer/queries/orderBook';
import { getter } from '@/store/decorators';
import { Filter } from '@/types/orderBook';
import type { OrderData } from '@/types/orderBook';

import type { AccountAsset, RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';

@Component
export default class OpenOrders extends Mixins(TranslationMixin, mixins.LoadingMixin, mixins.FormattedAmountMixin) {
  @Prop({ default: '', type: String }) filter!: string;
  @Prop({ default: false, type: Boolean }) currentBook!: boolean;

  @getter.orderBook.baseAsset baseAsset!: AccountAsset;
  @getter.orderBook.quoteAsset quoteAsset!: AccountAsset;
  @getter.orderBook.accountAddress accountAddress!: string;
  @getter.assets.assetDataByAddress public getAsset!: (addr?: string) => Nullable<RegisteredAccountAsset>;

  public orders: OrderData[] = [];

  mounted(): void {
    this.fetchData();
  }

  get items() {
    return this.orders.map((order) => {
      const { amount, price, side, orderBookId, time, originalAmount, status } = order;

      const { base, quote } = orderBookId;
      const baseAsset = this.getAsset(base) as RegisteredAccountAsset;
      const quoteAsset = this.getAsset(quote) as RegisteredAccountAsset;
      const baseAssetSymbol = baseAsset.symbol;
      const quoteAssetSymbol = quoteAsset.symbol;
      const pair = `${baseAssetSymbol}-${quoteAssetSymbol}`;
      const date = dayjs(time);

      const proportion = amount.div(originalAmount).mul(FPNumber.HUNDRED);
      const filled = proportion.toFixed(2);
      const total = this.getFPNumberFiatAmountByFPNumber(amount.mul(price), quoteAsset) ?? FPNumber.ZERO;

      return {
        date: date.format('M/DD HH:mm:ss'),
        baseAssetSymbol,
        quoteAssetSymbol,
        pair,
        side,
        price: price.toLocaleString(),
        amount: originalAmount.toLocaleString(),
        filled,
        status,
        total: total.toFixed(4),
      };
    });
  }

  get filtered() {
    if (this.filter !== Filter.executed) return this.items;

    return this.items.filter((item) => item.status === 'Filled');
  }

  private async fetchData(): Promise<void> {
    if (!this.accountAddress) return;

    const id =
      this.currentBook && this.baseAsset && this.quoteAsset
        ? { dexId: 0, base: this.baseAsset.address, quote: this.quoteAsset.address }
        : undefined;

    await this.withLoading(async () => {
      const data = await fetchOrderBookAccountOrders(this.accountAddress, id);
      this.orders = data ?? [];
    });
  }
}
</script>

<style lang="scss"></style>
