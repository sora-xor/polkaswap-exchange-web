<template>
  <base-widget v-bind="$attrs" extensive delimeter class="order-history-widget s-flex-column">
    <template #title>
      <div class="order-history-buttons order-history-buttons--filter-buttons">
        <span
          v-button
          :class="['order-history-button', { active: currentFilter === Filter.open }]"
          @click="switchFilter(Filter.open)"
        >
          {{ openOrdersText }}
        </span>
        <span
          v-button
          :class="['order-history-button', { active: currentFilter === Filter.all }]"
          @click="switchFilter(Filter.all)"
        >
          {{ t('orderBook.history.orderHistory') }}
        </span>
        <span
          v-button
          :class="['order-history-button', { active: currentFilter === Filter.executed }]"
          @click="switchFilter(Filter.executed)"
        >
          {{ t('orderBook.history.tradeHistory') }}
        </span>
      </div>
      <div v-if="isLoggedIn" class="order-history-buttons order-history-buttons--cancel-buttons">
        <span
          v-button
          :class="['order-history-button', 'order-history-button--cancel', { inactive: isCancelMultipleInactive }]"
          @click="cancelOrders(Cancel.multiple)"
        >
          {{ cancelText }}
        </span>
        <span
          v-button
          :class="['order-history-button', 'order-history-button--cancel', { inactive: isCancelAllInactive }]"
          @click="openConfirmCancelDialog"
        >
          {{ cancelAllText }}
        </span>
      </div>
    </template>

    <div class="order-history-main s-flex-column" v-if="isLoggedIn">
      <open-orders v-if="currentFilter === Filter.open" :parent-loading="openOrdersLoading" />
      <all-orders v-else :filter="currentFilter" />
    </div>
    <div v-else class="order-history-connect-account">
      <div class="order-history-connect-account-button">
        <h4 class="h4">{{ t('orderBook.history.connect') }}</h4>
        <s-button type="primary" class="btn s-typography-button--medium" @click="connectSoraWallet">
          {{ t('connectWalletText') }}
        </s-button>
      </div>
    </div>
    <cancel-confirm :visible.sync="confirmDialogVisibility" @confirm="cancelOrders" />
  </base-widget>
</template>

<script lang="ts">
import { OrderBookStatus } from '@sora-substrate/liquidity-proxy';
import { api, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import ConfirmDialogMixin from '@/components/mixins/ConfirmDialogMixin';
import InternalConnectMixin from '@/components/mixins/InternalConnectMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { state, getter, mutation, action } from '@/store/decorators';
import { Filter, Cancel } from '@/types/orderBook';
import { delay } from '@/utils';

import type { OrderBook } from '@sora-substrate/liquidity-proxy';
import type { LimitOrder } from '@sora-substrate/sdk/build/orderBook/types';

@Component({
  components: {
    BaseWidget: lazyComponent(Components.BaseWidget),
    AllOrders: lazyComponent(Components.AllOrders),
    OpenOrders: lazyComponent(Components.OpenOrders),
    CancelConfirm: lazyComponent(Components.CancelOrders),
  },
})
export default class OrderHistoryWidget extends Mixins(
  ConfirmDialogMixin,
  InternalConnectMixin,
  mixins.LoadingMixin,
  mixins.TransactionMixin
) {
  readonly Filter = Filter;
  readonly Cancel = Cancel;

  // Open Orders utils
  @state.orderBook.userLimitOrders private userLimitOrders!: Array<LimitOrder>;
  @getter.orderBook.orderBookId orderBookId!: string;
  @getter.settings.nodeIsConnected nodeIsConnected!: boolean;
  @action.orderBook.subscribeToUserLimitOrders private subscribeToUserLimitOrders!: AsyncFnWithoutArgs;
  @action.orderBook.unsubscribeFromUserLimitOrders private unsubscribeFromUserLimitOrders!: AsyncFnWithoutArgs;
  // Cancel Orders utils
  @state.orderBook.ordersToBeCancelled private ordersToBeCancelled!: Array<LimitOrder>;
  @mutation.orderBook.setOrdersToBeCancelled private setOrdersToBeCancelled!: (orders: LimitOrder[]) => void;
  // Additional utils
  @getter.orderBook.currentOrderBook private currentOrderBook!: Nullable<OrderBook>;

  currentFilter = Filter.open;
  openOrdersLoading = false;

  // Widget subscription for user limit orders
  @Watch('orderBookId', { immediate: true })
  @Watch('soraAddress')
  @Watch('nodeIsConnected')
  private async updateSubscription(): Promise<void> {
    this.openOrdersLoading = true;
    await this.subscribeToUserLimitOrders();
    await delay(2_000); // Waiting for selectable logic init
    this.openOrdersLoading = false;
  }

  get openOrdersText(): string {
    return this.t('orderBook.history.openOrders', { value: this.openOrdersCount });
  }

  get cancelText(): string {
    return this.hasSelectedForCancellation
      ? this.t('orderBook.history.cancel', { value: `(${this.ordersToBeCancelled.length})` })
      : this.t('orderBook.history.cancel');
  }

  get cancelAllText(): string {
    return this.t('orderBook.history.cancelAll');
  }

  get hasSelectedForCancellation(): boolean {
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
    return this.loading || this.isBookStopped || !this.hasSelectedForCancellation;
  }

  switchFilter(filter: Filter): void {
    this.currentFilter = filter;
  }

  openConfirmCancelDialog(): void {
    if (this.isBookStopped) return;
    if (!this.userLimitOrders.length) return;

    this.confirmOrExecute(this.cancelOrders);
  }

  async cancelOrders(cancel = Cancel.all): Promise<void> {
    if (this.loading || this.isBookStopped || !this.userLimitOrders.length) return;

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

  beforeDestroy(): void {
    this.unsubscribeFromUserLimitOrders();
  }
}
</script>

<style lang="scss">
.order-history-widget {
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
  &-buttons {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    justify-content: flex-end;
    gap: $inner-spacing-tiny $inner-spacing-medium;

    color: var(--s-color-base-content-secondary);

    &--cancel-buttons {
      flex: 1;
    }
  }

  &-button {
    &--cancel {
      color: var(--s-color-theme-accent);
    }

    &:hover {
      cursor: pointer;
      color: var(--s-color-theme-accent);
    }

    &.active {
      color: var(--s-color-theme-accent);
    }

    &.inactive {
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
</style>
