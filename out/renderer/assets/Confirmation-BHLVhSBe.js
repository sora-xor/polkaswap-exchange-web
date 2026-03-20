import { z as defineComponent, ak as lazyComponent, bF as useAttrs, u as useTranslation, h as computed, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, aN as toDisplayString, aj as unref, ap as createVNode, as as mergeProps, al as Components, b1 as resolveLibraryTheme, s as store, cg as ETH, aP as _export_sfc } from "./index-73GArslZ.js";
import { _ as _sfc_main$1 } from "./Moonpay.vue_vue_type_script_setup_true_lang-B8HGD9Zz.js";
import { u as useMoonpayBridge } from "./useMoonpayBridge-ejSkElaC.js";
import "./consts-Cuk5ZfDH.js";
import "./useBridgeHistory-BfHU-41q.js";
import "./index-FPtsBGoq.js";
import "./useWeb3Connection-eheLMuCm.js";
import "./useWalletConnect-CJNIxFYX.js";
const _hoisted_1 = { class: "moonpay-confirmation__title" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      MoonpayLogo: _sfc_main$1,
      ConfirmBridgeTransactionDialog: lazyComponent(Components.ConfirmBridgeTransactionDialog)
    }
  },
  __name: "Confirmation",
  emits: ["confirm"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const attrs = useAttrs();
    const emit = __emit;
    const { t } = useTranslation();
    const { bridgeTransactionData, getAsset, startBridgeForMoonpayTransaction, setConfirmationVisibility } = useMoonpayBridge();
    const libraryTheme = computed(() => resolveLibraryTheme(store));
    const visibility = computed({
      get: () => Boolean(store.state.moonpay.confirmationVisibility),
      set: (flag) => {
        setConfirmationVisibility(flag);
      }
    });
    const modalData = computed(() => {
      const data = bridgeTransactionData.value;
      if (!data) return {};
      const asset = getAsset(data.assetAddress);
      const nativeAsset = getAsset(ETH.address);
      return {
        isSoraToEvm: false,
        amount: data.amount,
        amount2: data.amount2,
        asset,
        nativeAsset,
        network: data.externalNetwork,
        networkType: data.externalNetworkType,
        externalNetworkFee: data.externalNetworkFee,
        soraNetworkFee: data.soraNetworkFee
      };
    });
    const forwardedAttrs = computed(() => {
      const entries = Object.entries(attrs);
      return entries.reduce((acc, [key, value]) => {
        if (key !== "onConfirm") {
          acc[key] = value;
        }
        return acc;
      }, {});
    });
    const handleConfirm = async () => {
      await startBridgeForMoonpayTransaction();
      emit("confirm");
    };
    __expose({
      get visibility() {
        return visibility.value;
      },
      set visibility(value) {
        visibility.value = value;
      },
      get modalData() {
        return modalData.value;
      },
      handleConfirm
    });
    return (_ctx, _cache) => {
      const _component_confirm_bridge_transaction_dialog = resolveComponent("confirm-bridge-transaction-dialog");
      return openBlock(), createBlock(_component_confirm_bridge_transaction_dialog, mergeProps({ ...forwardedAttrs.value, ...modalData.value }, {
        visible: visibility.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => visibility.value = $event),
        "confirm-button-text": unref(t)("moonpay.buttons.transfer"),
        onConfirm: handleConfirm
      }), {
        title: withCtx(() => [
          createVNode(_sfc_main$1, { theme: libraryTheme.value }, null, 8, ["theme"])
        ]),
        "content-title": withCtx(() => [
          createBaseVNode("div", _hoisted_1, toDisplayString(unref(t)("moonpay.confirmations.txReady")), 1)
        ]),
        _: 1
      }, 16, ["visible", "confirm-button-text"]);
    };
  }
});
const Confirmation = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-d4979034"]]);
export {
  Confirmation as default
};
