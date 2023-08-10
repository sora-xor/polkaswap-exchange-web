<template>
  <div class="order-book-widget history">
    <div class="order-history-header">
      <div class="order-history-header-filter-buttons">
        <span @click="switchFilter(Filter.open)" :class="getComputedFilterClasses(Filter.open)">{{
          `Open orders ${openOrdersCount}`
        }}</span>
        <span @click="switchFilter(Filter.all)" :class="getComputedFilterClasses(Filter.all)">Order history</span>
        <span @click="switchFilter(Filter.executed)" :class="getComputedFilterClasses(Filter.executed)">
          Trade history
        </span>
      </div>
      <div v-if="isLoggedIn" class="order-history-header-cancel-buttons">
        <span :class="getComputedCancelClasses(Cancel.multiple)">Cancel order</span>
        <span :class="getComputedCancelClasses(Cancel.all)">Cancel all</span>
      </div>
    </div>
    <div class="delimiter" />
    <div v-if="isLoggedIn">
      <open-orders v-if="currentFilter === Filter.open" />
      <all-orders v-else :filter="currentFilter" />
    </div>
    <div v-else class="order-history-connect-account">
      <h4>Connect an account to start trading</h4>
      <s-button type="primary">Connect account</s-button>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, LimitOrderSide } from '@/consts';
import { lazyComponent } from '@/router';
import { mutation, getter } from '@/store/decorators';
import { Filter, Cancel } from '@/types/orderBook';

@Component({
  components: {
    AllOrders: lazyComponent(Components.AllOrders),
    OpenOrders: lazyComponent(Components.OpenOrders),
  },
})
export default class OrderHistoryWidget extends Mixins(TranslationMixin) {
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  currentFilter = Filter.open;

  Filter = Filter;
  Cancel = Cancel;

  get openOrdersCount(): string {
    if (!this.isLoggedIn) return '';

    const count = 3;

    return count > 0 ? `(${count})` : ``;
  }

  getComputedFilterClasses(filter: Filter): string[] {
    const base = ['order-history-filter'];

    if (this.currentFilter === filter) base.push('order-history-filter--active');

    return base;
  }

  getComputedCancelClasses(cancel: Cancel): string[] {
    const base = ['order-history-cancel'];

    // TODO: write logic when the option is active
    const noOpenOrders = false;

    if (noOpenOrders) base.push('order-history-cancel--inactive');

    return base;
  }

  switchFilter(filter: Filter): void {
    this.currentFilter = filter;
  }
}
</script>

<style lang="scss">
.order-book-widget.history {
  min-width: 950px;
  max-height: 450px;

  .el-table-column--selection.is-leaf {
    visibility: hidden;
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

.order-book-widget {
  padding: 24px;
}

.delimiter {
  background: var(--s-color-base-border-secondary);
  margin: 8px 0;
  height: 1px;
  width: 100%;
}
</style>
