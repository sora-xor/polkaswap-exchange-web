<template>
  <div class="order-book-widgets">
    <s-row>
      <s-col>
        <book-charts-widget class="chart-widget" />
      </s-col>
    </s-row>
    <s-row :gutter="5">
      <s-col :xs="6" :sm="6" :md="6" :lg="6">
        <set-limit-order-widget class="set-widget" />
      </s-col>
      <s-col :xs="6" :sm="6" :md="6" :lg="6">
        <book-widget class="book-widget" />
      </s-col>
    </s-row>
    <s-row>
      <history-order-widget class="history-widget" />
    </s-row>
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
  @action.orderBook.unsubscribeFromOrderBook unsubscribeFromOrderBook!: FnWithoutArgs;

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
    width: 900px;

    margin-left: calc($sidebar-max-width + 8px);

    .set-widget {
    }
    .chart-widget {
    }
    .history-widget {
    }
    .book-widget {
    }
    .market-widget {
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
