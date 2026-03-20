import { z as defineComponent, bt as mergeModels, ak as lazyComponent, aZ as components, bu as useModel, u as useTranslation, U as useLoading, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, aJ as renderSlot, D as createBaseVNode, ap as createVNode, A as createElementBlock, aM as createCommentVNode, aN as toDisplayString, h as computed, aO as createTextVNode, bb as normalizeClass, aj as unref, Z as ZeroStringValue, al as Components, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { u as useNetworkFormatter } from "./useNetworkFormatter-Cuwa7_ot.js";
const _hoisted_1 = { class: "el-dialog__title" };
const _hoisted_2 = { class: "tokens" };
const _hoisted_3 = { class: "tokens-info-container" };
const _hoisted_4 = { class: "token-value" };
const _hoisted_5 = {
  key: 0,
  class: "token"
};
const _hoisted_6 = { class: "tokens-info-container" };
const _hoisted_7 = { class: "token-value" };
const _hoisted_8 = {
  key: 0,
  class: "token"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      DialogBase: components.DialogBase,
      AccountConfirmationOption: components.AccountConfirmationOption,
      BridgeTransactionDetails: lazyComponent(Components.BridgeTransactionDetails)
    }
  },
  __name: "ConfirmBridgeTransaction",
  props: /* @__PURE__ */ mergeModels({
    network: { default: 0 },
    networkType: { default: 0 },
    amountSend: { default: ZeroStringValue },
    amountReceived: { default: ZeroStringValue },
    asset: { default: null },
    nativeToken: { default: null },
    externalTransferFee: { default: ZeroStringValue },
    externalNetworkFee: { default: ZeroStringValue },
    soraNetworkFee: { default: ZeroStringValue },
    isSoraToEvm: { type: Boolean, default: true },
    confirmButtonText: { default: "" }
  }, {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["confirm"], ["update:visible"]),
  setup(__props, { emit: __emit }) {
    const props = __props;
    const visible = useModel(__props, "visible");
    const { t } = useTranslation();
    const { formatStringValue } = useFormattedAmount();
    const { getNetworkName, getNetworkIcon } = useNetworkFormatter();
    const { loading, withLoading } = useLoading();
    const confirmText = computed(() => props.confirmButtonText || t("confirmText"));
    const formattedAmountSend = computed(() => props.amountSend ? formatStringValue(props.amountSend) : "");
    const formattedAmountReceived = computed(() => props.amountReceived ? formatStringValue(props.amountReceived) : "");
    const tokenSymbol = computed(() => props.asset?.symbol ?? "");
    const networkName = computed(
      () => getNetworkName(props.networkType, props.network)
    );
    const emit = __emit;
    async function handleConfirm() {
      await withLoading(async () => {
        emit("confirm");
        visible.value = false;
      });
    }
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_divider = resolveComponent("s-divider");
      const _component_bridge_transaction_details = resolveComponent("bridge-transaction-details");
      const _component_account_confirmation_option = resolveComponent("account-confirmation-option");
      const _component_s_button = resolveComponent("s-button");
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: visible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => visible.value = $event)
      }, {
        title: withCtx(() => [
          renderSlot(_ctx.$slots, "title", {}, () => [
            createBaseVNode("span", _hoisted_1, toDisplayString(unref(t)("confirmTransactionText")), 1)
          ], true)
        ]),
        footer: withCtx(() => [
          createVNode(_component_account_confirmation_option, {
            "with-hint": "",
            class: "confirmation-option"
          }),
          createVNode(_component_s_button, {
            type: "primary",
            class: "s-typography-button--large",
            loading: unref(loading),
            onClick: handleConfirm
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(confirmText.value), 1)
            ]),
            _: 1
          }, 8, ["loading"])
        ]),
        default: withCtx(() => [
          renderSlot(_ctx.$slots, "content-title", {}, void 0, true),
          createBaseVNode("div", _hoisted_2, [
            createBaseVNode("div", _hoisted_3, [
              createBaseVNode("span", _hoisted_4, toDisplayString(formattedAmountSend.value), 1),
              __props.asset ? (openBlock(), createElementBlock("div", _hoisted_5, [
                createBaseVNode("i", {
                  class: normalizeClass(`network-icon network-icon--${unref(getNetworkIcon)(__props.isSoraToEvm ? 0 : __props.network)}`)
                }, null, 2),
                createTextVNode(" " + toDisplayString(tokenSymbol.value), 1)
              ])) : createCommentVNode("", true)
            ]),
            createVNode(_component_s_icon, {
              class: "icon-divider",
              name: "arrows-arrow-bottom-24"
            }),
            createBaseVNode("div", _hoisted_6, [
              createBaseVNode("span", _hoisted_7, toDisplayString(formattedAmountReceived.value), 1),
              __props.asset ? (openBlock(), createElementBlock("div", _hoisted_8, [
                createBaseVNode("i", {
                  class: normalizeClass(`network-icon network-icon--${unref(getNetworkIcon)(__props.isSoraToEvm ? __props.network : 0)}`)
                }, null, 2),
                createTextVNode(" " + toDisplayString(tokenSymbol.value), 1)
              ])) : createCommentVNode("", true)
            ])
          ]),
          createVNode(_component_s_divider, { class: "s-divider--dialog" }),
          createVNode(_component_bridge_transaction_details, {
            asset: __props.asset,
            "native-token": __props.nativeToken,
            "external-transfer-fee": __props.externalTransferFee,
            "external-network-fee": __props.externalNetworkFee,
            "sora-network-fee": __props.soraNetworkFee,
            "network-name": networkName.value
          }, null, 8, ["asset", "native-token", "external-transfer-fee", "external-network-fee", "sora-network-fee", "network-name"])
        ]),
        _: 3
      }, 8, ["visible"]);
    };
  }
});
const ConfirmBridgeTransaction = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-2cca8aa2"]]);
export {
  ConfirmBridgeTransaction as default
};
