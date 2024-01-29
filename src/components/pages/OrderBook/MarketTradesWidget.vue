<template>
  <div class="order-book-widget market-trades">
    <h4 class="market-trades__title">
      <span>{{ t('orderBook.marketTrades') }}</span>
      <s-tooltip
        slot="suffix"
        border-radius="mini"
        :content="t('orderBook.tooltip.marketWidget')"
        placement="top"
        tabindex="-1"
      >
        <s-icon name="info-16" size="14px" />
      </s-tooltip>
    </h4>
    <s-table class="market-trades-table" :data="completedOrders">
      <s-table-column>
        <template #header>
          <span class="market-trades__header">{{ t('orderBook.time') }}</span>
        </template>
        <template v-slot="{ row }">
          <span class="order-info time">{{ row.time }}</span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span class="market-trades__header">{{ t('orderBook.price') }}</span>
        </template>
        <template v-slot="{ row }">
          <span class="order-info side" :class="[{ buy: row.side === PriceVariant.Buy }]">{{ row.side }}</span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span class="market-trades__header">Price</span>
        </template>
        <template v-slot="{ row }">
          <span class="order-info price">{{ row.price }}</span>
        </template>
      </s-table-column>
      <s-table-column header-align="right" align="right">
        <template #header>
          <span class="market-trades__header">{{ t('orderBook.amount') }}</span>
        </template>
        <template v-slot="{ row }">
          <span class="order-info">{{ row.amount }}</span>
        </template>
      </s-table-column>
    </s-table>
  </div>
</template>

<script lang="ts">
import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import dayjs from 'dayjs';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { getter, state } from '@/store/decorators';
import type { OrderBookDealData } from '@/types/orderBook';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

@Component
export default class MarketTradesWidget extends Mixins(TranslationMixin) {
  readonly PriceVariant = PriceVariant;

  @state.orderBook.deals deals!: OrderBookDealData[];

  @getter.orderBook.baseAsset baseAsset!: AccountAsset;
  @getter.orderBook.quoteAsset quoteAsset!: AccountAsset;

  get completedOrders() {
    return this.deals.map((deal) => {
      const date = dayjs(deal.timestamp);
      const time = date.format('M/DD HH:mm:ss');
      const amount = `${deal.amount.toLocaleString()} ${this.baseAsset.symbol}`;
      const price = `${deal.price.toLocaleString()} ${this.quoteAsset.symbol}`;

      return { time, amount, price, side: deal.side };
    });
  }
}
</script>

<style lang="scss">
.market-trades {
  overflow: hidden;
  min-height: 272px;

  &__title {
    height: 40px;
    line-height: 40px;
    font-weight: 500;
    font-size: 17px;
    margin-left: $basic-spacing;

    .el-tooltip {
      margin-left: $inner-spacing-mini;
    }
  }

  .order-info {
    &.time {
      color: var(--s-color-base-content-secondary);
    }
    &.side {
      text-transform: uppercase;
      font-weight: 500;
      color: var(--s-color-status-error);
      &.buy {
        color: var(--s-color-status-success);
      }
    }
  }

  &__header {
    opacity: 0.3;
    color: var(--s-color-base-content-primary);
    font-size: var(--s-font-size-small);
    font-style: normal;
    font-weight: 550;
    line-height: 150%;
    letter-spacing: -0.26px;
    text-transform: uppercase;
  }
}

.market-trades-table {
  .el-table__body-wrapper {
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &.el-table {
    background: transparent;

    tr,
    th {
      background: transparent;
    }

    .el-table__body-wrapper {
      min-height: 272px;
    }
  }
}
</style>
