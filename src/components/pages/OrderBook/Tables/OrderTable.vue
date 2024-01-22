<template>
  <div>
    <s-table
      v-loading="loadingState"
      class="order-table"
      ref="table"
      :empty-text="t('orderBook.orderTable.noOrders')"
      :data="tableItems"
      :highlight-current-row="false"
      @cell-click="handleSelectRow"
      @selection-change="handleSelectionChange"
    >
      <s-table-column v-if="selectable" type="selection" :selectable="isSelectable" />
      <s-table-column width="88">
        <template #header>
          <span>{{ t('orderBook.orderTable.time') }}</span>
        </template>
        <template v-slot="{ row }">
          <div class="order-table__date">
            <div>{{ row.created.date }}</div>
            <div>{{ row.created.time }}</div>
          </div>
        </template>
      </s-table-column>
      <s-table-column width="126">
        <template #header>
          <span>{{ t('orderBook.orderTable.pair') }}</span>
        </template>
        <template v-slot="{ row }">
          <span class="order-table__pair">{{ row.pair }}</span>
        </template>
      </s-table-column>
      <s-table-column width="62">
        <template #header>
          <span>{{ t('orderBook.orderTable.side') }}</span>
        </template>
        <template v-slot="{ row }">
          <span class="order-table__side">{{ row.side }}</span>
        </template>
      </s-table-column>
      <s-table-column width="126">
        <template #header>
          <span>{{ t('orderBook.price') }}</span>
        </template>
        <template v-slot="{ row }">
          <div class="order-table__price">
            <span class="price">{{ getString(row.price) }}</span>
            <span>{{ row.quoteAssetSymbol }}</span>
          </div>
        </template>
      </s-table-column>
      <s-table-column width="180">
        <template #header>
          <span>{{ t('orderBook.amount') }}</span>
        </template>
        <template v-slot="{ row }">
          <div class="order-table__amount">
            <span class="amount">{{ getString(row.amount) }}/{{ getString(row.originalAmount) }}</span>
            <span>{{ row.baseAssetSymbol }}</span>
          </div>
        </template>
      </s-table-column>
      <s-table-column width="84">
        <template #header>
          <span>% {{ t('orderBook.orderTable.filled') }}</span>
        </template>
        <template v-slot="{ row }"> {{ row.filled }}% </template>
      </s-table-column>
      <s-table-column width="94">
        <template #header>
          <span>{{ t('orderBook.orderTable.lifetime') }}</span>
        </template>
        <template v-slot="{ row }">
          <div class="order-table__date">
            <div>{{ row.expires }}</div>
          </div>
        </template>
      </s-table-column>
      <s-table-column width="93">
        <template #header>
          <span>{{ t('orderBook.tradingPair.status') }}</span>
        </template>
        <template v-slot="{ row }">
          <span class="order-table__status">{{ row.status }}</span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>{{ t('orderBook.total') }}</span>
        </template>
        <template v-slot="{ row }">
          <span class="order-table__total">${{ row.total }}</span>
        </template>
      </s-table-column>
    </s-table>
    <div class="order-table__pagination">
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
import { FPNumber } from '@sora-substrate/util';
import { components } from '@soramitsu/soraneo-wallet-web';
import dayjs from 'dayjs';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import ScrollableTableMixin from '@/components/mixins/ScrollableTableMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { getter, mutation } from '@/store/decorators';
import { OrderStatus } from '@/types/orderBook';
import type { OrderData } from '@/types/orderBook';

import type { LimitOrder } from '@sora-substrate/util/build/orderBook/types';
import type { WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';

type OrderDataUI = Omit<OrderData, 'owner' | 'lifespan' | 'time' | 'expiresAt'>[];

@Component({
  components: {
    HistoryPagination: components.HistoryPagination,
  },
})
export default class OrderTable extends Mixins(TranslationMixin, ScrollableTableMixin) {
  @mutation.orderBook.setOrdersToBeCancelled setOrdersToBeCancelled!: (orders: LimitOrder[]) => void;

  @getter.wallet.account.assetsDataTable assetsDataTable!: WALLET_TYPES.AssetsTable;

  @Prop({ default: () => [], type: Array }) readonly orders!: OrderData[];
  @Prop({ default: false, type: Boolean }) readonly selectable!: boolean;

  pageAmount = 6;

  get preparedItems(): OrderDataUI {
    return this.orders.map((order: OrderData) => {
      const { originalAmount, amount, price, side, id, orderBookId, time, status } = order;
      const { base, quote } = orderBookId;
      const baseAsset = this.assetsDataTable[base] || {};
      const quoteAsset = this.assetsDataTable[quote] || {};
      const baseAssetSymbol = baseAsset?.symbol;
      const quoteAssetSymbol = quoteAsset?.symbol;
      const pair = `${baseAssetSymbol}-${quoteAssetSymbol}`;
      const created = dayjs(time);

      const proportion = amount.div(originalAmount).mul(FPNumber.HUNDRED);
      const filled = FPNumber.HUNDRED.sub(proportion).toFixed(2);
      const total = this.getFPNumberFiatAmountByFPNumber(originalAmount.mul(price), quoteAsset) ?? FPNumber.ZERO;

      const row = {
        id,
        orderBookId,
        originalAmount: originalAmount,
        amount: originalAmount.sub(amount),
        filled: Number(filled),
        baseAssetSymbol,
        quoteAssetSymbol,
        pair,
        price: price,
        total: total.dp(4).toLocaleString(),
        side,
        status: status ?? OrderStatus.Active,
        created: { date: created.format('M/DD'), time: created.format('HH:mm:ss') },
        expires: this.t('orderBook.month'),
      };

      return row;
    });
  }

  getString(value: FPNumber): string {
    return value.toLocaleString();
  }

  isSelectable(): boolean {
    return this.selectable;
  }

  handleSelectRow(row): void {
    if (!this.selectable) return;

    this.tableComponent?.toggleRowSelection(row);
  }

  handleSelectionChange(rows: LimitOrder[]): void {
    if (!this.selectable) return;

    this.setOrdersToBeCancelled(rows);
  }
}
</script>

<style lang="scss">
.order-table {
  font-size: var(--s-font-size-mini);

  .scrollable-table {
    height: 100%;
    @include scrollbar();
  }

  .el-table__header-wrapper {
    background-color: rgba(231, 218, 221, 0.35);
    th {
      background-color: rgba(231, 218, 221, 0.35);
      color: var(--s-color-base-content-secondary);
    }
  }
  .el-table__body-wrapper {
    background-color: var(--s-color-utility-surface);
    height: 400px;

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

  .order-table {
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
        font-weight: 550;
        margin-right: 2px;
      }
    }

    &__amount {
      .amount {
        font-weight: 550;
        margin-right: 2px;
      }
    }

    &__status {
      text-transform: uppercase;
      font-size: var(--s-font-size-extra-mini);
    }

    &__total {
      color: var(--s-color-fiat-value);
      font-family: var(--s-font-family-default);
      line-height: var(--s-line-height-medium);
      letter-spacing: var(--s-letter-spacing-small);
      font-weight: 400;
    }
  }

  &__pagination {
    margin: 0 $basic-spacing;
    padding-bottom: $basic-spacing;
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
