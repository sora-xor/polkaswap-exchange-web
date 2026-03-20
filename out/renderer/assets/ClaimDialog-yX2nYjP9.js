import { z as defineComponent, bt as mergeModels, aZ as components, bu as useModel, bm as toRefs, u as useTranslation, X as XOR, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aj as unref, h as computed, aI as WALLET_CONSTS, A as createElementBlock, bQ as Fragment, aO as createTextVNode, aN as toDisplayString, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useDemeterPoolCard } from "./useDemeterPoolCard-B9FeKKhi.js";
import { u as useDemeterPoolStatus } from "./useDemeterPoolStatus-2sPwJr2b.js";
import "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "claim-dialog" };
const _hoisted_2 = { class: "claim-dialog-title" };
const _hoisted_3 = { class: "claim-dialog-info" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      DialogBase: components.DialogBase,
      InfoLine: components.InfoLine,
      TokenLogo: components.TokenLogo,
      FormattedAmount: components.FormattedAmount
    }
  },
  __name: "ClaimDialog",
  props: /* @__PURE__ */ mergeModels({
    parentLoading: { type: Boolean, default: false },
    liquidity: { type: Object, default: null },
    pool: { type: Object, default: null },
    accountPool: { type: Object, default: null },
    poolAsset: { type: Object, default: null },
    rewardAsset: { type: Object, default: null }
  }, {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["close", "confirm"], ["update:visible"]),
  setup(__props, { emit: __emit }) {
    const FontSizeRate = WALLET_CONSTS.FontSizeRate;
    const props = __props;
    const emit = __emit;
    const isVisible = useModel(__props, "visible");
    const { liquidity, pool, accountPool, poolAsset, rewardAsset } = toRefs(props);
    const statusApi = useDemeterPoolStatus({
      liquidity,
      pool,
      accountPool,
      poolAsset,
      rewardAsset
    });
    const cardApi = useDemeterPoolCard(statusApi);
    const { t } = useTranslation();
    const rewardAssetSymbol = computed(() => cardApi.rewardAssetSymbol.value);
    const rewardsFormatted = computed(() => cardApi.rewardsFormatted.value);
    const rewardsFiat = computed(() => cardApi.rewardsFiat.value);
    const networkFee = computed(() => cardApi.networkFee.value);
    const networkFeeFormatted = computed(() => cardApi.networkFeeFormatted.value);
    const xorSymbol = XOR.symbol;
    const isInsufficientXorForFee = computed(() => cardApi.isInsufficientXorForFee.value);
    const parentLoading = computed(() => props.parentLoading);
    const getFiatAmountByCodecString = statusApi.getFiatAmountByCodecString;
    const confirm = () => {
      emit("confirm", statusApi.accountPool.value ?? null);
    };
    return (_ctx, _cache) => {
      const _component_token_logo = resolveComponent("token-logo");
      const _component_formatted_amount = resolveComponent("formatted-amount");
      const _component_info_line = resolveComponent("info-line");
      const _component_s_button = resolveComponent("s-button");
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: isVisible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isVisible.value = $event),
        title: unref(t)("demeterFarming.actions.claim")
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("div", _hoisted_2, [
              createVNode(_component_token_logo, {
                class: "claim-dialog-logo",
                token: unref(rewardAsset),
                size: "large"
              }, null, 8, ["token"]),
              createVNode(_component_formatted_amount, {
                "value-can-be-hidden": "",
                "symbol-as-decimal": "",
                value: rewardsFormatted.value,
                "font-size-rate": unref(FontSizeRate).SMALL,
                "asset-symbol": rewardAssetSymbol.value,
                class: "claim-dialog-value"
              }, null, 8, ["value", "font-size-rate", "asset-symbol"]),
              createVNode(_component_formatted_amount, {
                "value-can-be-hidden": "",
                "is-fiat-value": "",
                value: rewardsFiat.value,
                "font-size-rate": unref(FontSizeRate).MEDIUM,
                class: "claim-dialog-value--fiat"
              }, null, 8, ["value", "font-size-rate"])
            ]),
            createBaseVNode("div", _hoisted_3, [
              createVNode(_component_info_line, {
                label: unref(t)("networkFeeText"),
                "label-tooltip": unref(t)("networkFeeTooltipText"),
                value: networkFeeFormatted.value,
                "asset-symbol": unref(xorSymbol),
                "fiat-value": unref(getFiatAmountByCodecString)(networkFee.value),
                "is-formatted": ""
              }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"])
            ]),
            createVNode(_component_s_button, {
              type: "primary",
              class: "s-typography-button--large action-button",
              loading: parentLoading.value,
              disabled: isInsufficientXorForFee.value,
              onClick: confirm
            }, {
              default: withCtx(() => [
                isInsufficientXorForFee.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: unref(xorSymbol) })), 1)
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode(toDisplayString(unref(t)("signAndClaimText")), 1)
                ], 64))
              ]),
              _: 1
            }, 8, ["loading", "disabled"])
          ])
        ]),
        _: 1
      }, 8, ["visible", "title"]);
    };
  }
});
const ClaimDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-4489c455"]]);
export {
  ClaimDialog as default
};
