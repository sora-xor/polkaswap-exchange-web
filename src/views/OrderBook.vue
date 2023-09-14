<template>
  <div class="order-book-widgets">
    <set-limit-order-widget class="set-widget" />
    <book-charts-widget class="chart-widget" />
    <history-order-widget class="history-widget" />
    <book-widget class="book-widget" />
  </div>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';

@Component({
  components: {
    BookWidget: lazyComponent(Components.BookWidget),
    SetLimitOrderWidget: lazyComponent(Components.SetLimitOrderWidget),
    HistoryOrderWidget: lazyComponent(Components.HistoryOrderWidget),
    BookChartsWidget: lazyComponent(Components.BookChartsWidget),
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
      '. history .'
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
