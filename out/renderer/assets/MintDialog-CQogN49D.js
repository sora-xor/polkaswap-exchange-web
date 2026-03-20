import { z as defineComponent, c4 as ObjectInit, aZ as components, ak as lazyComponent, al as Components, u as useTranslation, c2 as useTransaction, a9 as ref, X as XOR, aA as watch, b5 as nextTick, h as computed, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aj as unref, aO as createTextVNode, A as createElementBlock, bQ as Fragment, aN as toDisplayString, Z as ZeroStringValue, O as Operation, ay as api, s as store, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "dashboard-mint" };
const _hoisted_2 = { class: "p3 dashboard-mint__text" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "MintDialog",
  props: {
    visible: { type: Boolean, default: false },
    editableFiat: { type: Boolean, default: false },
    asset: { default: () => ObjectInit }
  },
  emits: ["update:visible"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const DialogBase = components.DialogBase;
    const InfoLine = components.InfoLine;
    const AddressBookInput = components.AddressBookInput;
    const TokenInput = lazyComponent(Components.TokenInput);
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const { loading, withNotifications } = useTransaction();
    const { formatCodecNumber, getFiatAmountByCodecString, getFPNumberFromCodec } = useFormattedAmount();
    const isVisible = ref(props.visible);
    const value = ref("");
    const address = ref("");
    const tokenInput = ref(null);
    const xorSymbol = XOR.symbol;
    const asset = computed(() => props.asset);
    const editableFiat = computed(() => props.editableFiat);
    const networkFees = computed(() => store.state.wallet.settings.networkFees);
    const accountXor = computed(() => store.getters.assets.xor);
    const networkFee = computed(() => networkFees.value?.[Operation.Mint] ?? ZeroStringValue);
    const fpNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value));
    const xorBalance = computed(() => getFPNumberFromCodec(accountXor.value?.balance?.transferable ?? ZeroStringValue));
    const tokenSymbol = computed(() => asset.value?.symbol ?? "");
    const title = computed(() => `Mint ${tokenSymbol.value}`);
    const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
    const trimmedAddress = computed(() => address.value.trim());
    const emptyAddress = computed(() => trimmedAddress.value.length === 0);
    const validAddress = computed(() => !emptyAddress.value && api.validateAddress(trimmedAddress.value));
    const emptyValue = computed(() => !Number(value.value));
    const isInsufficientXorForFee = computed(() => xorBalance.value.sub(fpNetworkFee.value).isLtZero());
    const disabled = computed(
      () => loading.value || isInsufficientXorForFee.value || emptyValue.value || !validAddress.value
    );
    const resetForm = () => {
      value.value = "";
      address.value = "";
    };
    const handleMint = async () => {
      if (disabled.value || !asset.value) return;
      try {
        await withNotifications(async () => {
          await api.assets.mint(asset.value, value.value, trimmedAddress.value);
        });
      } finally {
        isVisible.value = false;
      }
    };
    watch(
      () => props.visible,
      async (visible) => {
        isVisible.value = visible;
        if (visible) {
          resetForm();
          await nextTick();
          tokenInput.value?.focus?.();
        }
      },
      { immediate: true }
    );
    watch(isVisible, (visible) => {
      emit("update:visible", visible);
    });
    __expose({
      isVisible,
      value,
      address,
      disabled,
      validAddress,
      emptyValue,
      handleMint,
      resetForm
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_tooltip = resolveComponent("s-tooltip");
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createBlock(unref(DialogBase), {
        title: title.value,
        visible: isVisible.value,
        "onUpdate:visible": _cache[2] || (_cache[2] = ($event) => isVisible.value = $event),
        tooltip: "COMING SOON..."
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createVNode(unref(AddressBookInput), {
              class: "dashboard-mint__address",
              modelValue: address.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => address.value = $event),
              "is-valid": validAddress.value,
              disabled: unref(loading)
            }, null, 8, ["modelValue", "is-valid", "disabled"]),
            createBaseVNode("p", _hoisted_2, [
              _cache[3] || (_cache[3] = createTextVNode(" ENTER THE AMOUNT YOU WANT TO MINT ", -1)),
              createVNode(_component_s_tooltip, {
                slot: "suffix",
                "border-radius": "mini",
                content: "COMING SOON...",
                placement: "top",
                tabindex: "-1"
              }, {
                default: withCtx(() => [
                  createVNode(_component_s_icon, {
                    name: "info-16",
                    size: "14px"
                  })
                ]),
                _: 1
              })
            ]),
            createVNode(unref(TokenInput), {
              ref_key: "tokenInput",
              ref: tokenInput,
              class: "dashboard-mint__token-input",
              title: "AMOUNT",
              modelValue: value.value,
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => value.value = $event),
              "is-fiat-editable": editableFiat.value,
              token: asset.value,
              disabled: unref(loading)
            }, null, 8, ["modelValue", "is-fiat-editable", "token", "disabled"]),
            createVNode(_component_s_button, {
              type: "primary",
              class: "s-typography-button--large action-button dashboard-mint__button",
              disabled: disabled.value,
              onClick: handleMint
            }, {
              default: withCtx(() => [
                isInsufficientXorForFee.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: unref(xorSymbol) })), 1)
                ], 64)) : emptyAddress.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode(toDisplayString(unref(t)("walletSend.enterAddress")), 1)
                ], 64)) : !validAddress.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                  createTextVNode(toDisplayString(unref(t)("walletSend.badAddress")), 1)
                ], 64)) : emptyValue.value ? (openBlock(), createElementBlock(Fragment, { key: 3 }, [
                  createTextVNode(toDisplayString(unref(t)("buttons.enterAmount")), 1)
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 4 }, [
                  createTextVNode(toDisplayString(title.value), 1)
                ], 64))
              ]),
              _: 1
            }, 8, ["disabled"]),
            createVNode(unref(InfoLine), {
              label: unref(t)("networkFeeText"),
              "label-tooltip": unref(t)("networkFeeTooltipText"),
              value: networkFeeFormatted.value,
              "asset-symbol": unref(xorSymbol),
              "fiat-value": unref(getFiatAmountByCodecString)(networkFee.value),
              "is-formatted": ""
            }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"])
          ])
        ]),
        _: 1
      }, 8, ["title", "visible"]);
    };
  }
});
const MintDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-5413ef97"]]);
export {
  MintDialog as default
};
