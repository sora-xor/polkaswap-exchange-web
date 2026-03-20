import { z as defineComponent, cG as demeterStakingLazyComponent, cZ as poolLazyViewComponent, bF as useAttrs, a_ as resolveComponent, A as createElementBlock, C as openBlock, ap as createVNode, ao as withCtx, aM as createCommentVNode, aj as unref, bQ as Fragment, bP as renderList, am as createBlock, bA as withDirectives, D as createBaseVNode, bB as vShow, as as mergeProps, h as computed, cH as DemeterStakingComponents, bg as PoolPageNames, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useDemeterBasePage, a as useDemeterPage } from "./useDemeterPage-BN2kYsB-.js";
import "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "s-flex farming-pool-badges" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    inheritAttrs: false,
    components: {
      PoolBase: poolLazyViewComponent(PoolPageNames.Pool),
      PoolCard: demeterStakingLazyComponent(DemeterStakingComponents.PoolCard),
      StatusBadge: demeterStakingLazyComponent(DemeterStakingComponents.StatusBadge),
      StakeDialog: demeterStakingLazyComponent(DemeterStakingComponents.StakeDialog),
      ClaimDialog: demeterStakingLazyComponent(DemeterStakingComponents.ClaimDialog),
      CalculatorDialog: demeterStakingLazyComponent(DemeterStakingComponents.CalculatorDialog)
    }
  },
  __name: "Pool",
  props: {
    parentLoading: { type: Boolean, default: false }
  },
  setup(__props) {
    const props = __props;
    const attrs = useAttrs();
    const parentLoading = computed(() => props.parentLoading);
    const base = useDemeterBasePage();
    const page = useDemeterPage(base, { parentLoading });
    return (_ctx, _cache) => {
      const _component_status_badge = resolveComponent("status-badge");
      const _component_pool_card = resolveComponent("pool-card");
      const _component_pool_base = resolveComponent("pool-base");
      const _component_stake_dialog = resolveComponent("stake-dialog");
      const _component_claim_dialog = resolveComponent("claim-dialog");
      const _component_calculator_dialog = resolveComponent("calculator-dialog");
      return openBlock(), createElementBlock("div", null, [
        createVNode(_component_pool_base, mergeProps(unref(attrs), { "parent-loading": parentLoading.value }), {
          "title-append": withCtx(({ liquidity, activeCollapseItems }) => [
            withDirectives(createBaseVNode("div", _hoisted_1, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(page).getLiquidityFarmingPools(liquidity), (item, index) => {
                return openBlock(), createBlock(_component_status_badge, {
                  key: `${item.pool.poolAsset}-${item.pool.rewardAsset}-${index}`,
                  liquidity,
                  pool: item.pool,
                  "account-pool": item.accountPool,
                  "pool-asset": item.poolAsset,
                  "reward-asset": item.rewardAsset,
                  apr: item.apr,
                  onAdd: _cache[0] || (_cache[0] = ($event) => unref(page).changePoolStake($event, true)),
                  class: "farming-pool-badge"
                }, null, 8, ["liquidity", "pool", "account-pool", "pool-asset", "reward-asset", "apr"]);
              }), 128))
            ], 512), [
              [vShow, !_ctx.isActiveCollapseItem(liquidity.address, activeCollapseItems)]
            ])
          ]),
          append: withCtx(({ liquidity, activeCollapseItems }) => [
            unref(page).isActiveCollapseItem(liquidity.address, activeCollapseItems) ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(unref(page).getLiquidityFarmingPools(liquidity), (item, index) => {
              return openBlock(), createBlock(_component_pool_card, {
                key: `${item.pool.poolAsset}-${item.pool.rewardAsset}-${index}`,
                liquidity,
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
                onCalculator: _cache[3] || (_cache[3] = ($event) => unref(base).showCalculatorDialog($event)),
                border: "",
                class: "demeter-pool"
              }, null, 8, ["liquidity", "pool", "account-pool", "base-asset", "pool-asset", "reward-asset", "apr", "tvl", "onClaim"]);
            }), 128)) : createCommentVNode("", true)
          ]),
          _: 1
        }, 16, ["parent-loading"]),
        createVNode(_component_stake_dialog, mergeProps({
          visible: unref(page).showStakeDialog,
          "onUpdate:visible": _cache[4] || (_cache[4] = ($event) => unref(page).showStakeDialog = $event),
          "is-adding": unref(page).isAddingStake,
          liquidity: unref(base).selectedAccountLiquidity,
          "parent-loading": parentLoading.value || unref(page).loading
        }, unref(page).selectedDerivedPool, {
          onAdd: _cache[5] || (_cache[5] = ($event) => unref(page).handleStakeAction($event, unref(page).deposit)),
          onRemove: _cache[6] || (_cache[6] = ($event) => unref(page).handleStakeAction($event, unref(page).withdraw))
        }), null, 16, ["visible", "is-adding", "liquidity", "parent-loading"]),
        createVNode(_component_claim_dialog, mergeProps({
          visible: unref(page).showClaimDialog,
          "onUpdate:visible": _cache[7] || (_cache[7] = ($event) => unref(page).showClaimDialog = $event),
          "parent-loading": parentLoading.value || unref(page).loading
        }, unref(page).selectedDerivedPool, {
          onConfirm: unref(page).handleClaimRewards
        }), null, 16, ["visible", "parent-loading", "onConfirm"]),
        createVNode(_component_calculator_dialog, mergeProps({
          visible: unref(base).showCalculatorDialog,
          "onUpdate:visible": _cache[8] || (_cache[8] = ($event) => unref(base).showCalculatorDialog = $event),
          liquidity: unref(base).selectedAccountLiquidity
        }, unref(page).selectedDerivedPool), null, 16, ["visible", "liquidity"])
      ]);
    };
  }
});
const Pool = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-2400306d"]]);
export {
  Pool as default
};
