import { z as defineComponent, Z as ZeroStringValue, ak as lazyComponent, bm as toRefs, a_ as resolveComponent, am as createBlock, C as openBlock, h as computed, al as Components } from "./index-73GArslZ.js";
import { u as useDemeterPoolStatus } from "./useDemeterPoolStatus-2sPwJr2b.js";
import "./useFormattedAmount-D-xkdlPs.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      StatusBadgeShared: lazyComponent(Components.StatusBadge)
    }
  },
  __name: "StatusBadge",
  props: {
    liquidity: { type: Object, default: null },
    pool: { type: Object, default: null },
    accountPool: { type: Object, default: null },
    poolAsset: { type: Object, default: null },
    rewardAsset: { type: Object, default: null },
    apr: { type: String, default: ZeroStringValue }
  },
  emits: ["add"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const { liquidity, pool, accountPool, poolAsset, rewardAsset } = toRefs(props);
    const statusApi = useDemeterPoolStatus({
      liquidity,
      pool,
      accountPool,
      poolAsset,
      rewardAsset
    });
    const apr = computed(() => props.apr);
    const rewardAssetValue = computed(() => rewardAsset.value);
    const hasStake = computed(() => statusApi.hasStake.value);
    const activeStatus = computed(() => statusApi.activeStatus.value);
    const depositDisabled = computed(() => statusApi.depositDisabled.value);
    const handleBadgeClick = (event) => {
      if (depositDisabled.value) return;
      event.stopPropagation();
      emit("add", statusApi.emitParams.value);
    };
    return (_ctx, _cache) => {
      const _component_status_badge_shared = resolveComponent("status-badge-shared");
      return openBlock(), createBlock(_component_status_badge_shared, {
        active: hasStake.value,
        stopped: !activeStatus.value,
        apr: apr.value,
        "reward-asset": rewardAssetValue.value,
        onClick: handleBadgeClick
      }, null, 8, ["active", "stopped", "apr", "reward-asset"]);
    };
  }
});
export {
  _sfc_main as default
};
