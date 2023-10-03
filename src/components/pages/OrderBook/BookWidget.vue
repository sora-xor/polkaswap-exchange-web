<template>
  <div class="order-book-widget stock-book book">
    <h4>
      Orderbook
      <s-tooltip slot="suffix" border-radius="mini" :content="t('alerts.typeTooltip')" placement="top" tabindex="-1">
        <s-icon name="info-16" size="14px" />
      </s-tooltip>
    </h4>
    <div class="book-columns">
      <div>total</div>
      <div>amount</div>
      <div>price</div>
    </div>
    <div class="stock-book-sell">
      <div v-for="order in sellOrders" :key="order.price" class="row">
        <span class="order-info price">{{ order.price }}</span>
        <span class="order-info">{{ order.amount }}</span>
        <span class="order-info">{{ order.total }}</span>
        <div class="bar" :style="getStyles(order.filled)" />
      </div>
    </div>
    <div :class="getComputedClassTrend()">
      <span class="mark-price">22.386800</span>
      <s-icon class="trend-icon" :name="iconTrend" size="18" />
      <span class="last-traded-price">$22.54</span>
    </div>
    <div class="stock-book-buy">
      <div v-for="order in sellOrders" :key="order.price" class="row">
        <span class="order-info price">{{ order.price }}</span>
        <span class="order-info">{{ order.amount }}</span>
        <span class="order-info">{{ order.total }}</span>
        <div class="bar" :style="getStyles(order.filled)" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { delay } from '@/utils';

type PriceTrend = 'up' | 'down';

@Component
export default class BookWidget extends Mixins(TranslationMixin) {
  priceTrend: PriceTrend = 'down';

  get iconTrend(): string {
    return this.priceTrend === 'up' ? 'arrows-arrow-bold-top-24' : 'arrows-arrow-bold-bottom-24';
  }

  getComputedClassTrend(): string {
    const base = ['stock-book-delimiter'];

    if (this.priceTrend === 'up') {
      base.push('stock-book-delimiter--up');
    } else {
      base.push('stock-book-delimiter--down');
    }

    return base.join(' ');
  }

  get sellOrders() {
    return [
      {
        price: '23.178100',
        amount: '112.28100',
        total: '2,602.460246',
        filled: 34,
      },
      {
        price: '23.178100',
        amount: '112.28100',
        total: '2,602.460246',
        filled: 22,
      },
      {
        price: '23.178100',
        amount: '112.28100',
        total: '2,602.460246',
        filled: 12,
      },
      {
        price: '23.178100',
        amount: '112.28100',
        total: '2,602.460246',
        filled: 79,
      },
      {
        price: '23.178100',
        amount: '112.28100',
        total: '2,602.460246',
        filled: 81,
      },
      {
        price: '23.178100',
        amount: '112.28100',
        total: '2,602.460246',
        filled: 54,
      },
      {
        price: '23.178100',
        amount: '112.28100',
        total: '2,602.460246',
        filled: 34,
      },
      {
        price: '23.178100',
        amount: '112.28100',
        total: '2,602.460246',
        filled: 99,
      },
      {
        price: '23.178100',
        amount: '112.28100',
        total: '2,602.460246',
        filled: 2,
      },
    ];
  }

  getStyles(filled) {
    return `width: ${filled}%`;
  }
}
</script>

<style lang="scss">
.stock-book {
  .row {
    display: flex;
    justify-content: space-between;
    margin: 2px;
    transform-style: preserve-3d;
  }

  .order-info {
    padding: 4px 16px 4px 16px;
    transform: scaleX(-1);
  }

  &-buy,
  &-sell {
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

    .mark-price {
      font-size: 24px;
      font-weight: 450;
      padding-left: 24px;
    }

    .last-traded-price {
      font-weight: 450;
      font-size: 18px;
      margin-left: 24px;
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
    background: #e7dadd;
    display: flex;
    width: 100%;
    color: var(--s-color-base-content-primary);
    padding: 4px 16px 4px 16px;
    justify-content: space-between;
    font-family: Sora;
    font-size: 14px;
    font-style: normal;
    font-weight: 550;
    line-height: 150%;
    letter-spacing: -0.26px;
    text-transform: uppercase;
  }

  h4 {
    margin: 16px 0 10px 16px;
    font-weight: 500;
  }
}
</style>
