import { z as defineComponent, aZ as components, ak as lazyComponent, cG as demeterStakingLazyComponent, u as useTranslation, U as useLoading, h as computed, aA as watch, a4 as onMounted, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, C as openBlock, bA as withDirectives, ap as createVNode, am as createBlock, ao as withCtx, aM as createCommentVNode, D as createBaseVNode, aN as toDisplayString, aj as unref, bb as normalizeClass, aO as createTextVNode, cw as TranslationConsts, bQ as Fragment, bP as renderList, aI as WALLET_CONSTS, as as mergeProps, al as Components, cH as DemeterStakingComponents, s as store, a9 as ref, ay as api, F as FPNumber, aU as formatDecimalPlaces, bp as formatAmountWithSuffix, cE as sortPools, bN as SortDirection } from "./index-73GArslZ.js";
import { u as useExploreTable } from "./useExploreTable-1H0JA_Cc.js";
import { u as useDemeterBasePage, a as useDemeterPage } from "./useDemeterPage-BN2kYsB-.js";
import "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "explore-table-item-index" };
const _hoisted_2 = { class: "explore-table-item-logo" };
const _hoisted_3 = { class: "explore-table-item-info explore-table-item-info--head" };
const _hoisted_4 = { class: "explore-table__primary" };
const _hoisted_5 = { class: "explore-table-item-index explore-table-item-index--body" };
const _hoisted_6 = { class: "explore-table-item-info explore-table-item-info--body" };
const _hoisted_7 = { class: "explore-table-item-name" };
const _hoisted_8 = {
  key: "description",
  class: "explore-table__secondary"
};
const _hoisted_9 = { class: "explore-table-cell" };
const _hoisted_10 = { class: "explore-table-item-name" };
const _hoisted_11 = { class: "explore-table__primary" };
const _hoisted_12 = { class: "explore-table__accent" };
const _hoisted_13 = { class: "explore-table__primary" };
const _hoisted_14 = { class: "explore-table-item-tokens" };
const _hoisted_15 = { class: "explore-table__primary" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      CalculatorButton: demeterStakingLazyComponent(DemeterStakingComponents.CalculatorButton),
      CalculatorDialog: demeterStakingLazyComponent(DemeterStakingComponents.CalculatorDialog),
      PairTokenLogo: lazyComponent(Components.PairTokenLogo),
      SortButton: lazyComponent(Components.SortButton),
      DataRowSkeleton: lazyComponent(Components.DataRowSkeleton),
      TokenLogo: components.TokenLogo,
      FormattedAmount: components.FormattedAmount,
      HistoryPagination: components.HistoryPagination
    }
  },
  __name: "Demeter",
  props: {
    parentLoading: { type: Boolean, default: false },
    exploreQuery: { type: String, default: "" },
    isAccountItemsOnly: { type: Boolean, default: false },
    isFarmingPage: { type: Boolean, default: true }
  },
  setup(__props) {
    const lpKey = (baseAsset, poolAsset) => [baseAsset, poolAsset].join(";");
    const FontSizeRate = WALLET_CONSTS.FontSizeRate;
    const FontWeightRate = WALLET_CONSTS.FontWeightRate;
    const props = __props;
    const { t } = useTranslation();
    const parentLoading = computed(() => props.parentLoading);
    const { loading, withLoading, withParentLoading } = useLoading({ parentLoading });
    const loadingState = computed(() => loading.value || parentLoading.value);
    const base = useDemeterBasePage({ isFarmingPage: computed(() => props.isFarmingPage) });
    const page = useDemeterPage(base, { parentLoading });
    const poolsData = ref({});
    const poolsList = computed(() => {
      const pools = base.pools.value ?? {};
      return Object.values(pools).map((poolMap) => Object.values(poolMap ?? {})).flat(2).filter((pool) => Boolean(pool && !pool.isRemoved));
    });
    const items = computed(() => {
      const assetsData = base.demeterAssetsData.value ?? {};
      const tokenInfos = base.tokenInfos.value ?? {};
      const mapped = poolsList.value.map((pool) => {
        const baseAsset = assetsData[pool.baseAsset];
        const poolAsset = assetsData[pool.poolAsset];
        const rewardAsset = assetsData[pool.rewardAsset];
        const rewardAssetSymbol = rewardAsset?.symbol ?? "";
        const rewardAssetPrice = FPNumber.fromCodecValue(base.getAssetFiatPrice(rewardAsset) ?? 0);
        const tokenInfo = tokenInfos[pool.rewardAsset];
        const accountPool = base.getAccountPool(pool);
        const isAccountItem = !!accountPool && base.isActiveAccountPool(accountPool);
        const poolData = poolsData.value[lpKey(pool.baseAsset, pool.poolAsset)];
        const poolTokenPriceCoefficient = poolData?.priceCoefficient ?? FPNumber.ZERO;
        const poolAssetPrice = FPNumber.fromCodecValue(base.getAssetFiatPrice(poolAsset) ?? 0);
        const poolTokenPrice = poolAssetPrice.mul(poolTokenPriceCoefficient);
        const poolBaseReserves = poolData?.reserves?.[0] ?? FPNumber.ZERO;
        const poolTargetReserves = poolData?.reserves?.[1] ?? FPNumber.ZERO;
        const poolSupply = poolData?.supply ?? FPNumber.ZERO;
        const accountPooledTokens = accountPool?.pooledTokens ?? FPNumber.ZERO;
        const liquidity2 = pool.isFarm ? {
          address: poolData?.address ?? "",
          balance: poolSupply.toCodecString(),
          firstAddress: baseAsset?.address ?? "",
          firstBalance: poolBaseReserves.toCodecString(),
          secondAddress: poolAsset?.address ?? "",
          secondBalance: poolTargetReserves.toCodecString(),
          poolShare: "1",
          reserveA: "1",
          reserveB: "1",
          totalSupply: "1"
        } : null;
        const assets = pool.isFarm ? [baseAsset, poolAsset] : [poolAsset];
        const name = assets.map((asset) => asset?.symbol ?? "").join("-");
        const description = pool.isFarm ? "" : poolAsset?.name ?? "";
        const depositFee = new FPNumber(pool.depositFee ?? 0).mul(FPNumber.HUNDRED);
        const tvl = poolTokenPrice.mul(pool.totalTokensInPool);
        const emission = base.getEmission(pool, tokenInfo);
        const apr = base.getApr(emission, tvl, rewardAssetPrice);
        const accountTokens = (pool.isFarm ? [
          {
            asset: baseAsset,
            balance: !poolSupply.isZero() ? poolBaseReserves.mul(accountPooledTokens).div(poolSupply) : FPNumber.ZERO
          },
          {
            asset: poolAsset,
            balance: !poolSupply.isZero() ? poolTargetReserves.mul(accountPooledTokens).div(poolSupply) : FPNumber.ZERO
          }
        ] : [{ asset: poolAsset, balance: accountPooledTokens }]).map((item) => ({
          ...item,
          balance: formatDecimalPlaces(item.balance)
        }));
        return {
          assets,
          name,
          description,
          baseAsset,
          poolAsset,
          rewardAsset,
          rewardAssetSymbol,
          depositFee: depositFee.toNumber(),
          depositFeeFormatted: formatDecimalPlaces(depositFee, true),
          tvl: tvl.toNumber(),
          tvlFormatted: formatAmountWithSuffix(tvl),
          apr: apr.toNumber(),
          aprFormatted: formatDecimalPlaces(apr, true),
          isAccountItem,
          accountTokens,
          liquidity: liquidity2
        };
      });
      return [...mapped].sort(
        (a, b) => sortPools(
          { baseAsset: a.poolAsset, poolAsset: a.rewardAsset },
          { baseAsset: b.poolAsset, poolAsset: b.rewardAsset }
        )
      );
    });
    const prefilteredItems = computed(() => {
      return props.isAccountItemsOnly ? items.value.filter((item) => item.isAccountItem) : items.value;
    });
    const filterItems = (list, search) => {
      const filterAsset = (asset) => asset?.name?.toLowerCase?.().includes(search) || asset?.symbol?.toLowerCase?.().includes(search) || asset?.address?.toLowerCase?.() === search;
      return list.filter((item) => {
        return item.name.toLowerCase().includes(search) || filterAsset(item.poolAsset) || filterAsset(item.baseAsset) || filterAsset(item.rewardAsset) || item.assets.some((asset) => filterAsset(asset));
      });
    };
    const exploreQuery = computed(() => props.exploreQuery ?? "");
    const table = useExploreTable({
      items: prefilteredItems,
      query: exploreQuery,
      filter: filterItems,
      defaultOrder: SortDirection.DESC,
      defaultProperty: "apr"
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
      const fiatObject = store.state.wallet.account.fiatPriceObject ?? {};
      return Object.keys(fiatObject).length > 0;
    });
    const isLoggedIn = computed(() => store.getters.wallet.account.isLoggedIn);
    const hasAprColumnData = computed(() => items.value.some((item) => item.apr !== 0));
    const showCalculatorDialog = computed({
      get: () => base.showCalculatorDialog.value,
      set: (value) => {
        base.showCalculatorDialog.value = value;
      }
    });
    const liquidity = computed(() => base.liquidity.value);
    const selectedDerivedPool = computed(() => page.selectedDerivedPool.value ?? null);
    const showPoolCalculator = base.showPoolCalculator;
    const updateExploreData = async () => {
      if (loading.value) return;
      await withLoading(async () => {
        await withParentLoading(async () => {
          const buffer = {};
          const isFarm = base.isFarmingPage.value;
          const keys = poolsList.value.map((pool) => lpKey(pool.baseAsset, pool.poolAsset));
          const poolKeys = [...new Set(keys)];
          await Promise.allSettled(
            poolKeys.map(async (key) => {
              if (buffer[key]) return;
              const data = await getPoolData(key, isFarm);
              if (data) buffer[key] = data;
            })
          );
          poolsData.value = Object.freeze(buffer);
        });
      });
    };
    const getPoolData = async (key, isFarm) => {
      const [baseAsset, poolAsset] = key.split(";");
      if (isFarm) {
        const poolInfo = api.poolXyk.getInfo(baseAsset, poolAsset);
        if (!poolInfo) return null;
        const address = poolInfo.address;
        const totalIssuance = await api.api.query.poolXYK.totalIssuances(poolInfo.address);
        const supply = totalIssuance.isEmpty ? FPNumber.ZERO : new FPNumber(totalIssuance);
        const reserves = (await api.poolXyk.getReserves(baseAsset, poolAsset)).map(
          (reserve) => FPNumber.fromCodecValue(reserve)
        );
        const poolAssetReserves = reserves[1];
        const priceCoefficient = supply.isZero() ? FPNumber.ZERO : poolAssetReserves.mul(new FPNumber(2)).div(supply);
        return { priceCoefficient, supply, reserves, address };
      }
      return { priceCoefficient: FPNumber.ONE };
    };
    watch(
      () => base.pools.value,
      () => {
        updateExploreData();
      },
      { deep: true }
    );
    watch(
      () => base.isFarmingPage.value,
      () => {
        updateExploreData();
      }
    );
    onMounted(() => {
      updateExploreData();
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_token_logo = resolveComponent("token-logo");
      const _component_pair_token_logo = resolveComponent("pair-token-logo");
      const _component_s_table_column = resolveComponent("s-table-column");
      const _component_sort_button = resolveComponent("sort-button");
      const _component_calculator_button = resolveComponent("calculator-button");
      const _component_data_row_skeleton = resolveComponent("data-row-skeleton");
      const _component_formatted_amount = resolveComponent("formatted-amount");
      const _component_s_tooltip = resolveComponent("s-tooltip");
      const _component_s_table = resolveComponent("s-table");
      const _component_history_pagination = resolveComponent("history-pagination");
      const _component_calculator_dialog = resolveComponent("calculator-dialog");
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
                  }, [..._cache[2] || (_cache[2] = [
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
                row.assets.length === 1 ? (openBlock(), createBlock(_component_token_logo, {
                  key: "token",
                  class: "explore-table-item-logo",
                  token: row.assets[0]
                }, null, 8, ["token"])) : (openBlock(), createBlock(_component_pair_token_logo, {
                  key: "pair",
                  "first-token": row.assets[0],
                  "second-token": row.assets[1],
                  size: "small",
                  class: "explore-table-item-logo"
                }, null, 8, ["first-token", "second-token"])),
                createBaseVNode("div", _hoisted_6, [
                  createBaseVNode("div", _hoisted_7, toDisplayString(row.name), 1),
                  row.description ? (openBlock(), createElementBlock("div", _hoisted_8, toDisplayString(row.description), 1)) : createCommentVNode("", true)
                ])
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, {
              "min-width": "120",
              "header-align": "left",
              align: "left"
            }, {
              header: withCtx(() => [
                createVNode(_component_sort_button, {
                  name: "rewardAssetSymbol",
                  sort: { order: unref(order), property: unref(property) },
                  onChangeSort: unref(changeSort)
                }, {
                  default: withCtx(() => [..._cache[3] || (_cache[3] = [
                    createBaseVNode("span", { class: "explore-table__primary" }, "Reward", -1)
                  ])]),
                  _: 1
                }, 8, ["sort", "onChangeSort"])
              ]),
              default: withCtx(({ row }) => [
                createBaseVNode("div", _hoisted_9, [
                  createVNode(_component_token_logo, {
                    size: "small",
                    class: "explore-table-item-logo explore-table-item-logo--plain",
                    "token-symbol": row.rewardAsset.symbol
                  }, null, 8, ["token-symbol"]),
                  createBaseVNode("div", _hoisted_10, toDisplayString(row.rewardAsset.symbol), 1)
                ])
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, {
              "min-width": "140",
              "header-align": "right",
              align: "right"
            }, {
              header: withCtx(() => [
                createVNode(_component_sort_button, {
                  name: "apr",
                  sort: { order: unref(order), property: unref(property) },
                  onChangeSort: unref(changeSort)
                }, {
                  default: withCtx(() => [
                    createBaseVNode("span", _hoisted_11, toDisplayString(unref(TranslationConsts).APR), 1)
                  ]),
                  _: 1
                }, 8, ["sort", "onChangeSort"])
              ]),
              default: withCtx(({ row }) => [
                createVNode(_component_data_row_skeleton, {
                  loading: !hasAprColumnData.value,
                  rect: "",
                  circle: ""
                }, {
                  default: withCtx(() => [
                    createBaseVNode("span", _hoisted_12, toDisplayString(row.aprFormatted), 1),
                    createVNode(_component_calculator_button, {
                      onClick: ($event) => unref(showPoolCalculator)({
                        baseAsset: row.baseAsset.address,
                        poolAsset: row.poolAsset.address,
                        rewardAsset: row.rewardAsset.address,
                        liquidity: row.liquidity
                      })
                    }, null, 8, ["onClick"])
                  ]),
                  _: 2
                }, 1032, ["loading"])
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, {
              "min-width": "80",
              "header-align": "right",
              align: "right"
            }, {
              header: withCtx(() => [
                createVNode(_component_sort_button, {
                  name: "depositFee",
                  sort: { order: unref(order), property: unref(property) },
                  onChangeSort: unref(changeSort)
                }, {
                  default: withCtx(() => [..._cache[4] || (_cache[4] = [
                    createBaseVNode("span", { class: "explore-table__primary" }, "Fee", -1)
                  ])]),
                  _: 1
                }, 8, ["sort", "onChangeSort"])
              ]),
              default: withCtx(({ row }) => [
                createTextVNode(toDisplayString(row.depositFeeFormatted), 1)
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
                createBaseVNode("span", _hoisted_13, toDisplayString(unref(t)("balanceText")), 1)
              ]),
              default: withCtx(({ row }) => [
                createBaseVNode("div", _hoisted_14, [
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
                    createBaseVNode("span", _hoisted_15, toDisplayString(unref(TranslationConsts).TVL), 1),
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
        }, null, 8, ["current-page", "page-amount", "total", "last-page", "loading", "onPaginationClick"]),
        createVNode(_component_calculator_dialog, mergeProps({
          visible: showCalculatorDialog.value,
          "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => showCalculatorDialog.value = $event)
        }, selectedDerivedPool.value, { liquidity: liquidity.value }), null, 16, ["visible", "liquidity"])
      ]);
    };
  }
});
export {
  _sfc_main as default
};
