<template>
  <div class="order-book-widget history">
    <div class="order-history-header">
      <div class="order-history-header-filter-buttons">
        <span @click="switchFilter(Filter.open)" :class="getComputedFilterClasses(Filter.open)">{{
          openOrdersText
        }}</span>
        <span @click="switchFilter(Filter.all)" :class="getComputedFilterClasses(Filter.all)">
          {{ t('orderBook.history.orderHistory') }}
        </span>
        <span @click="switchFilter(Filter.executed)" :class="getComputedFilterClasses(Filter.executed)">
          {{ t('orderBook.history.tradeHistory') }}
        </span>
      </div>
      <div v-if="isLoggedIn" class="order-history-header-cancel-buttons">
        <span :class="getComputedCancelClasses(Cancel.multiple)" @click="handleCancel(Cancel.multiple)">{{
          cancelText
        }}</span>
        <span :class="getComputedCancelClasses(Cancel.all)" @click="openConfirmCancelDialog">{{ cancelAllText }}</span>
      </div>
    </div>
    <div class="delimiter" />
    <div v-if="isLoggedIn">
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
import { state, getter } from '@/store/decorators';
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

  getComputedFilterClasses(filter: Filter): string[] {
    const base = ['order-history-filter'];

    if (this.currentFilter === filter) base.push('order-history-filter--active');

    return base;
  }

  getComputedCancelClasses(cancel: Cancel): string[] {
    const base = ['order-history-cancel'];
    let inactive = true;

    if (this.isBookStopped) {
      base.push('order-history-cancel--inactive');
      return base;
    }

    if (cancel === Cancel.all && this.userLimitOrders.length) {
      inactive = false;
    }

    if (cancel === Cancel.multiple && this.hasSelected) {
      inactive = false;
    }

    if (inactive) base.push('order-history-cancel--inactive');

    return base;
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
    const {
      orderBookId: { base, quote },
    } = orders[0];
    const ids = orders.map((order: LimitOrder) => order.id);

    await this.withNotifications(async () => {
      if (ids.length > 1) {
        await api.orderBook.cancelLimitOrderBatch(base, quote, ids);
      } else {
        await api.orderBook.cancelLimitOrder(base, quote, ids[0]);
      }
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

  .el-table-column--selection.is-leaf {
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
