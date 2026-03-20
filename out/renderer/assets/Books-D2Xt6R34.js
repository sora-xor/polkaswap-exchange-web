import { z as defineComponent, aZ as components, ak as lazyComponent, u as useTranslation, U as useLoading, c0 as toRef, s as store, a4 as onMounted, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, C as openBlock, bA as withDirectives, ap as createVNode, h as computed, am as createBlock, ao as withCtx, D as createBaseVNode, aN as toDisplayString, aj as unref, bb as normalizeClass, aO as createTextVNode, aI as WALLET_CONSTS, al as Components, a9 as ref, cB as fetchOrderBooks, cC as KnownAssets, bN as SortDirection, F as FPNumber, bp as formatAmountWithSuffix, cD as showMostFittingValue, cE as sortPools } from "./index-73GArslZ.js";
import { u as useExploreTable } from "./useExploreTable-1H0JA_Cc.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "explore-table-item-index" };
const _hoisted_2 = { class: "explore-table-item-logo" };
const _hoisted_3 = { class: "explore-table-item-info explore-table-item-info--head" };
const _hoisted_4 = { class: "explore-table__primary" };
const _hoisted_5 = { class: "explore-table-item-index explore-table-item-index--body" };
const _hoisted_6 = { class: "explore-table-item-info explore-table-item-info--body" };
const _hoisted_7 = { class: "explore-table-item-name" };
const _hoisted_8 = { class: "explore-table__primary" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      PairTokenLogo: lazyComponent(Components.PairTokenLogo),
      PriceChange: lazyComponent(Components.PriceChange),
      SortButton: lazyComponent(Components.SortButton),
      TokenAddress: components.TokenAddress,
      FormattedAmount: components.FormattedAmount,
      HistoryPagination: components.HistoryPagination
    }
  },
  __name: "Books",
  props: {
    exploreQuery: { default: "" },
    isAccountItemsOnly: { type: Boolean, default: false },
    parentLoading: { type: Boolean, default: false }
  },
  setup(__props) {
    const props = __props;
    const { t, TranslationConsts } = useTranslation();
    const { getAssetFiatPrice } = useFormattedAmount();
    const parentLoading = toRef(props, "parentLoading");
    const { loading, withLoading, withParentLoading } = useLoading({ parentLoading });
    const FontWeightRate = WALLET_CONSTS.FontWeightRate;
    const loadingState = computed(() => parentLoading.value || loading.value);
    const orderBooks = ref([]);
    const getAsset = store.getters.assets.assetDataByAddress;
    const whitelistAssets = computed(() => store.getters.assets.whitelistAssets);
    const allowedAssets = computed(
      () => whitelistAssets.value.length ? whitelistAssets.value : [...KnownAssets]
    );
    const prefilteredItems = computed(() => {
      const items = orderBooks.value.reduce((buffer, item) => {
        const {
          id: { base, quote },
          stats: { baseAssetReserves, quoteAssetReserves, price, priceChange, volume }
        } = item;
        const baseAsset = getAsset(base);
        const targetAsset = getAsset(quote);
        if (!(baseAsset && targetAsset)) return buffer;
        const name = `${baseAsset.symbol}-${targetAsset.symbol}`;
        const fpBaseAssetPrice = FPNumber.fromCodecValue(getAssetFiatPrice(baseAsset) ?? 0);
        const fpQuoteAssetPrice = FPNumber.fromCodecValue(getAssetFiatPrice(targetAsset) ?? 0);
        const fpBaseAssetReserves = FPNumber.fromCodecValue(baseAssetReserves ?? 0, baseAsset.decimals);
        const fpQuoteAssetReserves = FPNumber.fromCodecValue(quoteAssetReserves ?? 0, targetAsset.decimals);
        const fpTvl = fpBaseAssetPrice.mul(fpBaseAssetReserves).add(fpQuoteAssetPrice.mul(fpQuoteAssetReserves));
        const fpPriceUSD = price.mul(fpQuoteAssetPrice);
        buffer.push({
          name,
          baseAsset,
          targetAsset,
          price: price.toNumber(),
          priceFormatted: showMostFittingValue(price),
          priceUSDFormatted: fpPriceUSD.toLocaleString(),
          priceChangeDay: priceChange.toNumber(),
          priceChangeDayFP: priceChange,
          volumeDay: volume.toNumber(),
          volumeDayFormatted: formatAmountWithSuffix(volume),
          tvl: fpTvl.toNumber(),
          tvlFormatted: formatAmountWithSuffix(fpTvl)
        });
        return buffer;
      }, []);
      return [...items].sort(
        (a, b) => sortPools(
          { baseAsset: a.baseAsset, poolAsset: a.targetAsset },
          { baseAsset: b.baseAsset, poolAsset: b.targetAsset }
        )
      );
    });
    const filterItems = (items, search) => {
      return items.filter(
        (item) => [item.name, item.baseAsset.name, item.baseAsset.symbol, item.baseAsset.address, item.targetAsset.name].concat([item.targetAsset.symbol, item.targetAsset.address]).some((value) => value?.toLowerCase?.().includes(search))
      );
    };
    const {
      order,
      property,
      currentPage,
      pageAmount,
      total,
      lastPage,
      startIndex,
      tableItems,
      tableRef,
      isDefaultSort,
      changeSort,
      handleResetSort,
      handlePaginationClick
    } = useExploreTable({
      items: prefilteredItems,
      query: () => props.exploreQuery,
      filter: filterItems,
      defaultOrder: SortDirection.DESC,
      defaultProperty: "tvl"
    });
    const updateExploreData = async () => {
      await withLoading(async () => {
        await withParentLoading(async () => {
          orderBooks.value = Object.freeze(await fetchOrderBooks(allowedAssets.value) ?? []);
        });
      });
    };
    onMounted(() => {
      void updateExploreData();
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_pair_token_logo = resolveComponent("pair-token-logo");
      const _component_s_table_column = resolveComponent("s-table-column");
      const _component_sort_button = resolveComponent("sort-button");
      const _component_formatted_amount = resolveComponent("formatted-amount");
      const _component_price_change = resolveComponent("price-change");
      const _component_s_tooltip = resolveComponent("s-tooltip");
      const _component_s_table = resolveComponent("s-table");
      const _component_history_pagination = resolveComponent("history-pagination");
      const _directive_button = resolveDirective("button");
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createElementBlock("div", null, [
        withDirectives((openBlock(), createBlock(_component_s_table, {
          ref_key: "tableRef",
          ref: tableRef,
          data: unref(tableItems),
          "adapt-breakpoint": 0,
          "highlight-current-row": false,
          size: "small",
          class: "explore-table"
        }, {
          default: withCtx(() => [
            createVNode(_component_s_table_column, {
              width: "240",
              label: "#"
            }, {
              header: withCtx(() => [
                createBaseVNode("div", _hoisted_1, [
                  withDirectives((openBlock(), createElementBlock("span", {
                    class: normalizeClass(["explore-table-item-index--head", { active: unref(isDefaultSort) }]),
                    onClick: _cache[0] || (_cache[0] = //@ts-ignore
                    (...args) => unref(handleResetSort) && unref(handleResetSort)(...args))
                  }, [..._cache[1] || (_cache[1] = [
                    createTextVNode(" # ", -1)
                  ])], 2)), [
                    [_directive_button]
                  ])
                ]),
                createBaseVNode("div", _hoisted_2, [
                  createVNode(_component_s_icon, {
                    name: "various-bone-24",
                    size: "14px",
                    class: "explore-table-item-logo--head"
                  })
                ]),
                createBaseVNode("div", _hoisted_3, [
                  createBaseVNode("span", _hoisted_4, toDisplayString(unref(t)("nameText")), 1)
                ])
              ]),
              default: withCtx(({ $index, index, row }) => [
                createBaseVNode("span", _hoisted_5, toDisplayString((typeof ($index ?? index) === "number" && Number.isFinite($index ?? index) ? $index ?? index : unref(tableItems).indexOf(row)) + unref(startIndex) + 1), 1),
                createVNode(_component_pair_token_logo, {
                  "first-token": row.baseAsset,
                  "second-token": row.targetAsset,
                  size: "small",
                  class: "explore-table-item-logo"
                }, null, 8, ["first-token", "second-token"]),
                createBaseVNode("div", _hoisted_6, [
                  createBaseVNode("div", _hoisted_7, toDisplayString(row.baseAsset.symbol) + "-" + toDisplayString(row.targetAsset.symbol), 1)
                ])
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, {
              key: "price",
              "min-width": "130",
              "header-align": "right",
              align: "right"
            }, {
              header: withCtx(() => [
                createVNode(_component_sort_button, {
                  name: "price",
                  sort: { order: unref(order), property: unref(property) },
                  onChangeSort: unref(changeSort)
                }, {
                  default: withCtx(() => [..._cache[2] || (_cache[2] = [
                    createBaseVNode("span", { class: "explore-table__primary" }, "Price", -1)
                  ])]),
                  _: 1
                }, 8, ["sort", "onChangeSort"])
              ]),
              default: withCtx(({ row }) => [
                createVNode(_component_formatted_amount, {
                  "fiat-default-rounding": "",
                  "font-weight-rate": unref(FontWeightRate).MEDIUM,
                  value: row.priceFormatted,
                  class: "explore-table-item-price"
                }, null, 8, ["font-weight-rate", "value"]),
                createVNode(_component_formatted_amount, {
                  "is-fiat-value": "",
                  "fiat-default-rounding": "",
                  "font-weight-rate": unref(FontWeightRate).MEDIUM,
                  value: row.priceUSDFormatted,
                  class: "explore-table-item-price"
                }, null, 8, ["font-weight-rate", "value"])
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, {
              "min-width": "104",
              "header-align": "right",
              align: "right"
            }, {
              header: withCtx(() => [
                createVNode(_component_sort_button, {
                  name: "priceChangeDay",
                  sort: { order: unref(order), property: unref(property) },
                  onChangeSort: unref(changeSort)
                }, {
                  default: withCtx(() => [..._cache[3] || (_cache[3] = [
                    createBaseVNode("span", { class: "explore-table__primary" }, "1D %", -1)
                  ])]),
                  _: 1
                }, 8, ["sort", "onChangeSort"])
              ]),
              default: withCtx(({ row }) => [
                createVNode(_component_price_change, {
                  value: row.priceChangeDayFP
                }, null, 8, ["value"])
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, {
              "min-width": "104",
              "header-align": "right",
              align: "right"
            }, {
              header: withCtx(() => [
                createVNode(_component_sort_button, {
                  name: "volumeDay",
                  sort: { order: unref(order), property: unref(property) },
                  onChangeSort: unref(changeSort)
                }, {
                  default: withCtx(() => [..._cache[4] || (_cache[4] = [
                    createBaseVNode("span", { class: "explore-table__primary" }, "1D Vol.", -1)
                  ])]),
                  _: 1
                }, 8, ["sort", "onChangeSort"])
              ]),
              default: withCtx(({ row }) => [
                createVNode(_component_formatted_amount, {
                  "is-fiat-value": "",
                  "font-weight-rate": unref(FontWeightRate).MEDIUM,
                  value: row.volumeDayFormatted.amount,
                  class: "explore-table-item-price explore-table-item-amount"
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(row.volumeDayFormatted.suffix), 1)
                  ]),
                  _: 2
                }, 1032, ["font-weight-rate", "value"])
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, {
              "min-width": "104",
              "header-align": "right",
              align: "right"
            }, {
              header: withCtx(() => [
                createVNode(_component_sort_button, {
                  name: "tvl",
                  sort: { order: unref(order), property: unref(property) },
                  onChangeSort: unref(changeSort)
                }, {
                  default: withCtx(() => [
                    createBaseVNode("span", _hoisted_8, toDisplayString(unref(TranslationConsts).TVL), 1),
                    createVNode(_component_s_tooltip, {
                      "border-radius": "mini",
                      content: unref(t)("tooltips.tvl")
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
                  _: 1
                }, 8, ["sort", "onChangeSort"])
              ]),
              default: withCtx(({ row }) => [
                createVNode(_component_formatted_amount, {
                  "is-fiat-value": "",
                  "font-weight-rate": unref(FontWeightRate).MEDIUM,
                  value: row.tvlFormatted.amount,
                  class: "explore-table-item-price explore-table-item-amount"
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(row.tvlFormatted.suffix), 1)
                  ]),
                  _: 2
                }, 1032, ["font-weight-rate", "value"])
              ]),
              _: 1
            })
          ]),
          _: 1
        }, 8, ["data"])), [
          [_directive_loading, loadingState.value]
        ]),
        createVNode(_component_history_pagination, {
          class: "explore-table-pagination",
          "current-page": unref(currentPage),
          "page-amount": unref(pageAmount),
          total: unref(total),
          "last-page": unref(lastPage),
          loading: loadingState.value,
          onPaginationClick: unref(handlePaginationClick)
        }, null, 8, ["current-page", "page-amount", "total", "last-page", "loading", "onPaginationClick"])
      ]);
    };
  }
});
export {
  _sfc_main as default
};
