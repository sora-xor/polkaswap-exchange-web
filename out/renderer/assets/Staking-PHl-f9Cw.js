import { z as defineComponent, aZ as components, cG as demeterStakingLazyComponent, c_ as soraStakingLazyComponent, cZ as poolLazyViewComponent, ak as lazyComponent, u as useTranslation, h as computed, a_ as resolveComponent, bz as resolveDirective, bA as withDirectives, A as createElementBlock, C as openBlock, ap as createVNode, am as createBlock, aM as createCommentVNode, aj as unref, dG as soraStaking, ao as withCtx, aO as createTextVNode, aN as toDisplayString, D as createBaseVNode, bB as vShow, a9 as ref, d0 as SoraStakingPageNames, bQ as Fragment, bP as renderList, as as mergeProps, cH as DemeterStakingComponents, c$ as SoraStakingComponents, bg as PoolPageNames, al as Components, dh as sortAssets, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useDemeterBasePage, a as useDemeterPage } from "./useDemeterPage-BN2kYsB-.js";
import "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "container" };
const _hoisted_2 = { class: "staking-info-title" };
const _hoisted_3 = { class: "s-flex staking-info-badges" };
const _hoisted_4 = {
  key: 1,
  class: "staking-sora-separator"
};
const _hoisted_5 = { class: "staking-info-title" };
const _hoisted_6 = { class: "s-flex staking-info-badges" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      GenericPageHeader: lazyComponent(Components.GenericPageHeader),
      PoolBase: poolLazyViewComponent(PoolPageNames.Pool),
      PoolCard: demeterStakingLazyComponent(DemeterStakingComponents.PoolCard),
      DemeterStatusBadge: demeterStakingLazyComponent(DemeterStakingComponents.StatusBadge),
      SoraStatusBadge: soraStakingLazyComponent(SoraStakingComponents.StatusBadge),
      StakeDialog: demeterStakingLazyComponent(DemeterStakingComponents.StakeDialog),
      ClaimDialog: demeterStakingLazyComponent(DemeterStakingComponents.ClaimDialog),
      CalculatorDialog: demeterStakingLazyComponent(DemeterStakingComponents.CalculatorDialog),
      TokenLogo: components.TokenLogo
    }
  },
  __name: "Staking",
  props: {
    parentLoading: { type: Boolean, default: false }
  },
  setup(__props) {
    const props = __props;
    const { t } = useTranslation();
    const base = useDemeterBasePage({ isFarmingPage: true });
    const page = useDemeterPage(base, { parentLoading: computed(() => props.parentLoading) });
    const parentLoading = computed(() => props.parentLoading || page.loading.value);
    const soraStaking$1 = soraStaking;
    const activeCollapseItems = ref([]);
    const updateActiveCollapseItems = (items) => {
      activeCollapseItems.value = items;
    };
    const tokensData = computed(() => {
      const pools = base.pools.value;
      const assets = base.demeterAssetsData.value;
      return Object.entries(pools ?? {}).reduce((buffer, [address, poolMap]) => {
        const asset = assets[address];
        if (!asset) return buffer;
        const derivedItems = Object.values(poolMap ?? {}).flatMap((list) => {
          const derived = base.getDerivedPools(list);
          return derived.map((item) => base.prepareDerivedPoolData(item.pool, item.accountPool));
        });
        if (!derivedItems.length) return buffer;
        buffer.push({ asset, items: derivedItems });
        return buffer;
      }, []).sort((a, b) => sortAssets(a.asset, b.asset));
    });
    return (_ctx, _cache) => {
      const _component_generic_page_header = resolveComponent("generic-page-header");
      const _component_s_card = resolveComponent("s-card");
      const _component_token_logo = resolveComponent("token-logo");
      const _component_sora_status_badge = resolveComponent("sora-status-badge");
      const _component_s_icon = resolveComponent("s-icon");
      const _component_router_link = resolveComponent("router-link");
      const _component_demeter_status_badge = resolveComponent("demeter-status-badge");
      const _component_pool_card = resolveComponent("pool-card");
      const _component_s_collapse_item = resolveComponent("s-collapse-item");
      const _component_s_collapse = resolveComponent("s-collapse");
      const _component_stake_dialog = resolveComponent("stake-dialog");
      const _component_claim_dialog = resolveComponent("claim-dialog");
      const _component_calculator_dialog = resolveComponent("calculator-dialog");
      const _directive_loading = resolveDirective("loading");
      return withDirectives((openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_generic_page_header, {
          title: unref(t)("pageTitle.Staking")
        }, null, 8, ["title"]),
        !tokensData.value.length && !unref(soraStaking$1) ? (openBlock(), createBlock(_component_s_card, {
          key: 0,
          shadow: "always",
          size: "big",
          primary: "",
          class: "staking-empty-card"
        }, {
          default: withCtx(() => [
            createTextVNode(toDisplayString(unref(t)("demeterFarming.staking.stopped")), 1)
          ]),
          _: 1
        })) : createCommentVNode("", true),
        createVNode(_component_router_link, {
          class: "staking-sora-link",
          to: { name: unref(SoraStakingPageNames).Overview }
        }, {
          default: withCtx(() => [
            createVNode(_component_s_card, { class: "staking-sora-card" }, {
              default: withCtx(() => [
                createVNode(_component_token_logo, {
                  token: unref(soraStaking$1).asset,
                  size: "medium",
                  class: "token-logo"
                }, null, 8, ["token"]),
                createBaseVNode("div", null, [
                  _cache[8] || (_cache[8] = createBaseVNode("h5", { class: "staking-info-subtitle" }, "sora staking", -1)),
                  createBaseVNode("h3", _hoisted_2, toDisplayString(unref(soraStaking$1).asset.symbol), 1),
                  withDirectives(createBaseVNode("div", _hoisted_3, [
                    createVNode(_component_sora_status_badge)
                  ], 512), [
                    [vShow, !unref(page).isActiveCollapseItem("sora", activeCollapseItems.value)]
                  ])
                ]),
                createVNode(_component_s_icon, {
                  class: "staking-sora-arrow",
                  name: "arrows-chevron-right-rounded-24",
                  size: "24"
                })
              ]),
              _: 1
            })
          ]),
          _: 1
        }, 8, ["to"]),
        tokensData.value.length ? (openBlock(), createElementBlock("span", _hoisted_4)) : createCommentVNode("", true),
        createVNode(_component_s_collapse, {
          class: "demeter-staking-list",
          onChange: updateActiveCollapseItems
        }, {
          default: withCtx(() => [
            (openBlock(true), createElementBlock(Fragment, null, renderList(tokensData.value, (token) => {
              return openBlock(), createBlock(_component_s_collapse_item, {
                key: token.asset.address,
                name: token.asset.address,
                class: "staking-info"
              }, {
                title: withCtx(() => [
                  createVNode(_component_token_logo, {
                    token: token.asset,
                    size: "medium",
                    class: "token-logo"
                  }, null, 8, ["token"]),
                  createBaseVNode("div", null, [
                    createBaseVNode("h3", _hoisted_5, toDisplayString(token.asset.symbol), 1),
                    withDirectives(createBaseVNode("div", _hoisted_6, [
                      (openBlock(true), createElementBlock(Fragment, null, renderList(token.items, (item) => {
                        return openBlock(), createBlock(_component_demeter_status_badge, {
                          key: item.pool.rewardAsset,
                          pool: item.pool,
                          "account-pool": item.accountPool,
                          "pool-asset": item.poolAsset,
                          "reward-asset": item.rewardAsset,
                          apr: item.apr,
                          onAdd: _cache[0] || (_cache[0] = ($event) => unref(page).changePoolStake($event, true)),
                          class: "staking-info-badge"
                        }, null, 8, ["pool", "account-pool", "pool-asset", "reward-asset", "apr"]);
                      }), 128))
                    ], 512), [
                      [vShow, !unref(page).isActiveCollapseItem(token.asset.address, activeCollapseItems.value)]
                    ])
                  ])
                ]),
                default: withCtx(() => [
                  unref(page).isActiveCollapseItem(token.asset.address, activeCollapseItems.value) ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(token.items, (item) => {
                    return openBlock(), createBlock(_component_pool_card, {
                      key: item.pool.rewardAsset,
                      pool: item.pool,
                      "account-pool": item.accountPool,
                      "base-asset": item.baseAsset,
                      "pool-asset": item.poolAsset,
                      "reward-asset": item.rewardAsset,
                      apr: item.apr,
                      tvl: item.tvl,
                      onAdd: _cache[1] || (_cache[1] = ($event) => unref(page).changePoolStake($event, true)),
                      onRemove: _cache[2] || (_cache[2] = ($event) => unref(page).changePoolStake($event, false)),
                      onClaim: unref(page).claimPoolRewards,
                      onCalculator: _ctx.showPoolCalculator,
                      "show-balance": "",
                      class: "staking-info-card"
                    }, null, 8, ["pool", "account-pool", "base-asset", "pool-asset", "reward-asset", "apr", "tvl", "onClaim", "onCalculator"]);
                  }), 128)) : createCommentVNode("", true)
                ]),
                _: 2
              }, 1032, ["name"]);
            }), 128))
          ]),
          _: 1
        }),
        createVNode(_component_stake_dialog, mergeProps({
          visible: unref(page).showStakeDialog,
          "onUpdate:visible": _cache[3] || (_cache[3] = ($event) => unref(page).showStakeDialog = $event),
          "is-adding": unref(page).isAddingStake,
          "parent-loading": parentLoading.value
        }, unref(page).selectedDerivedPool, {
          onAdd: _cache[4] || (_cache[4] = ($event) => unref(page).handleStakeAction($event, unref(page).deposit)),
          onRemove: _cache[5] || (_cache[5] = ($event) => unref(page).handleStakeAction($event, unref(page).withdraw))
        }), null, 16, ["visible", "is-adding", "parent-loading"]),
        createVNode(_component_claim_dialog, mergeProps({
          visible: unref(page).showClaimDialog,
          "onUpdate:visible": _cache[6] || (_cache[6] = ($event) => unref(page).showClaimDialog = $event),
          "parent-loading": parentLoading.value
        }, unref(page).selectedDerivedPool, {
          onConfirm: unref(page).handleClaimRewards
        }), null, 16, ["visible", "parent-loading", "onConfirm"]),
        createVNode(_component_calculator_dialog, mergeProps({
          visible: unref(base).showCalculatorDialog,
          "onUpdate:visible": _cache[7] || (_cache[7] = ($event) => unref(base).showCalculatorDialog = $event)
        }, unref(page).selectedDerivedPool), null, 16, ["visible"])
      ])), [
        [_directive_loading, parentLoading.value]
      ]);
    };
  }
});
const Staking = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-67c110b5"]]);
export {
  Staking as default
};
