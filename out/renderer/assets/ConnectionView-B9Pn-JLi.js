import { z as defineComponent, u as useTranslation, aA as watch, a9 as ref, am as createBlock, C as openBlock, aj as unref, ar as isRef, ao as withCtx, ap as createVNode, aq as withModifiers, c0 as toRef, aO as createTextVNode, aN as toDisplayString, a_ as resolveComponent, h as computed, aP as _export_sfc, bX as LoadingMixin, bW as NotificationMixin, eh as settingsStorage, ei as AppWallet, ej as GDriveWallet, bY as delay, ek as verifyAccountJson, el as exportAccountJson, bO as AccountActionTypes, bz as resolveDirective, A as createElementBlock, D as createBaseVNode, aM as createCommentVNode, an as createSlots, bA as withDirectives, bQ as Fragment, em as LoginStep, bJ as isEqual, en as copyToClipboard, bP as renderList, bb as normalizeClass, eo as Transition, bS as TranslationMixin, ep as Links, aJ as renderSlot, eq as parseAccountJson, er as AppError, es as mnemonicValidate, et as FearlessLogo, eu as PolkadotLogo, ev as SubWalletLogo, bT as mapActions, ef as mapMutations, bV as mapState, ew as restoreAccount, ex as deleteAccount, ey as exportAccount, ez as getWallet, eg as subscribeToWalletAccounts, eA as isAppStorageSource, eB as checkExternalAccount, eC as createAccount, ay as api, eD as addWcSubWalletLocally, eE as isWcWallet, eF as isInternalWallet, eG as isInternalSource, eH as RecommendedWallets, as as mergeProps } from "./index-73GArslZ.js";
import { A as AccountConfirmDialog, P as PasswordInput } from "./ConfirmDialog-McxRtCCq.js";
import WalletBase from "./WalletBase-cZmYm1f_.js";
import AccountCard from "./AccountCard-xpQIDQ4O.js";
import { _ as _sfc_main$9 } from "./ActionsMenu.vue_vue_type_style_index_0_lang-BVo3j2aj.js";
import { u as useDialogVisibility, _ as _sfc_main$7 } from "./DialogBase.vue_vue_type_style_index_0_lang-BJGYcuJm.js";
import SimpleNotification from "./SimpleNotification-De0sbHHr.js";
import { _ as _sfc_main$8 } from "./WalletAccount.vue_vue_type_style_index_0_lang-DjfimqnM.js";
import AccountConnectionList from "./Account-ClkeU5W3.js";
import ConnectionItems from "./ConnectionItems-B2TGlCnN.js";
import { f as formatConnectedAddress, E as ExtensionConnectionList } from "./Extension-Dt2nV974.js";
import ExternalLink from "./ExternalLink-C8Y3dJnT.js";
import FileUploader from "./FileUploader-C62VRkNQ.js";
const _sfc_main$6 = /* @__PURE__ */ defineComponent({
  __name: "DeleteDialog",
  props: {
    visible: { type: Boolean, default: false },
    loading: { type: Boolean, default: false }
  },
  emits: ["update:visible", "close", "confirm"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const { isVisible } = useDialogVisibility(toRef(props, "visible"), {
      emit: (value) => emit("update:visible", value),
      onClose: () => emit("close")
    });
    const loading = toRef(props, "loading");
    const hideDeleteDialog = ref(false);
    watch(isVisible, (visible) => {
      if (!visible) {
        hideDeleteDialog.value = false;
      }
    });
    const handleConfirm = () => {
      emit("confirm", !hideDeleteDialog.value);
    };
    return (_ctx, _cache) => {
      return openBlock(), createBlock(_sfc_main$7, {
        visible: unref(isVisible),
        "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => isRef(isVisible) ? isVisible.value = $event : null),
        "append-to-body": ""
      }, {
        default: withCtx(() => [
          createVNode(SimpleNotification, {
            modelValue: hideDeleteDialog.value,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => hideDeleteDialog.value = $event),
            optional: "",
            "modal-content": "",
            "button-text": unref(t)("logoutText"),
            loading: loading.value,
            onSubmit: withModifiers(handleConfirm, ["prevent"])
          }, {
            title: withCtx(() => [
              createTextVNode(toDisplayString(unref(t)("desktop.assetsAtRiskText")), 1)
            ]),
            text: withCtx(() => [
              createTextVNode(toDisplayString(unref(t)("desktop.deleteAccountText")), 1)
            ]),
            _: 1
          }, 8, ["modelValue", "button-text", "loading"])
        ]),
        _: 1
      }, 8, ["visible"]);
    };
  }
});
const MINLENGTH = 3;
const _sfc_main$5 = /* @__PURE__ */ defineComponent({
  __name: "RenameDialog",
  props: {
    visible: { type: Boolean, default: false },
    account: { default: null },
    loading: { type: Boolean, default: false }
  },
  emits: ["update:visible", "close", "confirm"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const { isVisible } = useDialogVisibility(toRef(props, "visible"), {
      emit: (value2) => emit("update:visible", value2),
      onClose: () => emit("close")
    });
    const account = toRef(props, "account");
    const loading = toRef(props, "loading");
    const value = ref("");
    const prepared = computed(() => value.value.trim());
    const valid = computed(() => prepared.value.length >= MINLENGTH);
    watch(isVisible, (visible) => {
      if (!visible) {
        value.value = "";
      }
    });
    const handleConfirm = () => {
      emit("confirm", prepared.value);
    };
    return (_ctx, _cache) => {
      const _component_s_input = resolveComponent("s-input");
      const _component_s_button = resolveComponent("s-button");
      const _component_s_form = resolveComponent("s-form");
      return openBlock(), createBlock(_sfc_main$7, {
        visible: unref(isVisible),
        "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => isRef(isVisible) ? isVisible.value = $event : null),
        title: unref(t)("account.rename"),
        "append-to-body": "",
        class: "account-rename-dialog"
      }, {
        default: withCtx(() => [
          createVNode(_component_s_form, {
            class: "account-rename-dialog__form",
            onSubmit: withModifiers(handleConfirm, ["prevent"])
          }, {
            default: withCtx(() => [
              createVNode(_sfc_main$8, { "polkadot-account": account.value }, null, 8, ["polkadot-account"]),
              createVNode(_component_s_input, {
                modelValue: value.value,
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => value.value = $event),
                type: "text",
                placeholder: unref(t)("desktop.accountName.placeholder"),
                minlength: MINLENGTH,
                disabled: loading.value
              }, null, 8, ["modelValue", "placeholder", "disabled"]),
              createVNode(_component_s_button, {
                type: "primary",
                "native-type": "submit",
                class: "account-rename-dialog__button",
                disabled: !valid.value,
                loading: loading.value
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(unref(t)("confirmText")), 1)
                ]),
                _: 1
              }, 8, ["disabled", "loading"])
            ]),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["visible", "title"]);
    };
  }
});
const AccountRenameDialog = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["__scopeId", "data-v-4491c0c4"]]);
const accountActions = [AccountActionTypes.Rename, AccountActionTypes.Export, AccountActionTypes.Delete];
const _sfc_main$4 = defineComponent({
  components: {
    AccountConnectionList,
    AccountCard,
    AccountActionsMenu: _sfc_main$9,
    AccountRenameDialog,
    AccountExportDialog: AccountConfirmDialog,
    AccountDeleteDialog: _sfc_main$6,
    ConnectionItems
  },
  mixins: [LoadingMixin, NotificationMixin],
  props: {
    chainApi: {
      required: true,
      type: Object
    },
    text: {
      default: "",
      type: String
    },
    isInternal: {
      default: false,
      type: Boolean
    },
    selectedWallet: {
      default: "",
      type: String
    },
    connectedWallet: {
      default: "",
      type: String
    },
    connectedAccount: {
      default: "",
      type: String
    },
    accounts: {
      default: () => [],
      type: Array
    },
    logoutAccount: {
      default: () => {
      },
      type: Function
    },
    renameAccount: {
      default: () => {
      },
      type: Function
    },
    exportAccount: {
      default: () => {
      },
      type: Function
    },
    deleteAccount: {
      default: () => {
      },
      type: Function
    }
  },
  emits: ["select", "create", "import"],
  data() {
    return {
      accountActions,
      accountRenameVisibility: false,
      accountExportVisibility: false,
      accountDeleteVisibility: false,
      selectedAccount: null
    };
  },
  computed: {
    noAccounts() {
      return !this.accounts.length;
    }
  },
  methods: {
    isConnectedAccount(account) {
      return this.connectedWallet === account.source && formatConnectedAddress(
        this.chainApi,
        this.connectedAccount
      ) === account.address;
    },
    handleAccountAction(actionType, account) {
      this.selectedAccount = { ...account };
      switch (actionType) {
        case AccountActionTypes.Rename: {
          this.accountRenameVisibility = true;
          break;
        }
        case AccountActionTypes.Export: {
          this.accountExportVisibility = true;
          break;
        }
        case AccountActionTypes.Delete: {
          const storageValue = settingsStorage.get("allowAccountDeletePopup");
          const popupVisibility = storageValue ? Boolean(JSON.parse(storageValue)) : true;
          if (popupVisibility) {
            this.accountDeleteVisibility = true;
          } else {
            void this.handleDeleteAccount();
          }
          break;
        }
      }
    },
    handleRefreshClick() {
      window.history.go();
    },
    handleSelectAccount(account, isConnected) {
      this.$emit("select", account, isConnected);
    },
    handleCreateAccount() {
      this.$emit("create");
    },
    handleImportAccount() {
      this.$emit("import");
    },
    async handleRenameAccount(name) {
      await this.withLoading(async () => {
        await this.withAppNotification(async () => {
          if (!this.selectedAccount) return;
          const { address, source } = this.selectedAccount;
          if (source === AppWallet.GoogleDrive) {
            await GDriveWallet.accounts.changeName(address, name);
          }
          if (this.isConnectedAccount(this.selectedAccount) || source === AppWallet.Sora) {
            await this.renameAccount({ address, name });
          }
          this.accountRenameVisibility = false;
        });
      });
    },
    async handleExportAccount(password) {
      await this.withLoading(async () => {
        await this.$nextTick();
        await delay(250);
        await this.withAppNotification(async () => {
          if (!this.selectedAccount) return;
          const { address, source } = this.selectedAccount;
          if (source === AppWallet.GoogleDrive) {
            const json = await GDriveWallet.accounts.getAccount(address, password);
            if (!json) throw new Error("polkadotjs.noAccount");
            const verified = verifyAccountJson(this.chainApi, json, password);
            exportAccountJson(verified);
          } else {
            await this.exportAccount({ address, password });
          }
          this.accountExportVisibility = false;
        });
      });
    },
    async handleDeleteAccount(allowAccountDeletePopup = true) {
      await this.withLoading(async () => {
        await this.withAppNotification(async () => {
          if (!this.selectedAccount) return;
          if (!allowAccountDeletePopup) {
            settingsStorage.set("allowAccountDeletePopup", false);
          }
          if (this.isConnectedAccount(this.selectedAccount)) {
            await this.logoutAccount();
          }
          if (this.selectedAccount.source === AppWallet.GoogleDrive) {
            await GDriveWallet.accounts.delete(this.selectedAccount.address);
          } else {
            await this.deleteAccount(this.selectedAccount.address);
          }
          this.accountDeleteVisibility = false;
        });
      });
    }
  }
});
const _hoisted_1$3 = { class: "connection" };
const _hoisted_2$3 = {
  key: 0,
  class: "connection__text"
};
function _sfc_render$4(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_account_actions_menu = resolveComponent("account-actions-menu");
  const _component_account_connection_list = resolveComponent("account-connection-list");
  const _component_s_icon = resolveComponent("s-icon");
  const _component_account_card = resolveComponent("account-card");
  const _component_connection_items = resolveComponent("connection-items");
  const _component_s_button = resolveComponent("s-button");
  const _component_account_rename_dialog = resolveComponent("account-rename-dialog");
  const _component_account_export_dialog = resolveComponent("account-export-dialog");
  const _component_account_delete_dialog = resolveComponent("account-delete-dialog");
  const _directive_button = resolveDirective("button");
  return openBlock(), createElementBlock("div", null, [
    createBaseVNode("div", _hoisted_1$3, [
      _ctx.text ? (openBlock(), createElementBlock("p", _hoisted_2$3, toDisplayString(_ctx.text), 1)) : createCommentVNode("", true),
      createVNode(_component_account_connection_list, {
        accounts: _ctx.accounts,
        wallet: _ctx.selectedWallet,
        "is-connected": _ctx.isConnectedAccount,
        "chain-api": _ctx.chainApi,
        class: "connection__accounts",
        onSelect: _ctx.handleSelectAccount
      }, createSlots({ _: 2 }, [
        _ctx.isInternal ? {
          name: "menu",
          fn: withCtx((account) => [
            createVNode(_component_account_actions_menu, {
              actions: _ctx.accountActions,
              onSelect: ($event) => _ctx.handleAccountAction($event, account)
            }, null, 8, ["actions", "onSelect"])
          ]),
          key: "0"
        } : void 0
      ]), 1032, ["accounts", "wallet", "is-connected", "chain-api", "onSelect"]),
      _ctx.isInternal ? (openBlock(), createBlock(_component_connection_items, { key: 1 }, {
        default: withCtx(() => [
          withDirectives((openBlock(), createBlock(_component_account_card, {
            class: "connection__button",
            tabindex: "0",
            onClick: _ctx.handleCreateAccount
          }, {
            avatar: withCtx(() => [
              createVNode(_component_s_icon, {
                name: "basic-circle-plus-24",
                size: "28",
                class: "connection__button-icon"
              })
            ]),
            name: withCtx(() => [
              createTextVNode(toDisplayString(_ctx.t("desktop.button.createAccount")), 1)
            ]),
            _: 1
          }, 8, ["onClick"])), [
            [_directive_button]
          ]),
          withDirectives((openBlock(), createBlock(_component_account_card, {
            class: "connection__button",
            tabindex: "0",
            onClick: _ctx.handleImportAccount
          }, {
            avatar: withCtx(() => [
              createVNode(_component_s_icon, {
                name: "el-icon-link",
                size: "28",
                class: "connection__button-icon"
              })
            ]),
            name: withCtx(() => [
              createTextVNode(toDisplayString(_ctx.t("desktop.button.importAccount")), 1)
            ]),
            _: 1
          }, 8, ["onClick"])), [
            [_directive_button]
          ])
        ]),
        _: 1
      })) : _ctx.noAccounts ? (openBlock(), createBlock(_component_s_button, {
        key: 2,
        class: "connection__button s-typography-button--large",
        type: "primary",
        loading: _ctx.loading,
        onClick: _ctx.handleRefreshClick
      }, {
        default: withCtx(() => [
          createTextVNode(toDisplayString(_ctx.t("connection.action.refresh")), 1)
        ]),
        _: 1
      }, 8, ["loading", "onClick"])) : createCommentVNode("", true)
    ]),
    _ctx.isInternal ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
      createVNode(_component_account_rename_dialog, {
        visible: _ctx.accountRenameVisibility,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => _ctx.accountRenameVisibility = $event),
        account: _ctx.selectedAccount,
        loading: _ctx.loading,
        onConfirm: _ctx.handleRenameAccount
      }, null, 8, ["visible", "account", "loading", "onConfirm"]),
      createVNode(_component_account_export_dialog, {
        visible: _ctx.accountExportVisibility,
        "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => _ctx.accountExportVisibility = $event),
        account: _ctx.selectedAccount,
        loading: _ctx.loading,
        onConfirm: _ctx.handleExportAccount
      }, null, 8, ["visible", "account", "loading", "onConfirm"]),
      createVNode(_component_account_delete_dialog, {
        visible: _ctx.accountDeleteVisibility,
        "onUpdate:visible": _cache[2] || (_cache[2] = ($event) => _ctx.accountDeleteVisibility = $event),
        loading: _ctx.loading,
        onConfirm: _ctx.handleDeleteAccount
      }, null, 8, ["visible", "loading", "onConfirm"])
    ], 64)) : createCommentVNode("", true)
  ]);
}
const AccountListStep = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$4], ["__scopeId", "data-v-357328ba"]]);
const _sfc_main$3 = defineComponent({
  components: {
    PasswordInput
  },
  mixins: [NotificationMixin],
  props: {
    chainApi: {
      required: true,
      type: Object
    },
    step: {
      required: true,
      type: String
    },
    selectedWalletTitle: {
      default: "",
      type: String
    },
    loading: {
      default: false,
      type: Boolean
    },
    createAccount: {
      default: () => {
      },
      type: Function
    }
  },
  emits: ["update:step"],
  data() {
    return {
      ColumnsCount: 3,
      LoginStep,
      PhraseLength: 12,
      accountName: "",
      accountPassword: "",
      accountPasswordConfirm: "",
      seedPhraseToCompareIdx: [],
      showErrorMessage: false,
      toExport: false,
      incorrect: false
    };
  },
  watch: {
    step(value) {
      if (value !== LoginStep.ConfirmSeedPhrase) {
        this.seedPhraseToCompareIdx = [];
      }
    }
  },
  computed: {
    stepNumber() {
      switch (this.step) {
        case LoginStep.SeedPhrase:
          return 1;
        case LoginStep.ConfirmSeedPhrase:
          return 2;
        case LoginStep.CreateCredentials:
          return 3;
        default:
          return 1;
      }
    },
    btnTextConfirmStep() {
      if (this.seedPhraseToCompare.length === this.PhraseLength) {
        return this.t("desktop.button.next");
      }
      return this.t("desktop.button.skip");
    },
    btnTypeConfirmStep() {
      return this.seedPhraseToCompare.length === this.PhraseLength ? "primary" : "secondary";
    },
    btnConfirmDisabled() {
      return this.isInputsNotFilled || !this.arePasswordsEqual;
    },
    isInputsNotFilled() {
      return !this.accountName || !this.accountPassword || !this.accountPasswordConfirm;
    },
    arePasswordsEqual() {
      return this.accountPassword === this.accountPasswordConfirm;
    },
    seedPhrase() {
      const { seed } = this.chainApi.createSeed();
      return seed;
    },
    seedPhraseWords() {
      return this.seedPhrase.split(" ");
    },
    randomizedSeedPhraseMap() {
      return [...this.seedPhraseWords].sort(() => Math.random() - 0.5).reduce((acc, word, index) => ({ ...acc, [index]: word }), {});
    },
    seedPhraseToCompare() {
      return this.seedPhraseToCompareIdx.map((idx) => this.randomizedSeedPhraseMap[idx]);
    }
  },
  methods: {
    isHiddenWord(wordIndex) {
      return this.seedPhraseToCompareIdx.includes(wordIndex);
    },
    chooseWord(index) {
      if (!this.isHiddenWord(index)) {
        this.seedPhraseToCompareIdx.push(index);
      }
    },
    discardWord(index) {
      this.seedPhraseToCompareIdx = this.seedPhraseToCompareIdx.filter((idx) => idx !== index);
    },
    async handleCopy() {
      await copyToClipboard(this.seedPhrase);
    },
    renderWord(column, index) {
      return Math.floor(index / 4) === column - 1;
    },
    nextStep() {
      this.$emit("update:step", LoginStep.ConfirmSeedPhrase);
    },
    handleMnemonicCheck() {
      if (this.seedPhraseToCompare.length < this.PhraseLength) {
        this.$emit("update:step", LoginStep.CreateCredentials);
        return;
      }
      const isSeedPhraseMatched = isEqual(this.seedPhraseToCompare.join(" "), this.seedPhrase);
      if (!isSeedPhraseMatched) {
        this.seedPhraseToCompareIdx = [];
        this.runErrorMessage();
        this.runReturnAnimation();
      } else {
        this.$emit("update:step", LoginStep.CreateCredentials);
      }
    },
    runErrorMessage() {
      this.showErrorMessage = true;
      setTimeout(() => {
        this.showErrorMessage = false;
      }, 4500);
    },
    runReturnAnimation() {
      this.incorrect = true;
      setTimeout(() => {
        this.incorrect = false;
      }, 2e3);
    },
    handleAccountCreate() {
      return this.createAccount({
        seed: this.seedPhrase,
        name: this.accountName,
        password: this.accountPassword,
        passwordConfirm: this.accountPasswordConfirm,
        exportAccount: this.toExport
      });
    }
  }
});
const _hoisted_1$2 = { class: "login" };
const _hoisted_2$2 = { class: "login__step-count" };
const _hoisted_3$2 = { class: "seed-grid s-flex" };
const _hoisted_4$2 = {
  key: 0,
  class: "seed-grid__word"
};
const _hoisted_5$2 = { class: "seed-grid__word-number" };
const _hoisted_6$2 = { class: "login__text-advice" };
const _hoisted_7$1 = { class: "login__random-order login__order-container" };
const _hoisted_8$1 = ["onClick"];
const _hoisted_9$1 = { class: "login__text-confirm" };
const _hoisted_10$1 = { class: "login__correct-order login__order-container" };
const _hoisted_11$1 = ["onClick"];
const _hoisted_12$1 = { class: "login__error" };
const _hoisted_13$1 = {
  key: 0,
  class: "login__error-text"
};
const _hoisted_14$1 = { class: "login__create-account-desc" };
const _hoisted_15 = { class: "login__create-account-desc" };
const _hoisted_16 = {
  key: 0,
  class: "login__create-account-desc error"
};
const _hoisted_17 = { class: "wallet-settings-create-token_export" };
const _hoisted_18 = { class: "wallet-settings-create-token_desc" };
function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_s_button = resolveComponent("s-button");
  const _component_s_input = resolveComponent("s-input");
  const _component_password_input = resolveComponent("password-input");
  const _component_s_switch = resolveComponent("s-switch");
  const _component_s_form = resolveComponent("s-form");
  return openBlock(), createElementBlock("div", _hoisted_1$2, [
    createBaseVNode("div", _hoisted_2$2, toDisplayString(_ctx.t("stepText")) + " " + toDisplayString(_ctx.stepNumber) + " / " + toDisplayString(_ctx.ColumnsCount), 1),
    _ctx.step === _ctx.LoginStep.SeedPhrase ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
      createBaseVNode("div", _hoisted_3$2, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.ColumnsCount, (column) => {
          return openBlock(), createElementBlock("div", {
            key: column,
            class: "seed-grid__column"
          }, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.seedPhraseWords, (word, idx) => {
              return openBlock(), createElementBlock("div", {
                key: `${word}${idx}`
              }, [
                _ctx.renderWord(column, idx) ? (openBlock(), createElementBlock("div", _hoisted_4$2, [
                  createBaseVNode("span", _hoisted_5$2, toDisplayString(idx + 1), 1),
                  createBaseVNode("span", null, toDisplayString(word), 1)
                ])) : createCommentVNode("", true)
              ]);
            }), 128))
          ]);
        }), 128))
      ]),
      createVNode(_component_s_button, {
        size: "mini",
        class: "login__copy-seed",
        icon: "basic-copy-24",
        "icon-position": "right",
        onClick: _ctx.handleCopy
      }, {
        default: withCtx(() => [
          createBaseVNode("span", null, toDisplayString(_ctx.t("copyPhraseText")), 1)
        ]),
        _: 1
      }, 8, ["onClick"]),
      createBaseVNode("div", _hoisted_6$2, [
        createBaseVNode("p", null, toDisplayString(_ctx.t("desktop.seedAdviceText", { wallet: _ctx.selectedWalletTitle })), 1),
        createBaseVNode("p", null, toDisplayString(_ctx.t("desktop.seedAdviceAdditionTitle")), 1),
        createBaseVNode("p", null, toDisplayString(_ctx.t("desktop.seedAdviceAdditionText")), 1)
      ]),
      createVNode(_component_s_button, {
        key: "step1",
        class: "s-typography-button--large login-btn",
        type: "primary",
        onClick: _ctx.nextStep
      }, {
        default: withCtx(() => [
          createTextVNode(toDisplayString(_ctx.t("desktop.button.next")), 1)
        ]),
        _: 1
      }, 8, ["onClick"])
    ], 64)) : createCommentVNode("", true),
    _ctx.step === _ctx.LoginStep.ConfirmSeedPhrase ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
      createBaseVNode("div", _hoisted_7$1, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.randomizedSeedPhraseMap, (word, idx) => {
          return openBlock(), createElementBlock("div", {
            key: idx,
            class: normalizeClass(["login__random-word", { hidden: _ctx.isHiddenWord(idx), incorrect: _ctx.incorrect }]),
            onClick: ($event) => _ctx.chooseWord(idx)
          }, [
            createVNode(_component_s_button, { size: "small" }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(word), 1)
              ]),
              _: 2
            }, 1024)
          ], 10, _hoisted_8$1);
        }), 128))
      ]),
      createBaseVNode("div", _hoisted_9$1, [
        createBaseVNode("p", null, toDisplayString(_ctx.t("desktop.confirmSeedText")), 1)
      ]),
      _cache[4] || (_cache[4] = createBaseVNode("div", { class: "delimiter" }, null, -1)),
      createBaseVNode("div", _hoisted_10$1, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.seedPhraseToCompareIdx, (idx) => {
          return openBlock(), createElementBlock("div", {
            key: idx,
            class: "login__random-word",
            onClick: ($event) => _ctx.discardWord(idx)
          }, [
            createVNode(_component_s_button, { size: "small" }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(_ctx.randomizedSeedPhraseMap[idx]), 1)
              ]),
              _: 2
            }, 1024)
          ], 8, _hoisted_11$1);
        }), 128))
      ]),
      createBaseVNode("div", _hoisted_12$1, [
        createVNode(Transition, { name: "fade" }, {
          default: withCtx(() => [
            _ctx.showErrorMessage ? (openBlock(), createElementBlock("span", _hoisted_13$1, toDisplayString(_ctx.t("desktop.errorMnemonicText")), 1)) : createCommentVNode("", true)
          ]),
          _: 1
        })
      ]),
      createVNode(_component_s_button, {
        key: "step2",
        class: "s-typography-button--large login-btn",
        type: _ctx.btnTypeConfirmStep,
        onClick: _ctx.handleMnemonicCheck
      }, {
        default: withCtx(() => [
          createTextVNode(toDisplayString(_ctx.btnTextConfirmStep), 1)
        ]),
        _: 1
      }, 8, ["type", "onClick"])
    ], 64)) : _ctx.step === _ctx.LoginStep.CreateCredentials ? (openBlock(), createBlock(_component_s_form, {
      key: 2,
      class: "login__inputs",
      onSubmit: withModifiers(_ctx.handleAccountCreate, ["prevent"])
    }, {
      default: withCtx(() => [
        createVNode(_component_s_input, {
          modelValue: _ctx.accountName,
          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => _ctx.accountName = $event),
          disabled: _ctx.loading,
          placeholder: _ctx.t("desktop.accountName.placeholder")
        }, null, 8, ["modelValue", "disabled", "placeholder"]),
        createBaseVNode("p", _hoisted_14$1, toDisplayString(_ctx.t("desktop.accountName.desc")), 1),
        createVNode(_component_password_input, {
          modelValue: _ctx.accountPassword,
          "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => _ctx.accountPassword = $event),
          disabled: _ctx.loading
        }, null, 8, ["modelValue", "disabled"]),
        createBaseVNode("p", _hoisted_15, toDisplayString(_ctx.t("desktop.password.desc")), 1),
        createVNode(_component_s_input, {
          modelValue: _ctx.accountPasswordConfirm,
          "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => _ctx.accountPasswordConfirm = $event),
          type: "password",
          disabled: _ctx.loading,
          placeholder: _ctx.t("desktop.confirmPassword.placeholder")
        }, null, 8, ["modelValue", "disabled", "placeholder"]),
        !_ctx.arePasswordsEqual ? (openBlock(), createElementBlock("p", _hoisted_16, toDisplayString(_ctx.t("desktop.errorMessages.passwords")), 1)) : createCommentVNode("", true),
        createBaseVNode("div", _hoisted_17, [
          createVNode(_component_s_switch, {
            modelValue: _ctx.toExport,
            "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => _ctx.toExport = $event),
            disabled: _ctx.loading
          }, null, 8, ["modelValue", "disabled"]),
          createBaseVNode("span", null, toDisplayString(_ctx.t("desktop.exportOptionText")), 1)
        ]),
        createBaseVNode("p", _hoisted_18, toDisplayString(_ctx.t("desktop.exportJsonText")), 1),
        createVNode(_component_s_button, {
          key: "step3",
          class: "s-typography-button--large login-btn",
          type: "primary",
          "native-type": "submit",
          disabled: _ctx.btnConfirmDisabled,
          loading: _ctx.loading
        }, {
          default: withCtx(() => [
            createTextVNode(toDisplayString(_ctx.t("desktop.button.createAccount")), 1)
          ]),
          _: 1
        }, 8, ["disabled", "loading"])
      ]),
      _: 1
    }, 8, ["onSubmit"])) : createCommentVNode("", true)
  ]);
}
const CreateAccountStep = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$3], ["__scopeId", "data-v-3c6890ed"]]);
const wikiLink = Links.connection.wiki;
const _sfc_main$2 = defineComponent({
  components: {
    ExtensionConnectionList,
    ExternalLink
  },
  mixins: [TranslationMixin],
  props: {
    connectedWallet: {
      default: "",
      type: String
    },
    selectedWallet: {
      default: "",
      type: String
    },
    selectedWalletLoading: {
      default: false,
      type: Boolean
    },
    internalWallets: {
      default: () => [],
      type: Array
    },
    externalWallets: {
      default: () => [],
      type: Array
    },
    recommendedWallets: {
      default: () => [],
      type: Array
    }
  },
  emits: ["select", "disconnect"],
  data() {
    return {
      wikiLink
    };
  },
  methods: {
    handleSelectWallet(wallet) {
      this.$emit("select", wallet);
    },
    handleDisconnectWallet(wallet) {
      this.$emit("disconnect", wallet);
    }
  }
});
const _hoisted_1$1 = { class: "wallet-connection" };
const _hoisted_2$1 = { class: "wallet-connection-text" };
const _hoisted_3$1 = {
  key: 0,
  class: "wallet-connection-list"
};
const _hoisted_4$1 = { class: "wallet-connection-title" };
const _hoisted_5$1 = {
  key: 1,
  class: "wallet-connection-list"
};
const _hoisted_6$1 = { class: "wallet-connection-title" };
function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_external_link = resolveComponent("external-link");
  const _component_extension_connection_list = resolveComponent("extension-connection-list");
  return openBlock(), createElementBlock("div", _hoisted_1$1, [
    createBaseVNode("p", _hoisted_2$1, [
      createVNode(_component_external_link, {
        "default-class": "p3",
        href: _ctx.wikiLink,
        title: _ctx.t("connection.action.learnMore")
      }, null, 8, ["href", "title"])
    ]),
    _ctx.internalWallets.length ? (openBlock(), createElementBlock("div", _hoisted_3$1, [
      createBaseVNode("p", _hoisted_4$1, toDisplayString(_ctx.t("connection.list.integrated")), 1),
      createVNode(_component_extension_connection_list, {
        wallets: _ctx.internalWallets,
        "recommended-wallets": _ctx.recommendedWallets,
        "connected-wallet": _ctx.connectedWallet,
        "selected-wallet": _ctx.selectedWallet,
        "selected-wallet-loading": _ctx.selectedWalletLoading,
        onSelect: _ctx.handleSelectWallet,
        onDisconnect: _ctx.handleDisconnectWallet
      }, null, 8, ["wallets", "recommended-wallets", "connected-wallet", "selected-wallet", "selected-wallet-loading", "onSelect", "onDisconnect"])
    ])) : createCommentVNode("", true),
    _ctx.externalWallets.length ? (openBlock(), createElementBlock("div", _hoisted_5$1, [
      createBaseVNode("p", _hoisted_6$1, toDisplayString(_ctx.t("connection.list.extensions")), 1),
      createVNode(_component_extension_connection_list, {
        "show-disclaimer": "",
        wallets: _ctx.externalWallets,
        "recommended-wallets": _ctx.recommendedWallets,
        "connected-wallet": _ctx.connectedWallet,
        "selected-wallet": _ctx.selectedWallet,
        "selected-wallet-loading": _ctx.selectedWalletLoading,
        onSelect: _ctx.handleSelectWallet,
        onDisconnect: _ctx.handleDisconnectWallet
      }, null, 8, ["wallets", "recommended-wallets", "connected-wallet", "selected-wallet", "selected-wallet-loading", "onSelect", "onDisconnect"])
    ])) : createCommentVNode("", true),
    renderSlot(_ctx.$slots, "default", {}, void 0, true)
  ]);
}
const ExtensionListStep = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$2], ["__scopeId", "data-v-c78bbc75"]]);
const Tutorials = [
  {
    logo: FearlessLogo,
    title: "Fearless",
    link: "https://wiki.fearlesswallet.io/accounts/walkthrough/exporting-and-importing-a-wallet-using-a-json-file"
  },
  {
    logo: PolkadotLogo,
    title: "Polkadot{.js}",
    link: "https://support.polkadot.network/support/solutions/articles/65000177677-how-to-export-your-json-backup-file"
  },
  {
    logo: SubWalletLogo,
    title: "Subwallet",
    link: "https://docs.subwallet.app/extension-user-guide/export-and-backup-an-account"
  }
];
const _sfc_main$1 = defineComponent({
  components: {
    FileUploader,
    PasswordInput,
    WalletAccount: _sfc_main$8
  },
  mixins: [NotificationMixin],
  props: {
    step: {
      required: true,
      type: String
    },
    jsonOnly: {
      default: false,
      type: Boolean
    },
    loading: {
      default: false,
      type: Boolean
    },
    createAccount: {
      default: () => {
      },
      type: Function
    },
    restoreAccount: {
      default: () => {
      },
      type: Function
    }
  },
  emits: ["update:step"],
  data() {
    return {
      LoginStep,
      PhraseLength: 12,
      Tutorials,
      mnemonicPhrase: "",
      accountName: "",
      accountPassword: "",
      accountPasswordConfirm: "",
      json: null
    };
  },
  computed: {
    disabledNextStep() {
      return this.mnemonicPhrase.length === 0;
    },
    disabledImportStep() {
      if (this.json) return !this.accountPassword;
      return !(this.accountName && this.accountPassword && this.accountPasswordConfirm);
    },
    computedClasses() {
      const baseClass = ["login__inputs"];
      if (this.json) baseClass.push("login__inputs--json");
      return baseClass.join(" ");
    },
    importSteps() {
      return [
        this.t("desktop.importSteps.selectWallet"),
        this.t("desktop.importSteps.selectAccount"),
        this.t("desktop.importSteps.exportAccount")
      ];
    }
  },
  methods: {
    handleMnemonicInput(char) {
      const letter = char.replace(".", "").replace("  ", " ");
      if (/^[a-z ]+$/.test(letter)) {
        this.mnemonicPhrase = letter;
      }
    },
    nextStep() {
      void this.withAppNotification(async () => {
        try {
          if (this.mnemonicPhrase.trim().split(" ").length !== this.PhraseLength) {
            throw new AppError({ key: "desktop.errorMessages.mnemonicLength", payload: { number: this.PhraseLength } });
          }
          if (!mnemonicValidate(this.mnemonicPhrase)) {
            throw new AppError({ key: "desktop.errorMessages.mnemonic" });
          }
          this.json = null;
          this.resetForm();
          this.$emit("update:step", LoginStep.ImportCredentials);
        } catch (error) {
          this.mnemonicPhrase = "";
          throw error;
        }
      });
    },
    async handleUploadJson(jsonFile) {
      await this.withAppNotification(async () => {
        if (!jsonFile) return;
        const parsedJson = await parseAccountJson(jsonFile);
        const { address, encoded, encoding, meta = {} } = parsedJson;
        if (!(address && encoded && encoding)) {
          const uploader = this.$refs.uploader;
          uploader?.resetFileInput?.();
          throw new AppError({ key: "desktop.errorMessages.jsonFields" });
        }
        this.accountName = meta.name || "";
        this.json = parsedJson;
        this.mnemonicPhrase = "";
        this.$emit("update:step", LoginStep.ImportCredentials);
      });
    },
    async importAccount() {
      const action = this.json ? this.restoreAccount({ json: this.json, password: this.accountPassword }) : this.createAccount({
        seed: this.mnemonicPhrase,
        name: this.accountName,
        password: this.accountPassword,
        passwordConfirm: this.accountPasswordConfirm
      });
      await action;
      this.resetForm();
    },
    resetForm() {
      this.accountName = "";
      this.accountPassword = "";
      this.accountPasswordConfirm = "";
    }
  }
});
const _hoisted_1 = { class: "login" };
const _hoisted_2 = { class: "placeholder" };
const _hoisted_3 = { class: "upload-json__placeholder" };
const _hoisted_4 = { class: "import-step__count" };
const _hoisted_5 = { class: "import-step__text" };
const _hoisted_6 = { class: "export-tutorial" };
const _hoisted_7 = { class: "export-tutorial-title" };
const _hoisted_8 = { class: "export-tutorial-grid" };
const _hoisted_9 = ["href"];
const _hoisted_10 = { class: "extension-tutorial" };
const _hoisted_11 = ["src"];
const _hoisted_12 = { class: "extension-tutorial-title" };
const _hoisted_13 = { class: "login__create-account-desc" };
const _hoisted_14 = { class: "login__create-account-desc" };
function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_s_input = resolveComponent("s-input");
  const _component_s_button = resolveComponent("s-button");
  const _component_s_icon = resolveComponent("s-icon");
  const _component_file_uploader = resolveComponent("file-uploader");
  const _component_s_card = resolveComponent("s-card");
  const _component_wallet_account = resolveComponent("wallet-account");
  const _component_password_input = resolveComponent("password-input");
  const _component_s_form = resolveComponent("s-form");
  return openBlock(), createElementBlock("div", _hoisted_1, [
    _ctx.step === _ctx.LoginStep.Import ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
      !_ctx.jsonOnly ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
        createVNode(_component_s_input, {
          modelValue: _ctx.mnemonicPhrase,
          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => _ctx.mnemonicPhrase = $event),
          class: "input-textarea",
          type: "textarea",
          disabled: _ctx.loading,
          placeholder: _ctx.t("desktop.accountMnemonic.placeholder"),
          maxlength: 255,
          onInput: _ctx.handleMnemonicInput
        }, null, 8, ["modelValue", "disabled", "placeholder", "onInput"]),
        createVNode(_component_s_button, {
          key: "step1",
          class: "s-typography-button--large login-btn",
          type: "primary",
          disabled: _ctx.disabledNextStep,
          onClick: _ctx.nextStep
        }, {
          default: withCtx(() => [
            createTextVNode(toDisplayString(_ctx.t("desktop.button.next")), 1)
          ]),
          _: 1
        }, 8, ["disabled", "onClick"]),
        _cache[4] || (_cache[4] = createBaseVNode("p", { class: "line" }, "or", -1))
      ], 64)) : createCommentVNode("", true),
      createVNode(_component_file_uploader, {
        ref: "uploader",
        accept: "application/json",
        class: "upload-json",
        onUpload: _ctx.handleUploadJson
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_2, [
            createVNode(_component_s_icon, {
              class: "upload-json__icon",
              name: "el-icon-document",
              size: "32px"
            }),
            createBaseVNode("span", _hoisted_3, toDisplayString(_ctx.t("dragAndDropText", { extension: _ctx.TranslationConsts.JSON })), 1)
          ])
        ]),
        _: 1
      }, 8, ["onUpload"]),
      _ctx.jsonOnly ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
        createVNode(_component_s_card, {
          shadow: "always",
          class: "import-steps"
        }, {
          default: withCtx(() => [
            (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.importSteps, (text, index) => {
              return openBlock(), createElementBlock("div", {
                key: index,
                class: "import-step"
              }, [
                createBaseVNode("div", _hoisted_4, toDisplayString(index + 1), 1),
                createBaseVNode("div", _hoisted_5, toDisplayString(text), 1)
              ]);
            }), 128))
          ]),
          _: 1
        }),
        createBaseVNode("div", _hoisted_6, [
          createBaseVNode("div", _hoisted_7, toDisplayString(_ctx.t("desktop.exportTutorialsText")), 1),
          createBaseVNode("div", _hoisted_8, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.Tutorials, ({ logo, title, link }) => {
              return openBlock(), createElementBlock("a", {
                key: title,
                href: link,
                target: "_blank",
                rel: "nofollow noopener noreferrer",
                class: "export-tutorial-grid-item"
              }, [
                createVNode(_component_s_card, { shadow: "always" }, {
                  default: withCtx(() => [
                    createBaseVNode("div", _hoisted_10, [
                      createBaseVNode("img", {
                        class: "extension-tutorial-logo",
                        src: logo
                      }, null, 8, _hoisted_11),
                      createBaseVNode("span", _hoisted_12, toDisplayString(title), 1)
                    ])
                  ]),
                  _: 2
                }, 1024)
              ], 8, _hoisted_9);
            }), 128))
          ])
        ])
      ], 64)) : createCommentVNode("", true)
    ], 64)) : _ctx.step === _ctx.LoginStep.ImportCredentials ? (openBlock(), createBlock(_component_s_form, {
      key: 1,
      class: normalizeClass(_ctx.computedClasses),
      onSubmit: withModifiers(_ctx.importAccount, ["prevent"])
    }, {
      default: withCtx(() => [
        _ctx.json ? (openBlock(), createBlock(_component_wallet_account, {
          key: 0,
          "polkadot-account": { name: _ctx.accountName, address: _ctx.json.address }
        }, null, 8, ["polkadot-account"])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
          createVNode(_component_s_input, {
            modelValue: _ctx.accountName,
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => _ctx.accountName = $event),
            disabled: _ctx.loading,
            placeholder: _ctx.t("desktop.accountName.placeholder")
          }, null, 8, ["modelValue", "disabled", "placeholder"]),
          createBaseVNode("p", _hoisted_13, toDisplayString(_ctx.t("desktop.accountName.desc")), 1)
        ], 64)),
        createVNode(_component_password_input, {
          modelValue: _ctx.accountPassword,
          "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => _ctx.accountPassword = $event),
          disabled: _ctx.loading
        }, null, 8, ["modelValue", "disabled"]),
        !_ctx.json ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
          createBaseVNode("p", _hoisted_14, toDisplayString(_ctx.t("desktop.password.desc")), 1),
          createVNode(_component_s_input, {
            modelValue: _ctx.accountPasswordConfirm,
            "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => _ctx.accountPasswordConfirm = $event),
            type: "password",
            disabled: _ctx.loading,
            placeholder: _ctx.t("desktop.confirmPassword.placeholder")
          }, null, 8, ["modelValue", "disabled", "placeholder"])
        ], 64)) : createCommentVNode("", true),
        createVNode(_component_s_button, {
          key: "step2",
          disabled: _ctx.disabledImportStep,
          loading: _ctx.loading,
          class: "s-typography-button--large login-btn",
          type: "primary",
          "native-type": "submit"
        }, {
          default: withCtx(() => [
            createTextVNode(toDisplayString(_ctx.t("desktop.button.importAccount")), 1)
          ]),
          _: 1
        }, 8, ["disabled", "loading"])
      ]),
      _: 1
    }, 8, ["class", "onSubmit"])) : createCommentVNode("", true)
  ]);
}
const ImportAccountStep = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render$1], ["__scopeId", "data-v-2167cf06"]]);
const SelectAccountFlow = [LoginStep.ExtensionList, LoginStep.AccountList];
const AccountCreateFlow = [LoginStep.SeedPhrase, LoginStep.ConfirmSeedPhrase, LoginStep.CreateCredentials];
const AccountImportFlow = [LoginStep.Import, LoginStep.ImportCredentials];
const getPreviousLoginStep = (currentStep) => {
  if (!currentStep) return LoginStep.ExtensionList;
  for (const flow of [AccountCreateFlow, AccountImportFlow]) {
    const currentStepIndex = flow.findIndex((stepValue) => stepValue === currentStep);
    if (currentStepIndex > 0) {
      return flow[currentStepIndex - 1];
    }
  }
  return SelectAccountFlow.includes(currentStep) ? LoginStep.ExtensionList : LoginStep.AccountList;
};
const _sfc_main = defineComponent({
  components: {
    WalletBase,
    AccountConfirmDialog,
    AccountListStep,
    CreateAccountStep,
    ExtensionListStep,
    ImportAccountStep
  },
  mixins: [NotificationMixin, LoadingMixin],
  props: {
    chainApi: {
      required: true,
      type: Object
    },
    account: {
      default: () => null,
      type: Object
    },
    checkConnectedAccountSource: {
      default: () => {
      },
      type: Function
    },
    loginAccount: {
      default: () => {
      },
      type: Function
    },
    logoutAccount: {
      default: () => {
      },
      type: Function
    },
    renameAccount: {
      default: () => {
      },
      type: Function
    },
    closeView: {
      default: () => {
      },
      type: Function
    }
  },
  data() {
    return {
      step: LoginStep.AccountList,
      accountLoginVisibility: false,
      accountLoginData: null,
      selectedWallet: null,
      selectedWalletLoading: false,
      accounts: [],
      accountsSubscription: null,
      wcName: "",
      recommendedWallets: RecommendedWallets
    };
  },
  computed: {
    ...mapState("wallet/account", ["availableWallets", "isMST"]),
    ...mapState("wallet/transactions", ["isSignTxDialogDisabled"]),
    ...mapState("wallet/settings", ["isMSTAvailable"]),
    chainGenesisHash() {
      try {
        return this.chainApi.api.genesisHash.toString();
      } catch {
        return "";
      }
    },
    connectedAccount() {
      return this.account?.address ?? "";
    },
    connectedWallet() {
      return this.account?.source ?? "";
    },
    isInternal() {
      return !!this.selectedWallet && isInternalSource(this.selectedWallet);
    },
    isAppStored() {
      return !!this.selectedWallet && isAppStorageSource(this.selectedWallet);
    },
    wallets() {
      const wallets = {
        internal: [],
        external: []
      };
      return this.availableWallets.reduce((buffer, wallet) => {
        if (this.wcName && isWcWallet(wallet) && wallet.extensionName !== this.wcName) {
          return buffer;
        }
        if (isInternalWallet(wallet)) {
          buffer.internal.push(wallet);
        } else {
          buffer.external.push(wallet);
        }
        return buffer;
      }, wallets);
    },
    selectedWalletTitle() {
      if (!this.selectedWallet) return "";
      const wallet = this.availableWallets.find((wallet2) => wallet2.extensionName === this.selectedWallet);
      return wallet ? wallet.title : this.selectedWallet;
    },
    viewTitle() {
      if (this.isAccountList && this.selectedWalletTitle) {
        return this.t("connection.internalTitle", { wallet: this.selectedWalletTitle });
      } else if (this.isCreateFlow) {
        switch (this.step) {
          case LoginStep.SeedPhrase:
            return this.t("desktop.heading.seedPhraseTitle");
          case LoginStep.ConfirmSeedPhrase:
            return this.t("desktop.heading.confirmSeedTitle");
          case LoginStep.CreateCredentials:
            return this.t("desktop.heading.accountDetailsTitle");
          default:
            return "";
        }
      } else if (this.isImportFlow) {
        switch (this.step) {
          case LoginStep.Import:
            return this.t("desktop.heading.importTitle");
          case LoginStep.ImportCredentials:
            return this.t("desktop.heading.accountDetailsTitle");
          default:
            return "";
        }
      } else {
        return this.t("account.accountTitle");
      }
    },
    hasAccounts() {
      return !!this.accounts.length;
    },
    accountListText() {
      if (this.isInternal) {
        return this.t("connection.internalText", { wallet: this.selectedWalletTitle });
      }
      return this.hasAccounts ? this.t("connection.selectAccount") : this.t("desktop.welcome.text");
    },
    isLoggedIn() {
      return !!this.connectedAccount;
    },
    logoutButtonVisibility() {
      return this.isLoggedIn && !this.isCreateFlow && !this.isImportFlow;
    },
    isCreateFlow() {
      return AccountCreateFlow.includes(this.step);
    },
    isImportFlow() {
      return AccountImportFlow.includes(this.step);
    },
    isAccountList() {
      return this.step === LoginStep.AccountList;
    },
    isExtensionsList() {
      return this.step === LoginStep.ExtensionList;
    },
    prevStep() {
      return getPreviousLoginStep(this.step);
    },
    hasPrevStep() {
      return this.step !== this.prevStep;
    },
    hasBackBtn() {
      return this.hasPrevStep || this.isLoggedIn;
    }
  },
  watch: {
    async chainGenesisHash(curr, prev) {
      if (curr !== prev) {
        await this.updateWallets();
      }
    }
  },
  created() {
    this.resetStep();
    void this.updateWallets();
  },
  beforeUnmount() {
    this.resetSelectedWallet();
  },
  methods: {
    ...mapMutations("wallet/settings", ["setIsMstAvailable"]),
    ...mapActions("wallet/account", ["initMultisigAddress", "updateAvailableWallets", "setAccountPassphrase"]),
    resetWalletAccountsSubscription() {
      this.accountsSubscription?.();
      this.accountsSubscription = null;
    },
    async updateWallets() {
      await this.updateWcWallet();
      await this.updateAvailableWallets();
    },
    async updateWcWallet() {
      await this.withChainApi(this.chainApi, async () => {
        this.checkConnectedAccountSource(this.wcName);
        this.wcName = addWcSubWalletLocally(this.chainApi, (source) => {
          this.checkConnectedAccountSource(source);
          this.updateAvailableWallets();
        });
      });
    },
    navigateToCreateAccount() {
      this.step = LoginStep.SeedPhrase;
    },
    navigateToImportAccount() {
      this.step = LoginStep.Import;
    },
    navigateToAccountList() {
      this.step = LoginStep.AccountList;
    },
    switchFromMSTBeforeLogout() {
      if (this.isMST && this.isMSTAvailable) {
        api.mst.switchAccount(false);
      }
    },
    async handleAccountImport(data) {
      await this.withLoading(async () => {
        await this.$nextTick();
        await delay(250);
        await this.withAppNotification(async () => {
          const { json, password } = data;
          const verified = verifyAccountJson(this.chainApi, json, password);
          if (this.selectedWallet === AppWallet.GoogleDrive) {
            await GDriveWallet.accounts.add(verified, password);
          } else if (this.selectedWallet === AppWallet.Sora) {
            this.handleAccountRestore(data);
          }
          this.navigateToAccountList();
        });
      });
    },
    async handleAccountCreate(data) {
      await this.withLoading(async () => {
        await this.$nextTick();
        await delay(250);
        await this.withAppNotification(async () => {
          if (this.selectedWallet === AppWallet.GoogleDrive) {
            const accountJson = createAccount(this.chainApi, { ...data });
            await GDriveWallet.accounts.add(accountJson, data.password, data.seed);
          } else if (this.selectedWallet === AppWallet.Sora) {
            createAccount(this.chainApi, { ...data, saveAccount: true });
          }
          this.navigateToAccountList();
        });
      });
    },
    async handleAccountSelect(account, isConnected) {
      this.switchFromMSTBeforeLogout();
      this.setIsMstAvailable(account.source === AppWallet.FearlessWallet);
      if (isConnected) {
        this.closeView();
      } else if (this.isInternal && !isAppStorageSource(account.source)) {
        this.accountLoginData = account;
        this.accountLoginVisibility = true;
      } else {
        await this.withLoading(async () => {
          await this.withAppAlert(async () => {
            await checkExternalAccount(account);
            await this.loginAccount(account);
            this.initMultisigAddress();
            this.resetStep();
          });
        });
      }
    },
    async handleWalletSelect(wallet) {
      if (!wallet.installed) return;
      await this.withAppAlert(async () => {
        await this.selectWallet(wallet.extensionName);
        this.navigateToAccountList();
      });
    },
    async handleWalletDisconnect(wallet) {
      if (!wallet.provider) return;
      await wallet.provider.disconnect();
    },
    setSelectedWallet(wallet = null) {
      this.selectedWallet = wallet;
    },
    setSelectedWalletLoading(flag) {
      this.selectedWalletLoading = flag;
    },
    async subscribeToWalletAccounts() {
      if (!this.selectedWallet) return;
      this.accountsSubscription = await subscribeToWalletAccounts(this.chainApi, this.selectedWallet, (accounts) => {
        this.accounts = accounts;
      });
    },
    async selectWallet(wallet) {
      try {
        this.resetWalletAccountsSubscription();
        this.setSelectedWallet(wallet);
        this.setSelectedWalletLoading(true);
        await getWallet(wallet);
        this.setSelectedWalletLoading(false);
        await this.subscribeToWalletAccounts();
      } catch (error) {
        console.error(error);
        this.resetSelectedWallet();
        throw error;
      }
    },
    resetSelectedWallet() {
      this.resetWalletAccountsSubscription();
      this.setSelectedWallet();
      this.setSelectedWalletLoading(false);
    },
    async loadAccountJson(password) {
      if (!this.accountLoginData || this.selectedWallet !== AppWallet.GoogleDrive) {
        throw new Error("polkadotjs.noAccount");
      }
      const json = await GDriveWallet.accounts.getAccount(this.accountLoginData.address, password);
      if (!json) throw new Error("polkadotjs.noAccount");
      this.handleAccountRestore({ json, password });
      return json;
    },
    async handleAccountLogin(password) {
      await this.withLoading(async () => {
        await this.$nextTick();
        await delay(250);
        await this.withAppNotification(async () => {
          const { address, meta } = await this.loadAccountJson(password);
          await this.loginAccount({
            address,
            name: meta.name || "",
            source: this.selectedWallet
          });
          this.resetStep();
          if (this.isSignTxDialogDisabled) {
            this.setAccountPassphrase({ address, password });
          }
          this.accountLoginVisibility = false;
          this.accountLoginData = null;
        });
      });
    },
    handleAccountExport(data) {
      exportAccount(this.chainApi, data);
    },
    handleAccountDelete(address) {
      deleteAccount(this.chainApi, address);
    },
    handleAccountRestore(data) {
      restoreAccount(this.chainApi, data);
    },
    handleBack() {
      if (this.step === this.prevStep) {
        this.closeView();
      } else {
        this.step = this.prevStep;
        if (this.isExtensionsList) {
          this.resetSelectedWallet();
        }
      }
    },
    handleAccountLogout() {
      this.switchFromMSTBeforeLogout();
      this.resetStep();
      this.logoutAccount();
    },
    resetStep() {
      this.step = getPreviousLoginStep();
    }
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_s_icon = resolveComponent("s-icon");
  const _component_s_button = resolveComponent("s-button");
  const _component_extension_list_step = resolveComponent("extension-list-step");
  const _component_account_list_step = resolveComponent("account-list-step");
  const _component_create_account_step = resolveComponent("create-account-step");
  const _component_import_account_step = resolveComponent("import-account-step");
  const _component_account_confirm_dialog = resolveComponent("account-confirm-dialog");
  const _component_wallet_base = resolveComponent("wallet-base");
  return openBlock(), createBlock(_component_wallet_base, mergeProps({
    "show-header": "",
    "title-center": "",
    "show-back": _ctx.hasBackBtn,
    title: _ctx.viewTitle
  }, _ctx.$attrs, {
    onBack: _ctx.handleBack,
    onClose: _ctx.closeView
  }), createSlots({
    default: withCtx(() => [
      _ctx.isExtensionsList ? (openBlock(), createBlock(_component_extension_list_step, {
        key: 0,
        "connected-wallet": _ctx.connectedWallet,
        "selected-wallet": _ctx.selectedWallet,
        "selected-wallet-loading": _ctx.selectedWalletLoading,
        "internal-wallets": _ctx.wallets.internal,
        "external-wallets": _ctx.wallets.external,
        "recommended-wallets": _ctx.recommendedWallets,
        onSelect: _ctx.handleWalletSelect,
        onDisconnect: _ctx.handleWalletDisconnect
      }, null, 8, ["connected-wallet", "selected-wallet", "selected-wallet-loading", "internal-wallets", "external-wallets", "recommended-wallets", "onSelect", "onDisconnect"])) : _ctx.isAccountList ? (openBlock(), createBlock(_component_account_list_step, {
        key: 1,
        "chain-api": _ctx.chainApi,
        text: _ctx.accountListText,
        "is-internal": _ctx.isInternal,
        "connected-wallet": _ctx.connectedWallet,
        "connected-account": _ctx.connectedAccount,
        "selected-wallet": _ctx.selectedWallet,
        accounts: _ctx.accounts,
        "rename-account": _ctx.renameAccount,
        "export-account": _ctx.handleAccountExport,
        "delete-account": _ctx.handleAccountDelete,
        "logout-account": _ctx.handleAccountLogout,
        onSelect: _ctx.handleAccountSelect,
        onCreate: _ctx.navigateToCreateAccount,
        onImport: _ctx.navigateToImportAccount
      }, null, 8, ["chain-api", "text", "is-internal", "connected-wallet", "connected-account", "selected-wallet", "accounts", "rename-account", "export-account", "delete-account", "logout-account", "onSelect", "onCreate", "onImport"])) : _ctx.isCreateFlow ? (openBlock(), createBlock(_component_create_account_step, {
        key: 2,
        step: _ctx.step,
        "onUpdate:step": _cache[0] || (_cache[0] = ($event) => _ctx.step = $event),
        "chain-api": _ctx.chainApi,
        "selected-wallet-title": _ctx.selectedWalletTitle,
        loading: _ctx.loading,
        "create-account": _ctx.handleAccountCreate
      }, null, 8, ["step", "chain-api", "selected-wallet-title", "loading", "create-account"])) : _ctx.isImportFlow ? (openBlock(), createBlock(_component_import_account_step, {
        key: 3,
        step: _ctx.step,
        "onUpdate:step": _cache[1] || (_cache[1] = ($event) => _ctx.step = $event),
        loading: _ctx.loading,
        "create-account": _ctx.handleAccountCreate,
        "restore-account": _ctx.handleAccountImport,
        "json-only": !_ctx.isAppStored
      }, null, 8, ["step", "loading", "create-account", "restore-account", "json-only"])) : createCommentVNode("", true),
      createVNode(_component_account_confirm_dialog, {
        visible: _ctx.accountLoginVisibility,
        "onUpdate:visible": _cache[2] || (_cache[2] = ($event) => _ctx.accountLoginVisibility = $event),
        "with-timeout": "",
        account: _ctx.accountLoginData,
        loading: _ctx.loading,
        onConfirm: _ctx.handleAccountLogin
      }, null, 8, ["visible", "account", "loading", "onConfirm"])
    ]),
    _: 2
  }, [
    _ctx.logoutButtonVisibility ? {
      name: "actions",
      fn: withCtx(() => [
        createVNode(_component_s_button, {
          type: "action",
          tooltip: _ctx.t("logoutText"),
          onClick: _ctx.handleAccountLogout
        }, {
          default: withCtx(() => [
            createVNode(_component_s_icon, {
              name: "basic-eye-24",
              size: "28"
            })
          ]),
          _: 1
        }, 8, ["tooltip", "onClick"])
      ]),
      key: "0"
    } : void 0
  ]), 1040, ["show-back", "title", "onBack", "onClose"]);
}
const ConnectionView = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
const ConnectionView$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ConnectionView,
  getPreviousLoginStep
}, Symbol.toStringTag, { value: "Module" }));
export {
  AccountRenameDialog as A,
  ConnectionView as C,
  _sfc_main$6 as _,
  ConnectionView$1 as a
};
