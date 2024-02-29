<template>
  <base-widget
    extensive
    class="market-trades"
    :title="t('orderBook.marketTrades')"
    :tooltip="t('orderBook.tooltip.marketWidget')"
  >
    <s-table class="market-trades-table" :data="completedOrders">
      <s-table-column>
        <template #header>
          <span class="market-trades__header">{{ t('orderBook.price') }}</span>
        </template>
        <template v-slot="{ row }">
          <span class="order-info price" :class="{ buy: row.isBuy }">{{ row.price }}</span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span class="market-trades__header">{{ t('orderBook.time') }}</span>
        </template>
        <template v-slot="{ row }">
          <span class="order-info time">{{ row.time }}</span>
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
  </base-widget>
</template>

<script lang="ts">
import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import dayjs from 'dayjs';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';
import type { OrderBookDealData } from '@/types/orderBook';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    BaseWidget: lazyComponent(Components.BaseWidget),
  },
})
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
      const isBuy = deal.side === PriceVariant.Buy;

      return { time, amount, price, isBuy };
    });
  }
}
</script>

<style lang="scss">
.market-trades {
  min-height: 272px;

  .order-info {
    &.time {
      font-size: var(--s-font-size-extra-small);
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
