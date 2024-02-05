<template>
  <div class="s-flex-column order-table__main">
    <span class="h4 order-table__empty" v-if="isEmpty">No orders. Create your first order!</span>
    <s-table
      v-show="!isEmpty /* v-show cuz SScrollbar is set during the mounting */"
      v-loading="loadingState"
      class="order-table"
      ref="table"
      :row-key="rowKey"
      :empty-text="t('orderBook.orderTable.noOrders')"
      :data="tableItems"
      :highlight-current-row="false"
      @cell-click="handleSelectRow"
      @selection-change="handleSelectionChange"
      @select="handleSelect"
    >
      <s-table-column v-if="selectable" type="selection" />
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
          <span class="order-table__side" :class="[{ buy: row.side === PriceVariant.Buy }]">{{ row.side }}</span>
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
        @pagination-click="handlePagination"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/util';
import { components, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import dayjs from 'dayjs';
import debounce from 'lodash/debounce';
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';

import ScrollableTableMixin from '@/components/mixins/ScrollableTableMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { getter } from '@/store/decorators';
import { OrderStatus } from '@/types/orderBook';
import type { OrderData } from '@/types/orderBook';

import type { LimitOrder } from '@sora-substrate/util/build/orderBook/types';
import type { WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';
import type { OrderStatus as OrderStatusType } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

type OrderDataUI = Omit<OrderData, 'owner' | 'lifespan' | 'time' | 'expiresAt'>[];

@Component({
  components: {
    HistoryPagination: components.HistoryPagination,
  },
})
export default class OrderTable extends Mixins(TranslationMixin, ScrollableTableMixin) {
  readonly PriceVariant = PriceVariant;

  @getter.wallet.account.assetsDataTable assetsDataTable!: WALLET_TYPES.AssetsTable;

  @Prop({ default: () => [], type: Array }) readonly orders!: OrderData[];
  @Prop({ default: false, type: Boolean }) readonly selectable!: boolean;
  @Prop({ default: 6, type: Number }) declare readonly pageAmount: number;

  private syncTableItems(): void {
    this.$emit('sync', this.tableItems);
  }

  @Watch('tableItems', { deep: true, immediate: true })
  private syncTableItemsDebounced = debounce(this.syncTableItems, 250);

  get isEmpty(): boolean {
    return !this.orders?.length;
  }

  get rowKey() {
    return this.selectable ? 'id' : undefined;
  }

  get preparedItems(): OrderDataUI {
    return this.orders.map((order: OrderData) => {
      const { originalAmount, amount, price, side, id, orderBookId, time, status, lifespan } = order;
      const { base, quote } = orderBookId;
      const baseAsset = this.assetsDataTable[base] || {};
      const quoteAsset = this.assetsDataTable[quote] || {};
      const baseAssetSymbol = baseAsset?.symbol;
      const quoteAssetSymbol = quoteAsset?.symbol;
      const pair = `${baseAssetSymbol}-${quoteAssetSymbol}`;
      const created = dayjs(time);
      const expires = dayjs.duration(lifespan);

      const proportion = amount.div(originalAmount).mul(FPNumber.HUNDRED);
      const filled = FPNumber.HUNDRED.sub(proportion).toFixed(2);
      const total = this.getFPNumberFiatAmountByFPNumber(originalAmount.mul(price), quoteAsset) ?? FPNumber.ZERO;

      const row = {
        id,
        orderBookId,
        originalAmount: originalAmount.dp(2),
        amount: originalAmount.sub(amount).dp(2),
        filled: Number(filled),
        baseAssetSymbol,
        quoteAssetSymbol,
        pair,
        price: price.dp(2),
        total: total.dp(2).toLocaleString(),
        side,
        status: this.getStatusTranslation(status as OrderStatusType),
        created: { date: created.format('M/DD'), time: created.format('HH:mm:ss') },
        expires: expires.format('D[D]'),
      };

      return row;
    });
  }

  getStatusTranslation(status: OrderStatusType | undefined): string {
    switch (status) {
      case OrderStatus.Active:
        return this.t('orderBook.orderStatus.active');
      case OrderStatus.Aligned:
      case OrderStatus.Canceled:
        return this.t('orderBook.orderStatus.canceled');
      case OrderStatus.Expired:
        return this.t('orderBook.orderStatus.expired');
      case OrderStatus.Filled:
        return this.t('orderBook.orderStatus.filled');
      default:
        return this.t('orderBook.orderStatus.active');
    }
  }

  getString(value: FPNumber): string {
    return value.toLocaleString();
  }

  handleSelect(rows: LimitOrder[]): void {
    if (!this.selectable) return;

    this.$emit('select', rows);
  }

  handleSelectRow(row: LimitOrder): void {
    if (!this.selectable) return;

    this.$emit('cell-click', row);
  }

  handleSelectionChange(rows: LimitOrder[]): void {
    if (!this.selectable) return;

    this.$emit('selection-change', rows);
  }

  async handlePagination(button: WALLET_CONSTS.PaginationButton): Promise<void> {
    this.handlePaginationClick(button);
    await this.$nextTick(); // For this.tableItems to be loaded
    this.$emit('page-updated', this.currentPage, this.tableItems);
  }
}
</script>

<style lang="scss">
.order-table {
  font-size: var(--s-font-size-mini);

  &__main {
    flex: 1;
    align-items: center;
    justify-content: center;
  }

  .scrollable-table {
    height: 100%;
    @include scrollbar();
    // Fix issue with horizontal & vertical scroll
    &.el-scrollbar {
      > .el-scrollbar__wrap {
        position: relative;
        bottom: -15px;
        overflow-x: scroll;
        > .el-scrollbar__view {
          margin-top: -15px;
        }
      }
      > .el-scrollbar__bar.is-vertical {
        width: 0;
      }
    }
  }

  .el-table__header-wrapper {
    text-transform: uppercase;
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
      color: var(--s-color-status-error);
      &.buy {
        color: var(--s-color-status-success);
      }
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
    padding: 0 $basic-spacing $basic-spacing;
    width: 100%;
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
