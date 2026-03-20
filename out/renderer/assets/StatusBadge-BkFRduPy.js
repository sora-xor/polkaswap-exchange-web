import { z as defineComponent, u as useTranslation, ak as lazyComponent, al as Components, h as computed, am as createBlock, C as openBlock, aj as unref, aU as formatDecimalPlaces, ad as asZeroValue } from "./index-73GArslZ.js";
import { u as useSoraStaking } from "./useSoraStaking-B7oKU4Xa.js";
import "./useFormattedAmount-D-xkdlPs.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "StatusBadge",
  setup(__props, { expose: __expose }) {
    const { t } = useTranslation();
    const { stakingInitialized, maxApy, rewardAsset } = useSoraStaking();
    const StatusBadgeShared = lazyComponent(Components.StatusBadge);
    const soraStakingApyFormatted = computed(
      () => asZeroValue(maxApy.value) ? t("calculatingText") : formatDecimalPlaces(maxApy.value, true)
    );
    __expose({ soraStakingApyFormatted });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(StatusBadgeShared), {
        active: unref(stakingInitialized),
        stopped: false,
        apr: soraStakingApyFormatted.value,
        "reward-asset": unref(rewardAsset)
      }, null, 8, ["active", "apr", "reward-asset"]);
    };
  }
});
export {
  _sfc_main as default
};
