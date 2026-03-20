import { z as defineComponent, u as useTranslation, au as useRouter, U as useLoading, c_ as soraStakingLazyComponent, c$ as SoraStakingComponents, A as createElementBlock, C as openBlock, ap as createVNode, ao as withCtx, aO as createTextVNode, aN as toDisplayString, aj as unref, d0 as SoraStakingPageNames, h as computed, a9 as ref, bc as ValidatorsListMode, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useSoraStaking } from "./useSoraStaking-B7oKU4Xa.js";
import "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "container" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{ inheritAttrs: false },
  __name: "ValidatorsType",
  props: {
    parentLoading: { type: Boolean }
  },
  setup(__props) {
    const props = __props;
    const { t } = useTranslation();
    const router = useRouter();
    const { loading } = useLoading();
    const { setValidatorsType } = useSoraStaking();
    const StakingHeader = soraStakingLazyComponent(SoraStakingComponents.StakingHeader);
    const ValidatorsAttentionDialog = soraStakingLazyComponent(SoraStakingComponents.ValidatorsAttentionDialog);
    const SelectValidatorsMode = soraStakingLazyComponent(SoraStakingComponents.SelectValidatorsMode);
    const showValidatorsAttentionDialog = ref(false);
    const dialogParentLoading = computed(() => Boolean(props.parentLoading) || loading.value);
    const stakeWithSuggested = () => {
      setValidatorsType(ValidatorsListMode.RECOMMENDED);
      showValidatorsAttentionDialog.value = true;
    };
    const stakeWithSelected = () => {
      setValidatorsType(ValidatorsListMode.SELECT);
      showValidatorsAttentionDialog.value = true;
    };
    const handleSelectValidators = () => {
      showValidatorsAttentionDialog.value = false;
      router.push({ name: SoraStakingPageNames.SelectValidators });
    };
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(unref(StakingHeader), {
          "previous-page": unref(SoraStakingPageNames).Overview
        }, {
          default: withCtx(() => [
            createTextVNode(toDisplayString(unref(t)("soraStaking.info.validators")), 1)
          ]),
          _: 1
        }, 8, ["previous-page"]),
        createVNode(unref(SelectValidatorsMode), {
          onRecommended: stakeWithSuggested,
          onSelected: stakeWithSelected
        }),
        createVNode(unref(ValidatorsAttentionDialog), {
          visible: showValidatorsAttentionDialog.value,
          "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => showValidatorsAttentionDialog.value = $event),
          "parent-loading": dialogParentLoading.value,
          onProceed: handleSelectValidators
        }, null, 8, ["visible", "parent-loading"])
      ]);
    };
  }
});
const ValidatorsType = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-0a4b0035"]]);
export {
  ValidatorsType as default
};
