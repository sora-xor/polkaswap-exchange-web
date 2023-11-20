<template>
  <div class="order-book-widget market-trades">
    <h4 class="market-trades__title">
      <span>Market trades</span>
      <s-tooltip slot="suffix" border-radius="mini" :content="tooltipContent" placement="top" tabindex="-1">
        <s-icon name="info-16" size="14px" />
      </s-tooltip>
    </h4>
    <s-table class="market-trades-table" :data="completedOrders">
      <s-table-column>
        <template #header>
          <span class="market-trades__header">Time</span>
        </template>
        <template v-slot="{ row }">
          <span class="order-info time">{{ row.time }}</span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span class="market-trades__header">Price</span>
        </template>
        <template v-slot="{ row }">
          <span class="order-info price" :class="[{ buy: row.isBuy }]">{{ row.price }}</span>
        </template>
      </s-table-column>
      <s-table-column header-align="right" align="right">
        <template #header>
          <span class="market-trades__header">Amount</span>
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
  @state.orderBook.deals deals!: OrderBookDealData[];

  @getter.orderBook.baseAsset baseAsset!: AccountAsset;
  @getter.orderBook.quoteAsset quoteAsset!: AccountAsset;

  get tooltipContent(): string {
    return 'This widget shows a real-time stream of executed trades in the market, providing information on transaction volumes, recent activity, and current market trends. By observing the timing, price, and size of actual trades, traders can gain insights into market dynamics and sentiment, helping them to spot trading opportunities and make informed decisions';
  }

  get completedOrders() {
    return this.deals.map((deal) => {
      const date = dayjs(deal.timestamp);
      const time = date.format('M/DD HH:mm:ss');
      const amount = `${deal.amount.toLocaleString()} ${this.baseAsset.symbol}`;
      const price = `${deal.price.toLocaleString()} ${this.quoteAsset.symbol}`;
      const isBuy = deal.side === PriceVariant.Buy;

      return { time, amount, price, isBuy };
    });
  }
}
</script>

<style lang="scss">
.market-trades {
  min-height: 327px;

  &__title {
    height: 40px;
    line-height: 40px;
    font-weight: 500;
    font-size: 17px;
    margin-left: 16px;

    .el-tooltip {
      margin-left: 8px;
    }
  }

  .order-info {
    &.time {
      color: var(--s-color-base-content-secondary);
    }
    &.price {
      color: var(--s-color-status-error);
      &.buy {
        color: var(--s-color-status-success);
      }
    }
  }

  &__header {
    opacity: 0.3;
    color: var(--s-color-base-content-primary);
    font-family: Sora;
    font-size: 14px;
    font-style: normal;
    font-weight: 550;
    line-height: 150%;
    letter-spacing: -0.26px;
    text-transform: uppercase;
  }
}

.market-trades-table {
  &.el-table {
    background: transparent;

    tr,
    th {
      background: transparent;
    }

    .el-table__body-wrapper {
      min-height: 327px;
    }
  }
}
</style>
