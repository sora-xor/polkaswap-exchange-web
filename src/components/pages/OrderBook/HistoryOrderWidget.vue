<template>
  <div class="order-book-widget history">
    <div class="order-history-header">
      <div class="order-history-header-filter-buttons">
        <span @click="switchFilter(Filter.open)" :class="getComputedFilterClasses(Filter.open)">{{
          `Open orders ${openOrdersCount}`
        }}</span>
        <span @click="switchFilter(Filter.all)" :class="getComputedFilterClasses(Filter.all)" class="inactive-tab">
          Order history
        </span>
        <span
          @click="switchFilter(Filter.executed)"
          :class="getComputedFilterClasses(Filter.executed)"
          class="inactive-tab"
        >
          Trade history
        </span>
      </div>
      <div v-if="isLoggedIn" class="order-history-header-cancel-buttons">
        <span :class="getComputedCancelClasses(Cancel.multiple)" @click="handleCancel(Cancel.multiple)">{{
          cancelText
        }}</span>
        <span :class="getComputedCancelClasses(Cancel.all)" @click="handleCancel(Cancel.all)">{{ cancelAllText }}</span>
      </div>
    </div>
    <div class="delimiter" />
    <div v-if="isLoggedIn">
      <open-orders v-if="currentFilter === Filter.open" @cancelled-orders="handleCancelledOrders" />
      <all-orders v-else :filter="currentFilter" />
    </div>
    <div v-else class="order-history-connect-account">
      <h4>Connect an account to start trading</h4>
      <s-button type="primary" @click="connectAccount">Connect account</s-button>
    </div>
  </div>
</template>

<script lang="ts">
import { api, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, LimitOrderSide, PageNames } from '@/consts';
import router, { lazyComponent } from '@/router';
import { state, mutation, getter, action } from '@/store/decorators';
import { Filter, Cancel } from '@/types/orderBook';
import { delay } from '@/utils';

@Component({
  components: {
    AllOrders: lazyComponent(Components.AllOrders),
    OpenOrders: lazyComponent(Components.OpenOrders),
  },
})
export default class OrderHistoryWidget extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @state.orderBook.baseAssetAddress baseAssetAddress!: string;
  @state.orderBook.userLimitOrders userLimitOrders!: Array<any>;

  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  @action.orderBook.subscribeToUserLimitOrders subscribeToOpenOrders!: ({ base }) => void;

  currentFilter = Filter.open;
  openLimitOrders: Array<any> = [];
  ordersToBeCancelled = [];

  Filter = Filter;
  Cancel = Cancel;

  get cancelText(): string {
    if (this.hasSelected) {
      return `Cancel order (${this.ordersToBeCancelled.length})`;
    }
    return 'Cancel order';
  }

  get cancelAllText(): string {
    return 'Cancel all';
  }

  handleCancelledOrders(cancelledOrders): void {
    this.ordersToBeCancelled = cancelledOrders;
  }

  get hasSelected(): boolean {
    return this.ordersToBeCancelled.length > 0;
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

  deserializeKey(key: string) {
    const [base, quote] = key.split(',');
    return { base, quote };
  }

  handleCancel(cancel: Cancel): void {
    if (!this.userLimitOrders.length) return;

    if (cancel === Cancel.multiple) {
      if (this.ordersToBeCancelled.length > 1) {
        const limitOrderIds = this.ordersToBeCancelled.map((limitOrder: any) => limitOrder.limitOrderId);
        const { orderBookId } = this.ordersToBeCancelled[0];
        const { base, quote } = orderBookId;

        api.orderBook.cancelLimitOrderBatch(base, quote, limitOrderIds);
      }

      if (this.ordersToBeCancelled.length === 1) {
        const { limitOrderId, orderBookId } = this.ordersToBeCancelled[0];
        const { base, quote } = orderBookId;

        api.orderBook.cancelLimitOrder(base, quote, limitOrderId);
      }
    } else {
      const { orderBookId } = this.userLimitOrders[0];
      const { base, quote } = orderBookId;
      const limitOrderIds = this.userLimitOrders.map((limitOrder: any) => limitOrder.id);

      api.orderBook.cancelLimitOrderBatch(base, quote, limitOrderIds);
    }
  }

  switchFilter(filter: Filter): void {
    if (filter === Filter.all || filter === Filter.executed) return;
    this.currentFilter = filter;
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
  .el-table-column--selection.is-leaf {
    visibility: hidden;
  }

  .inactive-tab {
    opacity: 0.4;

    &:hover {
      cursor: default;
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
    font-size: 16px;
    font-weight: 500;
    color: var(--s-color-base-content-secondary);
    padding: 16px 16px 8px 16px;
  }

  &-filter {
    margin-right: 16px;

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
    margin-left: 16px;

    &:hover {
      cursor: pointer;
      color: var(--s-color-theme-accent);
    }

    &--inactive {
      opacity: 0.5;

      &:hover {
        cursor: default;
      }
    }
  }

  &-connect-account {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    h4 {
      font-size: 24px;
      text-align: center;
      margin-top: 18%;
    }

    .el-button {
      width: 30%;
      margin-top: 8px;
    }
  }
}

.delimiter {
  background: var(--s-color-base-border-secondary);
  margin: 8px 0;
  height: 1px;
  width: 100%;
}
</style>