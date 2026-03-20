import { z as defineComponent, ay as api, bS as TranslationMixin, aP as _export_sfc, a_ as resolveComponent, bz as resolveDirective, am as createBlock, aM as createCommentVNode, C as openBlock, ao as withCtx, A as createElementBlock, aJ as renderSlot, bQ as Fragment, bP as renderList, bA as withDirectives, aO as createTextVNode, aN as toDisplayString, as as mergeProps } from "./index-73GArslZ.js";
import { _ as _sfc_main$1 } from "./WalletAccount.vue_vue_type_style_index_0_lang-DjfimqnM.js";
import ConnectionItems from "./ConnectionItems-B2TGlCnN.js";
import "./FormattedAddress-BPe25jN5.js";
import "./useCopyAddress-CJeOU9NK.js";
import "./AccountCard-xpQIDQ4O.js";
import "./WalletAvatar.vue_vue_type_script_setup_true_lang-mm2xyMMC.js";
const _sfc_main = defineComponent({
  components: {
    ConnectionItems,
    WalletAccount: _sfc_main$1
  },
  mixins: [TranslationMixin],
  props: {
    accounts: { default: () => [], type: Array },
    wallet: { default: "", type: String },
    isConnected: { default: () => false, type: Function },
    chainApi: { default: () => api, type: Object }
  },
  emits: ["select"],
  computed: {
    accountList() {
      return this.accounts.map((account) => {
        const source = this.wallet;
        const accountData = { ...account, source };
        return {
          account,
          isConnected: this.isConnected(accountData)
        };
      });
    }
  },
  methods: {
    handleSelectAccount(account, isConnected) {
      this.$emit("select", account, isConnected);
    }
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_s_button = resolveComponent("s-button");
  const _component_wallet_account = resolveComponent("wallet-account");
  const _component_connection_items = resolveComponent("connection-items");
  const _directive_button = resolveDirective("button");
  return _ctx.accountList.length ? (openBlock(), createBlock(_component_connection_items, {
    key: 0,
    size: _ctx.accountList.length
  }, {
    default: withCtx(() => [
      (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.accountList, ({ account, isConnected }) => {
        return withDirectives((openBlock(), createBlock(_component_wallet_account, {
          key: account.address,
          "polkadot-account": account,
          "chain-api": _ctx.chainApi,
          tabindex: "0",
          onClick: ($event) => _ctx.handleSelectAccount(account, isConnected)
        }, {
          default: withCtx(() => [
            isConnected ? (openBlock(), createBlock(_component_s_button, {
              key: 0,
              size: "small",
              disabled: ""
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(_ctx.t("connection.wallet.connected")), 1)
              ]),
              _: 1
            })) : createCommentVNode("", true),
            renderSlot(_ctx.$slots, "menu", mergeProps({ ref_for: true }, account))
          ]),
          _: 2
        }, 1032, ["polkadot-account", "chain-api", "onClick"])), [
          [_directive_button]
        ]);
      }), 128)),
      renderSlot(_ctx.$slots, "default")
    ]),
    _: 3
  }, 8, ["size"])) : createCommentVNode("", true);
}
const AccountConnectionList = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
export {
  AccountConnectionList as default
};
