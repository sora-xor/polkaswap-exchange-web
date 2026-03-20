import { u as useWeb3Connection } from "./useWeb3Connection-eheLMuCm.js";
import { z as defineComponent, a4 as onMounted, a9 as ref, aB as onBeforeUnmount, aA as watch, a_ as resolveComponent, am as createBlock, C as openBlock, h as computed, aP as _export_sfc } from "./index-73GArslZ.js";
import "./useWalletConnect-CJNIxFYX.js";
import "./index-FPtsBGoq.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "EvmConnectButton",
  props: {
    label: { default: "Connect Wallet" },
    loadingLabel: { default: "Connecting..." },
    size: { default: "md" },
    disabled: { type: Boolean, default: false }
  },
  emits: ["connect"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const props = __props;
    const buttonRef = ref(null);
    const { connectEvmWallet, evmProviderLoading } = useWeb3Connection();
    const isBusy = computed(() => props.disabled || Boolean(evmProviderLoading.value));
    const resolvedLabel = computed(() => props.label);
    const resolvedLoadingLabel = computed(() => props.loadingLabel || props.label);
    const handleClick = (event) => {
      event.stopImmediatePropagation();
      event.preventDefault();
      if (isBusy.value) return;
      emit("connect");
      void connectEvmWallet();
    };
    onMounted(() => {
      const element = buttonRef.value;
      element?.addEventListener("click", handleClick, { capture: true });
    });
    onBeforeUnmount(() => {
      const element = buttonRef.value;
      element?.removeEventListener("click", handleClick, { capture: true });
    });
    watch(
      isBusy,
      (busy) => {
        const element = buttonRef.value;
        if (!element) return;
        element.loading = busy;
        if (busy) {
          element.setAttribute("aria-busy", "true");
          element.setAttribute("disabled", "");
        } else {
          element.removeAttribute("aria-busy");
          element.removeAttribute("disabled");
        }
      },
      { immediate: true }
    );
    return (_ctx, _cache) => {
      const _component_w3m_connect_button = resolveComponent("w3m-connect-button");
      return openBlock(), createBlock(_component_w3m_connect_button, {
        ref_key: "buttonRef",
        ref: buttonRef,
        size: __props.size,
        label: resolvedLabel.value,
        "loading-label": resolvedLoadingLabel.value,
        namespace: "eip155",
        "data-test-id": "evm-connect-button"
      }, null, 8, ["size", "label", "loading-label"]);
    };
  }
});
const EvmConnectButton = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-2db5d07c"]]);
export {
  EvmConnectButton as default
};
