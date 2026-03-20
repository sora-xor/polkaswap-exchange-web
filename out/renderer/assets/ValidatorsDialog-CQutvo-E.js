import { z as defineComponent, bt as mergeModels, bu as useModel, u as useTranslation, c2 as useTransaction, aZ as components, c_ as soraStakingLazyComponent, c$ as SoraStakingComponents, a9 as ref, bc as ValidatorsListMode, aA as watch, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, A as createElementBlock, aj as unref, h as computed, aO as createTextVNode, aN as toDisplayString, aM as createCommentVNode, bQ as Fragment, bP as renderList, s as store, aS as hasInsufficientXorForFee, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { u as useSoraStaking } from "./useSoraStaking-B7oKU4Xa.js";
const _hoisted_1 = {
  key: 0,
  class: "content"
};
const _hoisted_2 = {
  key: 1,
  class: "bottom"
};
const _hoisted_3 = {
  key: 0,
  class: "info"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ValidatorsDialog",
  props: /* @__PURE__ */ mergeModels({
    parentLoading: { type: Boolean }
  }, {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["close", "confirm"], ["update:visible"]),
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const isVisible = useModel(__props, "visible");
    const { t } = useTranslation();
    const { getFiatAmountByCodecString } = useFormattedAmount();
    const {
      stakingInfo,
      validators,
      selectedValidators,
      selectValidators,
      maxNominations,
      xor,
      formatCodecNumber,
      nominate
    } = useSoraStaking();
    const { loading, withNotifications, withApi } = useTransaction({
      parentLoading: () => Boolean(props.parentLoading)
    });
    const DialogBase = components.DialogBase;
    const InfoLine = components.InfoLine;
    const StakingHeader = soraStakingLazyComponent(SoraStakingComponents.StakingHeader);
    const ValidatorsList = soraStakingLazyComponent(SoraStakingComponents.ValidatorsList);
    const SelectValidatorsMode = soraStakingLazyComponent(SoraStakingComponents.SelectValidatorsMode);
    const mode = ref(ValidatorsListMode.USER);
    const isSelectingEditingMode = ref(false);
    const nominateNetworkFee = ref(null);
    const tabs = [ValidatorsListMode.USER, ValidatorsListMode.ALL];
    const networkFee = computed(() => nominateNetworkFee.value ?? "0");
    const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
    const networkFeeFiat = computed(() => xor.value ? getFiatAmountByCodecString(networkFee.value, xor.value) : null);
    const insufficientXorForFee = computed(
      () => xor.value ? hasInsufficientXorForFee(xor.value, networkFee.value) : false
    );
    const title = computed(
      () => hasTabs.value ? t("soraStaking.info.validators") : t("soraStaking.validatorsDialog.title.edit")
    );
    const hasTabs = computed(() => tabs.includes(mode.value));
    const isEditMode = computed(() => [ValidatorsListMode.RECOMMENDED, ValidatorsListMode.SELECT].includes(mode.value));
    const hasBackButton = computed(() => isEditMode.value || isSelectingEditingMode.value);
    const hasChanges = computed(() => {
      const selected = selectedValidators.value.map((validator) => validator.address);
      const userValidators = stakingInfo.value?.myValidators;
      if (!userValidators) return false;
      const sameLength = selected.length === userValidators.length;
      const sameContent = selected.every((address) => userValidators.includes(address));
      return !(sameLength && sameContent);
    });
    const tooManySelected = computed(
      () => selectedValidators.value.length > (maxNominations.value ?? Number.POSITIVE_INFINITY)
    );
    const confirmText = computed(() => {
      switch (mode.value) {
        case ValidatorsListMode.USER:
          return t("soraStaking.validators.change");
        case ValidatorsListMode.RECOMMENDED:
          return insufficientXorForFee.value ? t("insufficientBalanceText", { tokenSymbol: xor.value?.symbol ?? "" }) : hasChanges.value ? t("soraStaking.validators.save") : t("soraStaking.validators.alreadyNominated");
        case ValidatorsListMode.SELECT:
          return insufficientXorForFee.value ? t("insufficientBalanceText", { tokenSymbol: xor.value?.symbol ?? "" }) : hasChanges.value ? tooManySelected.value ? t("soraStaking.validators.tooManyValidators") : t("soraStaking.validators.selected", {
            selected: selectedValidators.value.length,
            total: validators.value.length
          }) : t("soraStaking.validators.alreadyNominated");
        default:
          return "";
      }
    });
    const showConfirmButton = computed(() => mode.value !== ValidatorsListMode.ALL && !isSelectingEditingMode.value);
    const confirmDisabled = computed(() => {
      if (insufficientXorForFee.value && mode.value !== ValidatorsListMode.USER) return true;
      if (mode.value === ValidatorsListMode.RECOMMENDED) return !hasChanges.value;
      if (mode.value === ValidatorsListMode.SELECT) {
        return selectedValidators.value.length === 0 || !hasChanges.value || tooManySelected.value;
      }
      return false;
    });
    const buttonLoading = computed(() => Boolean(props.parentLoading) || loading.value);
    const setStakingInfo = (info) => {
      store.commit.staking.setStakingInfo(info);
    };
    const setMode = (nextMode) => {
      mode.value = nextMode;
      isSelectingEditingMode.value = false;
    };
    const updateNominateFee = async () => {
      try {
        await withApi(async () => {
          nominateNetworkFee.value = await store.dispatch.staking.getNominateNetworkFee();
        });
      } catch (error) {
        console.error("Failed to fetch nominate network fee", error);
        nominateNetworkFee.value = null;
      }
    };
    watch(selectedValidators, updateNominateFee, { immediate: true });
    watch(isVisible, (visible) => {
      if (visible) {
        setMode(ValidatorsListMode.USER);
        selectValidators([]);
      }
    });
    const handleBack = () => {
      if (isSelectingEditingMode.value) {
        setMode(ValidatorsListMode.USER);
      } else {
        isSelectingEditingMode.value = true;
      }
    };
    const handleRecommendedMode = () => {
      setMode(ValidatorsListMode.RECOMMENDED);
    };
    const handleSelectedMode = () => {
      setMode(ValidatorsListMode.SELECT);
    };
    const handleConfirm = async () => {
      if (mode.value === ValidatorsListMode.USER) {
        isSelectingEditingMode.value = true;
        return;
      }
      await withNotifications(async () => {
        await nominate();
        if (!stakingInfo.value) {
          throw new Error("There is no staking info");
        }
        setStakingInfo({
          ...stakingInfo.value,
          myValidators: selectedValidators.value.map((validator) => validator.address)
        });
        setMode(ValidatorsListMode.USER);
        emit("confirm");
      });
    };
    return (_ctx, _cache) => {
      const _component_s_tab = resolveComponent("s-tab");
      const _component_s_tabs = resolveComponent("s-tabs");
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createBlock(unref(DialogBase), {
        class: "validators-dialog",
        visible: isVisible.value,
        "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => isVisible.value = $event)
      }, {
        default: withCtx(() => [
          createVNode(unref(StakingHeader), {
            class: "header",
            "has-back-button": hasBackButton.value,
            onBack: handleBack
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(title.value), 1)
            ]),
            _: 1
          }, 8, ["has-back-button"]),
          !isSelectingEditingMode.value ? (openBlock(), createElementBlock("div", _hoisted_1, [
            hasTabs.value ? (openBlock(), createBlock(_component_s_tabs, {
              key: 0,
              class: "tabs",
              modelValue: mode.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => mode.value = $event),
              type: "rounded"
            }, {
              default: withCtx(() => [
                (openBlock(), createElementBlock(Fragment, null, renderList(tabs, (tab) => {
                  return createVNode(_component_s_tab, {
                    key: tab,
                    label: unref(t)(`soraStaking.validatorsDialog.tabs.${tab}`),
                    name: tab
                  }, null, 8, ["label", "name"]);
                }), 64))
              ]),
              _: 1
            }, 8, ["modelValue"])) : createCommentVNode("", true),
            createVNode(unref(ValidatorsList), {
              mode: mode.value,
              "onUpdate:selected": unref(selectValidators)
            }, null, 8, ["mode", "onUpdate:selected"]),
            showConfirmButton.value ? (openBlock(), createElementBlock("div", _hoisted_2, [
              createVNode(_component_s_button, {
                class: "confirm",
                type: "primary",
                loading: buttonLoading.value,
                disabled: confirmDisabled.value,
                onClick: handleConfirm
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(confirmText.value), 1)
                ]),
                _: 1
              }, 8, ["loading", "disabled"]),
              isEditMode.value ? (openBlock(), createElementBlock("div", _hoisted_3, [
                createVNode(unref(InfoLine), {
                  label: unref(t)("networkFeeText"),
                  "label-tooltip": unref(t)("networkFeeTooltipText"),
                  value: networkFeeFormatted.value,
                  "asset-symbol": unref(xor)?.symbol,
                  "fiat-value": networkFeeFiat.value,
                  "is-formatted": ""
                }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"])
              ])) : createCommentVNode("", true)
            ])) : createCommentVNode("", true)
          ])) : (openBlock(), createBlock(unref(SelectValidatorsMode), {
            key: 1,
            onRecommended: handleRecommendedMode,
            onSelected: handleSelectedMode
          }))
        ]),
        _: 1
      }, 8, ["visible"]);
    };
  }
});
const ValidatorsDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-660ed434"]]);
export {
  ValidatorsDialog as default
};
