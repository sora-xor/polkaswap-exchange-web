<template>
  <div>
    <s-table
      v-loading="loading"
      class="limit-order-table"
      empty-text="No open orders"
      ref="multipleOrdersTable"
      :data="openOrders"
      :highlight-current-row="false"
      @cell-click="handleSelectRow"
      @selection-change="handleSelectionChange"
    >
      <s-table-column type="selection" :selectable="isSelectionAllowed" />
      <s-table-column :width="'70'">
        <template #header>
          <span>TIME</span>
        </template>
        <template v-slot="{ row }">
          <div class="limit-order-table__date">
            <div>{{ row.date.date }}</div>
            <div>{{ row.date.time }}</div>
          </div>
        </template>
      </s-table-column>
      <s-table-column :width="'126'">
        <template #header>
          <span>PAIR</span>
        </template>
        <template v-slot="{ row }">
          <span class="limit-order-table__pair">{{ row.pair }}</span>
        </template>
      </s-table-column>
      <s-table-column :width="'65'">
        <template #header>
          <span>SIDE</span>
        </template>
        <template v-slot="{ row }">
          <span class="limit-order-table__side">{{ row.side }}</span>
        </template>
      </s-table-column>
      <s-table-column :width="'126'">
        <template #header>
          <span>PRICE</span>
        </template>
        <template v-slot="{ row }">
          <div class="limit-order-table__price">
            <span class="price">{{ row.price }}</span>&nbsp;
            <span>{{ row.quoteAssetSymbol }}</span>
          </div>
        </template>
      </s-table-column>
      <s-table-column :width="'140'">
        <template #header>
          <span>AMOUNT</span>
        </template>
        <template v-slot="{ row }">
          <div class="limit-order-table__amount">
            <span class="amount">{{ row.amount }}/{{ row.originalAmount }}</span>&nbsp;
            <span>{{ row.baseAssetSymbol }}</span>
          </div>
        </template>
      </s-table-column>
      <s-table-column :width="'98'">
        <template #header>
          <span>% FILLED</span>
        </template>
        <template v-slot="{ row }"> {{ row.filled }}% </template>
      </s-table-column>
      <s-table-column :width="'94'">
        <template #header>
          <span>LIFETIME</span>
        </template>
        <template v-slot="{ row }">
          <span>{{ row.expired }}</span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>TOTAL</span>
        </template>
        <template v-slot="{ row }">
          <span class="limit-order-table__total">${{ row.total }}</span>
        </template>
      </s-table-column>
    </s-table>
    <div class="limit-order-table__pagination">
      <history-pagination
        v-if="total"
        :current-page="currentPage"
        :page-amount="pageAmount"
        :total="total"
        :last-page="lastPage"
        :loading="loadingState"
        @pagination-click="handlePaginationClick"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { OrderBookStatus } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/util';
import { WALLET_CONSTS, components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { getter, state, action } from '@/store/decorators';

import type { OrderBook } from '@sora-substrate/liquidity-proxy';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { LimitOrder } from '@sora-substrate/util/build/orderBook/types';

@Component({
  components: {
    HistoryPagination: components.HistoryPagination,
  },
})
export default class OpenOrders extends Mixins(
  TranslationMixin,
  mixins.LoadingMixin,
  mixins.FormattedAmountMixin,
  mixins.PaginationSearchMixin
) {
  @state.orderBook.userLimitOrders userLimitOrders!: Array<LimitOrder>;

  @getter.orderBook.currentOrderBook currentOrderBook!: Nullable<OrderBook>;
  @getter.assets.assetDataByAddress getAsset!: (addr?: string) => Nullable<AccountAsset>;

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

  pageAmount = 6;

  get total(): number {
    return this.openOrders.length;
  }

  get openOrders(): any {
    return this.userLimitOrders.map((limitOrder) => {
      const { amount, price, side, id, orderBookId, time, originalAmount } = limitOrder;

      const baseAsset = this.getAsset(orderBookId.base) as AccountAsset;
      const quoteAsset = this.getAsset(orderBookId.quote) as AccountAsset;
      const baseAssetSymbol = baseAsset.symbol;
      const quoteAssetSymbol = quoteAsset.symbol;
      const pair = `${baseAssetSymbol}-${quoteAssetSymbol}`;
      const date = new Date(time);

      const proportion = amount.div(originalAmount).mul(FPNumber.HUNDRED);
      const filled = FPNumber.HUNDRED.sub(proportion).toFixed(2);
      const total = this.getFPNumberFiatAmountByFPNumber(amount.mul(price), quoteAsset) ?? FPNumber.ZERO;

      const row = {
        limitOrderId: id,
        orderBookId,
        originalAmount: originalAmount.toLocaleString(),
        amount: originalAmount.sub(amount).toLocaleString(),
        filled: Number(filled),
        baseAssetSymbol,
        quoteAssetSymbol,
        pair,
        price,
        side,
        expired: 'month',
        total: total.toLocaleString(),
        date: { date: `${date.getUTCMonth() + 1}/${date.getUTCDate()}`, time: date.toLocaleTimeString() },
      };

      return row;
    });
  }

  handlePaginationClick(button: WALLET_CONSTS.PaginationButton): void {
    let current = 1;

    switch (button) {
      case WALLET_CONSTS.PaginationButton.Prev:
        current = this.currentPage - 1;
        break;
      case WALLET_CONSTS.PaginationButton.Next:
        current = this.currentPage + 1;
        break;
      case WALLET_CONSTS.PaginationButton.First:
        current = 1;
        break;
      case WALLET_CONSTS.PaginationButton.Last:
        current = this.lastPage;
    }

    this.currentPage = current;
  }

  get loadingState(): boolean {
    return this.parentLoading || this.loading;
  }

  handleSelectRow(row): void {
    if (this.$refs.multipleOrdersTable) {
      (this.$refs.multipleOrdersTable as any).toggleRowSelection(row);
    }
  }

  handleSelectionChange(rows): void {
    this.$emit('cancelled-orders', rows);
  }

  isSelectionAllowed(): boolean {
    return !!this.currentOrderBook && this.currentOrderBook.status !== OrderBookStatus.Stop;
  }
}
</script>

<style lang="scss">
.limit-order-table {
  // border-bottom-left-radius: var(--s-border-radius-small);
  // border-bottom-right-radius: var(--s-border-radius-small);

  font-size: 12px;

  .el-table__header-wrapper {
    background-color: rgba(42, 23, 31, 0.04);
    th {
      background-color: rgba(42, 23, 31, 0.04);
      color: var(--s-color-base-content-secondary);
    }
  }
  .el-table__body-wrapper {
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }

    background-color: var(--s-color-utility-surface);

    .el-table__row {
      background-color: var(--s-color-utility-surface);
    }

    .el-checkbox__inner {
      border-radius: 4px;
    }

    .el-table__empty-text {
      color: var(--s-color-base-content-secondary);
      font-size: 20px;
    }
  }

  .limit-order-table {
    &__date {
      color: var(--s-color-base-content-secondary);
      font-size: 12.5px;
    }

    &__pair {
      font-weight: 500;
    }

    &__side {
      text-transform: uppercase;
      font-weight: 500;
    }

    &__price {
      .price {
        font-weight: 500;
      }
    }

    &__amount {
      .amount {
        font-weight: 500;
      }
    }

    &__total {
      color: var(--s-color-fiat-value);
      font-family: var(--s-font-family-default);
      font-weight: 400;
      line-height: var(--s-line-height-medium);
      letter-spacing: var(--s-letter-spacing-small);
    }
  }

  .el-table__body-wrapper {
    height: 400px;
  }

  &__pagination {
    margin: 0 16px;
    padding-bottom: 16px;
  }
}

[design-system-theme='dark'] {
  .el-table__header-wrapper {
    background-color: var(--s-color-utility-surface);
    th {
      background-color: var(--s-color-utility-surface);
    }
  }
}
</style>
