<template>
  <div>
    <div v-if="isScreenHuge()" class="order-book-widgets--huge">
      <div class="column-1">
        <set-limit-order-widget class="set-widget" />
      </div>
      <div class="column-2">
        <book-charts-widget class="chart-widget" />
        <history-order-widget class="history-widget" />
      </div>
      <div class="column-3">
        <book-widget class="book-widget" />
        <market-trades-widget class="trades-widget" />
      </div>
    </div>
    <div v-else class="order-book-widgets">
      <div class="column-1">
        <book-charts-widget class="chart-widget" />
      </div>
      <div class="column-2">
        <set-limit-order-widget class="set-widget" />
        <book-widget class="book-widget" />
      </div>
      <div class="column-3">
        <history-order-widget class="history-widget" />
        <market-trades-widget class="trades-widget" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { BreakpointClass, Components } from '@/consts';
import { lazyComponent } from '@/router';
import { action, getter, mutation, state } from '@/store/decorators';

import type { OrderBook, OrderBookId } from '@sora-substrate/liquidity-proxy';

@Component({
  components: {
    BookWidget: lazyComponent(Components.BookWidget),
    SetLimitOrderWidget: lazyComponent(Components.SetLimitOrderWidget),
    HistoryOrderWidget: lazyComponent(Components.HistoryOrderWidget),
    BookChartsWidget: lazyComponent(Components.BookChartsWidget),
    MarketTradesWidget: lazyComponent(Components.MarketTradesWidget),
  },
})
export default class OrderBookView extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @state.orderBook.orderBooks orderBooks!: Record<string, OrderBook>;
  @state.settings.screenBreakpointClass responsiveClass!: BreakpointClass;

  @action.orderBook.getPlaceOrderNetworkFee private getPlaceOrderFee!: AsyncFnWithoutArgs;
  @action.orderBook.getOrderBooksInfo private getOrderBooksInfo!: AsyncFnWithoutArgs;
  @mutation.orderBook.setCurrentOrderBook setCurrentOrderBook!: (orderBookId: OrderBookId) => void;

  @getter.orderBook.orderBookId private orderBookId!: string;
  @action.orderBook.subscribeToOrderBookStats private subscribeToOrderBookStats!: AsyncFnWithoutArgs;
  @action.orderBook.unsubscribeFromOrderBookStats private unsubscribeFromOrderBookStats!: FnWithoutArgs;

  @Watch('orderBookId', { immediate: true })
  private updateSubscription() {
    this.subscribeToOrderBookStats();
  }

  beforeDestroy(): void {
    this.unsubscribeFromOrderBookStats();
  }

  async mounted(): Promise<void> {
    await this.withApi(async () => {
      await Promise.all([this.getOrderBooksInfo(), this.getPlaceOrderFee()]);
      this.checkCurrentOrderBook();
    });
  }

  private checkCurrentOrderBook(): void {
    if (!this.orderBookId) {
      const book = Object.values(this.orderBooks)[0];

      if (book) {
        this.setCurrentOrderBook(book.orderBookId);
      }
    }
  }

  isScreenHuge(): boolean {
    return this.responsiveClass === BreakpointClass.HugeDesktop;
  }
}
</script>

<style lang="scss">
.order-book {
  &-widgets {
    width: 1010px;

    .column-2 {
      margin-top: 8px;
      margin-bottom: 8px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;

      .set-widget {
        flex-basis: 49.5%;
      }

      .book-widget {
        flex-basis: 49.5%;
      }
    }

    .column-2 {
      @include large-desktop {
        justify-content: space-between;

        .set-widget {
          flex-basis: 48%;
        }

        .book-widget {
          flex-basis: 48%;
        }
      }
    }

    .column-3 {
      @include large-desktop {
        .trades-widget {
          margin-left: auto;
          margin-right: auto;
        }
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
  .order-book-widgets--huge {
    margin-left: 170px;
    display: flex;

    .column-1 {
      width: 440px;
      margin-right: 8px;
    }

    .column-2 {
      width: 1010px;
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

.app-main--orderbook {
  .icon-container {
    & + span {
      @include desktop(true) {
        display: none;
      }
    }
  }

  .order-book-widgets {
    @include desktop {
      margin-left: 64px;
    }

    @include large-desktop {
      margin-left: 0;
    }
  }
}

.trades-widget {
  margin-top: 8px;
}
</style>
