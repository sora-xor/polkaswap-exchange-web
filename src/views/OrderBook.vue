<template>
  <div>
    <div class="order-book-widgets">
      <div class="column-1">
        <book-charts-widget class="chart-widget" />
      </div>
      <div class="column-2">
        <set-limit-order-widget class="set-widget" />
        <book-widget class="book-widget" />
      </div>
      <div class="column-3">
        <history-order-widget class="history-widget" />
      </div>
    </div>
    <!-- <div class="order-book-widgetss">
      <div class="column-1">
        <set-limit-order-widget class="set-widget" />
      </div>
      <div class="column-2">
        <book-charts-widget class="chart-widget" />
        <history-order-widget class="history-widget" />
      </div>
      <div class="column-3">
        <book-widget class="book-widget" />
      </div>
    </div> -->
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

  largeDesktop = true;

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

    .column-2 {
      margin-top: 8px;
      margin-bottom: 8px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;

      .set-widget {
        flex-basis: 49%;
      }

      .book-widget {
        flex-basis: 49.5%;
      }
    }

    @include large-desktop(true) {
      max-width: 740px;
    }

    @include tablet(true) {
      max-width: 420px;

      .column-2 {
        justify-content: center;
        align-items: center;
        flex-direction: column;

        .book-widget {
          min-width: 420px;
        }

        .set-widget {
          max-width: 420px;
          margin-bottom: 8px;
        }
      }

      .column-3 {
        .order-history-header-filter-buttons {
          display: flex;
          flex-direction: column;
        }
      }
    }

    @include mobile(true) {
      max-width: 364px;

      .column-2 {
        .book-widget {
          width: 360px;
          min-width: unset;
        }
      }

      .column-3 {
        .order-history-header-cancel-buttons {
          display: flex;
          flex-direction: column;
        }
      }
    }
  }

  &-widget {
    padding: unset;
    background-color: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-dialog);
    color: var(--s-color-base-content-primary);
    border-radius: var(--s-border-radius-small);
  }
}

.min-huge-desktop {
  .order-book-widgetss {
    display: flex;

    .column-1 {
      width: 440px;
      margin-right: 8px;
    }

    .column-2 {
      .history-widget {
        margin-top: 8px;
      }
    }

    .column-3 {
      width: 440px;
      margin-left: 8px;
    }
  }
}
</style>
