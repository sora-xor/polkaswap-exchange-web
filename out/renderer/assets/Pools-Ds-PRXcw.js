import { aF as getCurrentIndexer, aG as IndexerType, aH as gql, F as FPNumber, aU as formatDecimalPlaces, bp as formatAmountWithSuffix, cE as sortPools, z as defineComponent, aZ as components, ak as lazyComponent, u as useTranslation, U as useLoading, h as computed, H as useAssetsStore, aA as watch, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, C as openBlock, bA as withDirectives, ap as createVNode, am as createBlock, ao as withCtx, aM as createCommentVNode, D as createBaseVNode, aN as toDisplayString, aj as unref, bb as normalizeClass, aO as createTextVNode, aI as WALLET_CONSTS, bQ as Fragment, bP as renderList, cw as TranslationConsts, al as Components, s as store, a9 as ref, cC as KnownAssets, bN as SortDirection } from "./index-73GArslZ.js";
import { u as useExploreTable } from "./useExploreTable-1H0JA_Cc.js";
const SubqueryPoolsQuery = gql`
  query SubqueryPoolsQuery($after: Cursor, $filter: PoolXYKFilter) {
    data: poolXYKs(after: $after, filter: $filter) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          baseAssetId
          targetAssetId
          baseAssetReserves
          targetAssetReserves
          priceUSD
          liquidityUSD
          strategicBonusApy
        }
      }
    }
  }
`;
const SubsquidPoolsQuery = gql`
  query SubsquidPoolsQuery($after: String, $where: PoolXYKWhereInput) {
    data: poolXyksConnection(orderBy: id_ASC, after: $after, where: $where) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          baseAsset {
            id
          }
          targetAsset {
            id
          }
          baseAssetReserves
          targetAssetReserves
          priceUSD
          strategicBonusApy
        }
      }
    }
  }
`;
const parse = (item) => {
  const apy = new FPNumber(item.strategicBonusApy ?? 0).mul(FPNumber.HUNDRED);
  const priceUSD = new FPNumber(item.priceUSD ?? 0);
  const baseAssetId = "baseAssetId" in item ? item.baseAssetId : item.baseAsset.id;
  const targetAssetId = "targetAssetId" in item ? item.targetAssetId : item.targetAsset.id;
  return {
    baseAssetId,
    targetAssetId,
    baseAssetReserves: item.baseAssetReserves,
    targetAssetReserves: item.targetAssetReserves,
    priceUSD,
    apy
  };
};
const subqueryPoolsFilter = (ids) => {
  const filter = {
    baseAssetReserves: { greaterThan: "0" },
    targetAssetReserves: { greaterThan: "0" }
  };
  if (ids.length) {
    filter.targetAssetId = { in: ids };
  }
  return filter;
};
const subsquidPoolsFilter = (ids) => {
  const where = {
    baseAssetReserves_gt: "0",
    targetAssetReserves_gt: "0"
  };
  if (ids.length) {
    where.targetAsset = { id_in: ids };
  }
  return where;
};
async function fetchPoolsData(assets) {
  const ids = assets?.map((item) => item.address) ?? [];
  const indexer = getCurrentIndexer();
  let result;
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const filter = subqueryPoolsFilter(ids);
      const variables = { filter };
      const subqueryIndexer = indexer;
      result = await subqueryIndexer.services.explorer.fetchAllEntities(SubqueryPoolsQuery, variables, parse);
      break;
    }
    case IndexerType.SUBSQUID: {
      const where = subsquidPoolsFilter(ids);
      const variables = { where };
      const subsquidIndexer = indexer;
      result = await subsquidIndexer.services.explorer.fetchAllEntitiesConnection(SubsquidPoolsQuery, variables, parse);
      break;
    }
  }
  return result ?? [];
}
const formatAccountToken = (value) => {
  return formatDecimalPlaces(FPNumber.fromCodecValue(value ?? 0));
};
const findAccountPool = (accountLiquidity, baseAssetId, targetAssetId) => {
  return accountLiquidity.find(
    (liquidity) => liquidity.firstAddress === baseAssetId && liquidity.secondAddress === targetAssetId
  ) ?? null;
};
function buildPoolTableItems({
  pools,
  accountLiquidity,
  getAsset
}) {
  const items = pools.reduce((buffer, pool) => {
    const baseAsset = getAsset(pool.baseAssetId);
    const targetAsset = getAsset(pool.targetAssetId);
    if (!baseAsset || !targetAsset) return buffer;
    const name = `${baseAsset.symbol}-${targetAsset.symbol}`;
    const baseAssetReserves = FPNumber.fromCodecValue(pool.baseAssetReserves ?? 0, baseAsset.decimals);
    const targetAssetReserves = FPNumber.fromCodecValue(pool.targetAssetReserves ?? 0, targetAsset.decimals);
    const tvlUSD = targetAssetReserves.mul(pool.priceUSD).mul(FPNumber.TWO);
    const accountPool = findAccountPool(accountLiquidity, baseAsset.address, targetAsset.address);
    const poolTokens = [
      {
        asset: baseAsset,
        balance: formatDecimalPlaces(baseAssetReserves)
      },
      {
        asset: targetAsset,
        balance: formatDecimalPlaces(targetAssetReserves)
      }
    ];
    const accountTokens = [
      {
        asset: baseAsset,
        balance: formatAccountToken(accountPool?.firstBalance)
      },
      {
        asset: targetAsset,
        balance: formatAccountToken(accountPool?.secondBalance)
      }
    ];
    buffer.push({
      name,
      baseAsset,
      targetAsset,
      priceUSD: pool.priceUSD.toNumber(),
      priceUSDFormatted: pool.priceUSD.toLocaleString(),
      apy: pool.apy.toNumber(),
      apyFormatted: formatDecimalPlaces(pool.apy, true),
      tvl: tvlUSD.toNumber(),
      tvlFormatted: formatAmountWithSuffix(tvlUSD),
      isAccountItem: Boolean(accountPool),
      poolTokens,
      accountTokens
    });
    return buffer;
  }, []);
  return [...items].sort(
    (a, b) => sortPools(
      { baseAsset: a.baseAsset, poolAsset: a.targetAsset },
      { baseAsset: b.baseAsset, poolAsset: b.targetAsset }
    )
  );
}
function filterPoolTableItems(items, search) {
  const normalized = search.toLowerCase().trim();
  if (!normalized) return items;
  const matchesAsset = (asset) => {
    if (!asset) return false;
    return asset.name?.toLowerCase?.().includes(normalized) || asset.symbol?.toLowerCase?.().includes(normalized) || asset.address?.toLowerCase?.() === normalized;
  };
  return items.filter((item) => {
    return item.name.toLowerCase().includes(normalized) || matchesAsset(item.baseAsset) || matchesAsset(item.targetAsset);
  });
}
const _hoisted_1 = { class: "explore-table-item-index" };
const _hoisted_2 = { class: "explore-table-item-logo" };
const _hoisted_3 = { class: "explore-table-item-info explore-table-item-info--head" };
const _hoisted_4 = { class: "explore-table__primary" };
const _hoisted_5 = { class: "explore-table-item-index explore-table-item-index--body" };
const _hoisted_6 = { class: "explore-table-item-info explore-table-item-info--body" };
const _hoisted_7 = { class: "explore-table-item-name" };
const _hoisted_8 = { class: "explore-table__accent" };
const _hoisted_9 = { class: "explore-table__primary" };
const _hoisted_10 = { class: "explore-table-item-tokens" };
const _hoisted_11 = { class: "explore-table-item-tokens" };
const _hoisted_12 = { class: "explore-table__primary" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      PairTokenLogo: lazyComponent(Components.PairTokenLogo),
      SortButton: lazyComponent(Components.SortButton),
      DataRowSkeleton: lazyComponent(Components.DataRowSkeleton),
      TokenLogo: components.TokenLogo,
      FormattedAmount: components.FormattedAmount,
      HistoryPagination: components.HistoryPagination
    }
  },
  __name: "Pools",
  props: {
    parentLoading: { type: Boolean, default: false },
    exploreQuery: { type: String, default: "" },
    isAccountItemsOnly: { type: Boolean, default: false }
  },
  setup(__props) {
    const FontSizeRate = WALLET_CONSTS.FontSizeRate;
    const FontWeightRate = WALLET_CONSTS.FontWeightRate;
    const props = __props;
    const { t } = useTranslation();
    const parentLoading = computed(() => props.parentLoading);
    const { loading, withLoading, withParentLoading } = useLoading({ parentLoading });
    const loadingState = computed(() => loading.value || parentLoading.value);
    const assetsStore = useAssetsStore();
    const whitelistAssets = computed(() => assetsStore.whitelistAssets ?? []);
    const allowedAssets = computed(() => whitelistAssets.value.length ? whitelistAssets.value : KnownAssets);
    const getAsset = (address) => assetsStore.assetDataByAddress(address);
    const accountLiquidity = computed(() => store.state.pool.accountLiquidity ?? []);
    const poolsData = ref([]);
    const items = computed(
      () => buildPoolTableItems({
        pools: poolsData.value,
        accountLiquidity: accountLiquidity.value,
        getAsset
      })
    );
    const prefilteredItems = computed(
      () => props.isAccountItemsOnly ? items.value.filter((item) => item.isAccountItem) : items.value
    );
    const exploreQuery = computed(() => props.exploreQuery ?? "");
    const table = useExploreTable({
      items: prefilteredItems,
      query: exploreQuery,
      filter: filterPoolTableItems,
      defaultOrder: SortDirection.DESC,
      defaultProperty: "tvl"
    });
    const {
      tableItems,
      order,
      property,
      isDefaultSort,
      handlePaginationClick,
      changeSort,
      handleResetSort,
      currentPage,
      pageAmount,
      total,
      lastPage,
      startIndex,
      tableRef
    } = table;
    const pricesAvailable = computed(() => {
      const fiatPriceObject = store.state.wallet.account.fiatPriceObject ?? {};
      return Object.keys(fiatPriceObject).length > 0;
    });
    const isLoggedIn = computed(() => store.getters.wallet.account.isLoggedIn);
    const whitelistSignature = computed(() => whitelistAssets.value.map((asset) => asset.address).join(";"));
    const updateExploreData = async () => {
      if (loading.value) return;
      await withLoading(async () => {
        await withParentLoading(async () => {
          const data = await fetchPoolsData(allowedAssets.value);
          poolsData.value = Object.freeze(data ?? []);
        });
      });
    };
    watch(
      () => whitelistSignature.value,
      () => {
        updateExploreData();
      },
      { immediate: true }
    );
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_pair_token_logo = resolveComponent("pair-token-logo");
      const _component_s_table_column = resolveComponent("s-table-column");
      const _component_sort_button = resolveComponent("sort-button");
      const _component_formatted_amount = resolveComponent("formatted-amount");
      const _component_token_logo = resolveComponent("token-logo");
      const _component_s_tooltip = resolveComponent("s-tooltip");
      const _component_data_row_skeleton = resolveComponent("data-row-skeleton");
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
              "min-width": "240",
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
              "min-width": "130",
              "header-align": "right",
              align: "right"
            }, {
              header: withCtx(() => [
                createVNode(_component_sort_button, {
                  name: "priceUSD",
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
                  value: row.priceUSDFormatted,
                  class: "explore-table-item-price"
                }, null, 8, ["font-weight-rate", "value"])
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, {
              "min-width": "120",
              "header-align": "right",
              align: "right"
            }, {
              header: withCtx(() => [
                createVNode(_component_sort_button, {
                  name: "apy",
                  sort: { order: unref(order), property: unref(property) },
                  onChangeSort: unref(changeSort)
                }, {
                  default: withCtx(() => [..._cache[3] || (_cache[3] = [
                    createBaseVNode("span", { class: "explore-table__primary" }, "APY", -1)
                  ])]),
                  _: 1
                }, 8, ["sort", "onChangeSort"])
              ]),
              default: withCtx(({ row }) => [
                createBaseVNode("span", _hoisted_8, toDisplayString(row.apyFormatted), 1)
              ]),
              _: 1
            }),
            isLoggedIn.value ? (openBlock(), createBlock(_component_s_table_column, {
              key: "logged",
              "min-width": "140",
              "header-align": "right",
              align: "right"
            }, {
              header: withCtx(() => [
                createBaseVNode("span", _hoisted_9, toDisplayString(unref(t)("balanceText")), 1)
              ]),
              default: withCtx(({ row }) => [
                createBaseVNode("div", _hoisted_10, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(row.accountTokens, ({ asset, balance }, index) => {
                    return openBlock(), createElementBlock("div", {
                      key: index,
                      class: "explore-table-cell"
                    }, [
                      createVNode(_component_formatted_amount, {
                        "value-can-be-hidden": "",
                        "font-size-rate": unref(FontSizeRate).SMALL,
                        value: balance,
                        class: "explore-table-item-token"
                      }, null, 8, ["font-size-rate", "value"]),
                      createVNode(_component_token_logo, {
                        size: "small",
                        class: "explore-table-item-logo explore-table-item-logo--plain",
                        token: asset
                      }, null, 8, ["token"])
                    ]);
                  }), 128))
                ])
              ]),
              _: 1
            })) : createCommentVNode("", true),
            createVNode(_component_s_table_column, {
              "min-width": "200",
              "header-align": "right",
              align: "right"
            }, {
              header: withCtx(() => [..._cache[4] || (_cache[4] = [
                createBaseVNode("span", { class: "explore-table__primary" }, "Pool Tokens", -1)
              ])]),
              default: withCtx(({ row }) => [
                createBaseVNode("div", _hoisted_11, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(row.poolTokens, ({ asset, balance }, index) => {
                    return openBlock(), createElementBlock("div", {
                      key: index,
                      class: "explore-table-cell"
                    }, [
                      createVNode(_component_formatted_amount, {
                        "font-size-rate": unref(FontSizeRate).SMALL,
                        value: balance,
                        class: "explore-table-item-token"
                      }, null, 8, ["font-size-rate", "value"]),
                      createVNode(_component_token_logo, {
                        size: "small",
                        class: "explore-table-item-logo explore-table-item-logo--plain",
                        token: asset
                      }, null, 8, ["token"])
                    ]);
                  }), 128))
                ])
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, {
              key: "tvl",
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
                    createBaseVNode("span", _hoisted_12, toDisplayString(unref(TranslationConsts).TVL), 1),
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
                createVNode(_component_data_row_skeleton, {
                  loading: !pricesAvailable.value,
                  rect: ""
                }, {
                  default: withCtx(() => [
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
                  _: 2
                }, 1032, ["loading"])
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
