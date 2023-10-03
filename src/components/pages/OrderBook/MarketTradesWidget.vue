<template>
  <div class="order-book-widget market-trades">
    <h4>
      Market trades
      <s-tooltip slot="suffix" border-radius="mini" :content="t('alerts.typeTooltip')" placement="top" tabindex="-1">
        <s-icon name="info-16" size="14px" />
      </s-tooltip>
    </h4>
    <div class="book-columns">
      <div>time</div>
      <div>price</div>
      <div>amount</div>
    </div>
    <div v-for="order in completedOrders" :key="order.price" class="row">
      <span class="order-info">{{ order.time }}</span>
      <span class="order-info">{{ order.price }}</span>
      <span class="order-info">{{ order.amount }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class MarketTradesWidget extends Mixins(TranslationMixin) {
  get completedOrders() {
    return [
      { time: '8/26 14:12:26', price: '900.40 ETH', amount: '12.56 XOR' },
      { time: '8/26 14:13:26', price: '900.40 ETH', amount: '88.53 XOR' },
      { time: '8/26 15:12:26', price: '910.40 ETH', amount: '117.56 XOR' },
      { time: '8/26 16:25:26', price: '930.40 ETH', amount: '142.16 XOR' },
      { time: '8/26 17:59:26', price: '934.40 ETH', amount: '9.99 XOR' },
      { time: '8/26 18:11:26', price: '921.40 ETH', amount: '12.56 XOR' },
      { time: '8/26 19:12:26', price: '920.40 ETH', amount: '3.50 XOR' },
    ];
  }
}
</script>

<style lang="scss">
.market-trades {
  .row {
    display: flex;
    justify-content: space-between;
    margin: 2px;
  }

  .order-info {
    padding: 4px 16px 4px 16px;
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
