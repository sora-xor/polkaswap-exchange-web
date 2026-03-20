import { z as defineComponent, ak as lazyComponent, al as Components, e as useSettingsStore, v as useWalletStore, U as useLoading, aA as watch, h as computed, bG as goTo, V as PageNames, a4 as onMounted, ax as DAI, aw as KUSD, aB as onBeforeUnmount, A as createElementBlock, C as openBlock, D as createBaseVNode, ap as createVNode, aj as unref, a9 as ref, cx as isEmpty, b5 as nextTick, cy as BreakpointClass } from "./index-73GArslZ.js";
import { u as useOrderBook } from "./useOrderBook-BhgjjoQG.js";
import { u as useOrderBookManagement } from "./useOrderBookManagement-DQ_IdVc7.js";
import { u as usePiniaTelemetry } from "./usePiniaTelemetry-DKBIwNF3.js";
import { u as useSelectedTokensRoute } from "./useSelectedTokensRoute-FZz8yy9f.js";
import { u as useOrderBookStore } from "./index-BDxnS5Vu.js";
import "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = {
  key: 0,
  class: "order-book-widgets--huge"
};
const _hoisted_2 = { class: "column-1" };
const _hoisted_3 = { class: "column-2" };
const _hoisted_4 = { class: "column-3" };
const _hoisted_5 = {
  key: 1,
  class: "order-book-widgets"
};
const _hoisted_6 = { class: "column-2" };
const _hoisted_7 = { class: "column-3" };
const _hoisted_8 = { class: "column-1" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{ name: "OrderBookView" },
  __name: "OrderBook",
  setup(__props) {
    const BookWidget = lazyComponent(Components.BookWidget);
    const SetLimitOrderWidget = lazyComponent(Components.SetLimitOrderWidget);
    const HistoryOrderWidget = lazyComponent(Components.HistoryOrderWidget);
    const BookChartsWidget = lazyComponent(Components.BookChartsWidget);
    const MarketTradesWidget = lazyComponent(Components.MarketTradesWidget);
    const CustomisePageWidget = lazyComponent(Components.CustomisePage);
    const settingsVisibility = ref(false);
    const settingsStore = useSettingsStore();
    const walletStore = useWalletStore();
    const responsiveClass = computed(() => settingsStore.screenBreakpointClass);
    const orderBookEnabled = computed(() => settingsStore.orderBookEnabled);
    const { orderBookId, baseAsset, quoteAsset } = useOrderBook();
    const orderBookStore = useOrderBookStore();
    usePiniaTelemetry(
      "order-book",
      [
        { store: settingsStore, storeId: "settings" },
        { store: orderBookStore, storeId: "orderBook" }
      ],
      {
        metadata: () => ({
          orderBookId: orderBookId.value || null,
          baseAsset: baseAsset.value?.symbol ?? null,
          quoteAsset: quoteAsset.value?.symbol ?? null
        })
      }
    );
    const {
      orderBooks,
      setCurrentOrderBook,
      getOrderBooksInfo,
      subscribeToOrderBookStats,
      unsubscribeFromOrderBookStats,
      unsubscribeFromBidsAndAsks
    } = useOrderBookManagement();
    const { withApi } = useLoading();
    const selectOrderBookByAddresses = async (firstAddress, secondAddress) => {
      if (!firstAddress || !secondAddress) return;
      if (isEmpty(orderBooks.value)) {
        await getOrderBooksInfo();
      }
      const orderbook = Object.values(orderBooks.value).find(
        ({ orderBookId: id }) => id.base === firstAddress && id.quote === secondAddress
      );
      if (orderbook) {
        setCurrentOrderBook(orderbook.orderBookId);
        await nextTick();
      }
    };
    const { route, firstRouteAddress, secondRouteAddress, parseCurrentRoute, updateRouteAfterSelectTokens } = useSelectedTokensRoute(async ({ firstAddress, secondAddress }) => {
      await selectOrderBookByAddresses(firstAddress, secondAddress);
    });
    const isScreenHuge = computed(() => responsiveClass.value === BreakpointClass.HugeDesktop);
    const hasRouteParams = computed(() => Boolean(route.params.first && route.params.second));
    const hasResolvedRoutePair = computed(() => Boolean(firstRouteAddress.value && secondRouteAddress.value));
    const routeLookupReady = computed(
      () => Object.keys(walletStore.whitelistIdsBySymbol ?? {}).length > 0 && Object.keys(walletStore.assetsDataTable ?? {}).length > 0
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
        ({ orderBookId: orderBookId2 }) => orderBookId2.base === DAI.address && orderBookId2.quote === KUSD.address
      );
      const fallback = preferredFallback ?? [...orderbookList].sort((a, b) => {
        if (a.status !== b.status) {
          return b.status > a.status ? 1 : -1;
        }
        return b.orderBookId.dexId - a.orderBookId.dexId;
      })[0];
      if (!fallback) return;
      setCurrentOrderBook(fallback.orderBookId);
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
          goTo(PageNames.Swap);
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
            { address: DAI.address, symbol: DAI.symbol },
            { address: KUSD.address, symbol: KUSD.symbol }
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
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", null, [
        isScreenHuge.value ? (openBlock(), createElementBlock("div", _hoisted_1, [
          createBaseVNode("div", _hoisted_2, [
            createVNode(unref(SetLimitOrderWidget), { class: "set-widget" }),
            createVNode(unref(CustomisePageWidget), {
              visible: settingsVisibility.value,
              "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => settingsVisibility.value = $event),
              class: "setting-widget"
            }, null, 8, ["visible"])
          ]),
          createBaseVNode("div", _hoisted_3, [
            createVNode(unref(BookChartsWidget), {
              class: "chart-widget",
              "pip-disabled": ""
            }),
            createVNode(unref(HistoryOrderWidget), {
              class: "history-widget",
              "pip-disabled": ""
            })
          ]),
          createBaseVNode("div", _hoisted_4, [
            createVNode(unref(BookWidget), {
              class: "book-widget",
              "pip-disabled": ""
            }),
            createVNode(unref(MarketTradesWidget), {
              class: "trades-widget",
              "pip-disabled": ""
            })
          ])
        ])) : (openBlock(), createElementBlock("div", _hoisted_5, [
          createBaseVNode("div", _hoisted_6, [
            createVNode(unref(SetLimitOrderWidget), { class: "set-widget" }),
            createVNode(unref(BookWidget), {
              class: "book-widget",
              "pip-disabled": ""
            })
          ]),
          createBaseVNode("div", _hoisted_7, [
            createVNode(unref(HistoryOrderWidget), {
              class: "history-widget",
              "pip-disabled": ""
            }),
            createVNode(unref(MarketTradesWidget), {
              class: "trades-widget",
              "pip-disabled": ""
            })
          ]),
          createBaseVNode("div", _hoisted_8, [
            createVNode(unref(BookChartsWidget), {
              class: "chart-widget",
              "pip-disabled": ""
            })
          ])
        ]))
      ]);
    };
  }
});
export {
  _sfc_main as default
};
