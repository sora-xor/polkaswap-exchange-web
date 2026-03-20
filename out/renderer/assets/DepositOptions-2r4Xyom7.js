import { _ as _sfc_main$2 } from "./CedeStore.vue_vue_type_script_setup_true_lang-OuBazZos.js";
import { _ as _sfc_main$1 } from "./Moonpay.vue_vue_type_script_setup_true_lang-B8HGD9Zz.js";
import { z as defineComponent, ak as lazyComponent, al as Components, u as useTranslation, G as useInternalConnect, s as store, aB as onBeforeUnmount, a_ as resolveComponent, A as createElementBlock, C as openBlock, D as createBaseVNode, aM as createCommentVNode, ap as createVNode, h as computed, aN as toDisplayString, aj as unref, ao as withCtx, aO as createTextVNode, cw as TranslationConsts, bb as normalizeClass, bQ as Fragment, a9 as ref, b1 as resolveLibraryTheme, bG as goTo, V as PageNames, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useWeb3Connection } from "./useWeb3Connection-eheLMuCm.js";
import "./useWalletConnect-CJNIxFYX.js";
import "./index-FPtsBGoq.js";
const _hoisted_1 = { class: "container" };
const _hoisted_2 = { class: "pay-options" };
const _hoisted_3 = { class: "pay-options__option pay-options-moonpay" };
const _hoisted_4 = { class: "pay-options__option pay-options-cede" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "DepositOptions",
  setup(__props) {
    const Moonpay = lazyComponent(Components.Moonpay);
    const MoonpayNotification = lazyComponent(Components.MoonpayNotification);
    const MoonpayConfirmation = lazyComponent(Components.MoonpayConfirmation);
    const PaymentError = lazyComponent(Components.PaymentErrorDialog);
    const SelectProviderDialog = lazyComponent(Components.SelectProviderDialog);
    const showErrorInfoBanner = ref(false);
    const { t } = useTranslation();
    const { isLoggedIn, connectSoraWallet } = useInternalConnect();
    const { connectEvmWallet, evmAddress, disconnectExternalNetwork } = useWeb3Connection();
    const libraryTheme = computed(() => resolveLibraryTheme(store));
    const moonpayEnabled = computed(() => Boolean(store.getters.settings.moonpayEnabled));
    const startBridgeButtonVisibility = computed(() => Boolean(store.state.moonpay.startBridgeButtonVisibility));
    const bridgeTransactionData = computed(() => store.state.moonpay.bridgeTransactionData);
    const pendingTxCount = computed(() => startBridgeButtonVisibility.value && bridgeTransactionData.value ? 1 : 0);
    const hasPendingTx = computed(() => pendingTxCount.value > 0);
    const computedCounterClass = computed(() => {
      const classes = ["pay-options__purchase-count"];
      if (hasPendingTx.value) {
        classes.push("pay-options__purchase-count--pending");
      }
      return classes.join(" ");
    });
    const moonpayTextBtn = computed(() => isLoggedIn.value ? t("fiatPayment.moonpayTitle") : t("connectWalletText"));
    const cedeTextBtn = computed(
      () => isLoggedIn.value ? t("fiatPayment.cedeStoreBtn", {
        value1: TranslationConsts.CEX,
        value2: TranslationConsts.CedeStore
      }) : t("connectWalletText")
    );
    const setMoonpayVisibility = store.commit.moonpay.setDialogVisibility;
    function openDepositTxHistory() {
      goTo(PageNames.DepositTxHistory);
    }
    function openCedeWidget() {
      if (!isLoggedIn.value) {
        connectSoraWallet();
        return;
      }
      goTo(PageNames.CedeStore);
    }
    function showErrorMessage() {
      showErrorInfoBanner.value = true;
    }
    async function openMoonpayDialog() {
      if (!moonpayEnabled.value) {
        showErrorMessage();
        return;
      }
      if (!isLoggedIn.value) {
        connectSoraWallet();
        return;
      }
      if (!evmAddress.value) {
        try {
          await connectEvmWallet();
        } catch {
          return;
        }
        if (!evmAddress.value) return;
      }
      setMoonpayVisibility(true);
    }
    onBeforeUnmount(() => {
      disconnectExternalNetwork();
    });
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      const _component_s_icon = resolveComponent("s-icon");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          createBaseVNode("div", _hoisted_3, [
            createVNode(_sfc_main$1, { theme: libraryTheme.value }, null, 8, ["theme"]),
            createBaseVNode("h4", null, toDisplayString(unref(t)("fiatPayment.moonpayTitle")), 1),
            createBaseVNode("span", null, toDisplayString(unref(t)("fiatPayment.moonpayDesc")), 1),
            createVNode(_component_s_button, {
              class: "pay-options__button",
              type: "primary",
              onClick: openMoonpayDialog
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(moonpayTextBtn.value), 1)
              ]),
              _: 1
            })
          ]),
          createBaseVNode("div", _hoisted_4, [
            createVNode(_sfc_main$2, { theme: libraryTheme.value }, null, 8, ["theme"]),
            createBaseVNode("h4", null, toDisplayString(unref(t)("fiatPayment.cedeStoreTitle", { value: unref(TranslationConsts).CEX })), 1),
            createBaseVNode("span", null, toDisplayString(unref(t)("fiatPayment.cedeStoreDesc", {
              value1: unref(TranslationConsts).CEX,
              value2: unref(TranslationConsts).Polkaswap,
              value3: unref(TranslationConsts).CedeStore
            })), 1),
            createVNode(_component_s_button, {
              class: "pay-options__button",
              type: "primary",
              onClick: openCedeWidget
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(cedeTextBtn.value), 1)
              ]),
              _: 1
            })
          ]),
          unref(isLoggedIn) ? (openBlock(), createElementBlock("div", {
            key: 0,
            class: "pay-options__history-btn",
            onClick: openDepositTxHistory
          }, [
            createBaseVNode("span", null, toDisplayString(unref(t)("fiatPayment.historyBtn")), 1),
            createBaseVNode("div", null, [
              createBaseVNode("span", {
                class: normalizeClass(computedCounterClass.value)
              }, toDisplayString(pendingTxCount.value), 3),
              createVNode(_component_s_icon, {
                name: "arrows-chevron-right-rounded-24",
                size: "18"
              })
            ])
          ])) : createCommentVNode("", true)
        ]),
        moonpayEnabled.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
          createVNode(unref(Moonpay)),
          createVNode(unref(MoonpayNotification)),
          createVNode(unref(MoonpayConfirmation)),
          createVNode(unref(SelectProviderDialog))
        ], 64)) : createCommentVNode("", true),
        createVNode(unref(PaymentError), {
          visible: showErrorInfoBanner.value,
          "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => showErrorInfoBanner.value = $event)
        }, null, 8, ["visible"])
      ]);
    };
  }
});
const DepositOptions = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-4db23e7e"]]);
export {
  DepositOptions as default
};
