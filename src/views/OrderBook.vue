<template>
  <div>
    <div v-if="isScreenHuge" class="order-book-widgets--huge">
      <div class="column-1">
        <SetLimitOrderWidget class="set-widget"></SetLimitOrderWidget>
        <CustomisePageWidget v-model:visible="settingsVisibility" class="setting-widget"></CustomisePageWidget>
      </div>
      <div class="column-2">
        <BookChartsWidget class="chart-widget" pip-disabled></BookChartsWidget>
        <HistoryOrderWidget class="history-widget" pip-disabled></HistoryOrderWidget>
      </div>
      <div class="column-3">
        <BookWidget class="book-widget" pip-disabled></BookWidget>
        <MarketTradesWidget class="trades-widget" pip-disabled></MarketTradesWidget>
      </div>
    </div>
    <div v-else class="order-book-widgets">
      <div class="column-2">
        <SetLimitOrderWidget class="set-widget"></SetLimitOrderWidget>
        <BookWidget class="book-widget" pip-disabled></BookWidget>
      </div>
      <div class="column-3">
        <HistoryOrderWidget class="history-widget" pip-disabled></HistoryOrderWidget>
        <MarketTradesWidget class="trades-widget" pip-disabled></MarketTradesWidget>
      </div>
      <div class="column-1">
        <BookChartsWidget class="chart-widget" pip-disabled></BookChartsWidget>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import isEmpty from 'lodash/fp/isEmpty';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useLoading } from '@/composables/useLoading';
import { useOrderBook } from '@/composables/useOrderBook';
import { useOrderBookManagement } from '@/composables/useOrderBookManagement';
import { usePiniaTelemetry } from '@/composables/usePiniaTelemetry';
import { useSelectedTokensRoute } from '@/composables/useSelectedTokensRoute';
import { Components, PageNames } from '@/consts';
import { BreakpointClass } from '@/consts/layout';
import { goTo, lazyComponent } from '@/router';
import { useSettingsStore } from '@/stores/settings';
import { useOrderBookStore } from '@/stores/orderBook';

import type { OrderBook, OrderBookId } from '@sora-substrate/liquidity-proxy';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Nullable } from '@/types/common';

const BookWidget = lazyComponent(Components.BookWidget);
const SetLimitOrderWidget = lazyComponent(Components.SetLimitOrderWidget);
const HistoryOrderWidget = lazyComponent(Components.HistoryOrderWidget);
const BookChartsWidget = lazyComponent(Components.BookChartsWidget);
const MarketTradesWidget = lazyComponent(Components.MarketTradesWidget);
const CustomisePageWidget = lazyComponent(Components.CustomisePage);

defineOptions({ name: 'OrderBookView' });

const settingsVisibility = ref(false);

const settingsStore = useSettingsStore();
const responsiveClass = computed(() => settingsStore.screenBreakpointClass as BreakpointClass);
const orderBookEnabled = computed(() => settingsStore.orderBookEnabled as Nullable<boolean>);
const { orderBookId, baseAsset, quoteAsset } = useOrderBook();
const orderBookStore = useOrderBookStore();
usePiniaTelemetry(
  'order-book',
  [
    { store: settingsStore, storeId: 'settings' },
    { store: orderBookStore, storeId: 'orderBook' },
  ],
  {
    metadata: () => ({
      orderBookId: orderBookId.value || null,
      baseAsset: baseAsset.value?.symbol ?? null,
      quoteAsset: quoteAsset.value?.symbol ?? null,
    }),
  }
);
const {
  orderBooks,
  setCurrentOrderBook,
  getOrderBooksInfo,
  subscribeToOrderBookStats,
  unsubscribeFromOrderBookStats,
  unsubscribeFromBidsAndAsks,
} = useOrderBookManagement();

const { withApi } = useLoading();

const selectOrderBookByAddresses = async (firstAddress?: string, secondAddress?: string): Promise<void> => {
  if (!firstAddress || !secondAddress) return;

  if (isEmpty(orderBooks.value)) {
    await getOrderBooksInfo();
  }

  const orderbook = Object.values(orderBooks.value).find(
    ({ orderBookId: id }) => id.base === firstAddress && id.quote === secondAddress
  );

  if (orderbook) {
    setCurrentOrderBook(orderbook.orderBookId as OrderBookId);
    await nextTick();
  }
};

const { firstRouteAddress, secondRouteAddress, parseCurrentRoute, updateRouteAfterSelectTokens } =
  useSelectedTokensRoute(async ({ firstAddress, secondAddress }) => {
    await selectOrderBookByAddresses(firstAddress, secondAddress);
  });

const isScreenHuge = computed(() => responsiveClass.value === BreakpointClass.HugeDesktop);

watch(
  orderBookId,
  (id) => {
    if (id) {
      void subscribeToOrderBookStats();
      const base = baseAsset.value;
      const quote = quoteAsset.value;
      if (base?.address && quote?.address && firstRouteAddress.value && base.address !== firstRouteAddress.value) {
        updateRouteAfterSelectTokens(base, quote);
      }
    }
  },
  { immediate: true }
);

watch(
  orderBookEnabled,
  (value) => {
    if (value === false) {
      goTo(PageNames.Swap);
    }
  },
  { immediate: true }
);

onMounted(() => {
  void withApi(async () => {
    await getOrderBooksInfo();

    if (orderBookId.value) {
      const base = baseAsset.value;
      const quote = quoteAsset.value;
      if (base && quote) {
        updateRouteAfterSelectTokens(base, quote);
      }
      return;
    }
    const orderbookList = Object.values(orderBooks.value);
    parseCurrentRoute();

    if (firstRouteAddress.value && secondRouteAddress.value) {
      await selectOrderBookByAddresses(firstRouteAddress.value, secondRouteAddress.value);
    }

    if (!orderBookId.value) {
      const fallback = [...orderbookList].sort((a, b) => {
        if (a.status !== b.status) {
          return b.status > a.status ? 1 : -1;
        }
        return b.orderBookId.dexId - a.orderBookId.dexId;
      })[0];

      if (fallback) {
        setCurrentOrderBook(fallback.orderBookId as OrderBookId);
        await nextTick();
        const base = baseAsset.value;
        const quote = quoteAsset.value;
        if (base && quote) {
          updateRouteAfterSelectTokens(base, quote);
        }
      }
    }
  });
});

onBeforeUnmount(() => {
  unsubscribeFromOrderBookStats();
  unsubscribeFromBidsAndAsks();
});
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
        .order-history-buttons--filter-buttons {
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

    .column-1 {
      margin-top: $inner-spacing-mini;
      @include large-desktop {
        margin-top: var(--s-size-mini);
      }
    }
  }
}

.min-huge-desktop {
  .order-book-widgets--huge {
    margin-left: 110px;
    display: flex;

    .column-1 {
      width: 440px;
      margin-right: $inner-spacing-mini;
      margin-top: 0;
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
  .app-sidebar .icon-container {
    & + span {
      @include large-mobile {
        @include desktop(true) {
          display: none;
        }
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
