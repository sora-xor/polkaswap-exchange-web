import { z as defineComponent, ak as lazyComponent, u as useTranslation, U as useLoading, G as useInternalConnect, a9 as ref, a_ as resolveComponent, bz as resolveDirective, bA as withDirectives, aj as unref, A as createElementBlock, C as openBlock, ap as createVNode, am as createBlock, aM as createCommentVNode, ao as withCtx, aO as createTextVNode, aN as toDisplayString, bL as resolveDynamicComponent, al as Components, bG as goTo, V as PageNames } from "./index-73GArslZ.js";
import { F as FiatOptionTabs } from "./tabs-xjDSPYBb.js";
const _hoisted_1 = { class: "container transaction-fiat-history" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      GenericPageHeader: lazyComponent(Components.GenericPageHeader),
      MoonpayHistory: lazyComponent(Components.MoonpayHistory)
    }
  },
  __name: "DepositTxHistory",
  setup(__props) {
    const { t } = useTranslation();
    const { loading } = useLoading();
    const { connectSoraWallet, isLoggedIn } = useInternalConnect();
    const parentLoading = loading;
    const currentTab = ref(FiatOptionTabs.moonpay);
    const navigateToDepositOptions = () => {
      goTo(PageNames.DepositOptions);
    };
    return (_ctx, _cache) => {
      const _component_generic_page_header = resolveComponent("generic-page-header");
      const _component_s_button = resolveComponent("s-button");
      const _directive_loading = resolveDirective("loading");
      return withDirectives((openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_generic_page_header, {
          class: "page-header-title--moonpay-history",
          onBack: navigateToDepositOptions,
          "has-button-back": ""
        }, {
          title: withCtx(() => [
            createTextVNode(toDisplayString(unref(t)("fiatPayment.historyTitle")), 1)
          ]),
          _: 1
        }),
        (openBlock(), createBlock(resolveDynamicComponent(currentTab.value))),
        !unref(isLoggedIn) ? (openBlock(), createBlock(_component_s_button, {
          key: 0,
          class: "go-wallet-btn",
          type: "primary",
          onClick: unref(connectSoraWallet)
        }, {
          default: withCtx(() => [
            createTextVNode(toDisplayString(unref(t)("connectWalletText")), 1)
          ]),
          _: 1
        }, 8, ["onClick"])) : createCommentVNode("", true)
      ])), [
        [_directive_loading, unref(parentLoading)]
      ]);
    };
  }
});
export {
  _sfc_main as default
};
