import { z as defineComponent, ak as lazyComponent, al as Components, aZ as components, u as useTranslation, s as store, aA as watch, a4 as onMounted, b5 as nextTick, aB as onBeforeUnmount, a9 as ref, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, C as openBlock, D as createBaseVNode, ap as createVNode, aj as unref, ao as withCtx, am as createBlock, aM as createCommentVNode, aN as toDisplayString, h as computed, bA as withDirectives, bb as normalizeClass, aO as createTextVNode, aI as WALLET_CONSTS, bN as SortDirection, F as FPNumber, cY as HundredNumber, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "collaterals-search" };
const _hoisted_2 = { class: "explore-table-item-index" };
const _hoisted_3 = { class: "explore-table-item-index explore-table-item-index--body" };
const _hoisted_4 = { class: "explore-table-item-info explore-table-item-info--body" };
const _hoisted_5 = { class: "explore-table-item-name" };
const _hoisted_6 = { class: "explore-table__primary" };
const _hoisted_7 = { class: "explore-table__accent" };
const _hoisted_8 = { class: "explore-table__accent" };
const _hoisted_9 = { class: "explore-table-item-tokens" };
const _hoisted_10 = { class: "explore-table-cell" };
const _hoisted_11 = {
  key: 0,
  class: "explore-table-cell"
};
const _hoisted_12 = { class: "explore-table-item-tokens" };
const _hoisted_13 = { class: "explore-table-cell" };
const _hoisted_14 = {
  key: 0,
  class: "explore-table-cell"
};
const _hoisted_15 = { class: "explore-table-item-tokens" };
const _hoisted_16 = { class: "explore-table-cell" };
const _hoisted_17 = {
  key: 0,
  class: "explore-table-cell"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ExploreCollaterals",
  props: {
    exploreQuery: {}
  },
  emits: ["open", "update-search"],
  setup(__props, { emit: __emit }) {
    const PairTokenLogo = lazyComponent(Components.PairTokenLogo);
    const SortButton = lazyComponent(Components.SortButton);
    lazyComponent(Components.DataRowSkeleton);
    const TokenLogo = components.TokenLogo;
    const FormattedAmount = components.FormattedAmount;
    const HistoryPagination = components.HistoryPagination;
    const SearchInput = components.SearchInput;
    const FontSizeRate = WALLET_CONSTS.FontSizeRate;
    WALLET_CONSTS.FontWeightRate;
    const ZERO = FPNumber.ZERO;
    const props = __props;
    const emit = __emit;
    const tableRef = ref(null);
    const teardownScrollSync = ref(null);
    const { getFPNumberFiatAmountByFPNumber } = useFormattedAmount();
    const { t } = useTranslation();
    const collaterals = computed(() => store.state.vault.collaterals);
    const percentFormat = computed(() => store.state.settings.percentFormat);
    const collapsed = computed(() => store.state.settings.menuCollapsed ?? false);
    const isLoggedIn = computed(() => store.getters.wallet.account.isLoggedIn);
    const getAsset = store.getters.assets.assetDataByAddress;
    const order = ref(SortDirection.DESC);
    const property = ref("totalDebtValue");
    const currentPage = ref(1);
    const pageAmount = ref(10);
    const loadingState = ref(false);
    const formatPercent = (value) => {
      const percent = value / HundredNumber;
      return percentFormat.value?.format?.(percent) ?? `${percent * HundredNumber}%`;
    };
    const prefilteredItems = computed(
      () => Object.values(collaterals.value).reduce((acc, collateral) => {
        const lockedAsset = getAsset(collateral.lockedAssetId);
        const debtAsset = getAsset(collateral.debtAssetId);
        if (!(lockedAsset && debtAsset)) return acc;
        const stabilityFeeValue = collateral.riskParams.stabilityFeeAnnual.toNumber();
        const stabilityFee = formatPercent(stabilityFeeValue);
        const maxLtvValue = collateral.riskParams.liquidationRatioReversed;
        const maxLtv = formatPercent(maxLtvValue);
        const totalLocked = collateral.totalLocked.toLocaleString(2);
        const totalLockedFiatFp = getFPNumberFiatAmountByFPNumber(collateral.totalLocked, lockedAsset) ?? ZERO;
        const totalLockedValue = totalLockedFiatFp.toNumber();
        const totalLockedFiat = totalLockedFiatFp.toLocaleString(2);
        const totalDebt = collateral.debtSupply.toLocaleString(2);
        const totalDebtFiatFp = getFPNumberFiatAmountByFPNumber(collateral.debtSupply, debtAsset) ?? ZERO;
        const totalDebtValue = totalDebtFiatFp.toNumber();
        const totalDebtFiat = totalDebtFiatFp.toLocaleString(2);
        let availableToBorrowValue = 0;
        let availableToBorrow = "0";
        let availableToBorrowFiat = "0";
        let isAvailable = false;
        const availableToBorrowFp = collateral.riskParams.hardCap.sub(collateral.debtSupply).dp(2);
        if (availableToBorrowFp.isGtZero()) {
          isAvailable = true;
          availableToBorrow = availableToBorrowFp.toLocaleString(2);
          const availableToBorrowFiatFp = getFPNumberFiatAmountByFPNumber(availableToBorrowFp, debtAsset) ?? ZERO;
          availableToBorrowValue = availableToBorrowFiatFp.toNumber();
          availableToBorrowFiat = availableToBorrowFiatFp.toLocaleString(2);
        }
        acc.push({
          name: `${debtAsset.symbol}/${lockedAsset.symbol}`,
          lockedAsset,
          debtAsset,
          stabilityFeeValue,
          stabilityFee,
          totalLockedValue,
          totalLocked,
          totalLockedFiat,
          totalDebtValue,
          totalDebt,
          totalDebtFiat,
          availableToBorrowValue,
          availableToBorrow,
          availableToBorrowFiat,
          isAvailable,
          maxLtv,
          maxLtvValue
        });
        return acc;
      }, [])
    );
    const filteredItems = computed(() => {
      const search = props.exploreQuery.toLowerCase().trim();
      if (!search) return prefilteredItems.value;
      const filterAsset = (asset) => asset?.name?.toLowerCase?.().includes(search) || asset?.symbol?.toLowerCase?.().includes(search) || asset?.address?.toLowerCase?.() === search;
      return prefilteredItems.value.filter((item) => {
        return item.name.toLowerCase().includes(search) || filterAsset(item.lockedAsset) || filterAsset(item.debtAsset);
      });
    });
    const isDefaultSort = computed(() => !property.value);
    const preparedItems = computed(() => {
      if (isDefaultSort.value) return filteredItems.value;
      const isAscending = order.value === SortDirection.ASC;
      const prop = property.value;
      return [...filteredItems.value].sort((a, b) => {
        const aValue = a[prop];
        const bValue = b[prop];
        if (aValue === bValue) return 0;
        return (isAscending ? aValue > bValue : aValue < bValue) ? 1 : -1;
      });
    });
    const total = computed(() => preparedItems.value.length);
    const lastPage = computed(() => total.value ? Math.ceil(total.value / pageAmount.value) : 1);
    const startIndex = computed(() => (currentPage.value - 1) * pageAmount.value);
    const sliceStart = computed(() => {
      if (!total.value) return 0;
      const start = startIndex.value;
      if (start >= total.value) {
        return Math.max(total.value - pageAmount.value, 0);
      }
      return start;
    });
    const tableItems = computed(() => {
      const start = sliceStart.value;
      const end = start + pageAmount.value;
      return preparedItems.value.slice(start, end);
    });
    watch(
      () => props.exploreQuery,
      () => {
        currentPage.value = 1;
      }
    );
    watch(total, () => {
      if (currentPage.value > lastPage.value) {
        currentPage.value = lastPage.value;
      }
    });
    const changeSort = ({ order: newOrder = SortDirection.DESC, property: newProperty = "" } = {}) => {
      order.value = newOrder;
      property.value = newProperty;
    };
    const handleResetSort = () => {
      changeSort();
    };
    const sortState = computed(() => ({
      order: order.value,
      property: property.value
    }));
    const handlePaginationClick = (button) => {
      switch (button) {
        case WALLET_CONSTS.PaginationButton.Prev:
          currentPage.value = Math.max(currentPage.value - 1, 1);
          break;
        case WALLET_CONSTS.PaginationButton.Next:
          currentPage.value = Math.min(currentPage.value + 1, lastPage.value);
          break;
        case WALLET_CONSTS.PaginationButton.Last:
          currentPage.value = lastPage.value;
          break;
        default:
          currentPage.value = 1;
      }
    };
    const openSelectedPosition = (row) => {
      if (!(isLoggedIn.value && row.isAvailable)) return;
      emit("open", row.lockedAsset, row.debtAsset);
    };
    const updateSearch = (value) => {
      emit("update-search", value);
    };
    const resetSearch = () => {
      emit("update-search", "");
    };
    const initScrollbarSync = () => {
      teardownScrollSync.value?.();
      const tableComponent = tableRef.value;
      const elTable = tableComponent?.$refs?.table;
      const bodyWrapper = elTable?.$refs?.bodyWrapper;
      const headerWrapper = elTable?.$refs?.headerWrapper;
      if (!bodyWrapper || !headerWrapper) return;
      const syncScroll = () => {
        const scrollLeft = bodyWrapper.scrollLeft;
        headerWrapper.scrollLeft = scrollLeft;
        elTable.scrollPosition = scrollLeft === 0 ? "left" : "right";
      };
      bodyWrapper.addEventListener("scroll", syncScroll, { passive: true });
      syncScroll();
      teardownScrollSync.value = () => {
        bodyWrapper.removeEventListener("scroll", syncScroll);
      };
    };
    onMounted(async () => {
      await nextTick();
      initScrollbarSync();
    });
    watch(tableItems, () => {
      nextTick().then(() => initScrollbarSync());
    });
    onBeforeUnmount(() => {
      teardownScrollSync.value?.();
      teardownScrollSync.value = null;
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_table_column = resolveComponent("s-table-column");
      const _component_s_tooltip = resolveComponent("s-tooltip");
      const _component_s_table = resolveComponent("s-table");
      const _directive_button = resolveDirective("button");
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["collaterals-container container", { "menu-collapsed": collapsed.value }])
      }, [
        createBaseVNode("div", _hoisted_1, [
          createVNode(unref(SearchInput), {
            class: "search",
            autofocus: "",
            value: __props.exploreQuery,
            placeholder: unref(t)("searchText"),
            onInput: updateSearch,
            onClear: resetSearch
          }, null, 8, ["value", "placeholder"])
        ]),
        createVNode(_component_s_table, {
          ref: "table",
          data: tableItems.value,
          "highlight-current-row": false,
          size: "small",
          class: "collaterals-table explore-table",
          onCellClick: openSelectedPosition
        }, {
          default: withCtx(() => [
            createVNode(_component_s_table_column, {
              width: "250",
              label: "#"
            }, {
              header: withCtx(() => [
                createBaseVNode("div", _hoisted_2, [
                  withDirectives((openBlock(), createElementBlock("span", {
                    class: normalizeClass(["explore-table-item-index--head", { active: isDefaultSort.value }]),
                    onClick: handleResetSort
                  }, [..._cache[0] || (_cache[0] = [
                    createTextVNode(" # ", -1)
                  ])], 2)), [
                    [_directive_button]
                  ])
                ]),
                _cache[1] || (_cache[1] = createBaseVNode("div", { class: "explore-table-item-info explore-table-item-info--head" }, [
                  createBaseVNode("span", { class: "explore-table__primary" }, "DEBT / COLLATERAL")
                ], -1))
              ]),
              default: withCtx(({ $index, index, row }) => [
                createBaseVNode("span", _hoisted_3, toDisplayString((typeof ($index ?? index) === "number" && Number.isFinite($index ?? index) ? $index ?? index : tableItems.value.indexOf(row)) + sliceStart.value + 1), 1),
                createVNode(unref(PairTokenLogo), {
                  class: "explore-table-item-logo",
                  size: "small",
                  "first-token": row.debtAsset,
                  "second-token": row.lockedAsset
                }, null, 8, ["first-token", "second-token"]),
                createBaseVNode("div", _hoisted_4, [
                  createBaseVNode("div", _hoisted_5, toDisplayString(row.debtAsset.symbol) + " / " + toDisplayString(row.lockedAsset.symbol), 1)
                ]),
                isLoggedIn.value && row.isAvailable ? (openBlock(), createBlock(_component_s_icon, {
                  key: 0,
                  name: "plus-16",
                  size: "12"
                })) : createCommentVNode("", true)
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, {
              width: "140",
              "header-align": "right",
              align: "right"
            }, {
              header: withCtx(() => [
                createVNode(unref(SortButton), {
                  name: "stabilityFeeValue",
                  sort: sortState.value,
                  onChangeSort: changeSort
                }, {
                  default: withCtx(() => [
                    createBaseVNode("span", _hoisted_6, toDisplayString(unref(t)("kensetsu.interest")), 1),
                    createVNode(_component_s_tooltip, {
                      "border-radius": "mini",
                      content: unref(t)("kensetsu.interestDescription")
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
                }, 8, ["sort"])
              ]),
              default: withCtx(({ row }) => [
                createBaseVNode("span", _hoisted_7, toDisplayString(row.stabilityFee), 1)
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, {
              width: "120",
              "header-align": "right",
              align: "right"
            }, {
              header: withCtx(() => [
                createVNode(unref(SortButton), {
                  name: "maxLtvValue",
                  sort: sortState.value,
                  onChangeSort: changeSort
                }, {
                  default: withCtx(() => [..._cache[2] || (_cache[2] = [
                    createBaseVNode("span", { class: "explore-table__primary" }, "MAX LTV", -1)
                  ])]),
                  _: 1
                }, 8, ["sort"])
              ]),
              default: withCtx(({ row }) => [
                createBaseVNode("span", _hoisted_8, toDisplayString(row.maxLtv), 1)
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, {
              "min-width": "180",
              "header-align": "right",
              align: "right"
            }, {
              header: withCtx(() => [
                createVNode(unref(SortButton), {
                  name: "totalLockedValue",
                  sort: sortState.value,
                  onChangeSort: changeSort
                }, {
                  default: withCtx(() => [..._cache[3] || (_cache[3] = [
                    createBaseVNode("span", { class: "explore-table__primary" }, "Total locked", -1)
                  ])]),
                  _: 1
                }, 8, ["sort"])
              ]),
              default: withCtx(({ row }) => [
                createBaseVNode("div", _hoisted_9, [
                  createBaseVNode("div", _hoisted_10, [
                    createVNode(unref(FormattedAmount), {
                      class: "explore-table-item-token",
                      "font-size-rate": unref(FontSizeRate).SMALL,
                      value: row.totalLocked
                    }, null, 8, ["font-size-rate", "value"]),
                    createVNode(unref(TokenLogo), {
                      class: "explore-table-item-logo explore-table-item-logo--plain",
                      size: "small",
                      token: row.lockedAsset
                    }, null, 8, ["token"])
                  ]),
                  row.totalLockedFiat ? (openBlock(), createElementBlock("div", _hoisted_11, [
                    createVNode(unref(FormattedAmount), {
                      class: "explore-table-item-token",
                      "is-fiat-value": "",
                      "font-size-rate": unref(FontSizeRate).SMALL,
                      value: row.totalLockedFiat
                    }, null, 8, ["font-size-rate", "value"])
                  ])) : createCommentVNode("", true)
                ])
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, {
              "min-width": "180",
              "header-align": "right",
              align: "right"
            }, {
              header: withCtx(() => [
                createVNode(unref(SortButton), {
                  name: "totalDebtValue",
                  sort: sortState.value,
                  onChangeSort: changeSort
                }, {
                  default: withCtx(() => [..._cache[4] || (_cache[4] = [
                    createBaseVNode("span", { class: "explore-table__primary" }, "Total debt", -1)
                  ])]),
                  _: 1
                }, 8, ["sort"])
              ]),
              default: withCtx(({ row }) => [
                createBaseVNode("div", _hoisted_12, [
                  createBaseVNode("div", _hoisted_13, [
                    createVNode(unref(FormattedAmount), {
                      class: "explore-table-item-token",
                      "font-size-rate": unref(FontSizeRate).SMALL,
                      value: row.totalDebt
                    }, null, 8, ["font-size-rate", "value"]),
                    createVNode(unref(TokenLogo), {
                      class: "explore-table-item-logo explore-table-item-logo--plain",
                      size: "small",
                      token: row.debtAsset
                    }, null, 8, ["token"])
                  ]),
                  row.totalDebtFiat ? (openBlock(), createElementBlock("div", _hoisted_14, [
                    createVNode(unref(FormattedAmount), {
                      class: "explore-table-item-token",
                      "is-fiat-value": "",
                      "font-size-rate": unref(FontSizeRate).SMALL,
                      value: row.totalDebtFiat
                    }, null, 8, ["font-size-rate", "value"])
                  ])) : createCommentVNode("", true)
                ])
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, {
              "min-width": "180",
              "header-align": "right",
              align: "right"
            }, {
              header: withCtx(() => [
                createVNode(unref(SortButton), {
                  name: "availableToBorrowValue",
                  sort: sortState.value,
                  onChangeSort: changeSort
                }, {
                  default: withCtx(() => [..._cache[5] || (_cache[5] = [
                    createBaseVNode("span", { class: "explore-table__primary" }, "Available", -1)
                  ])]),
                  _: 1
                }, 8, ["sort"])
              ]),
              default: withCtx(({ row }) => [
                createBaseVNode("div", _hoisted_15, [
                  createBaseVNode("div", _hoisted_16, [
                    createVNode(unref(FormattedAmount), {
                      class: "explore-table-item-token",
                      "font-size-rate": unref(FontSizeRate).SMALL,
                      value: row.availableToBorrow
                    }, null, 8, ["font-size-rate", "value"]),
                    createVNode(unref(TokenLogo), {
                      class: "explore-table-item-logo explore-table-item-logo--plain",
                      size: "small",
                      token: row.debtAsset
                    }, null, 8, ["token"])
                  ]),
                  row.availableToBorrowFiat ? (openBlock(), createElementBlock("div", _hoisted_17, [
                    createVNode(unref(FormattedAmount), {
                      class: "explore-table-item-token",
                      "is-fiat-value": "",
                      "font-size-rate": unref(FontSizeRate).SMALL,
                      value: row.availableToBorrowFiat
                    }, null, 8, ["font-size-rate", "value"])
                  ])) : createCommentVNode("", true)
                ])
              ]),
              _: 1
            })
          ]),
          _: 1
        }, 8, ["data"]),
        createVNode(unref(HistoryPagination), {
          class: "explore-table-pagination",
          "current-page": currentPage.value,
          "page-amount": pageAmount.value,
          total: total.value,
          "last-page": lastPage.value,
          loading: loadingState.value,
          onPaginationClick: handlePaginationClick
        }, null, 8, ["current-page", "page-amount", "total", "last-page", "loading"])
      ], 2);
    };
  }
});
const ExploreCollaterals = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-4508b4a6"]]);
export {
  ExploreCollaterals as default
};
