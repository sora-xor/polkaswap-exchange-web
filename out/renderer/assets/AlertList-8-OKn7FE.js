import { z as defineComponent, aZ as components, u as useTranslation, c3 as useNotification, s as store, a4 as onMounted, h as computed, a9 as ref, aA as watch, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, C as openBlock, am as createBlock, aM as createCommentVNode, D as createBaseVNode, ao as withCtx, bQ as Fragment, bP as renderList, bA as withDirectives, ap as createVNode, aN as toDisplayString, aj as unref, cn as reactive, F as FPNumber, Z as ZeroStringValue, bq as calcPriceChange, d9 as toPrecision, cD as showMostFittingValue, aI as WALLET_CONSTS, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "alerts-list" };
const _hoisted_2 = { class: "condition" };
const _hoisted_3 = { class: "current-price" };
const _hoisted_4 = { class: "alerts-list__type" };
const _hoisted_5 = ["onClick"];
const _hoisted_6 = ["onClick"];
const _hoisted_7 = {
  key: 1,
  class: "settings-alert-section"
};
const _hoisted_8 = { class: "create" };
const _hoisted_9 = { class: "settings-alert-section" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      AccountCard: components.AccountCard,
      TokenLogo: components.TokenLogo
    }
  },
  __name: "AlertList",
  emits: ["create", "edit-alert"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const { t } = useTranslation();
    const { showAppNotification } = useNotification();
    const alerts = computed(() => store.state.wallet.settings.alerts ?? []);
    const allowTopUpAlert = computed(() => Boolean(store.state.wallet.settings.allowTopUpAlert));
    const isBrowserNotificationApiAvailable = computed(() => store.state.settings.isBrowserNotificationApiAvailable);
    const whitelistIdsBySymbol = computed(() => store.getters.wallet.account.whitelistIdsBySymbol);
    const getAsset = store.getters.assets.assetDataByAddress;
    const loading = ref(false);
    const scrollKey = ref(0);
    const topUpNotifs = ref(null);
    const alertMenuRefs = reactive({});
    const showCreateAlertBtn = computed(() => alerts.value.length < WALLET_CONSTS.MAX_ALERTS_NUMBER);
    function setAlertMenuRef(el, index) {
      if (el) {
        alertMenuRefs[index] = el;
      } else {
        delete alertMenuRefs[index];
      }
    }
    function isNotificationsEnabledByUser() {
      if (!isBrowserNotificationApiAvailable.value) {
        showAppNotification(t("alerts.noSupportMsg"), "error");
        return false;
      }
      switch (Notification.permission) {
        case "denied":
          store.commit.settings.setBrowserNotifsPopupBlocked(true);
          return false;
        case "default":
          store.commit.settings.setBrowserNotifsPopupEnabled(true);
          return false;
        default:
          return true;
      }
    }
    function getDescription(alert) {
      return alert.type === "drop" ? t("alerts.onDropDesc", { token: alert.token, price: `$${alert.price}` }) : t("alerts.onRaiseDesc", { token: alert.token, price: `$${alert.price}` });
    }
    function getInfo(alert) {
      const desiredPrice = new FPNumber(alert.price);
      const asset = getAsset(whitelistIdsBySymbol.value[alert.token]);
      const currentPrice = FPNumber.fromCodecValue(getAssetFiatPrice(asset) ?? ZeroStringValue);
      const priceChange = calcPriceChange(desiredPrice, currentPrice);
      const priceChangeFormatted = toPrecision(priceChange, 2).toString();
      const currentPriceFormatted = showMostFittingValue(currentPrice);
      return `${priceChangeFormatted}% · ${t("alerts.currentPrice")}: $${currentPriceFormatted}`;
    }
    function getType(alert) {
      return alert.once ? t("alerts.once") : t("alerts.always");
    }
    function closeAlertMenu(index) {
      alertMenuRefs[index]?.doClose?.();
    }
    function forceScrollUpdate() {
      scrollKey.value += 1;
    }
    function handleCreateAlert() {
      if (!isNotificationsEnabledByUser()) return;
      emit("create");
    }
    function handleDeleteAlert(position) {
      store.commit.wallet.settings.removePriceAlert(position);
      closeAlertMenu(position);
      forceScrollUpdate();
    }
    function handleEditAlert(alert, position) {
      emit("edit-alert", { ...alert, position });
      closeAlertMenu(position);
    }
    function handleTopUpNotifs(value) {
      isNotificationsEnabledByUser();
      store.commit.wallet.settings.setDepositNotifications(value);
    }
    function getAssetFiatPrice(asset) {
      if (!asset) return null;
      return store.state.wallet.account.fiatPriceObject?.[asset.address] ?? null;
    }
    onMounted(() => {
      if (Notification.permission !== "granted") {
        store.commit.wallet.settings.setDepositNotifications(false);
      }
      topUpNotifs.value = allowTopUpAlert.value;
    });
    watch(
      allowTopUpAlert,
      (value) => {
        topUpNotifs.value = value;
      },
      { immediate: false }
    );
    return (_ctx, _cache) => {
      const _component_token_logo = resolveComponent("token-logo");
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_popover_panel = resolveComponent("s-popover-panel");
      const _component_account_card = resolveComponent("account-card");
      const _component_s_scrollbar = resolveComponent("s-scrollbar");
      const _component_s_divider = resolveComponent("s-divider");
      const _component_s_button = resolveComponent("s-button");
      const _component_s_switch = resolveComponent("s-switch");
      const _directive_button = resolveDirective("button");
      return openBlock(), createElementBlock("div", null, [
        (openBlock(), createBlock(_component_s_scrollbar, {
          class: "alerts-list-scrollbar",
          key: scrollKey.value
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_1, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(alerts.value, (alert, index) => {
                return withDirectives((openBlock(), createBlock(_component_account_card, {
                  key: index,
                  class: "alerts-list__item"
                }, {
                  avatar: withCtx(() => [
                    createVNode(_component_token_logo, {
                      "token-symbol": alert.token
                    }, null, 8, ["token-symbol"])
                  ]),
                  name: withCtx(() => [
                    createBaseVNode("span", _hoisted_2, toDisplayString(getDescription(alert)), 1)
                  ]),
                  description: withCtx(() => [
                    createBaseVNode("span", _hoisted_3, toDisplayString(getInfo(alert)), 1)
                  ]),
                  default: withCtx(() => [
                    createBaseVNode("div", _hoisted_4, toDisplayString(getType(alert)), 1),
                    createVNode(_component_s_popover_panel, {
                      ref_for: true,
                      ref: (el) => setAlertMenuRef(el, index),
                      "popper-class": "settings-alert-popover",
                      trigger: "click",
                      "visible-arrow": false
                    }, {
                      reference: withCtx(() => [
                        createVNode(_component_s_icon, {
                          class: "options-icon",
                          name: "basic-more-vertical-24"
                        })
                      ]),
                      default: withCtx(() => [
                        withDirectives((openBlock(), createElementBlock("div", {
                          class: "settings-alert-option",
                          onClick: ($event) => handleEditAlert(alert, index)
                        }, [
                          createVNode(_component_s_icon, { name: "el-icon-edit" }),
                          createBaseVNode("span", null, toDisplayString(unref(t)("alerts.edit")), 1)
                        ], 8, _hoisted_5)), [
                          [_directive_button]
                        ]),
                        withDirectives((openBlock(), createElementBlock("div", {
                          class: "settings-alert-option",
                          onClick: ($event) => handleDeleteAlert(index)
                        }, [
                          createVNode(_component_s_icon, { name: "el-icon-delete" }),
                          createBaseVNode("span", null, toDisplayString(unref(t)("alerts.delete")), 1)
                        ], 8, _hoisted_6)), [
                          [_directive_button]
                        ])
                      ]),
                      _: 2
                    }, 1536)
                  ]),
                  _: 2
                }, 1024)), [
                  [_directive_button]
                ]);
              }), 128))
            ])
          ]),
          _: 1
        })),
        alerts.value.length ? (openBlock(), createBlock(_component_s_divider, { key: 0 })) : createCommentVNode("", true),
        showCreateAlertBtn.value ? (openBlock(), createElementBlock("div", _hoisted_7, [
          createVNode(_component_s_button, {
            class: "el-dialog__close",
            type: "action",
            icon: "plus-16",
            onClick: handleCreateAlert,
            disabled: loading.value
          }, null, 8, ["disabled"]),
          createBaseVNode("span", _hoisted_8, toDisplayString(unref(t)("alerts.createBtn")), 1)
        ])) : createCommentVNode("", true),
        createBaseVNode("div", _hoisted_9, [
          createVNode(_component_s_switch, {
            modelValue: topUpNotifs.value,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => topUpNotifs.value = $event),
            disabled: loading.value,
            onChange: handleTopUpNotifs
          }, null, 8, ["modelValue", "disabled"]),
          createBaseVNode("span", null, toDisplayString(unref(t)("alerts.enableSwitch")), 1)
        ])
      ]);
    };
  }
});
const AlertList = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-fdb2c4de"]]);
export {
  AlertList as default
};
