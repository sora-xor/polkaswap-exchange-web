import { z as defineComponent, aZ as components, ak as lazyComponent, u as useTranslation, a4 as onMounted, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, C as openBlock, ap as createVNode, h as computed, bQ as Fragment, D as createBaseVNode, bA as withDirectives, am as createBlock, aM as createCommentVNode, aN as toDisplayString, aj as unref, bb as normalizeClass, bP as renderList, aO as createTextVNode, aI as WALLET_CONSTS, a9 as ref, a$ as MOONPAY_WIDGET_ORIGINS, ao as withCtx, al as Components, s as store, b1 as resolveLibraryTheme, dc as MoonpayTransactionStatus, dd as buildMoonpayTransactionDetailsUrl, b0 as getCssVariableValue, aP as _export_sfc } from "./index-73GArslZ.js";
import { _ as _sfc_main$1 } from "./Moonpay.vue_vue_type_script_setup_true_lang-B8HGD9Zz.js";
import { u as useMoonpayBridge } from "./useMoonpayBridge-ejSkElaC.js";
import "./consts-Cuk5ZfDH.js";
import "./useBridgeHistory-BfHU-41q.js";
import "./index-FPtsBGoq.js";
import "./useWeb3Connection-eheLMuCm.js";
import "./useWalletConnect-CJNIxFYX.js";
const _hoisted_1 = { class: "moonpay-history" };
const _hoisted_2 = { class: "moonpay-history-title" };
const _hoisted_3 = ["onClick"];
const _hoisted_4 = { class: "moonpay-history-item-data" };
const _hoisted_5 = { class: "moonpay-history-item__date" };
const _hoisted_6 = { class: "moonpay-history-item__amount" };
const _hoisted_7 = { class: "moonpay-history-item__wallet-address" };
const _hoisted_8 = { key: 0 };
const HistoryView = "history";
const DetailsView = "details";
const pageAmount = 5;
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      MoonpayLogo: _sfc_main$1,
      FormattedAmount: components.FormattedAmount,
      GenericPageHeader: lazyComponent(Components.GenericPageHeader),
      IFrameWidget: lazyComponent(Components.IFrameWidget),
      HistoryPagination: components.HistoryPagination
    }
  },
  __name: "MoonpayHistory",
  setup(__props) {
    const FontSizeRate = WALLET_CONSTS.FontSizeRate;
    const { t, language, formatDate } = useTranslation();
    const {
      loading,
      withApi,
      initMoonpayApi,
      prepareEvmNetwork,
      showHistory,
      prepareMoonpayTxForBridgeTransfer,
      getBridgeHistoryItemByMoonpayId,
      walletConnect
    } = useMoonpayBridge();
    const transactions = computed(() => store.state.moonpay.transactions);
    const currencies = computed(() => store.state.moonpay.currencies);
    const isValidNetwork = computed(() => Boolean(store.getters.web3.isValidNetwork));
    const libraryTheme = computed(() => resolveLibraryTheme(store));
    const currentPage = ref(1);
    const currentView = ref(HistoryView);
    const selectedItem = ref({});
    const total = computed(() => transactions.value.length);
    const lastPage = computed(() => total.value ? Math.ceil(total.value / pageAmount) : 1);
    const startIndex = computed(() => (currentPage.value - 1) * pageAmount);
    const lastIndex = computed(() => currentPage.value * pageAmount);
    const currenciesById = computed(
      () => currencies.value.reduce((result, item) => ({ ...result, [item.id]: item }), {})
    );
    const historyItems = computed(() => transactions.value.slice(startIndex.value, lastIndex.value));
    const formattedItems = computed(() => {
      const formatCurrencyName = (id) => (currenciesById.value[id]?.code ?? "").toUpperCase();
      const formatCurrencyAmount = (amount) => Number.isFinite(amount) ? String(amount) : amount;
      const iconStatus = (status) => {
        if (status === MoonpayTransactionStatus.Completed) return "basic-check-mark-24";
        if (status === MoonpayTransactionStatus.Failed) return "basic-clear-X-24";
        return "basic-more-horizontal-24";
      };
      return historyItems.value.map((item) => ({
        ...item,
        formatted: {
          fiat: formatCurrencyName(item.baseCurrencyId),
          fiatAmount: formatCurrencyAmount(item.baseCurrencyAmount),
          crypto: formatCurrencyName(item.currencyId),
          cryptoAmount: formatCurrencyAmount(item.quoteCurrencyAmount),
          date: formatDate(new Date(item.updatedAt).getTime()),
          icon: iconStatus(item.status)
        }
      }));
    });
    const detailsWidgetUrl = computed(() => {
      const item = selectedItem.value;
      const transactionId = typeof item?.id === "string" ? item.id : "";
      const returnUrl = typeof item?.returnUrl === "string" ? item.returnUrl : "";
      return buildMoonpayTransactionDetailsUrl({
        returnUrl,
        transactionId,
        language: language.value,
        colorCode: getCssVariableValue("--s-color-theme-accent")
      });
    });
    const bridgeTxToSora = computed(() => {
      const itemId = selectedItem.value?.id;
      if (!itemId) return void 0;
      return getBridgeHistoryItemByMoonpayId(itemId);
    });
    const evmAddress = computed(() => walletConnect.evmAddress.value?.toLowerCase?.() ?? "");
    const isCompletedTransaction = computed(() => selectedItem.value?.status === MoonpayTransactionStatus.Completed);
    const externalAccountIsMoonpayRecipient = computed(() => {
      const walletAddress = selectedItem.value?.walletAddress?.toLowerCase?.();
      return walletAddress ? walletAddress === evmAddress.value : false;
    });
    const actionButtonType = computed(() => bridgeTxToSora.value ? "secondary" : "primary");
    const actionButtonDisabled = computed(() => !externalAccountIsMoonpayRecipient.value);
    const actionButtonText = computed(() => {
      if (!evmAddress.value) return t("connectWalletText");
      if (bridgeTxToSora.value) return t("moonpay.buttons.view");
      if (!externalAccountIsMoonpayRecipient.value) return t("changeAccountText");
      if (!isValidNetwork.value) return t("changeNetworkText");
      return t("moonpay.buttons.transfer");
    });
    const isHistoryView = computed(() => currentView.value === HistoryView);
    const emptyHistory = computed(() => !transactions.value.length);
    const changeView = (view) => {
      currentView.value = view;
    };
    const handlePaginationClick = (button) => {
      let nextPage = currentPage.value;
      switch (button) {
        case WALLET_CONSTS.PaginationButton.Prev:
          nextPage = currentPage.value - 1;
          break;
        case WALLET_CONSTS.PaginationButton.Next:
          nextPage = currentPage.value + 1;
          break;
        case WALLET_CONSTS.PaginationButton.Last:
          nextPage = lastPage.value;
          break;
      }
      currentPage.value = nextPage;
    };
    const navigateToDetails = (item) => {
      selectedItem.value = item;
      changeView(DetailsView);
    };
    const handleTransaction = async () => {
      const item = selectedItem.value;
      if (!item?.id) return;
      if (!isValidNetwork.value) {
        walletConnect.changeEvmNetworkProvided();
        return;
      }
      if (bridgeTxToSora.value?.id) {
        await prepareEvmNetwork();
        await showHistory(bridgeTxToSora.value.id);
        return;
      }
      await prepareMoonpayTxForBridgeTransfer(item);
    };
    const loadMoonpayData = async () => {
      await withApi(async () => {
        initMoonpayApi();
        await prepareEvmNetwork();
        await Promise.all([store.dispatch.moonpay.getTransactions(), store.dispatch.moonpay.getCurrencies()]);
      });
    };
    onMounted(() => {
      void loadMoonpayData();
    });
    return (_ctx, _cache) => {
      const _component_formatted_amount = resolveComponent("formatted-amount");
      const _component_s_icon = resolveComponent("s-icon");
      const _component_history_pagination = resolveComponent("history-pagination");
      const _component_i_frame_widget = resolveComponent("i-frame-widget");
      const _component_s_button = resolveComponent("s-button");
      const _directive_button = resolveDirective("button");
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_sfc_main$1, { theme: libraryTheme.value }, null, 8, ["theme"]),
        isHistoryView.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
          createBaseVNode("div", _hoisted_2, toDisplayString(unref(t)("moonpay.history.title")), 1),
          withDirectives((openBlock(), createElementBlock("div", {
            class: normalizeClass(["moonpay-history-list", { empty: emptyHistory.value }])
          }, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(formattedItems.value, (item) => {
              return withDirectives((openBlock(), createElementBlock("div", {
                key: item.id,
                class: "moonpay-history-item",
                tabindex: "0",
                onClick: ($event) => navigateToDetails(item)
              }, [
                createBaseVNode("div", _hoisted_4, [
                  createBaseVNode("div", _hoisted_5, toDisplayString(item.formatted.date), 1),
                  createBaseVNode("div", _hoisted_6, [
                    item.formatted.cryptoAmount ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                      createVNode(_component_formatted_amount, {
                        class: "moonpay-history-item-amount",
                        "value-can-be-hidden": "",
                        value: item.formatted.cryptoAmount,
                        "font-size-rate": unref(FontSizeRate).MEDIUM,
                        "asset-symbol": item.formatted.crypto
                      }, null, 8, ["value", "font-size-rate", "asset-symbol"]),
                      _cache[0] || (_cache[0] = createBaseVNode("i", { class: "network-icon network-icon--ethereum" }, null, -1)),
                      _cache[1] || (_cache[1] = createTextVNode("  ", -1)),
                      createBaseVNode("span", null, toDisplayString(unref(t)("forText")), 1),
                      _cache[2] || (_cache[2] = createTextVNode("   ", -1))
                    ], 64)) : createCommentVNode("", true),
                    createVNode(_component_formatted_amount, {
                      class: "moonpay-history-item-amount",
                      "value-can-be-hidden": "",
                      value: item.formatted.fiatAmount,
                      "font-size-rate": unref(FontSizeRate).MEDIUM,
                      "asset-symbol": item.formatted.fiat
                    }, null, 8, ["value", "font-size-rate", "asset-symbol"])
                  ]),
                  createBaseVNode("div", _hoisted_7, toDisplayString(item.walletAddress), 1)
                ]),
                createVNode(_component_s_icon, {
                  class: normalizeClass(["moonpay-history-item-icon", item.status]),
                  name: item.formatted.icon,
                  size: "14"
                }, null, 8, ["class", "name"])
              ], 8, _hoisted_3)), [
                [_directive_button]
              ]);
            }), 128)),
            emptyHistory.value ? (openBlock(), createElementBlock("span", _hoisted_8, toDisplayString(unref(t)("moonpay.history.empty")), 1)) : createCommentVNode("", true)
          ], 2)), [
            [_directive_loading, unref(loading)]
          ]),
          !emptyHistory.value ? (openBlock(), createBlock(_component_history_pagination, {
            key: 0,
            class: "moonpay-history-pagination",
            "current-page": currentPage.value,
            "page-amount": pageAmount,
            total: total.value,
            loading: unref(loading),
            "last-page": lastPage.value,
            onPaginationClick: handlePaginationClick
          }, null, 8, ["current-page", "total", "loading", "last-page"])) : createCommentVNode("", true)
        ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
          createVNode(_component_i_frame_widget, {
            src: detailsWidgetUrl.value,
            "allowed-origins": unref(MOONPAY_WIDGET_ORIGINS)
          }, null, 8, ["src", "allowed-origins"]),
          isCompletedTransaction.value ? (openBlock(), createBlock(_component_s_button, {
            key: 0,
            type: actionButtonType.value,
            disabled: actionButtonDisabled.value,
            loading: unref(loading),
            class: "moonpay-details-button s-typography-button--big",
            onClick: handleTransaction
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(actionButtonText.value), 1)
            ]),
            _: 1
          }, 8, ["type", "disabled", "loading"])) : createCommentVNode("", true)
        ], 64))
      ]);
    };
  }
});
const MoonpayHistory = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-f98bef93"]]);
export {
  MoonpayHistory as default
};
