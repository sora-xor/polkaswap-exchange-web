<template>
  <order-table
    ref="orderTable"
    is-open-orders
    :orders="sortedUserLimitOrders"
    :selectable="isSelectionAllowed"
    :parent-loading="loadingState"
    @cell-click="handleSelectRow"
    @selection-change="handleSelectionChange"
    @select="handleSelect"
    @page-updated="handlePagination"
    @sync="syncTableItems"
  />
</template>

<script lang="ts">
import { OrderBookStatus } from '@sora-substrate/liquidity-proxy';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch, Ref } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { getter, state, action, mutation } from '@/store/decorators';
import { delay, waitUntil } from '@/utils';

import OrderTable from './OrderTable.vue';

import type { OrderBook } from '@sora-substrate/liquidity-proxy';
import type { LimitOrder } from '@sora-substrate/sdk/build/orderBook/types';

@Component({
  components: {
    OrderTable,
    HistoryPagination: components.HistoryPagination,
  },
})
export default class OpenOrders extends Mixins(TranslationMixin, mixins.LoadingMixin, mixins.FormattedAmountMixin) {
  @state.orderBook.userLimitOrders private userLimitOrders!: Array<LimitOrder>;
  @getter.orderBook.currentOrderBook private currentOrderBook!: Nullable<OrderBook>;
  // Subscription to open orders on the current page (to track the filled %)
  @action.orderBook.subscribeOnLimitOrders private subscribeOnLimitOrders!: (ids: number[]) => Promise<void>;
  @mutation.orderBook.resetPagedUserLimitOrdersSubscription private resetLimitOrdersSubscription!: FnWithoutArgs;
  // Selectable cancel orders
  @state.orderBook.ordersToBeCancelled private ordersToBeCancelled!: LimitOrder[];
  @mutation.orderBook.setOrdersToBeCancelled private setOrdersToBeCancelled!: (orders: LimitOrder[]) => void;

  @Ref('orderTable') readonly orderTable!: OrderTable;

  private currentPage = 1;
  private tableItems: LimitOrder[] = [];

  private selectedPageItemIds: number[] = [];
  private needToUpdateSelection = false;
  private syncTableItemsRefreshing = false;

  private get ordersToBeCancelledIds(): number[] {
    return this.ordersToBeCancelled.map(({ id }) => id);
  }

  get loadingState(): boolean {
    return this.parentLoading || this.loading;
  }

  get isSelectionAllowed(): boolean {
    return !!this.currentOrderBook && this.currentOrderBook.status !== OrderBookStatus.Stop;
  }

  get sortedUserLimitOrders(): LimitOrder[] {
    return [...this.userLimitOrders].sort((a, b) => b.time - a.time);
  }

  @Watch('sortedUserLimitOrders', { deep: true, immediate: true })
  private async updatePagedOrdersSubscription(orders?: LimitOrder[], oldOrders?: LimitOrder[]): Promise<void> {
    if (!orders?.length || orders.length === oldOrders?.length) {
      return;
    }

    this.syncTableItemsRefreshing = true;
    await waitUntil(() => !this.syncTableItemsRefreshing);

    if (this.ordersToBeCancelledIds.length) {
      const stillRemain = this.tableItems.filter(({ id }) => this.ordersToBeCancelledIds.includes(id));
      this.setOrdersToBeCancelled(stillRemain);
    }

    this.handlePagination(this.currentPage);
  }

  async handlePagination(page: number, tableItems?: LimitOrder[]): Promise<void> {
    await this.withLoading(async () => {
      const items = tableItems ?? this.tableItems;
      this.currentPage = page;

      this.resetLimitOrdersSubscription();
      if (items.length) {
        await this.subscribeOnLimitOrders(items.map(({ id }) => id));
      }
    });
  }

  /** Restore the selection after the data refresh */
  private restoreSelectedData(): void {
    const pageItems = this.tableItems.filter(({ id }) => this.ordersToBeCancelledIds.includes(id));

    pageItems.forEach((row) => {
      this.orderTable?.tableComponent?.toggleRowSelection?.(row, true);
    });

    this.selectedPageItemIds = pageItems.map(({ id }) => id);
  }

  handleSelect(rows: LimitOrder[]): void {
    this.needToUpdateSelection = true;
  }

  handleSelectRow(row: LimitOrder): void {
    if (!this.isSelectionAllowed) return;

    this.needToUpdateSelection = true;
    this.orderTable?.tableComponent?.toggleRowSelection?.(row);
  }

  handleSelectionChange(rows: LimitOrder[]): void {
    if (!(this.isSelectionAllowed && this.needToUpdateSelection)) return;

    const diff = this.selectedPageItemIds.length - rows.length;

    if (diff === 1) {
      // Removed 1 item from the selected list
      const rowIds = rows.map(({ id }) => id);
      const clickedRowId = this.selectedPageItemIds.find((id) => !rowIds.includes(id));
      if (clickedRowId) {
        this.setOrdersToBeCancelled(this.ordersToBeCancelled.filter(({ id }) => id !== clickedRowId));
      }
    } else if (diff === -1) {
      // Added 1 item to the selected list
      const clickedRow = rows.find(({ id }) => !this.selectedPageItemIds.includes(id));
      if (clickedRow) {
        this.setOrdersToBeCancelled([...this.ordersToBeCancelled, clickedRow]);
      }
    }

    this.selectedPageItemIds = rows.map(({ id }) => id);
    this.needToUpdateSelection = false;
  }

  syncTableItems(items: LimitOrder[]): void {
    this.tableItems = items;
    this.syncTableItemsRefreshing = false;
    this.restoreSelectedData();
  }

  // Widget subscription close
  beforeDestroy(): void {
    if (this.isSelectionAllowed) {
      this.setOrdersToBeCancelled([]);
    }
    this.resetLimitOrdersSubscription();
  }
}
</script>
