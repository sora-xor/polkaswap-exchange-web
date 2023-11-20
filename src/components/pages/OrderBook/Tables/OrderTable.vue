<template>
  <div>
    <s-table
      v-loading="loadingState"
      class="order-table"
      empty-text="No orders"
      ref="table"
      :data="tableItems"
      :highlight-current-row="false"
      @cell-click="handleSelectRow"
      @selection-change="handleSelectionChange"
    >
      <s-table-column v-if="selectable" type="selection" :selectable="isSelectable" />
      <s-table-column width="94">
        <template #header>
          <span>TIME</span>
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
          <span>PAIR</span>
        </template>
        <template v-slot="{ row }">
          <span class="order-table__pair">{{ row.pair }}</span>
        </template>
      </s-table-column>
      <s-table-column width="65">
        <template #header>
          <span>SIDE</span>
        </template>
        <template v-slot="{ row }">
          <span class="order-table__side">{{ row.side }}</span>
        </template>
      </s-table-column>
      <s-table-column width="126">
        <template #header>
          <span>PRICE</span>
        </template>
        <template v-slot="{ row }">
          <div class="order-table__price">
            <span class="price">{{ row.price }}</span>&nbsp;
            <span>{{ row.quoteAssetSymbol }}</span>
          </div>
        </template>
      </s-table-column>
      <s-table-column width="140">
        <template #header>
          <span>AMOUNT</span>
        </template>
        <template v-slot="{ row }">
          <div class="order-table__amount">
            <span class="amount">{{ row.amount }}/{{ row.originalAmount }}</span>&nbsp;
            <span>{{ row.baseAssetSymbol }}</span>
          </div>
        </template>
      </s-table-column>
      <s-table-column width="98">
        <template #header>
          <span>% FILLED</span>
        </template>
        <template v-slot="{ row }"> {{ row.filled }}% </template>
      </s-table-column>
      <s-table-column width="94">
        <template #header>
          <span>LIFETIME</span>
        </template>
        <template v-slot="{ row }">
          <div class="order-table__date">
            <div>{{ row.expires.date }}</div>
            <div>{{ row.expires.time }}</div>
          </div>
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
          <span>TOTAL</span>
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
import { OrderStatus } from '@/types/orderBook';
import type { OrderData } from '@/types/orderBook';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    HistoryPagination: components.HistoryPagination,
  },
})
export default class OrderTable extends Mixins(TranslationMixin, ScrollableTableMixin) {
  @Prop({ default: () => [], type: Array }) readonly orders!: OrderData[];
  @Prop({ default: false, type: Boolean }) readonly selectable!: boolean;

  pageAmount = 6;

  get preparedItems(): any {
    return this.orders.map((order) => {
      const { originalAmount, amount, price, side, id, orderBookId, time, status, expiresAt } = order;
      const { base, quote } = orderBookId;
      const baseAsset = this.getAsset(base) as AccountAsset;
      const quoteAsset = this.getAsset(quote) as AccountAsset;
      const baseAssetSymbol = baseAsset.symbol;
      const quoteAssetSymbol = quoteAsset.symbol;
      const pair = `${baseAssetSymbol}-${quoteAssetSymbol}`;
      const created = dayjs(time);
      const expires = dayjs(expiresAt);

      const proportion = amount.div(originalAmount).mul(FPNumber.HUNDRED);
      const filled = FPNumber.HUNDRED.sub(proportion).toFixed(2);
      const total = this.getFPNumberFiatAmountByFPNumber(originalAmount.mul(price), quoteAsset) ?? FPNumber.ZERO;

      const row = {
        id,
        orderBookId,
        originalAmount: originalAmount.toLocaleString(),
        amount: originalAmount.sub(amount).toLocaleString(),
        filled: Number(filled),
        baseAssetSymbol,
        quoteAssetSymbol,
        pair,
        price: price.toLocaleString(),
        total: total.toLocaleString(),
        side,
        status: status ?? OrderStatus.Active,
        created: { date: created.format('M/DD'), time: created.format('HH:mm:ss') },
        expires: { date: expires.format('M/DD'), time: expires.format('HH:mm:ss') },
      };

      return row;
    });
  }

  isSelectable(): boolean {
    return this.selectable;
  }

  handleSelectRow(row): void {
    if (!this.selectable) return;

    this.tableComponent?.toggleRowSelection(row);
  }

  handleSelectionChange(rows): void {
    if (!this.selectable) return;

    this.$emit('cancelled-orders', rows);
  }
}
</script>

<style lang="scss">
.order-table {
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
    height: auto !important;
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
