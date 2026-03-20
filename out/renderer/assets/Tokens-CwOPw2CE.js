import { aF as getCurrentIndexer, aG as IndexerType, bn as retryOnEmptyResult, aH as gql, F as FPNumber, z as defineComponent, aZ as components, ak as lazyComponent, u as useTranslation, U as useLoading, c0 as toRef, s as store, aA as watch, h as computed, a4 as onMounted, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, C as openBlock, ap as createVNode, bA as withDirectives, aj as unref, am as createBlock, ao as withCtx, D as createBaseVNode, aN as toDisplayString, bb as normalizeClass, aO as createTextVNode, aI as WALLET_CONSTS, al as Components, a9 as ref, cC as KnownAssets, bN as SortDirection, di as getAssetsSubset, dh as sortAssets, Z as ZeroStringValue, bp as formatAmountWithSuffix, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useExploreTable } from "./useExploreTable-1H0JA_Cc.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
const SubqueryAssetsQuery = gql`
  query AssetsQuery($after: Cursor, $filter: AssetFilter) {
    data: assets(orderBy: ID_ASC, after: $after, filter: $filter) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          priceUSD
          priceChangeDay
          priceChangeWeek
          volumeDayUSD
          volumeWeekUSD
          liquidity
          liquidityBooks
          velocity
        }
      }
    }
  }
`;
const SubsquidAssetsQuery = gql`
  query AssetsConnectionQuery($after: String, $where: AssetWhereInput) {
    data: assetsConnection(orderBy: id_ASC, after: $after, where: $where) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          priceUSD
          priceChangeDay
          priceChangeWeek
          volumeDayUSD
          volumeWeekUSD
          liquidity
          liquidityBooks
          velocity
        }
      }
    }
  }
`;
const parse = (item) => {
  const priceUSD = new FPNumber(item.priceUSD ?? 0);
  const liquidityPools = FPNumber.fromCodecValue(item.liquidity ?? 0);
  const liquidityBooks = FPNumber.fromCodecValue(item.liquidityBooks ?? 0);
  const liquidity = liquidityPools.add(liquidityBooks);
  const tvlUSD = liquidity.mul(priceUSD);
  return {
    [item.id]: {
      priceUSD,
      priceChangeDay: new FPNumber(item.priceChangeDay ?? 0),
      priceChangeWeek: new FPNumber(item.priceChangeWeek ?? 0),
      volumeDayUSD: new FPNumber(item.volumeDayUSD ?? 0),
      volumeWeekUSD: new FPNumber(item.volumeWeekUSD ?? 0),
      tvlUSD,
      velocity: new FPNumber(item.velocity ?? 0)
    }
  };
};
const subqueryAssetsFilter = (ids) => {
  const filter = {
    or: [{ liquidity: { greaterThan: "0" } }, { liquidityBooks: { greaterThan: "0" } }]
  };
  if (ids.length) {
    filter.id = { in: ids };
  }
  return filter;
};
const subsquidAssetsFilter = (ids) => {
  const where = {
    OR: [{ liquidity_gt: "0" }, { liquidityBooks_gt: "0" }]
  };
  if (ids.length) {
    where.id_in = ids;
  }
  return where;
};
async function fetchTokensData(assets) {
  const ids = assets.map((item) => item.address);
  const indexer = getCurrentIndexer();
  let items;
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const filter = subqueryAssetsFilter(ids);
      const variables = { filter };
      const subqueryIndexer = indexer;
      items = await retryOnEmptyResult(
        async () => subqueryIndexer.services.explorer.fetchAllEntities(SubqueryAssetsQuery, variables, parse),
        (value) => !value?.length
      );
      break;
    }
    case IndexerType.SUBSQUID: {
      const where = subsquidAssetsFilter(ids);
      const variables = { where };
      const subsquidIndexer = indexer;
      items = await retryOnEmptyResult(
        async () => subsquidIndexer.services.explorer.fetchAllEntitiesConnection(SubsquidAssetsQuery, variables, parse),
        (value) => !value?.length
      );
      break;
    }
  }
  if (!items) return {};
  return items.reduce((acc, item) => ({ ...acc, ...item }), {});
}
const _hoisted_1 = { class: "explore-table-item-index" };
const _hoisted_2 = { class: "explore-table-item-logo" };
const _hoisted_3 = { class: "explore-table-item-info explore-table-item-info--head" };
const _hoisted_4 = { class: "explore-table__primary" };
const _hoisted_5 = { class: "explore-table__secondary" };
const _hoisted_6 = { class: "explore-table-item-index explore-table-item-index--body" };
const _hoisted_7 = { class: "explore-table-item-info explore-table-item-info--body" };
const _hoisted_8 = { class: "explore-table-item-name" };
const _hoisted_9 = { class: "explore-table__secondary explore-table__token-name" };
const _hoisted_10 = { class: "explore-table-item-address" };
const _hoisted_11 = { class: "explore-table__primary" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      AssetsFilter: components.AssetsFilter,
      PriceChange: lazyComponent(Components.PriceChange),
      SortButton: lazyComponent(Components.SortButton),
      TokenAddress: components.TokenAddress,
      TokenLogo: components.TokenLogo,
      FormattedAmount: components.FormattedAmount,
      HistoryPagination: components.HistoryPagination
    }
  },
  __name: "Tokens",
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
    const tokensData = ref({});
    const getAsset = store.getters.assets.assetDataByAddress;
    const whitelistAssets = computed(() => store.getters.assets.whitelistAssets);
    const allowedAssets = computed(
      () => whitelistAssets.value.length ? whitelistAssets.value : [...KnownAssets]
    );
    const assetsFilter = computed(() => store.state.wallet.settings.assetsFilter);
    const items = computed(() => {
      if (!Object.keys(tokensData.value).length) {
        return allowedAssets.value.map((asset) => {
          const price = FPNumber.fromCodecValue(getAssetFiatPrice(asset) ?? ZeroStringValue);
          const zero = FPNumber.ZERO;
          return {
            ...asset,
            price: price.toNumber(),
            priceFormatted: price.toLocaleString(7),
            priceChangeDay: zero.toNumber(),
            priceChangeDayFP: zero,
            priceChangeWeek: zero.toNumber(),
            priceChangeWeekFP: zero,
            volumeDay: zero.toNumber(),
            volumeDayFormatted: formatAmountWithSuffix(zero),
            tvl: zero.toNumber(),
            tvlFormatted: formatAmountWithSuffix(zero),
            velocity: zero.toNumber(),
            velocityFormatted: String(zero.toNumber(2))
          };
        });
      }
      return Object.entries(tokensData.value).reduce((buffer, [address, tokenData]) => {
        const asset = getAsset(address);
        if (!asset) return buffer;
        buffer.push({
          ...asset,
          price: tokenData.priceUSD.toNumber(),
          priceFormatted: tokenData.priceUSD.toLocaleString(7),
          priceChangeDay: tokenData.priceChangeDay.toNumber(),
          priceChangeDayFP: tokenData.priceChangeDay,
          priceChangeWeek: tokenData.priceChangeWeek.toNumber(),
          priceChangeWeekFP: tokenData.priceChangeWeek,
          volumeDay: tokenData.volumeDayUSD.toNumber(),
          volumeDayFormatted: formatAmountWithSuffix(tokenData.volumeDayUSD),
          tvl: tokenData.tvlUSD.toNumber(),
          tvlFormatted: formatAmountWithSuffix(tokenData.tvlUSD),
          velocity: tokenData.velocity.toNumber(),
          velocityFormatted: String(tokenData.velocity.toNumber(2))
        });
        return buffer;
      }, []);
    });
    const prefilteredItems = computed(() => {
      return getAssetsSubset([...items.value].sort((a, b) => sortAssets(a, b)), assetsFilter.value);
    });
    const filterItems = (items2, search) => {
      return items2.filter(
        (item) => [item.symbol, item.name, item.address].some((value) => value?.toLowerCase?.().includes(search))
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
    watch(assetsFilter, () => {
      currentPage.value = 1;
    });
    const updateExploreData = async () => {
      await withLoading(async () => {
        await withParentLoading(async () => {
          tokensData.value = Object.freeze(await fetchTokensData(allowedAssets.value));
        });
      });
    };
    onMounted(() => {
      void updateExploreData();
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_token_logo = resolveComponent("token-logo");
      const _component_token_address = resolveComponent("token-address");
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
        createVNode(unref(assetsFilter), { class: "token-filter-options" }),
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
              "min-width": "290",
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
                  createBaseVNode("span", _hoisted_4, toDisplayString(unref(t)("nameText")), 1),
                  createBaseVNode("span", _hoisted_5, "(" + toDisplayString(unref(t)("tokens.assetId")) + ")", 1)
                ])
              ]),
              default: withCtx(({ $index, index, row }) => [
                createBaseVNode("span", _hoisted_6, toDisplayString((typeof ($index ?? index) === "number" && Number.isFinite($index ?? index) ? $index ?? index : unref(tableItems).indexOf(row)) + unref(startIndex) + 1), 1),
                createVNode(_component_token_logo, {
                  class: "explore-table-item-logo",
                  "token-symbol": row.symbol
                }, null, 8, ["token-symbol"]),
                createBaseVNode("div", _hoisted_7, [
                  createBaseVNode("div", _hoisted_8, toDisplayString(row.symbol), 1),
                  createBaseVNode("div", _hoisted_9, toDisplayString(row.name), 1),
                  createBaseVNode("div", _hoisted_10, [
                    createVNode(_component_token_address, {
                      class: "explore-table-item-address__value",
                      "show-name": false,
                      name: row.name,
                      symbol: row.symbol,
                      address: row.address
                    }, null, 8, ["name", "symbol", "address"])
                  ])
                ])
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, {
              key: "price",
              "min-width": "130",
              "header-align": "left",
              align: "left"
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
                  "is-fiat-value": "",
                  "fiat-default-rounding": "",
                  "font-weight-rate": unref(FontWeightRate).MEDIUM,
                  value: row.priceFormatted,
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
              "header-align": "left",
              align: "left"
            }, {
              header: withCtx(() => [
                createVNode(_component_sort_button, {
                  name: "priceChangeWeek",
                  sort: { order: unref(order), property: unref(property) },
                  onChangeSort: unref(changeSort)
                }, {
                  default: withCtx(() => [..._cache[4] || (_cache[4] = [
                    createBaseVNode("span", { class: "explore-table__primary" }, "7D %", -1)
                  ])]),
                  _: 1
                }, 8, ["sort", "onChangeSort"])
              ]),
              default: withCtx(({ row }) => [
                createVNode(_component_price_change, {
                  value: row.priceChangeWeekFP
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
                  default: withCtx(() => [..._cache[5] || (_cache[5] = [
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
                    createBaseVNode("span", _hoisted_11, toDisplayString(unref(TranslationConsts).TVL), 1),
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
            }),
            createVNode(_component_s_table_column, {
              "min-width": "88",
              "header-align": "right",
              align: "right"
            }, {
              header: withCtx(() => [
                createVNode(_component_sort_button, {
                  name: "velocity",
                  sort: { order: unref(order), property: unref(property) },
                  onChangeSort: unref(changeSort)
                }, {
                  default: withCtx(() => [
                    _cache[8] || (_cache[8] = createBaseVNode("span", { class: "explore-table__primary" }, "VC.", -1)),
                    createVNode(_component_s_tooltip, { "border-radius": "mini" }, {
                      content: withCtx(() => [
                        createBaseVNode("div", null, toDisplayString(unref(t)("tooltips.velocity")), 1),
                        _cache[6] || (_cache[6] = createBaseVNode("br", null, null, -1)),
                        _cache[7] || (_cache[7] = createBaseVNode("span", { style: { "font-weight": "500" } }, "Velocity = Trading Volume USD / Market Cap USD", -1))
                      ]),
                      default: withCtx(() => [
                        createVNode(_component_s_icon, {
                          name: "info-16",
                          size: "14px"
                        })
                      ]),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["sort", "onChangeSort"])
              ]),
              default: withCtx(({ row }) => [
                createVNode(_component_formatted_amount, {
                  "font-weight-rate": unref(FontWeightRate).MEDIUM,
                  value: row.velocityFormatted,
                  class: "explore-table-item-price explore-table-item-amount"
                }, null, 8, ["font-weight-rate", "value"])
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
const Tokens = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-e9db9b15"]]);
export {
  Tokens as default
};
