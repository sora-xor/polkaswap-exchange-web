import { h as computed, z as defineComponent, aZ as components, ak as lazyComponent, u as useTranslation, at as useRoute, au as useRouter, H as useAssetsStore, a_ as resolveComponent, A as createElementBlock, C as openBlock, D as createBaseVNode, ap as createVNode, aN as toDisplayString, aj as unref, ao as withCtx, bb as normalizeClass, al as Components, aa as OrderBookStatus, de as getBookDecimals, F as FPNumber } from "./index-73GArslZ.js";
import { u as useOrderBookStore } from "./index-BDxnS5Vu.js";
function useOrderBookPairList() {
  const orderBookStore = useOrderBookStore();
  const orderBooks = computed(
    () => orderBookStore.orderBooks ?? {}
  );
  const orderBooksStats = computed(
    () => orderBookStore.orderBooksStats ?? {}
  );
  const selectOrderBook = (id) => {
    orderBookStore.setCurrentOrderBook(id);
  };
  return {
    orderBooks,
    orderBooksStats,
    selectOrderBook
  };
}
const _hoisted_1 = { class: "order-book-popover" };
const _hoisted_2 = { class: "order-book-popover__title" };
const _hoisted_3 = { class: "book-pair" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      PairTokenLogo: lazyComponent(Components.PairTokenLogo),
      PriceChange: lazyComponent(Components.PriceChange),
      FormattedAmount: components.FormattedAmount
    }
  },
  __name: "PairListPopover",
  emits: ["close"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const emit = __emit;
    const { t } = useTranslation();
    const route = useRoute();
    const router = useRouter();
    const assetsStore = useAssetsStore();
    const { orderBooks, orderBooksStats, selectOrderBook } = useOrderBookPairList();
    const getTooltipText = (status) => {
      switch (status) {
        case OrderBookStatus.Trade:
          return t("orderBook.tooltip.bookStatus.active");
        case OrderBookStatus.PlaceAndCancel:
          return t("orderBook.tooltip.bookStatus.placeable");
        case OrderBookStatus.OnlyCancel:
          return t("orderBook.tooltip.bookStatus.cancelable");
        case OrderBookStatus.Stop:
          return t("orderBook.tooltip.bookStatus.inactive");
        default:
          return t("unknownErrorText");
      }
    };
    const mapBookStatus = (status) => {
      switch (status) {
        case OrderBookStatus.Trade:
          return t("orderBook.bookStatus.active");
        case OrderBookStatus.PlaceAndCancel:
          return t("orderBook.bookStatus.placeable");
        case OrderBookStatus.OnlyCancel:
          return t("orderBook.bookStatus.cancelable");
        case OrderBookStatus.Stop:
          return t("orderBook.bookStatus.inactive");
        default:
          return t("unknownErrorText");
      }
    };
    const calculateColor = (status) => {
      if ([OrderBookStatus.Trade, OrderBookStatus.PlaceAndCancel].includes(status)) {
        return "status-live";
      }
      if ([OrderBookStatus.OnlyCancel, OrderBookStatus.Stop].includes(status)) {
        return "status-stop";
      }
      return void 0;
    };
    const tableItems = computed(() => {
      return Object.entries(orderBooks.value).reduce((buffer, [orderBookKey, value]) => {
        if (!orderBookKey) return buffer;
        const { base, quote } = value.orderBookId;
        const decimals = getBookDecimals(value);
        const stats = orderBooksStats.value[orderBookKey];
        const price = (stats?.price ?? FPNumber.ZERO).dp(decimals);
        const priceChange = stats?.priceChange ?? FPNumber.ZERO;
        const volume = stats?.volume ?? FPNumber.ZERO;
        const baseAsset = assetsStore.assetDataByAddress(base);
        const targetAsset = assetsStore.assetDataByAddress(quote);
        const row = {
          id: value.orderBookId,
          baseAsset,
          targetAsset,
          pair: `${baseAsset?.symbol}-${targetAsset?.symbol}`,
          status: value.status,
          price: price.toLocaleString(),
          priceChange,
          volumeNumber: volume.toNumber(),
          volume: volume.toLocaleString()
        };
        const insertIndex = buffer.findIndex(
          (item) => row.status > item.status || row.status === item.status && row.id.dexId > item.id.dexId || row.status === item.status && row.id.dexId === item.id.dexId && row.volumeNumber > item.volumeNumber
        );
        if (insertIndex !== -1) {
          buffer.splice(insertIndex, 0, row);
        } else {
          buffer.push(row);
        }
        return buffer;
      }, []);
    });
    const chooseBook = (row) => {
      selectOrderBook(row.id);
      const routeName = route.name || "OrderBook";
      void router.replace({
        name: routeName,
        params: {
          first: row.id.base,
          second: row.id.quote
        }
      });
      emit("close");
    };
    const handleClickStatusTooltip = (event) => {
      event?.stopPropagation();
    };
    __expose({
      tableItems,
      chooseBook,
      getTooltipText,
      mapBookStatus,
      calculateColor
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_tooltip = resolveComponent("s-tooltip");
      const _component_pair_token_logo = resolveComponent("pair-token-logo");
      const _component_s_table_column = resolveComponent("s-table-column");
      const _component_formatted_amount = resolveComponent("formatted-amount");
      const _component_price_change = resolveComponent("price-change");
      const _component_s_table = resolveComponent("s-table");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          createBaseVNode("span", null, toDisplayString(unref(t)("orderBook.tradingPair.choosePair")), 1),
          createVNode(_component_s_tooltip, {
            "border-radius": "mini",
            content: unref(t)("orderBook.tooltip.pairsList"),
            placement: "top",
            tabindex: "-1"
          }, {
            default: withCtx(() => [
              createVNode(_component_s_icon, {
                name: "info-16",
                size: "14px"
              })
            ]),
            _: 1
          }, 8, ["content"])
        ]),
        createVNode(_component_s_table, {
          class: "orderbook-whitelist-table",
          data: tableItems.value,
          "highlight-current-row": false,
          onRowClick: chooseBook
        }, {
          default: withCtx(() => [
            createVNode(_component_s_table_column, { width: "184" }, {
              header: withCtx(() => [
                createBaseVNode("span", null, toDisplayString(unref(t)("orderBook.tokenPair")), 1)
              ]),
              default: withCtx(({ row }) => [
                createVNode(_component_pair_token_logo, {
                  "first-token": row.baseAsset,
                  "second-token": row.targetAsset,
                  size: "small"
                }, null, 8, ["first-token", "second-token"]),
                createBaseVNode("div", _hoisted_3, [
                  createBaseVNode("div", null, toDisplayString(row.pair), 1)
                ])
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, { width: "130" }, {
              header: withCtx(() => [
                createBaseVNode("span", null, toDisplayString(unref(t)("priceText")), 1)
              ]),
              default: withCtx(({ row }) => [
                createVNode(_component_formatted_amount, {
                  value: row.price,
                  "fiat-sign": ""
                }, null, 8, ["value"])
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, { width: "110" }, {
              header: withCtx(() => [
                createBaseVNode("span", null, toDisplayString(unref(t)("orderBook.tradingPair.volume")), 1)
              ]),
              default: withCtx(({ row }) => [
                createVNode(_component_formatted_amount, {
                  value: row.volume,
                  "is-fiat-value": ""
                }, null, 8, ["value"])
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, { width: "100" }, {
              header: withCtx(() => [..._cache[0] || (_cache[0] = [
                createBaseVNode("span", null, "1D %", -1)
              ])]),
              default: withCtx(({ row }) => [
                createVNode(_component_price_change, {
                  value: row.priceChange
                }, null, 8, ["value"])
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, { width: "176" }, {
              header: withCtx(() => [
                createBaseVNode("span", null, toDisplayString(unref(t)("orderBook.tradingPair.status")), 1)
              ]),
              default: withCtx(({ row }) => [
                createBaseVNode("span", {
                  class: normalizeClass(calculateColor(row.status))
                }, toDisplayString(mapBookStatus(row.status)), 3),
                createVNode(_component_s_tooltip, {
                  "border-radius": "mini",
                  content: getTooltipText(row.status),
                  placement: "top",
                  tabindex: "-1",
                  class: "status-tooltip"
                }, {
                  default: withCtx(() => [
                    createBaseVNode("button", {
                      class: "status-tooltip__trigger",
                      type: "button",
                      onClick: handleClickStatusTooltip
                    }, [
                      createVNode(_component_s_icon, {
                        name: "info-16",
                        size: "14px"
                      })
                    ])
                  ]),
                  _: 1
                }, 8, ["content"])
              ]),
              _: 1
            })
          ]),
          _: 1
        }, 8, ["data"])
      ]);
    };
  }
});
export {
  _sfc_main as default
};
