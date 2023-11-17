<template>
  <div>
    <s-table
      v-loading="parentLoading"
      class="order-table"
      empty-text="No orders"
      ref="multipleOrdersTable"
      :data="items"
      :highlight-current-row="false"
      @cell-click="handleSelectRow"
      @selection-change="handleSelectionChange"
    >
      <s-table-column v-if="selectable" type="selection" :selectable="isSelectable" />
      <s-table-column :width="'70'">
        <template #header>
          <span>TIME</span>
        </template>
        <template v-slot="{ row }">
          <div class="order-table__date">
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
          <span class="order-table__pair">{{ row.pair }}</span>
        </template>
      </s-table-column>
      <s-table-column :width="'65'">
        <template #header>
          <span>SIDE</span>
        </template>
        <template v-slot="{ row }">
          <span class="order-table__side">{{ row.side }}</span>
        </template>
      </s-table-column>
      <s-table-column :width="'126'">
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
      <s-table-column :width="'140'">
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
        :loading="parentLoading"
        @pagination-click="handlePaginationClick"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { WALLET_CONSTS, components, mixins } from '@soramitsu/soraneo-wallet-web';
import dayjs from 'dayjs';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { getter } from '@/store/decorators';
import { OrderStatus } from '@/types/orderBook';
import type { OrderData } from '@/types/orderBook';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

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
  @Prop({ default: () => [], type: Array }) readonly orders!: OrderData[];
  @Prop({ default: false, type: Boolean }) readonly selectable!: boolean;

  @getter.assets.assetDataByAddress getAsset!: (addr?: string) => Nullable<AccountAsset>;

  pageAmount = 6;

  get total(): number {
    return this.items.length;
  }

  get items(): any {
    return this.orders.map((order) => {
      const { originalAmount, amount, price, side, id, orderBookId, time, status } = order;
      const { base, quote } = orderBookId;
      const baseAsset = this.getAsset(base) as AccountAsset;
      const quoteAsset = this.getAsset(quote) as AccountAsset;
      const baseAssetSymbol = baseAsset.symbol;
      const quoteAssetSymbol = quoteAsset.symbol;
      const pair = `${baseAssetSymbol}-${quoteAssetSymbol}`;
      const date = dayjs(time);

      const proportion = amount.div(originalAmount).mul(FPNumber.HUNDRED);
      const filled = FPNumber.HUNDRED.sub(proportion).toFixed(2);
      const total = this.getFPNumberFiatAmountByFPNumber(originalAmount.mul(price), quoteAsset) ?? FPNumber.ZERO;

      const row = {
        id,
        originalAmount: originalAmount.toLocaleString(),
        amount: originalAmount.sub(amount).toLocaleString(),
        filled: Number(filled),
        baseAssetSymbol,
        quoteAssetSymbol,
        pair,
        price: price.toLocaleString(),
        total: total.toLocaleString(),
        side,
        expired: 'month',
        status: status ?? OrderStatus.Active,
        date: { date: date.format('M/DD'), time: date.format('HH:mm:ss') },
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

  isSelectable(): boolean {
    return this.selectable;
  }

  handleSelectRow(row): void {
    if (!this.selectable) return;

    if (this.$refs.multipleOrdersTable) {
      (this.$refs.multipleOrdersTable as any).toggleRowSelection(row);
    }
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
