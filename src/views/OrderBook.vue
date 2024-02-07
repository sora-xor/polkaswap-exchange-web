<template>
  <div>
    <div v-if="isScreenHuge" class="order-book-widgets--huge">
      <div class="column-1">
        <set-limit-order-widget class="set-widget" />
        <customise-page-widget :visible.sync="settingsVisibility" class="setting-widget" />
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
import isEmpty from 'lodash/fp/isEmpty';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import SelectedTokenRouteMixin from '@/components/mixins/SelectedTokensRouteMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { BreakpointClass, Components, PageNames } from '@/consts';
import { goTo, lazyComponent } from '@/router';
import { action, getter, mutation, state } from '@/store/decorators';

import type { OrderBook, OrderBookId } from '@sora-substrate/liquidity-proxy';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    BookWidget: lazyComponent(Components.BookWidget),
    SetLimitOrderWidget: lazyComponent(Components.SetLimitOrderWidget),
    HistoryOrderWidget: lazyComponent(Components.HistoryOrderWidget),
    BookChartsWidget: lazyComponent(Components.BookChartsWidget),
    MarketTradesWidget: lazyComponent(Components.MarketTradesWidget),
    CustomisePageWidget: lazyComponent(Components.CustomisePage),
  },
})
export default class OrderBookView extends Mixins(TranslationMixin, mixins.LoadingMixin, SelectedTokenRouteMixin) {
  @state.orderBook.orderBooks private orderBooks!: Record<string, OrderBook>;
  @state.settings.screenBreakpointClass private responsiveClass!: BreakpointClass;

  @getter.settings.orderBookEnabled orderBookEnabled!: Nullable<boolean>;
  @getter.orderBook.orderBookId orderBookId!: string;
  @getter.orderBook.baseAsset private baseAsset!: Nullable<RegisteredAccountAsset>;
  @getter.orderBook.quoteAsset private quoteAsset!: Nullable<RegisteredAccountAsset>;

  @mutation.orderBook.setCurrentOrderBook private setCurrentOrderBook!: (orderBookId: OrderBookId) => void;

  @action.orderBook.getOrderBooksInfo private getOrderBooksInfo!: AsyncFnWithoutArgs;
  @action.orderBook.subscribeToOrderBookStats private subscribeToOrderBookStats!: AsyncFnWithoutArgs;
  @action.orderBook.unsubscribeFromOrderBookStats private unsubscribeFromOrderBookStats!: FnWithoutArgs;
  @action.orderBook.unsubscribeFromBidsAndAsks private unsubscribeFromBidsAndAsks!: FnWithoutArgs;

  settingsVisibility = false;

  @Watch('orderBookId', { immediate: true })
  private updateSubscription(): void {
    this.subscribeToOrderBookStats();
    if (!(this.firstRouteAddress && this.secondRouteAddress)) {
      return;
    }
    // We need to check only base asset cuz quote might be only XOR for now
    if (this.baseAsset?.address !== this.firstRouteAddress) {
      this.updateRouteAfterSelectTokens(this.baseAsset, this.quoteAsset);
    }
  }

  @Watch('orderBookEnabled', { immediate: true })
  private checkAvailability(value: Nullable<boolean>): void {
    if (value === false) {
      goTo(PageNames.Swap);
    }
  }

  get isScreenHuge(): boolean {
    return this.responsiveClass === BreakpointClass.HugeDesktop;
  }

  /** Overrides SelectedTokenRouteMixin */
  async setData(params: { firstAddress: string; secondAddress: string }): Promise<void> {
    if (isEmpty(this.orderBooks)) {
      await this.getOrderBooksInfo();
    }
    const orderbooks = Object.values(this.orderBooks);

    const orderbook = orderbooks.find(
      ({ orderBookId }) => orderBookId.base === params.firstAddress && orderBookId.quote === params.secondAddress
    );
    if (orderbook) {
      this.setCurrentOrderBook(orderbook.orderBookId);
    }
  }

  created(): void {
    this.withApi(async () => {
      await this.getOrderBooksInfo();
      if (this.orderBookId) {
        this.updateRouteAfterSelectTokens(this.baseAsset, this.quoteAsset);
        return;
      }

      const orderbooks = Object.values(this.orderBooks);
      this.parseCurrentRoute();
      if (this.isValidRoute && this.firstRouteAddress && this.secondRouteAddress) {
        const orderbook = orderbooks.find(
          ({ orderBookId }) =>
            orderBookId.base === this.firstRouteAddress && orderBookId.quote === this.secondRouteAddress
        );
        if (orderbook) {
          this.setCurrentOrderBook(orderbook.orderBookId);
        }
      }

      // If it's still not set, we need to select 1st from the list
      if (!this.orderBookId) {
        const orderbook = orderbooks[0];
        if (orderbook) {
          this.setCurrentOrderBook(orderbook.orderBookId);
          this.updateRouteAfterSelectTokens(this.baseAsset, this.quoteAsset);
        }
      }
    });
  }

  beforeDestroy(): void {
    this.unsubscribeFromOrderBookStats();
    this.unsubscribeFromBidsAndAsks();
  }
}
</script>

<style lang="scss">
.order-book {
  &-widgets {
    width: 1010px;

    .column-2 {
      margin-top: $inner-spacing-mini;
      margin-bottom: $inner-spacing-mini;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;

      .set-widget {
        flex-basis: 49.5%;
      }

      .book-widget {
        flex-basis: 49.5%;
      }

      @include large-desktop {
        justify-content: space-between;

        margin-top: var(--s-size-mini);
        margin-bottom: var(--s-size-mini);

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
          margin-top: var(--s-size-mini);
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
          margin-bottom: $inner-spacing-mini;
        }
      }

      .column-3 {
        .order-history-header-filter-buttons {
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
          flex-direction: column;
          justify-content: flex-start;
          flex: none;
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
    margin-left: 110px;
    display: flex;

    .column-1 {
      width: 440px;
      margin-right: $inner-spacing-mini;
    }

    .column-2 {
      width: 1010px;
      .history-widget {
        margin-top: $inner-spacing-mini;
      }
    }

    .column-3 {
      width: 440px;
      margin-left: $inner-spacing-mini;
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
  margin-top: $inner-spacing-mini;
}
</style>
