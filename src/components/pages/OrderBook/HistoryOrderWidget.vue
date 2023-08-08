<template>
  <div class="order-book-widget history">
    <div class="order-history-header">
      <div class="order-history-header-filter-buttons">
        <span @click="switchFilter(Filter.open)" :class="getComputedFilterClasses(Filter.open)">{{
          `Open orders ${openOrdersCount}`
        }}</span>
        <span @click="switchFilter(Filter.all)" :class="getComputedFilterClasses(Filter.all)">Order history</span>
        <span @click="switchFilter(Filter.closed)" :class="getComputedFilterClasses(Filter.closed)">Trade history</span>
      </div>
      <div v-if="isLoggedIn" class="order-history-header-cancel-buttons">
        <span :class="getComputedCancelClasses(Cancel.multiple)">Cancel order</span>
        <span :class="getComputedCancelClasses(Cancel.all)">Cancel all</span>
      </div>
    </div>
    <div class="delimiter" />
    <div v-if="isLoggedIn">
      <div v-if="currentFilter === Filter.open">
        <s-table :data="openOrders" :highlight-current-row="false">
          <s-table-column type="selection" />
          <s-table-column>
            <template #header>
              <span>Time</span>
            </template>
            <template v-slot="{ row }">
              <div>
                <div>{{ row.date.date }}</div>
                <div>{{ row.date.time }}</div>
              </div>
            </template>
          </s-table-column>
          <s-table-column>
            <template #header>
              <span>Pair</span>
            </template>
            <template v-slot="{ row }">
              <div>
                <div>{{ row.pair }}</div>
              </div>
            </template>
          </s-table-column>
          <s-table-column>
            <template #header>
              <span>Price</span>
            </template>
            <template v-slot="{ row }">
              <span>{{ row.price }}</span>
            </template>
          </s-table-column>
          <s-table-column>
            <template #header>
              <span>Volume</span>
            </template>
            <template v-slot="{ row }">
              <span>{{ row.volume }}</span>
            </template>
          </s-table-column>
          <s-table-column>
            <template #header>
              <span>Daily change</span>
            </template>
            <template v-slot="{ row }">
              <span>{{ row.dailyChange }}</span>
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
        </s-table>
      </div>
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

enum Filter {
  open = 'open',
  all = 'all',
  closed = 'closed',
}

enum Cancel {
  multiple = 'multiple',
  all = 'all',
}

@Component({
  components: {},
})
export default class OrderHistoryWidget extends Mixins(TranslationMixin) {
  [x: string]: any;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  currentFilter = Filter.open;

  Filter = Filter;
  Cancel = Cancel;

  get openOrders(): any {
    return [
      {
        date: { date: '8/26', time: '14:12:25' },
        pair: 'XOR-ETH',
        side: 'buy',
        price: '103.39',
        amount: '5',
        filled: '100',
        expired: 'a week',
        total: '13,3423.77',
      },
      {
        date: { date: '8/26', time: '16:19:11' },
        pair: 'XOR-ETH',
        side: 'buy',
        price: '103.39',
        amount: '5',
        filled: '100',
        expired: 'a week',
        total: '13,3423.77',
      },
      {
        date: { date: '8/25', time: '11:15:45' },
        pair: 'XOR-ETH',
        side: 'buy',
        price: '103.39',
        amount: '5',
        filled: '100',
        expired: 'a week',
        total: '13,3423.77',
      },
    ];
  }

  get allOrders(): any {
    return [];
  }

  get closedOrders(): any {
    return [];
  }

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

    return base;
  }

  switchFilter(filter: Filter): void {
    this.currentFilter = filter;
  }
}
</script>

<style lang="scss">
.order-book-widget.history {
  min-width: 900px;
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

    &--inactive {
      opacity: 0.7;
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
