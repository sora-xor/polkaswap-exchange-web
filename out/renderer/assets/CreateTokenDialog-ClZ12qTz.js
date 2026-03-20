import { z as defineComponent, aZ as components, cV as dashboardLazyComponent, cW as DashboardComponents, aI as WALLET_CONSTS, u as useTranslation, c2 as useTransaction, a9 as ref, X as XOR, aA as watch, h as computed, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, A as createElementBlock, bQ as Fragment, bP as renderList, aj as unref, bL as resolveDynamicComponent, aO as createTextVNode, aN as toDisplayString, Z as ZeroStringValue, O as Operation, s as store, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "dashboard-create" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "CreateTokenDialog",
  props: {
    visible: { type: Boolean, default: false }
  },
  emits: ["update:visible"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const DialogBase = components.DialogBase;
    const InfoLine = components.InfoLine;
    dashboardLazyComponent(DashboardComponents.CreateSimpleToken);
    dashboardLazyComponent(DashboardComponents.CreateNftToken);
    const TokenTabs = WALLET_CONSTS.TokenTabs;
    const props = __props;
    const emit = __emit;
    const { t, TranslationConsts } = useTranslation();
    const { loading } = useTransaction();
    const { getFPNumberFromCodec, formatCodecNumber, getFiatAmountByCodecString } = useFormattedAmount();
    const isVisible = ref(props.visible);
    const currentTab = ref(TokenTabs.Token);
    const networkFees = computed(() => store.state.wallet.settings.networkFees);
    const accountXor = computed(() => store.getters.assets.xor);
    const xorSymbol = XOR.symbol;
    const title = computed(() => "Create token");
    const networkFee = computed(() => networkFees.value?.[Operation.RegisterAsset] ?? ZeroStringValue);
    const fpNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value));
    const xorBalance = computed(() => getFPNumberFromCodec(accountXor.value?.balance?.transferable ?? ZeroStringValue));
    const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
    const isInsufficientXorForFee = computed(() => xorBalance.value.sub(fpNetworkFee.value).isLtZero());
    const disabled = computed(() => loading.value || isInsufficientXorForFee.value);
    const getTabName = (tab) => {
      if (tab === TokenTabs.NonFungibleToken) {
        return TranslationConsts.NFT;
      }
      return t(`createToken.${tab}`);
    };
    const handleChangeTab = (value) => {
      currentTab.value = value;
    };
    const handleCreate = () => {
    };
    watch(
      () => props.visible,
      (visible) => {
        isVisible.value = visible;
      },
      { immediate: true }
    );
    watch(isVisible, (visible) => {
      emit("update:visible", visible);
    });
    __expose({
      isVisible,
      currentTab,
      disabled,
      isInsufficientXorForFee,
      handleChangeTab,
      handleCreate
    });
    return (_ctx, _cache) => {
      const _component_s_tab = resolveComponent("s-tab");
      const _component_s_tabs = resolveComponent("s-tabs");
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createBlock(unref(DialogBase), {
        title: unref(t)("createToken.titleCommon"),
        visible: isVisible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isVisible.value = $event),
        tooltip: "COMING SOON..."
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createVNode(_component_s_tabs, {
              class: "token__tab",
              type: "rounded",
              value: currentTab.value,
              onInput: handleChangeTab
            }, {
              default: withCtx(() => [
                (openBlock(true), createElementBlock(Fragment, null, renderList(unref(TokenTabs), (tab) => {
                  return openBlock(), createBlock(_component_s_tab, {
                    key: tab,
                    label: getTabName(tab),
                    name: tab
                  }, null, 8, ["label", "name"]);
                }), 128))
              ]),
              _: 1
            }, 8, ["value"]),
            (openBlock(), createBlock(resolveDynamicComponent(currentTab.value))),
            createVNode(_component_s_button, {
              type: "primary",
              class: "s-typography-button--large action-button dashboard-create__button",
              disabled: disabled.value,
              onClick: handleCreate
            }, {
              default: withCtx(() => [
                isInsufficientXorForFee.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: unref(xorSymbol) })), 1)
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
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
const CreateTokenDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-9ae7d548"]]);
export {
  CreateTokenDialog as default
};
