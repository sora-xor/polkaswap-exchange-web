import { z as defineComponent, dD as LogoSize, a_ as resolveComponent, bz as resolveDirective, bA as withDirectives, A as createElementBlock, C as openBlock, D as createBaseVNode, aJ as renderSlot, aM as createCommentVNode, ap as createVNode, aj as unref, aN as toDisplayString, bH as normalizeProps, bI as guardReactiveProps, as as mergeProps, aP as _export_sfc } from "./index-73GArslZ.js";
import PinIcon from "./PinIcon-CSrsyNsO.js";
import TokenAddress from "./TokenAddress-BkSlSXjr.js";
import TokenLogo from "./TokenLogo-LJf92LMT.js";
import "./FormattedAddress-BPe25jN5.js";
import "./useCopyAddress-CJeOU9NK.js";
const _hoisted_1 = ["tabindex"];
const _hoisted_2 = { class: "asset-description s-flex" };
const _hoisted_3 = { class: "asset-symbol" };
const _hoisted_4 = {
  key: 0,
  class: "check"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "AssetListItem",
  props: {
    asset: {},
    withClickableLogo: { type: Boolean, default: false },
    selected: { type: Boolean, default: false },
    selectable: { type: Boolean, default: false },
    pinnable: { type: Boolean, default: true },
    pinned: { type: Boolean, default: false },
    withFiat: { type: Boolean, default: false },
    withTabindex: { type: Boolean, default: false }
  },
  emits: ["show-details", "pin"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const defaultLogoSize = LogoSize.BIG;
    const handleIconClick = (event) => {
      if (!props.withClickableLogo) {
        return;
      }
      event.stopImmediatePropagation();
      emit("show-details", props.asset);
    };
    const pin = (event) => {
      event.stopPropagation();
      emit("pin", props.asset);
    };
    __expose({ handleIconClick, pin });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _directive_button = resolveDirective("button");
      return withDirectives((openBlock(), createElementBlock("div", mergeProps({
        class: [
          "s-flex",
          "asset",
          { "asset--with-fiat": __props.withFiat },
          { "asset--selected": __props.selected },
          { "asset--pinned": __props.pinned }
        ]
      }, _ctx.$attrs, {
        tabindex: __props.withTabindex ? 0 : -1
      }), [
        withDirectives(createVNode(TokenLogo, {
          size: unref(defaultLogoSize),
          token: __props.asset,
          "with-clickable-logo": __props.withClickableLogo,
          onClick: handleIconClick
        }, null, 8, ["size", "token", "with-clickable-logo"]), [
          [_directive_button]
        ]),
        createBaseVNode("div", _hoisted_2, [
          renderSlot(_ctx.$slots, "value", normalizeProps(guardReactiveProps(__props.asset)), () => [
            createBaseVNode("div", _hoisted_3, toDisplayString(__props.asset.symbol), 1)
          ], true),
          createVNode(TokenAddress, {
            name: __props.asset.name,
            symbol: __props.asset.symbol,
            address: __props.asset.address,
            class: "asset-info"
          }, null, 8, ["name", "symbol", "address"]),
          renderSlot(_ctx.$slots, "append", normalizeProps(guardReactiveProps(__props.asset)), void 0, true)
        ]),
        renderSlot(_ctx.$slots, "default", normalizeProps(guardReactiveProps(__props.asset)), void 0, true),
        __props.selectable ? (openBlock(), createElementBlock("div", _hoisted_4, [
          createVNode(_component_s_icon, {
            name: "basic-check-mark-24",
            size: "12px"
          })
        ])) : createCommentVNode("", true),
        __props.pinnable ? (openBlock(), createElementBlock("div", {
          key: 1,
          class: "pin",
          onClick: pin
        }, [
          createVNode(PinIcon, { "is-pinned": __props.pinned }, null, 8, ["is-pinned"])
        ])) : createCommentVNode("", true)
      ], 16, _hoisted_1)), [
        [_directive_button, __props.withTabindex]
      ]);
    };
  }
});
const AssetListItem = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-a8dabe51"]]);
export {
  AssetListItem as default
};
