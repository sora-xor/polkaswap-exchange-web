<template>
  <div class="order-book-widget book">
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
    <div class="order-book-widget-sell">
      <div v-for="order in sellOrders" :key="order.price" class="row">
        <span class="order-info">{{ order.price }}</span>
        <span class="order-info">{{ order.amount }}</span>
        <span class="order-info">{{ order.total }}</span>
      </div>
    </div>
    <div class="order-book-widget-delimiter"><span>22.386800</span> <span>$22.54</span></div>
    <div class="order-book-widget-buy">
      <div v-for="order in sellOrders" :key="order.price" class="row">
        <span class="order-info">{{ order.price }}</span>
        <span class="order-info">{{ order.amount }}</span>
        <span class="order-info">{{ order.total }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { delay } from '@/utils';

@Component
export default class BookWidget extends Mixins(TranslationMixin) {
  get sellOrders() {
    return [
      {
        price: '23.178100',
        amount: '112.28100',
        total: '2,602.460246',
      },
      {
        price: '23.178100',
        amount: '112.28100',
        total: '2,602.460246',
      },
      {
        price: '23.178100',
        amount: '112.28100',
        total: '2,602.460246',
      },
      {
        price: '23.178100',
        amount: '112.28100',
        total: '2,602.460246',
      },
      {
        price: '23.178100',
        amount: '112.28100',
        total: '2,602.460246',
      },
      {
        price: '23.178100',
        amount: '112.28100',
        total: '2,602.460246',
      },
      {
        price: '23.178100',
        amount: '112.28100',
        total: '2,602.460246',
      },
      {
        price: '23.178100',
        amount: '112.28100',
        total: '2,602.460246',
      },
      {
        price: '23.178100',
        amount: '112.28100',
        total: '2,602.460246',
      },
    ];
  }

  async mounted() {}
}
</script>

<style lang="scss">
.book {
  --row-width: 50px;
}

.order-book-widget {
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

  &-sell,
  &-buy {
    transform: scaleX(-1);
    .row::after {
      content: '';
      display: inline-block;
      transform: translateZ(-1px);
      width: var(--row-width);
      height: 24px;
      position: absolute;
    }
  }

  &-sell {
    .row::after {
      background: rgba(255, 216, 235, 0.8);
    }
  }

  &-buy {
    .row::after {
      background: rgba(185, 235, 219, 0.4);
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
