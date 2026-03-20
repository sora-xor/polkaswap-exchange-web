import { z as defineComponent, u as useTranslation, au as useRouter, U as useLoading, c_ as soraStakingLazyComponent, c$ as SoraStakingComponents, a_ as resolveComponent, bz as resolveDirective, bA as withDirectives, h as computed, A as createElementBlock, C as openBlock, ap as createVNode, ao as withCtx, aO as createTextVNode, aN as toDisplayString, aj as unref, d0 as SoraStakingPageNames, d1 as StakeDialogMode, a9 as ref, bc as ValidatorsListMode, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useSoraStaking } from "./useSoraStaking-B7oKU4Xa.js";
import "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "container" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{ inheritAttrs: false },
  __name: "SelectValidators",
  props: {
    parentLoading: { type: Boolean }
  },
  setup(__props) {
    const props = __props;
    const { t } = useTranslation();
    const router = useRouter();
    const { loading } = useLoading();
    const { newStakeValidatorsMode, validators, selectedValidators, selectValidators } = useSoraStaking();
    const StakingHeader = soraStakingLazyComponent(SoraStakingComponents.StakingHeader);
    const ValidatorsList = soraStakingLazyComponent(SoraStakingComponents.ValidatorsList);
    const StakeDialog = soraStakingLazyComponent(SoraStakingComponents.StakeDialog);
    const showStakeDialog = ref(false);
    const containerLoading = computed(() => Boolean(props.parentLoading) || !validators.value.length);
    const dialogParentLoading = computed(() => Boolean(props.parentLoading) || loading.value);
    const title = computed(
      () => newStakeValidatorsMode.value === ValidatorsListMode.RECOMMENDED ? t("soraStaking.validators.recommended") : t("soraStaking.validators.select")
    );
    const confirmText = computed(
      () => newStakeValidatorsMode.value === ValidatorsListMode.RECOMMENDED ? t("soraStaking.validators.next") : t("soraStaking.validators.selected", {
        selected: selectedValidators.value.length,
        total: validators.value.length
      })
    );
    const confirmDisabled = computed(() => selectedValidators.value.length === 0);
    const handleConfirm = () => {
      showStakeDialog.value = true;
    };
    const handleStake = () => {
      showStakeDialog.value = false;
      router.push({ name: SoraStakingPageNames.Overview });
    };
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      const _directive_loading = resolveDirective("loading");
      return withDirectives((openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(unref(StakingHeader), {
          "previous-page": unref(SoraStakingPageNames).ValidatorsType
        }, {
          default: withCtx(() => [
            createTextVNode(toDisplayString(title.value), 1)
          ]),
          _: 1
        }, 8, ["previous-page"]),
        createVNode(unref(ValidatorsList), {
          mode: unref(newStakeValidatorsMode),
          validators: unref(validators),
          "selected-validators": unref(selectedValidators),
          "onUpdate:selected": unref(selectValidators)
        }, null, 8, ["mode", "validators", "selected-validators", "onUpdate:selected"]),
        createVNode(_component_s_button, {
          class: "confirm",
          type: "primary",
          disabled: confirmDisabled.value,
          onClick: handleConfirm
        }, {
          default: withCtx(() => [
            createTextVNode(toDisplayString(confirmText.value), 1)
          ]),
          _: 1
        }, 8, ["disabled"]),
        createVNode(unref(StakeDialog), {
          visible: showStakeDialog.value,
          "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => showStakeDialog.value = $event),
          mode: unref(StakeDialogMode).NEW,
          "parent-loading": dialogParentLoading.value,
          onConfirm: handleStake
        }, null, 8, ["visible", "mode", "parent-loading"])
      ])), [
        [_directive_loading, containerLoading.value]
      ]);
    };
  }
});
const SelectValidators = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-013caf59"]]);
export {
  SelectValidators as default
};
