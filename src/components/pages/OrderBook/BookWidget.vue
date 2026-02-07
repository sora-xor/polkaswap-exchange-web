<template>
  <base-widget
    v-bind="$attrs"
    extensive
    v-loading="loading"
    class="stock-book book"
    :title="t('orderBook.orderBook')"
    :tooltip="t('orderBook.tooltip.bookWidget')"
  >
    <template #filters>
      <s-dropdown
        v-if="false"
        class="stock-book__switcher"
        trigger="click"
        :size="18"
        popper-class="stock-book-switcher"
      >
        {{ selectedStep }}
        <template slot="menu">
          <s-dropdown-item v-for="value in steps" :key="value" @click="handleSelectStep(value)">{{
            value
          }}</s-dropdown-item>
        </template>
      </s-dropdown>
    </template>

    <div class="book-columns">
      <div>{{ t('priceText') }}</div>
      <div>{{ t('orderBook.amount') }}</div>
      <div>{{ t('orderBook.total') }}</div>
    </div>
    <div v-if="asksFormatted.length" class="stock-book-sell" :class="{ unclickable: isMarketOrder }">
      <div class="margin" :style="sellMarginStyle"></div>
      <div
        v-for="order in sellOrders"
        :key="order.price"
        class="row"
        @click="fillPrice(order.price, PriceVariant.Sell)"
      >
        <span class="order-info total">{{ order.total }}</span>
        <span class="order-info amount">{{ order.amount }}</span>
        <span class="order-info price">{{ order.price }}</span>
        <div class="bar" :style="barStyle(order.filled)"></div>
      </div>
    </div>
    <div v-else class="stock-book-sell--no-asks">{{ t('orderBook.book.noAsks') }}</div>
    <div :class="trendClass">
      <div>
        <span class="mark-price">{{ lastPriceFormatted }}</span>
        <s-icon class="trend-icon" :name="trendIcon" size="18"></s-icon>
        <span class="last-traded-price">{{ fiatValue }}</span>
      </div>
    </div>
    <div v-if="bidsFormatted.length" class="stock-book-buy" :class="{ unclickable: isMarketOrder }">
      <div v-for="order in buyOrders" :key="order.price" class="row" @click="fillPrice(order.price, PriceVariant.Buy)">
        <span class="order-info total">{{ order.total }}</span>
        <span class="order-info amount">{{ order.amount }}</span>
        <span class="order-info price">{{ order.price }}</span>
        <div class="bar" :style="barStyle(order.filled)"></div>
      </div>
    </div>
    <div v-else class="stock-book-buy--no-bids">{{ t('orderBook.book.noBids') }}</div>
  </base-widget>
</template>

<script setup lang="ts">
import { onBeforeUnmount } from 'vue';
import { PriceVariant as LiquidityPriceVariant } from '@sora-substrate/liquidity-proxy';

import { Components } from '@/consts';
import { useOrderBook } from '@/composables/useOrderBook';
import { useLoading } from '@/composables/useLoading';
import { usePiniaTelemetry } from '@/composables/usePiniaTelemetry';
import { useTranslation } from '@/composables/useTranslation';
import { lazyComponent } from '@/router';
import { useOrderBookStore } from '@/stores/orderBook';

defineOptions({
  inheritAttrs: false,
  components: {
    BaseWidget: lazyComponent(Components.BaseWidget),
  },
});

const { t } = useTranslation();
const { loading, withLoading, withParentLoading } = useLoading();

const {
  orderBookId,
  baseAsset,
  quoteAsset,
  asksFormatted,
  bidsFormatted,
  sellOrders,
  buyOrders,
  sellMarginStyle,
  barStyle,
  showAggregationOptions,
  isMarketOrder,
  steps,
  selectedStep,
  setSelectedStep,
  lastDealTrendsUp,
  trendIcon,
  trendClass,
  lastPriceFormatted,
  fiatValue,
  fillPrice,
  watchOrderBookSubscription,
  unsubscribeFromOrderBook,
  PriceVariant: orderBookPriceVariant,
} = useOrderBook({ maxRows: 11 });
const orderBookStore = useOrderBookStore();

usePiniaTelemetry('order-book', [{ store: orderBookStore, storeId: 'orderBook' }], {
  metadata: () => ({
    widget: 'book',
    orderBookId: orderBookId.value || null,
    baseAsset: baseAsset.value?.symbol ?? null,
    quoteAsset: quoteAsset.value?.symbol ?? null,
  }),
});

const handleSelectStep = (value: string) => setSelectedStep(value);

const stopSubscription = watchOrderBookSubscription({ withLoading, withParentLoading });

onBeforeUnmount(() => {
  stopSubscription?.();
  unsubscribeFromOrderBook();
});

// expose enum for template usage
const PriceVariant = orderBookPriceVariant ?? LiquidityPriceVariant;
</script>

<style lang="scss">
$row-height: 24px;
$background-column-color-light: #e7dadd;
$background-column-color-dark: #693d81;
$mono-font: 'JetBrainsMono';

.stock-book {
  :not(.unclickable) .row:hover {
    cursor: pointer;
  }

  .row {
    display: flex;
    justify-content: space-between;
    transform-style: preserve-3d;
    font-family: $mono-font;
    margin: 2px;
  }

  &__switcher {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-right: 12px;

    &:hover {
      cursor: pointer;

      .el-icon-arrow-down {
        color: var(--s-color-base-content-secondary);
      }
    }

    .el-icon-arrow-down {
      color: var(--s-color-base-content-tertiary);
      font-weight: 800;
      margin-left: 4px;
      margin-bottom: 1px;
    }
  }

  &-switcher {
    background-color: var(--s-color-utility-surface) !important;
  }

  .order-info {
    width: 130px;
    padding: 4px $basic-spacing 4px $basic-spacing;
    transform: scaleX(-1);

    &.amount,
    &.total {
      text-align: end;
    }
  }

  &-buy,
  &-sell {
    height: $row-height * 12;
    transform: scaleX(-1);
    .bar {
      width: 40%;
      height: 100%;
      z-index: -1;
      position: absolute;
    }
  }

  &-buy {
    .bar {
      background: rgba(185, 235, 219, 0.4);
    }

    .order-info.price {
      color: var(--status-day-success, #34ad87);
    }
  }

  &-sell {
    .bar {
      background: rgba(255, 216, 235, 0.8);
    }

    .order-info.price {
      color: var(--status-day-error, #f754a3);
    }
  }

  &-delimiter {
    display: flex;
    align-items: center;
    height: 30px;
    line-height: 30px;
    background-color: rgba($color: $background-column-color-light, $alpha: 0.2);

    .mark-price {
      font-size: var(--s-font-size-large);
      padding-left: $inner-spacing-big;
      font-weight: 450;
    }

    .last-traded-price {
      margin-left: $inner-spacing-big;
      font-size: var(--s-font-size-big);
      font-weight: 450;
      unicode-bidi: bidi-override;
      direction: ltr;
    }

    .trend-icon {
      margin-left: 4px;
    }

    &--up {
      .mark-price,
      .trend-icon {
        color: #34ad87;
      }
    }

    &--down {
      .mark-price,
      .trend-icon {
        color: #f754a3;
      }
    }
  }

  .book-columns {
    opacity: 0.3;
    background-color: $background-column-color-light;
    display: flex;
    width: 100%;
    color: var(--s-color-base-content-primary);
    padding: 4px 16px 4px 16px;
    justify-content: space-between;
    font-size: 14px;
    font-style: normal;
    font-weight: 550;
    line-height: 150%;
    letter-spacing: -0.26px;
    text-transform: uppercase;
  }
}

.stock-book-sell--no-asks,
.stock-book-buy--no-bids {
  margin-top: $basic-spacing;
  color: var(--s-color-base-content-tertiary);
  height: $row-height * 9.8;
  font-size: 17px;
  font-weight: 600;
  text-align: center;
}

[design-system-theme='dark'] {
  .book-columns {
    background-color: #693d81;
  }

  .stock-book {
    &-sell {
      .bar {
        background-color: rgba(255, 0, 124, 0.3);
      }
    }
    &-buy {
      .bar {
        background-color: rgba(1, 202, 139, 0.2);
      }
    }
    &-delimiter {
      background-color: $background-column-color-dark;
    }
  }
}
</style>
