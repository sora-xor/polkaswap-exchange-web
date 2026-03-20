import { z as defineComponent, bT as mapActions, bU as mapGetters, bV as mapState, bW as NotificationMixin, bX as LoadingMixin, bY as delay, bZ as unlockAccountPair, aP as _export_sfc, a_ as resolveComponent, am as createBlock, C as openBlock } from "./index-73GArslZ.js";
import { A as AccountConfirmDialog } from "./ConfirmDialog-McxRtCCq.js";
import "./DialogBase.vue_vue_type_style_index_0_lang-BJGYcuJm.js";
import "./InputFocusMixin-CmEfEypi.js";
import "./relativeTime-8MZMp0Re.js";
import "./Option-DNliqlst.js";
import "./WalletAccount.vue_vue_type_style_index_0_lang-DjfimqnM.js";
import "./FormattedAddress-BPe25jN5.js";
import "./useCopyAddress-CJeOU9NK.js";
import "./AccountCard-xpQIDQ4O.js";
import "./WalletAvatar.vue_vue_type_script_setup_true_lang-mm2xyMMC.js";
const _sfc_main = defineComponent({
  components: {
    AccountConfirmDialog
  },
  mixins: [NotificationMixin, LoadingMixin],
  props: {
    account: {
      required: true,
      type: Object
    },
    chainApi: {
      required: true,
      type: Object
    },
    visibility: {
      required: true,
      type: Boolean
    },
    setVisibility: {
      required: true,
      type: Function
    }
  },
  computed: {
    ...mapState("wallet/transactions", ["isSignTxDialogDisabled"]),
    ...mapGetters("wallet/account", ["getPassword"]),
    visible: {
      get() {
        return this.visibility;
      },
      set(flag) {
        this.setVisibility(flag);
      }
    },
    passphrase() {
      const address = this.account?.address;
      return address ? this.getPassword(address) : null;
    }
  },
  methods: {
    ...mapActions("wallet/account", ["setAccountPassphrase", "resetAccountPassphrase"]),
    async handleConfirm(password) {
      await this.withLoading(async () => {
        await this.$nextTick();
        await delay(250);
        await this.withAppNotification(async () => {
          const address = this.account?.address;
          if (!address) {
            this.setVisibility(false);
            return;
          }
          unlockAccountPair(this.chainApi, password);
          if (this.isSignTxDialogDisabled) {
            this.setAccountPassphrase({ address, password });
          } else {
            this.resetAccountPassphrase(address);
          }
          this.setVisibility(false);
        });
      });
    }
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_account_confirm_dialog = resolveComponent("account-confirm-dialog");
  return openBlock(), createBlock(_component_account_confirm_dialog, {
    visible: _ctx.visible,
    "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => _ctx.visible = $event),
    "with-timeout": "",
    account: _ctx.account,
    loading: _ctx.loading,
    passphrase: _ctx.passphrase,
    "confirm-button-text": _ctx.t("desktop.dialog.confirmButton"),
    onConfirm: _ctx.handleConfirm
  }, null, 8, ["visible", "account", "loading", "passphrase", "confirm-button-text", "onConfirm"]);
}
const ConfirmDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
export {
  ConfirmDialog as default
};
