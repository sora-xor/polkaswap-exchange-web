import AccountCard from "./AccountCard-xpQIDQ4O.js";
import { z as defineComponent, bS as TranslationMixin, aP as _export_sfc, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, C as openBlock, ap as createVNode, aM as createCommentVNode, ao as withCtx, aJ as renderSlot, bQ as Fragment, bP as renderList, bA as withDirectives, am as createBlock, aO as createTextVNode, aN as toDisplayString, aq as withModifiers, D as createBaseVNode } from "./index-73GArslZ.js";
import ConnectionItems from "./ConnectionItems-B2TGlCnN.js";
const isProviderConnected = (provider) => {
  if (!provider) return false;
  try {
    const connectionState = provider.isConnected;
    if (typeof connectionState === "function") {
      return !!connectionState.call(provider);
    }
    return !!connectionState;
  } catch {
    return false;
  }
};
const formatConnectedAddress = (chainApi, address) => {
  if (!address) return "";
  const formatter = chainApi?.formatAddress;
  if (typeof formatter !== "function") {
    return address;
  }
  try {
    return formatter.call(chainApi, address, false);
  } catch {
    return address;
  }
};
const _sfc_main = defineComponent({
  components: {
    ConnectionItems,
    AccountCard
  },
  mixins: [TranslationMixin],
  props: {
    wallets: { default: () => [], type: Array },
    recommendedWallets: { default: () => [], type: Array },
    connectedWallet: { default: "", type: String },
    selectedWallet: { default: "", type: String },
    selectedWalletLoading: { default: false, type: Boolean },
    showDisclaimer: { default: false, type: Boolean }
  },
  emits: ["select", "disconnect"],
  methods: {
    isSelectedWalletLoading(wallet) {
      return wallet.extensionName === this.selectedWallet && this.selectedWalletLoading;
    },
    isConnectedWallet(wallet) {
      return wallet.extensionName === this.connectedWallet;
    },
    isRecommendedWallet(wallet) {
      return this.recommendedWallets.includes(wallet.extensionName);
    },
    hasDisconnectAction(wallet) {
      return isProviderConnected(wallet?.provider);
    },
    handleSelect(wallet) {
      if (!this.isSelectedWalletLoading(wallet)) {
        this.$emit("select", wallet);
      }
    },
    handleDisconnect(wallet) {
      this.$emit("disconnect", wallet);
    }
  }
});
const _hoisted_1 = ["src", "alt"];
const _hoisted_2 = { class: "extension-name" };
const _hoisted_3 = {
  key: 0,
  class: "extension-label extension-label--recommended"
};
const _hoisted_4 = ["href"];
const _hoisted_5 = {
  key: 1,
  class: "connection-loading"
};
const _hoisted_6 = {
  key: 0,
  class: "connection-disclaimer"
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_s_icon = resolveComponent("s-icon");
  const _component_s_button = resolveComponent("s-button");
  const _component_account_card = resolveComponent("account-card");
  const _component_connection_items = resolveComponent("connection-items");
  const _directive_button = resolveDirective("button");
  return openBlock(), createElementBlock("div", null, [
    createVNode(_component_connection_items, {
      size: _ctx.wallets.length
    }, {
      default: withCtx(() => [
        (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.wallets, (wallet) => {
          return withDirectives((openBlock(), createBlock(_component_account_card, {
            key: wallet.extensionName,
            tabindex: "0",
            onClick: ($event) => _ctx.handleSelect(wallet)
          }, {
            avatar: withCtx(() => [
              wallet.logo.src ? (openBlock(), createElementBlock("img", {
                key: 0,
                src: wallet.logo.src,
                alt: wallet.logo.alt
              }, null, 8, _hoisted_1)) : (openBlock(), createBlock(_component_s_icon, {
                key: 1,
                name: "finance-wallet-24",
                size: "32",
                class: "extension-icon--unknown"
              }))
            ]),
            name: withCtx(() => [
              createBaseVNode("div", _hoisted_2, [
                createTextVNode(toDisplayString(wallet.title) + " ", 1),
                _ctx.isRecommendedWallet(wallet) ? (openBlock(), createElementBlock("div", _hoisted_3, [
                  createBaseVNode("span", null, toDisplayString(_ctx.t("connection.wallet.recommended")), 1),
                  createVNode(_component_s_icon, {
                    name: "basic-circle-star-24",
                    size: "12",
                    class: "extension-label__icon"
                  })
                ])) : createCommentVNode("", true)
              ])
            ]),
            default: withCtx(() => [
              !wallet.installed && wallet.installUrl ? (openBlock(), createElementBlock("a", {
                key: 0,
                href: wallet.installUrl,
                target: "_blank",
                rel: "nofollow noopener noreferrer",
                class: "connection-action"
              }, [
                createVNode(_component_s_button, {
                  class: "connection-install",
                  type: "secondary",
                  size: "mini",
                  tabindex: "-1"
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.t("connection.wallet.install")), 1)
                  ]),
                  _: 1
                })
              ], 8, _hoisted_4)) : _ctx.isSelectedWalletLoading(wallet) ? (openBlock(), createElementBlock("span", _hoisted_5, [
                createVNode(_component_s_icon, {
                  name: "el-icon-loading",
                  size: "16",
                  class: "connection-loading-icon"
                })
              ])) : createCommentVNode("", true),
              _ctx.hasDisconnectAction(wallet) ? (openBlock(), createBlock(_component_s_button, {
                key: 2,
                class: "connection-state",
                size: "small",
                onClick: withModifiers(($event) => _ctx.handleDisconnect(wallet), ["stop"])
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.t("disconnectWalletText")), 1)
                ]),
                _: 1
              }, 8, ["onClick"])) : _ctx.isConnectedWallet(wallet) ? (openBlock(), createBlock(_component_s_button, {
                key: 3,
                class: "connection-state",
                size: "small",
                disabled: ""
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.t("connection.wallet.connected")), 1)
                ]),
                _: 1
              })) : createCommentVNode("", true)
            ]),
            _: 2
          }, 1032, ["onClick"])), [
            [_directive_button]
          ]);
        }), 128)),
        renderSlot(_ctx.$slots, "default", {}, void 0, true)
      ]),
      _: 3
    }, 8, ["size"]),
    _ctx.showDisclaimer ? (openBlock(), createElementBlock("p", _hoisted_6, toDisplayString(_ctx.t("connection.disclaimer")), 1)) : createCommentVNode("", true)
  ]);
}
const ExtensionConnectionList = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-3b3b21e8"]]);
const Extension = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ExtensionConnectionList
}, Symbol.toStringTag, { value: "Module" }));
export {
  ExtensionConnectionList as E,
  Extension as a,
  formatConnectedAddress as f
};
