import { z as defineComponent, aZ as components, u as useTranslation, bm as toRefs, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aN as toDisplayString, aj as unref, aI as WALLET_CONSTS } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "reward-item-tooltip-content" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "RewardsItemTooltip",
    components: {
      FormattedAmount: components.FormattedAmount
    }
  },
  __name: "ItemTooltip",
  props: {
    value: {},
    asset: {}
  },
  setup(__props) {
    const props = __props;
    const { t } = useTranslation();
    const FontSizeRate = WALLET_CONSTS.FontSizeRate;
    const { value, asset } = toRefs(props);
    return (_ctx, _cache) => {
      const _component_formatted_amount = resolveComponent("formatted-amount");
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_popover_panel = resolveComponent("s-popover-panel");
      return openBlock(), createBlock(_component_s_popover_panel, {
        "popper-class": "reward-item-tooltip",
        placement: "right",
        trigger: "hover"
      }, {
        reference: withCtx(() => [
          createVNode(_component_s_icon, {
            name: "info-16",
            size: "14px",
            class: "reward-item-tooltip-value-icon",
            tabindex: "-1"
          })
        ]),
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("div", null, toDisplayString(unref(t)("rewards.totalVested")) + ":", 1),
            createVNode(_component_formatted_amount, {
              class: "reward-item-tooltip-value",
              "value-can-be-hidden": "",
              "symbol-as-decimal": "",
              value: unref(value),
              "font-size-rate": unref(FontSizeRate).MEDIUM,
              "asset-symbol": unref(asset).symbol
            }, null, 8, ["value", "font-size-rate", "asset-symbol"])
          ])
        ]),
        _: 1
      });
    };
  }
});
export {
  _sfc_main as _
};
