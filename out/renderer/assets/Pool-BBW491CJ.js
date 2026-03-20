import { z as defineComponent, aZ as components, bD as poolLazyComponent, ak as lazyComponent, u as useTranslation, U as useLoading, G as useInternalConnect, s as store, a_ as resolveComponent, bz as resolveDirective, bA as withDirectives, aj as unref, A as createElementBlock, C as openBlock, ap as createVNode, D as createBaseVNode, am as createBlock, aM as createCommentVNode, h as computed, aN as toDisplayString, ao as withCtx, aO as createTextVNode, bQ as Fragment, bP as renderList, aJ as renderSlot, as as mergeProps, a9 as ref, bE as PoolComponents, al as Components, X as XOR, aI as WALLET_CONSTS, cE as sortPools, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { u as usePoolApy } from "./usePoolApy-lSPKqmx4.js";
const _hoisted_1 = { class: "container el-form--pool" };
const _hoisted_2 = {
  class: "pool-wrapper",
  "data-test-name": "Pools"
};
const _hoisted_3 = {
  key: 0,
  class: "pool-empty-state"
};
const _hoisted_4 = { class: "pool-info-container pool-info-container--empty" };
const _hoisted_5 = { class: "pool-info-container-block" };
const _hoisted_6 = { class: "pool-info-container__title" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      GenericPageHeader: lazyComponent(Components.GenericPageHeader),
      PairTokenLogo: lazyComponent(Components.PairTokenLogo),
      PoolInfo: lazyComponent(Components.PoolInfo),
      AddLiquidityDialog: poolLazyComponent(PoolComponents.AddLiquidityDialog),
      RemoveLiquidityDialog: poolLazyComponent(PoolComponents.RemoveLiquidityDialog),
      FormattedAmount: components.FormattedAmount,
      InfoLine: components.InfoLine
    }
  },
  __name: "Pool",
  setup(__props) {
    const { t } = useTranslation();
    const { loading } = useLoading();
    const parentLoading = loading;
    const { connectSoraWallet, isLoggedIn } = useInternalConnect();
    const { formatCodecNumber, formatStringValue, getFiatAmountByCodecString } = useFormattedAmount();
    const { getPoolApyFormatted } = usePoolApy();
    WALLET_CONSTS.FontSizeRate;
    WALLET_CONSTS.FontWeightRate;
    const accountLiquidity = computed(() => store.state.pool.accountLiquidity);
    const getAsset = store.getters.assets.assetDataByAddress;
    const addLiquidityVisibility = ref(false);
    const removeLiquidityVisibility = ref(false);
    const activeCollapseItems = ref([]);
    const hasAccountLiquidities = computed(() => accountLiquidity.value.length > 0);
    const accountLiquidityData = computed(() => {
      const items = accountLiquidity.value.map((liquidity) => {
        const firstAsset = getAsset(liquidity.firstAddress);
        const secondAsset = getAsset(liquidity.secondAddress);
        const firstAssetSymbol = getAssetSymbol(firstAsset);
        const secondAssetSymbol = getAssetSymbol(secondAsset);
        return {
          ...liquidity,
          firstAsset,
          firstAssetSymbol,
          firstBalanceFormatted: formatCodecNumber(liquidity.firstBalance, liquidity.decimals),
          firstBalanceFiat: firstAsset ? getFiatAmountByCodecString(liquidity.firstBalance, firstAsset) : null,
          secondAsset,
          secondAssetSymbol,
          secondBalanceFormatted: formatCodecNumber(liquidity.secondBalance, liquidity.decimals),
          secondBalanceFiat: secondAsset ? getFiatAmountByCodecString(liquidity.secondBalance, secondAsset) : null,
          poolShareFormatted: `${formatStringValue(liquidity.poolShare)}%`,
          apyFormatted: getPoolApyFormatted(liquidity.firstAddress, liquidity.secondAddress),
          title: getPairTitle(firstAssetSymbol, secondAssetSymbol)
        };
      });
      return items.sort(
        (a, b) => sortPools(
          { baseAsset: a.firstAsset, poolAsset: a.secondAsset },
          { baseAsset: b.firstAsset, poolAsset: b.secondAsset }
        )
      );
    });
    const handleAddLiquidity = (item) => {
      const firstAddress = item?.firstAsset.address ?? XOR.address;
      const secondAddress = item?.secondAsset.address ?? "";
      void store.dispatch.addLiquidity.setDataFromLiquidity({ firstAddress, secondAddress });
      addLiquidityVisibility.value = true;
    };
    const handleRemoveLiquidity = (item) => {
      const firstAddress = item.firstAsset.address;
      const secondAddress = item.secondAsset.address;
      store.commit.removeLiquidity.setAddresses({ firstAddress, secondAddress });
      removeLiquidityVisibility.value = true;
    };
    const updateActiveCollapseItems = (items) => {
      activeCollapseItems.value = items;
    };
    const getAssetSymbol = (asset) => asset?.symbol ?? t("unknownAssetText");
    const getPairTitle = (firstTokenSymbol, secondTokenSymbol) => {
      if (firstTokenSymbol && secondTokenSymbol) {
        return `${firstTokenSymbol}-${secondTokenSymbol}`;
      }
      return "";
    };
    return (_ctx, _cache) => {
      const _component_generic_page_header = resolveComponent("generic-page-header");
      const _component_s_button = resolveComponent("s-button");
      const _component_pair_token_logo = resolveComponent("pair-token-logo");
      const _component_info_line = resolveComponent("info-line");
      const _component_pool_info = resolveComponent("pool-info");
      const _component_s_collapse_item = resolveComponent("s-collapse-item");
      const _component_s_collapse = resolveComponent("s-collapse");
      const _component_add_liquidity_dialog = resolveComponent("add-liquidity-dialog");
      const _component_remove_liquidity_dialog = resolveComponent("remove-liquidity-dialog");
      const _directive_loading = resolveDirective("loading");
      return withDirectives((openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_generic_page_header, {
          class: "page-header--pool",
          title: unref(t)("exchange.Pool"),
          tooltip: unref(t)("pool.description")
        }, null, 8, ["title", "tooltip"]),
        createBaseVNode("div", _hoisted_2, [
          !unref(isLoggedIn) || !hasAccountLiquidities.value ? (openBlock(), createElementBlock("div", _hoisted_3, [
            createBaseVNode("p", _hoisted_4, toDisplayString(!unref(isLoggedIn) ? unref(t)("pool.connectToWallet") : unref(t)("pool.liquidityNotFound")), 1),
            createVNode(_component_s_button, {
              type: "primary",
              class: "pool-empty-state__action s-typography-button--large",
              onClick: _cache[0] || (_cache[0] = ($event) => !unref(isLoggedIn) ? unref(connectSoraWallet)() : handleAddLiquidity())
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(!unref(isLoggedIn) ? unref(t)("connectWalletText") : unref(t)("pool.addLiquidity")), 1)
              ]),
              _: 1
            })
          ])) : (openBlock(), createBlock(_component_s_collapse, {
            key: "has-pools",
            class: "pool-list",
            borders: true,
            onChange: updateActiveCollapseItems
          }, {
            default: withCtx(() => [
              (openBlock(true), createElementBlock(Fragment, null, renderList(accountLiquidityData.value, (liquidityItem) => {
                return openBlock(), createBlock(_component_s_collapse_item, {
                  key: liquidityItem.address,
                  name: liquidityItem.address,
                  class: "pool-info-container"
                }, {
                  title: withCtx(() => [
                    createVNode(_component_pair_token_logo, {
                      "first-token": liquidityItem.firstAsset,
                      "second-token": liquidityItem.secondAsset,
                      size: "small"
                    }, null, 8, ["first-token", "second-token"]),
                    createBaseVNode("div", _hoisted_5, [
                      createBaseVNode("h3", _hoisted_6, toDisplayString(liquidityItem.title), 1),
                      renderSlot(_ctx.$slots, "title-append", mergeProps({ ref_for: true }, { liquidity: liquidityItem, activeCollapseItems: activeCollapseItems.value }), void 0, true)
                    ])
                  ]),
                  default: withCtx(() => [
                    createVNode(_component_pool_info, null, {
                      buttons: withCtx(() => [
                        createVNode(_component_s_button, {
                          type: "secondary",
                          class: "s-typography-button--medium",
                          "data-test-name": "addLiquidity",
                          onClick: ($event) => handleAddLiquidity(liquidityItem)
                        }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(unref(t)("pool.addLiquidity")), 1)
                          ]),
                          _: 1
                        }, 8, ["onClick"]),
                        createVNode(_component_s_button, {
                          type: "secondary",
                          class: "s-typography-button--medium",
                          "data-test-name": "removeLiquidity",
                          onClick: ($event) => handleRemoveLiquidity(liquidityItem)
                        }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(unref(t)("pool.removeLiquidity")), 1)
                          ]),
                          _: 1
                        }, 8, ["onClick"])
                      ]),
                      default: withCtx(() => [
                        createVNode(_component_info_line, {
                          "is-formatted": "",
                          "value-can-be-hidden": "",
                          label: unref(t)("pool.pooledToken", { tokenSymbol: liquidityItem.firstAssetSymbol }),
                          value: liquidityItem.firstBalanceFormatted,
                          "fiat-value": liquidityItem.firstBalanceFiat
                        }, null, 8, ["label", "value", "fiat-value"]),
                        createVNode(_component_info_line, {
                          "is-formatted": "",
                          "value-can-be-hidden": "",
                          label: unref(t)("pool.pooledToken", { tokenSymbol: liquidityItem.secondAssetSymbol }),
                          value: liquidityItem.secondBalanceFormatted,
                          "fiat-value": liquidityItem.secondBalanceFiat
                        }, null, 8, ["label", "value", "fiat-value"]),
                        createVNode(_component_info_line, {
                          "value-can-be-hidden": "",
                          label: unref(t)("pool.poolShare"),
                          value: liquidityItem.poolShareFormatted
                        }, null, 8, ["label", "value"]),
                        liquidityItem.apyFormatted ? (openBlock(), createBlock(_component_info_line, {
                          key: 0,
                          label: unref(t)("pool.strategicBonusApy"),
                          value: liquidityItem.apyFormatted
                        }, null, 8, ["label", "value"])) : createCommentVNode("", true)
                      ]),
                      _: 2
                    }, 1024),
                    renderSlot(_ctx.$slots, "append", mergeProps({ ref_for: true }, { liquidity: liquidityItem, activeCollapseItems: activeCollapseItems.value }), void 0, true)
                  ]),
                  _: 2
                }, 1032, ["name"]);
              }), 128))
            ]),
            _: 3
          }))
        ]),
        unref(isLoggedIn) && hasAccountLiquidities.value ? (openBlock(), createBlock(_component_s_button, {
          key: 0,
          class: "el-button--add-liquidity s-typography-button--large",
          "data-test-name": "addLiquidity",
          type: "primary",
          onClick: _cache[1] || (_cache[1] = ($event) => handleAddLiquidity())
        }, {
          default: withCtx(() => [
            createTextVNode(toDisplayString(unref(t)("pool.addLiquidity")), 1)
          ]),
          _: 1
        })) : createCommentVNode("", true),
        createVNode(_component_add_liquidity_dialog, {
          visible: addLiquidityVisibility.value,
          "onUpdate:visible": _cache[2] || (_cache[2] = ($event) => addLiquidityVisibility.value = $event)
        }, null, 8, ["visible"]),
        createVNode(_component_remove_liquidity_dialog, {
          visible: removeLiquidityVisibility.value,
          "onUpdate:visible": _cache[3] || (_cache[3] = ($event) => removeLiquidityVisibility.value = $event)
        }, null, 8, ["visible"])
      ])), [
        [_directive_loading, unref(parentLoading)]
      ]);
    };
  }
});
const Pool = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-c4bbc02e"]]);
export {
  Pool as default
};
