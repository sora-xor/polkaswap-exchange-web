<template>
  <div class="order-book-widget history s-flex-column">
    <div class="order-history-header">
      <div class="order-history-header-filter-buttons">
        <span
          class="order-history-filter"
          :class="{ 'order-history-filter--active': currentFilter === Filter.open }"
          @click="switchFilter(Filter.open)"
        >
          {{ openOrdersText }}
        </span>
        <span
          class="order-history-filter"
          :class="{ 'order-history-filter--active': currentFilter === Filter.all }"
          @click="switchFilter(Filter.all)"
        >
          {{ t('orderBook.history.orderHistory') }}
        </span>
        <span
          class="order-history-filter"
          :class="{ 'order-history-filter--active': currentFilter === Filter.executed }"
          @click="switchFilter(Filter.executed)"
        >
          {{ t('orderBook.history.tradeHistory') }}
        </span>
      </div>
      <div v-if="isLoggedIn" class="order-history-header-cancel-buttons">
        <span
          class="order-history-cancel"
          :class="{ 'order-history-cancel--inactive': isCancelMultipleInactive }"
          @click="handleCancel(Cancel.multiple)"
        >
          {{ cancelText }}
        </span>
        <span
          class="order-history-cancel"
          :class="{ 'order-history-cancel--inactive': isCancelAllInactive }"
          @click="openConfirmCancelDialog"
        >
          {{ cancelAllText }}
        </span>
      </div>
    </div>
    <div class="delimiter" />
    <div class="order-history-main s-flex-column" v-if="isLoggedIn">
      <open-orders v-if="currentFilter === Filter.open" />
      <all-orders v-else :filter="currentFilter" />
    </div>
    <div v-else class="order-history-connect-account">
      <div class="order-history-connect-account-button">
        <h4>{{ t('orderBook.history.connect') }}</h4>
        <s-button type="primary" class="btn s-typography-button--medium" @click="connectAccount">
          {{ t('connectWalletText') }}
        </s-button>
      </div>
    </div>
    <cancel-confirm :visible.sync="confirmCancelOrderVisibility" @confirm="handleCancel" />
  </div>
</template>

<script lang="ts">
import { OrderBookStatus } from '@sora-substrate/liquidity-proxy';
import { api, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, PageNames } from '@/consts';
import router, { lazyComponent } from '@/router';
import { state, getter, mutation } from '@/store/decorators';
import { Filter, Cancel } from '@/types/orderBook';

import type { OrderBook } from '@sora-substrate/liquidity-proxy';
import type { LimitOrder } from '@sora-substrate/util/build/orderBook/types';

@Component({
  components: {
    AllOrders: lazyComponent(Components.AllOrders),
    OpenOrders: lazyComponent(Components.OpenOrders),
    CancelConfirm: lazyComponent(Components.CancelOrders),
  },
})
export default class OrderHistoryWidget extends Mixins(TranslationMixin, mixins.LoadingMixin, mixins.TransactionMixin) {
  @state.orderBook.userLimitOrders userLimitOrders!: Array<LimitOrder>;
  @state.orderBook.ordersToBeCancelled ordersToBeCancelled!: Array<LimitOrder>;

  @getter.orderBook.currentOrderBook currentOrderBook!: Nullable<OrderBook>;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  @mutation.orderBook.setOrdersToBeCancelled private setOrdersToBeCancelled!: (orders: LimitOrder[]) => void;

  confirmCancelOrderVisibility = false;
  currentFilter = Filter.open;
  openLimitOrders: Array<LimitOrder> = [];

  readonly Filter = Filter;
  readonly Cancel = Cancel;

  get openOrdersText(): string {
    return this.t('orderBook.history.openOrders', { value: this.openOrdersCount });
  }

  get cancelText(): string {
    return this.hasSelected
      ? this.t('orderBook.history.cancel', { value: `(${this.ordersToBeCancelled.length})` })
      : this.t('orderBook.history.cancel');
  }

  get cancelAllText(): string {
    return this.t('orderBook.history.cancelAll');
  }

  get hasSelected(): boolean {
    return this.ordersToBeCancelled.length > 0;
  }

  get isBookStopped(): boolean {
    return !this.currentOrderBook || this.currentOrderBook.status === OrderBookStatus.Stop;
  }

  get openOrdersCount(): string {
    if (!this.isLoggedIn) return '';

    const count = this.userLimitOrders.length;

    return count > 0 ? `(${count})` : ``;
  }

  get isCancelAllInactive(): boolean {
    return this.loading || this.isBookStopped || !this.userLimitOrders.length;
  }

  get isCancelMultipleInactive(): boolean {
    return this.loading || this.isBookStopped || !this.hasSelected;
  }

  connectAccount(): void {
    router.push({ name: PageNames.Wallet });
  }

  switchFilter(filter: Filter): void {
    this.currentFilter = filter;
  }

  openConfirmCancelDialog(): void {
    if (this.isBookStopped) return;
    if (!this.userLimitOrders.length) return;

    this.confirmCancelOrderVisibility = true;
  }

  async handleCancel(cancel: Cancel): Promise<void> {
    if (this.isBookStopped) return;
    if (!this.userLimitOrders.length) return;

    const orders = cancel === Cancel.multiple ? this.ordersToBeCancelled : this.userLimitOrders;

    if (!orders.length) return;

    await this.withNotifications(async () => {
      const {
        orderBookId: { base, quote },
      } = orders[0]; // TODO: [STEFAN] issue with ordersToBeCancelled -> orderToBeCancelledIds
      const ids = orders.map((order: LimitOrder) => order.id);

      if (ids.length > 1) {
        await api.orderBook.cancelLimitOrderBatch(base, quote, ids);
      } else {
        await api.orderBook.cancelLimitOrder(base, quote, ids[0]);
      }
      this.setOrdersToBeCancelled([]);
    });
  }
}
</script>

<style lang="scss">
.history-widget {
  .order-book-widget.history {
    padding: 0;
  }
}

.order-book-widget.history {
  min-height: 570px;

  .el-table-column--selection.is-leaf > .cell {
    visibility: hidden;
  }

  .inactive-tab {
    opacity: 0.4;

    &:hover {
      cursor: not-allowed;
      color: var(--s-color-base-content-secondary);
    }
  }
}
</style>

<style lang="scss" scoped>
.order-history {
  &-header {
    display: flex;
    justify-content: space-between;
    padding: $basic-spacing $basic-spacing $inner-spacing-mini $basic-spacing;
    color: var(--s-color-base-content-secondary);
    font-size: $basic-spacing;
    font-weight: 500;
    &-cancel-buttons {
      display: flex;
      flex-wrap: wrap;
      align-content: flex-start;
      justify-content: flex-end;
      flex: 1;
    }
    &-filter-buttons {
      display: flex;
      flex-wrap: wrap;
      align-content: flex-start;
      justify-content: flex-start;
    }
  }

  &-filter {
    margin-right: $basic-spacing;
    line-height: 1.5;

    &:hover {
      cursor: pointer;
      color: var(--s-color-theme-accent);
    }

    &--active {
      color: var(--s-color-theme-accent);
    }
  }

  &-cancel {
    color: var(--s-color-theme-accent);
    margin-left: $basic-spacing;
    line-height: 1.5;

    &:hover {
      cursor: pointer;
      color: var(--s-color-theme-accent);
    }

    &--inactive {
      opacity: 0.5;

      &:hover {
        cursor: not-allowed;
      }
    }
  }

  &-main {
    flex: 1;
  }

  &-connect-account {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;

    h4 {
      font-size: var(--s-font-size-large);
      text-align: center;
    }

    &-button {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      .el-button {
        width: 70%;
        margin-top: $inner-spacing-mini;
      }
    }
  }
}

.delimiter {
  background: var(--s-color-base-border-secondary);
  margin: $inner-spacing-mini 0;
  height: 1px;
  width: 100%;
}
</style>
