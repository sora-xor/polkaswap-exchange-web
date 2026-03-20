import { z as defineComponent, ak as lazyComponent, al as Components, am as createBlock, C as openBlock, an as createSlots, ao as withCtx, h as computed, ap as createVNode, aj as unref, aq as withModifiers, ar as isRef, as as mergeProps } from "./index-73GArslZ.js";
import { u as useWidgetTokenSelect } from "./useWidgetTokenSelect-CzOdir7j.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "TokenPriceChart",
  props: {
    predefinedToken: { default: null },
    defaultAsset: { default: void 0 },
    parentLoading: { type: Function, default: void 0 },
    loading: { type: Function, default: void 0 }
  },
  setup(__props) {
    const PriceChartWidget = lazyComponent(Components.PriceChartWidget);
    const TokenSelectButton = lazyComponent(Components.TokenSelectButton);
    const SelectToken = lazyComponent(Components.SelectToken);
    const props = __props;
    const predefinedToken = computed(() => props.predefinedToken);
    const {
      selectedToken,
      selectTokenIcon,
      tokenTabIndex,
      showSelectTokenDialog,
      handleSelectToken,
      changeToken,
      closeTokenDialog
    } = useWidgetTokenSelect({
      defaultAsset: props.defaultAsset,
      predefinedToken,
      parentLoading: props.parentLoading,
      loading: props.loading
    });
    const onTokenSelect = (asset) => {
      changeToken(asset);
      closeTokenDialog();
    };
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(PriceChartWidget), mergeProps(_ctx.$attrs, {
        "base-asset": unref(selectedToken),
        "is-available": "",
        class: "token-price-chart"
      }), createSlots({ _: 2 }, [
        !predefinedToken.value ? {
          name: "title",
          fn: withCtx(() => [
            createVNode(unref(TokenSelectButton), {
              icon: unref(selectTokenIcon),
              token: unref(selectedToken),
              tabindex: unref(tokenTabIndex),
              onClick: withModifiers(unref(handleSelectToken), ["stop"])
            }, null, 8, ["icon", "token", "tabindex", "onClick"]),
            createVNode(unref(SelectToken), {
              "disabled-custom": "",
              visible: unref(showSelectTokenDialog),
              "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isRef(showSelectTokenDialog) ? showSelectTokenDialog.value = $event : null),
              asset: unref(selectedToken),
              onSelect: onTokenSelect
            }, null, 8, ["visible", "asset"])
          ]),
          key: "0"
        } : void 0
      ]), 1040, ["base-asset"]);
    };
  }
});
export {
  _sfc_main as _
};
