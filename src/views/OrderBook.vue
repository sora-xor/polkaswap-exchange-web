<template>
  <div class="order-book-widgets">
    <div class="column-1">
      <set-limit-order-widget class="set-widget" />
    </div>
    <div class="column-2">
      <book-charts-widget class="chart-widget" />
      <history-order-widget class="history-widget" />
    </div>
    <div class="column-3">
      <book-widget class="book-widget" />
      <!-- <market-trades-widget class="market-widget" /> -->
    </div>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { action, mutation, state } from '@/store/decorators';

import type { NavigationGuardNext, Route } from 'vue-router';

@Component({
  components: {
    BookWidget: lazyComponent(Components.BookWidget),
    SetLimitOrderWidget: lazyComponent(Components.SetLimitOrderWidget),
    HistoryOrderWidget: lazyComponent(Components.HistoryOrderWidget),
    BookChartsWidget: lazyComponent(Components.BookChartsWidget),
    MarketTradesWidget: lazyComponent(Components.MarketTradesWidget),
  },
})
export default class OrderBook extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @state.orderBook.orderBooks orderBooks!: any;
  @state.orderBook.orderBookUpdates orderBookUpdates!: any;
  @state.orderBook.baseAssetAddress baseAssetAddress!: string;

  @action.orderBook.subscribeToOrderBook subscribeToOrderBook!: any;
  @action.orderBook.unsubscribeFromOrderBook unsubscribeFromOrderBook!: AsyncFnWithoutArgs;

  async beforeRouteLeave(to: Route, from: Route, next: NavigationGuardNext<Vue>): Promise<void> {
    this.unsubscribeFromOrderBook();
    next();
  }

  async mounted(): Promise<void> {
    if (!this.orderBookUpdates.length && this.baseAssetAddress) {
      await this.subscribeToOrderBook({ base: this.baseAssetAddress });
    }
  }
}
</script>

<style lang="scss">
.order-book {
  &-widgets {
    display: flex;
    flex-wrap: nowrap;
    margin-left: calc($sidebar-max-width + 8px);

    .set-widget {
    }
    .chart-widget {
      max-height: 600px;
      min-height: 500px;
    }
    .history-widget {
      min-height: 500px;
    }
    .book-widget {
      min-height: 630px;
    }
    .market-widget {
      min-height: 400px;
      max-height: 400px;
    }

    .column-1 {
      min-width: 400px;
      max-width: 500px;
    }

    .column-2 {
      min-width: 1000px;
    }

    .column-3 {
      min-width: 480px;
      max-width: 490px;
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
