import { z as defineComponent, ak as lazyComponent, aZ as components, u as useTranslation, aA as watch, a4 as onMounted, aB as onBeforeUnmount, a9 as ref, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, aj as unref, a$ as MOONPAY_WIDGET_ORIGINS, h as computed, al as Components, b0 as getCssVariableValue, b1 as resolveLibraryTheme, s as store } from "./index-73GArslZ.js";
import { M as MoonpayNotifications } from "./consts-Cuk5ZfDH.js";
import { _ as _sfc_main$1 } from "./Moonpay.vue_vue_type_script_setup_true_lang-B8HGD9Zz.js";
import { u as useMoonpayBridge } from "./useMoonpayBridge-ejSkElaC.js";
import "./useBridgeHistory-BfHU-41q.js";
import "./index-FPtsBGoq.js";
import "./useWeb3Connection-eheLMuCm.js";
import "./useWalletConnect-CJNIxFYX.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      DialogBase: components.DialogBase,
      MoonpayLogo: _sfc_main$1,
      IFrameWidget: lazyComponent(Components.IFrameWidget)
    }
  },
  __name: "Moonpay",
  setup(__props, { expose: __expose }) {
    const widgetUrl = ref("");
    const transactionsPolling = ref(null);
    const {
      internalWallet,
      moonpayApi,
      withApi,
      initMoonpayApi,
      showNotification,
      prepareMoonpayTxForBridgeTransfer,
      setDialogVisibility,
      createTransactionsPolling
    } = useMoonpayBridge();
    const { language } = useTranslation();
    const transactions = computed(() => store.state.moonpay.transactions);
    const pollingTimestamp = computed(() => store.state.moonpay.pollingTimestamp);
    const libraryTheme = computed(() => resolveLibraryTheme(store));
    const account = computed(() => store.getters.wallet.account.account);
    const visibility = computed({
      get: () => Boolean(store.state.moonpay.dialogVisibility),
      set: (flag) => setDialogVisibility(flag)
    });
    const lastCompletedTransaction = computed(() => {
      if (!pollingTimestamp.value) return void 0;
      return transactions.value.find(
        (item) => Date.parse(item.createdAt) >= pollingTimestamp.value && item.status === "completed"
      );
    });
    const createMoonpayWidgetUrl = () => {
      const currentAccount = account.value;
      if (!currentAccount) return "";
      return moonpayApi.value.createWidgetUrl({
        colorCode: getCssVariableValue("--s-color-theme-accent"),
        externalTransactionId: currentAccount.address,
        language: language.value
      });
    };
    const updateWidgetUrl = () => {
      widgetUrl.value = "";
      const url = createMoonpayWidgetUrl();
      setTimeout(() => {
        widgetUrl.value = url;
      });
    };
    const startPollingMoonpay = async () => {
      console.info("Moonpay: start polling to get user transactions");
      transactionsPolling.value = await createTransactionsPolling();
    };
    const stopPollingMoonpay = () => {
      console.info("Moonpay: stop polling");
      transactionsPolling.value?.();
      transactionsPolling.value = null;
    };
    const prepareBridgeForTransfer = async (transaction) => {
      setDialogVisibility(false);
      stopPollingMoonpay();
      updateWidgetUrl();
      await showNotification(MoonpayNotifications.Success);
      await prepareMoonpayTxForBridgeTransfer(transaction, true);
    };
    watch(
      () => internalWallet.isLoggedIn.value,
      (isLoggedIn) => {
        if (!isLoggedIn) stopPollingMoonpay();
      },
      { immediate: true }
    );
    watch(
      visibility,
      (isVisible) => {
        if (isVisible && !pollingTimestamp.value) {
          void startPollingMoonpay();
        }
      },
      { immediate: true }
    );
    watch([language, libraryTheme], () => {
      if (!pollingTimestamp.value) {
        updateWidgetUrl();
      }
    });
    watch(lastCompletedTransaction, async (transaction, previous) => {
      if (!transaction || previous && previous.id === transaction.id) return;
      await prepareBridgeForTransfer(transaction);
    });
    onMounted(() => {
      void withApi(async () => {
        initMoonpayApi();
        updateWidgetUrl();
      });
    });
    onBeforeUnmount(() => {
      stopPollingMoonpay();
    });
    __expose({
      widgetUrl
    });
    return (_ctx, _cache) => {
      const _component_i_frame_widget = resolveComponent("i-frame-widget");
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: visibility.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => visibility.value = $event),
        class: "moonpay-dialog"
      }, {
        title: withCtx(() => [
          createVNode(_sfc_main$1, { theme: libraryTheme.value }, null, 8, ["theme"])
        ]),
        default: withCtx(() => [
          createVNode(_component_i_frame_widget, {
            src: widgetUrl.value,
            "allowed-origins": unref(MOONPAY_WIDGET_ORIGINS)
          }, null, 8, ["src", "allowed-origins"])
        ]),
        _: 1
      }, 8, ["visible"]);
    };
  }
});
export {
  _sfc_main as default
};
