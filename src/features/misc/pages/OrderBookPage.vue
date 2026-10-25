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
import { DAI, KUSD } from '@sora-substrate/sdk/build/assets/consts';
import { useRouter } from 'vue-router';

import { useLoading } from '@/composables/useLoading';
import { useOrderBook } from '@/composables/useOrderBook';
import { useOrderBookManagement } from '@/composables/useOrderBookManagement';
import { usePiniaTelemetry } from '@/composables/usePiniaTelemetry';
import { PageNames } from '@/consts';
import { BreakpointClass } from '@/consts/layout';
import { useSelectedTokensRoute } from '@/shared/navigation/useSelectedTokensRoute';
import { useSettingsStore } from '@/stores/settings';
import { useOrderBookStore } from '@/stores/orderBook';
import { useWalletStore } from '@/stores/wallet';

import type { OrderBook, OrderBookId } from '@sora-substrate/liquidity-proxy';
import type { AccountAsset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Nullable } from '@/types/common';
import BookChartsWidget from '@/features/misc/components/order-book/BookChartsWidget.vue';
import BookWidget from '@/features/misc/components/order-book/BookWidget.vue';
import CustomisePageWidget from '@/features/misc/components/order-book/Dialogs/CustomisePage.vue';
import HistoryOrderWidget from '@/features/misc/components/order-book/HistoryOrderWidget.vue';
import MarketTradesWidget from '@/features/misc/components/order-book/MarketTradesWidget.vue';
import SetLimitOrderWidget from '@/features/misc/components/order-book/SetLimitOrderWidget.vue';

defineOptions({ name: 'OrderBookPage' });

const settingsVisibility = ref(false);

const router = useRouter();
const settingsStore = useSettingsStore();
const walletStore = useWalletStore();
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

const { route, firstRouteAddress, secondRouteAddress, parseCurrentRoute, updateRouteAfterSelectTokens } =
  useSelectedTokensRoute(async ({ firstAddress, secondAddress }) => {
    await selectOrderBookByAddresses(firstAddress, secondAddress);
  });

const isScreenHuge = computed(() => responsiveClass.value === BreakpointClass.HugeDesktop);
const hasRouteParams = computed(() => Boolean(route.params.first && route.params.second));
const hasResolvedRoutePair = computed(() => Boolean(firstRouteAddress.value && secondRouteAddress.value));
const routeLookupReady = computed(
  () =>
    Object.keys(walletStore.whitelistIdsBySymbol ?? {}).length > 0 &&
    Object.keys(walletStore.assetsDataTable ?? {}).length > 0
);

const syncRouteFromCurrentOrderBook = () => {
  const base = baseAsset.value;
  const quote = quoteAsset.value;

  if (base?.symbol && quote?.symbol) {
    updateRouteAfterSelectTokens(base, quote);
  }
};

const selectFallbackOrderBook = async () => {
  if (orderBookId.value) return;

  if (isEmpty(orderBooks.value)) {
    await getOrderBooksInfo();
  }

  const orderbookList = Object.values(orderBooks.value);
  const preferredFallback = orderbookList.find(
    ({ orderBookId }) => orderBookId.base === DAI.address && orderBookId.quote === KUSD.address
  );

  const fallback =
    preferredFallback ??
    [...orderbookList].sort((a, b) => {
      if (a.status !== b.status) {
        return b.status > a.status ? 1 : -1;
      }
      return b.orderBookId.dexId - a.orderBookId.dexId;
    })[0];

  if (!fallback) return;

  setCurrentOrderBook(fallback.orderBookId as OrderBookId);
  await nextTick();
  syncRouteFromCurrentOrderBook();
};

watch(
  orderBookId,
  (id) => {
    if (id) {
      void subscribeToOrderBookStats();
    }
  },
  { immediate: true }
);

watch(
  [orderBookId, baseAsset, quoteAsset, firstRouteAddress, secondRouteAddress],
  ([id, base, quote, first, second]) => {
    if (!(id && base?.address && quote?.address && base?.symbol && quote?.symbol)) return;
    if (hasRouteParams.value && !hasResolvedRoutePair.value) return;
    if (first === base.address && second === quote.address) return;

    updateRouteAfterSelectTokens(base, quote);
  }
);

watch(
  [hasRouteParams, firstRouteAddress, secondRouteAddress],
  ([hasParams, first, second]) => {
    if (!(hasParams && first && second)) return;

    void selectOrderBookByAddresses(first, second);
  },
  { immediate: true }
);

watch([hasRouteParams, hasResolvedRoutePair, routeLookupReady], ([hasParams, hasResolvedPair, lookupReady]) => {
  if (!(hasParams && !hasResolvedPair && lookupReady)) return;

  const isValid = parseCurrentRoute();
  if (!isValid) {
    void selectFallbackOrderBook();
  }
});

watch(
  orderBookEnabled,
  (value) => {
    if (value === false) {
      void router.push({ name: PageNames.Swap });
    }
  },
  { immediate: true }
);

onMounted(() => {
  const hasRequestedPairInRoute = hasRouteParams.value;

  if (!hasRequestedPairInRoute) {
    const base = baseAsset.value;
    const quote = quoteAsset.value;

    if (base?.symbol && quote?.symbol) {
      updateRouteAfterSelectTokens(base, quote);
    } else {
      updateRouteAfterSelectTokens(
        { address: DAI.address, symbol: DAI.symbol } as AccountAsset,
        { address: KUSD.address, symbol: KUSD.symbol } as AccountAsset
      );
    }
  }

  void withApi(async () => {
    await getOrderBooksInfo();

    if (hasRequestedPairInRoute) {
      if (hasResolvedRoutePair.value) {
        parseCurrentRoute();
        await selectOrderBookByAddresses(firstRouteAddress.value, secondRouteAddress.value);
      } else if (routeLookupReady.value) {
        const isValid = parseCurrentRoute();
        if (!isValid) {
          await selectFallbackOrderBook();
          return;
        }
      }
    }

    if (!orderBookId.value && !(hasRequestedPairInRoute && !hasResolvedRoutePair.value && !routeLookupReady.value)) {
      await selectFallbackOrderBook();
    }

    const shouldDeferRouteSync = hasRouteParams.value && !hasResolvedRoutePair.value && !routeLookupReady.value;
    if (!shouldDeferRouteSync) {
      syncRouteFromCurrentOrderBook();
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
