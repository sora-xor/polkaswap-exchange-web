<template>
  <div class="order-book-widgets">
    <set-limit-order-widget class="set-widget" />
    <book-charts-widget class="chart-widget" />
    <history-order-widget class="history-widget" />
    <book-widget class="book-widget" />
    <market-trades-widget class="market-widget" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';

@Component({
  components: {
    BookWidget: lazyComponent(Components.BookWidget),
    SetLimitOrderWidget: lazyComponent(Components.SetLimitOrderWidget),
    HistoryOrderWidget: lazyComponent(Components.HistoryOrderWidget),
    BookChartsWidget: lazyComponent(Components.BookChartsWidget),
    MarketTradesWidget: lazyComponent(Components.MarketTradesWidget),
  },
})
export default class OrderBook extends Mixins(TranslationMixin) {}
</script>

<style lang="scss">
.order-book {
  &-widgets {
    display: grid;
    grid-template-rows: 1fr 1fr;
    grid-template-columns: 1fr 2fr 1fr;
    grid-template-areas:
      'set chart book'
      '. history market'
      '. history .';
    margin-left: calc($sidebar-max-width + 8px);

    .set-widget {
      grid-area: set;
    }
    .chart-widget {
      grid-area: chart;
    }
    .history-widget {
      grid-area: history;
    }
    .book-widget {
      grid-area: book;
    }
    .market-widget {
      grid-area: market;
    }
  }

  &-widget {
    margin: 8px;
    padding: unset;
    background-color: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-dialog);
    color: var(--s-color-base-content-primary);
    border-radius: var(--s-border-radius-small);
  }
}
</style>

<style lang="scss" scoped>
.containerr {
  margin: 0 auto 0;
}
</style>
