import { z as defineComponent, aZ as components, u as useTranslation, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, am as createBlock, C as openBlock, D as createBaseVNode, aJ as renderSlot, aM as createCommentVNode, ap as createVNode, aN as toDisplayString, bA as withDirectives, aO as createTextVNode, aj as unref, ao as withCtx, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = {
  key: 0,
  class: "account-panel"
};
const _hoisted_2 = { class: "account-group" };
const _hoisted_3 = ["src"];
const _hoisted_4 = {
  key: 0,
  class: "account-group-name"
};
const _hoisted_5 = { class: "account-group" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      WalletAvatar: components.WalletAvatar,
      FormattedAddress: components.FormattedAddress
    }
  },
  __name: "AccountPanel",
  props: {
    address: { default: "" },
    name: { default: "" },
    tooltip: { default: "" },
    icon: { default: "" }
  },
  emits: ["connect", "disconnect"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const { t } = useTranslation();
    function handleConnect() {
      emit("connect");
    }
    function handleDisconnect() {
      emit("disconnect");
    }
    return (_ctx, _cache) => {
      const _component_wallet_avatar = resolveComponent("wallet-avatar");
      const _component_formatted_address = resolveComponent("formatted-address");
      const _component_s_button = resolveComponent("s-button");
      const _directive_button = resolveDirective("button");
      return __props.address ? (openBlock(), createElementBlock("div", _hoisted_1, [
        _cache[0] || (_cache[0] = createBaseVNode("div", { class: "account-panel-divider" }, null, -1)),
        createBaseVNode("div", _hoisted_2, [
          renderSlot(_ctx.$slots, "icon", {}, () => [
            __props.icon ? (openBlock(), createElementBlock("img", {
              key: 0,
              src: __props.icon,
              alt: "provider icon",
              class: "account-group-logo"
            }, null, 8, _hoisted_3)) : (openBlock(), createBlock(_component_wallet_avatar, {
              key: 1,
              address: __props.address,
              size: 18,
              class: "account-gravatar"
            }, null, 8, ["address"]))
          ], true),
          __props.name ? (openBlock(), createElementBlock("span", _hoisted_4, toDisplayString(__props.name), 1)) : createCommentVNode("", true),
          createVNode(_component_formatted_address, {
            value: __props.address,
            symbols: 12,
            "tooltip-text": __props.tooltip
          }, null, 8, ["value", "tooltip-text"])
        ]),
        createBaseVNode("div", _hoisted_5, [
          withDirectives((openBlock(), createElementBlock("span", {
            class: "account-group-btn",
            onClick: handleConnect
          }, [
            createTextVNode(toDisplayString(unref(t)("changeAccountText")), 1)
          ])), [
            [_directive_button]
          ]),
          withDirectives((openBlock(), createElementBlock("span", {
            class: "account-group-btn disconnect",
            onClick: handleDisconnect
          }, [
            createTextVNode(toDisplayString(unref(t)("disconnectWalletText")), 1)
          ])), [
            [_directive_button]
          ])
        ])
      ])) : (openBlock(), createBlock(_component_s_button, {
        key: 1,
        class: "account-panel-button s-typography-button--large",
        "data-test-name": "connectPolkadot",
        type: "primary",
        onClick: handleConnect
      }, {
        default: withCtx(() => [
          createTextVNode(toDisplayString(unref(t)("connectWalletText")), 1)
        ]),
        _: 1
      }));
    };
  }
});
const AccountPanel = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-915367c1"]]);
export {
  AccountPanel as default
};
