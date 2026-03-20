import { z as defineComponent, bS as TranslationMixin, aP as _export_sfc, a_ as resolveComponent, bz as resolveDirective, am as createBlock, C as openBlock, ao as withCtx, bA as withDirectives, ap as createVNode, as as mergeProps, e9 as dayjs, r as requireLegacyStore, u as useTranslation, a4 as onMounted, dA as onUnmounted, ea as PassphraseTimeout, h as computed, aj as unref, aJ as renderSlot, A as createElementBlock, aM as createCommentVNode, D as createBaseVNode, aN as toDisplayString, bQ as Fragment, bP as renderList, a9 as ref, eb as PassphraseTimeoutDuration, ec as DefaultPassphraseTimeout, aA as watch, b5 as nextTick, ar as isRef, aq as withModifiers, c0 as toRef, aO as createTextVNode } from "./index-73GArslZ.js";
import { u as useDialogVisibility, _ as _sfc_main$3 } from "./DialogBase.vue_vue_type_style_index_0_lang-BJGYcuJm.js";
import { I as InputFocusMixin } from "./InputFocusMixin-CmEfEypi.js";
import { r as relativeTime } from "./relativeTime-8MZMp0Re.js";
import { A as AccountSettingsOption } from "./Option-DNliqlst.js";
import { _ as _sfc_main$4 } from "./WalletAccount.vue_vue_type_style_index_0_lang-DjfimqnM.js";
const _sfc_main$2 = defineComponent({
  inheritAttrs: false,
  mixins: [InputFocusMixin, TranslationMixin],
  props: {
    modelValue: {
      type: String,
      default: ""
    }
  },
  emits: ["update:modelValue"],
  data() {
    return {
      hidden: true
    };
  },
  computed: {
    query: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit("update:modelValue", value);
      }
    },
    icon() {
      return this.hidden ? "basic-eye-no-24" : "basic-filterlist-24";
    },
    type() {
      return this.hidden ? "password" : "text";
    }
  },
  methods: {
    togglePasswordVisibility() {
      this.hidden = !this.hidden;
    },
    reset() {
      this.hidden = true;
    }
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_s_icon = resolveComponent("s-icon");
  const _component_s_input = resolveComponent("s-input");
  const _directive_button = resolveDirective("button");
  return openBlock(), createBlock(_component_s_input, mergeProps({
    ref: "input",
    modelValue: _ctx.query,
    "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => _ctx.query = $event),
    type: _ctx.type,
    placeholder: _ctx.t("desktop.password.placeholder")
  }, _ctx.$attrs), {
    suffix: withCtx(() => [
      withDirectives(createVNode(_component_s_icon, {
        name: _ctx.icon,
        class: "eye-icon",
        size: "18",
        onClick: _ctx.togglePasswordVisibility
      }, null, 8, ["name", "onClick"]), [
        [_directive_button]
      ])
    ]),
    _: 1
  }, 16, ["modelValue", "type", "placeholder"]);
}
const PasswordInput = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render]]);
const _hoisted_1 = {
  key: 0,
  class: "save-password-duration"
};
const _hoisted_2 = {
  key: 0,
  class: "save-password-duration-saved"
};
const _hoisted_3 = { class: "save-password-duration-title" };
const _hoisted_4 = { class: "save-password-duration-title" };
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "SignatureOption",
  props: {
    withHint: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false }
  },
  setup(__props, { expose: __expose }) {
    dayjs.extend(relativeTime);
    const store = requireLegacyStore();
    const { t, dayjsLocale } = useTranslation();
    const durations = PassphraseTimeout;
    const timestamp = ref(null);
    const timer = ref(null);
    const updateTimestamp = () => {
      timestamp.value = Date.now();
    };
    const resetTimer = () => {
      if (timer.value) {
        clearInterval(timer.value);
      }
      timer.value = null;
      timestamp.value = null;
    };
    const createTimer = () => {
      resetTimer();
      updateTimestamp();
      timer.value = setInterval(updateTimestamp, 1e3);
    };
    onMounted(() => {
      createTimer();
    });
    onUnmounted(() => {
      resetTimer();
    });
    const model = computed({
      get: () => store.state.wallet.transactions.isSignTxDialogDisabled,
      set: (value) => {
        store.commit.wallet.transactions.setSignTxDialogDisabled(value);
        if (!value) {
          store.dispatch.wallet.account.resetAccountPassphrase(store.state.wallet.account.address);
        }
      }
    });
    const passwordTimeoutModel = computed({
      get: () => {
        const currentTimeout = store.state.wallet.account.accountPasswordTimeout;
        const key = Object.keys(PassphraseTimeoutDuration).find(
          (durationKey) => PassphraseTimeoutDuration[durationKey] === currentTimeout
        );
        return key ?? PassphraseTimeout.FIFTEEN_MINUTES;
      },
      set: (name) => {
        const duration = PassphraseTimeoutDuration[name] ?? DefaultPassphraseTimeout;
        store.commit.wallet.account.setPasswordTimeout(duration);
      }
    });
    const passwordResetDate = computed(() => {
      const accountTimestamp = store.state.wallet.account.accountPasswordTimestamp[store.state.wallet.account.address];
      if (!accountTimestamp || !timestamp.value) {
        return null;
      }
      const diff = accountTimestamp + store.state.wallet.account.accountPasswordTimeout - timestamp.value;
      return dayjs.duration(diff).locale(dayjsLocale.value).humanize();
    });
    __expose({
      model,
      passwordTimeoutModel,
      durations
    });
    return (_ctx, _cache) => {
      const _component_s_tab = resolveComponent("s-tab");
      const _component_s_tabs = resolveComponent("s-tabs");
      return openBlock(), createBlock(AccountSettingsOption, {
        modelValue: model.value,
        "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => model.value = $event),
        disabled: __props.disabled,
        title: unref(t)("accountSettings.signature.title"),
        hint: unref(t)("accountSettings.hint"),
        "with-hint": __props.withHint
      }, {
        default: withCtx(() => [
          renderSlot(_ctx.$slots, "default", {}, void 0, true),
          __props.disabled || model.value ? (openBlock(), createElementBlock("div", _hoisted_1, [
            passwordResetDate.value ? (openBlock(), createElementBlock("div", _hoisted_2, [
              createBaseVNode("span", _hoisted_3, toDisplayString(unref(t)("accountSettings.disabled")) + ":", 1),
              createBaseVNode("span", null, toDisplayString(passwordResetDate.value), 1)
            ])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
              createBaseVNode("span", _hoisted_4, toDisplayString(unref(t)("accountSettings.disable")) + ":", 1),
              createVNode(_component_s_tabs, {
                modelValue: passwordTimeoutModel.value,
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => passwordTimeoutModel.value = $event),
                type: "rounded",
                class: "save-password-durations"
              }, {
                default: withCtx(() => [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(unref(durations), (duration) => {
                    return openBlock(), createBlock(_component_s_tab, {
                      key: duration,
                      label: duration,
                      name: duration,
                      disabled: __props.disabled
                    }, null, 8, ["label", "name", "disabled"]);
                  }), 128))
                ]),
                _: 1
              }, 8, ["modelValue"])
            ], 64))
          ])) : createCommentVNode("", true)
        ]),
        _: 3
      }, 8, ["modelValue", "disabled", "title", "hint", "with-hint"]);
    };
  }
});
const AccountSignatureOption = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-fa0dc2aa"]]);
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ConfirmDialog",
  props: {
    visible: { type: Boolean, default: false },
    account: { default: null },
    loading: { type: Boolean, default: false },
    withTimeout: { type: Boolean, default: false },
    passphrase: { default: "" },
    confirmButtonText: { default: "" }
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
    const account = toRef(props, "account");
    const loading = toRef(props, "loading");
    const withTimeout = toRef(props, "withTimeout");
    const confirmButtonText = toRef(props, "confirmButtonText");
    const passphrase = toRef(props, "passphrase");
    const passwordModel = ref("");
    const passwordInput = ref(null);
    const password = computed({
      get: () => passphrase.value || passwordModel.value,
      set: (value) => {
        passwordModel.value = value;
      }
    });
    const confirmText = computed(() => confirmButtonText.value || t("confirmText"));
    const isConfirmDisabled = computed(() => loading.value || !password.value);
    watch(isVisible, async (visible) => {
      if (!visible) {
        passwordModel.value = "";
        passwordInput.value?.reset?.();
        return;
      }
      await nextTick();
      passwordInput.value?.focus?.();
    });
    const handleConfirm = () => {
      emit("confirm", password.value);
    };
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      const _component_s_form = resolveComponent("s-form");
      return openBlock(), createBlock(_sfc_main$3, {
        visible: unref(isVisible),
        "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => isRef(isVisible) ? isVisible.value = $event : null),
        title: unref(t)("desktop.dialog.confirmTitle"),
        class: "confirm-dialog",
        "append-to-body": ""
      }, {
        default: withCtx(() => [
          createVNode(_component_s_form, {
            class: "confirm-dialog__form",
            onSubmit: withModifiers(handleConfirm, ["prevent"])
          }, {
            default: withCtx(() => [
              createVNode(_sfc_main$4, { "polkadot-account": account.value }, null, 8, ["polkadot-account"]),
              !passphrase.value ? (openBlock(), createBlock(PasswordInput, {
                key: 0,
                ref_key: "passwordInput",
                ref: passwordInput,
                modelValue: password.value,
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => password.value = $event),
                disabled: loading.value,
                autofocus: ""
              }, null, 8, ["modelValue", "disabled"])) : createCommentVNode("", true),
              withTimeout.value ? (openBlock(), createBlock(AccountSignatureOption, {
                key: 1,
                "with-hint": ""
              })) : createCommentVNode("", true),
              createVNode(_component_s_button, {
                type: "primary",
                "native-type": "submit",
                class: "confirm-dialog__button",
                disabled: isConfirmDisabled.value,
                loading: loading.value
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(confirmText.value), 1)
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
const AccountConfirmDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-61a8fa26"]]);
export {
  AccountConfirmDialog as A,
  PasswordInput as P,
  AccountSignatureOption as a
};
