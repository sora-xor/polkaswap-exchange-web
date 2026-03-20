import { z as defineComponent, bD as poolLazyComponent, ak as lazyComponent, u as useTranslation, U as useLoading, aA as watch, h as computed, a4 as onMounted, X as XOR, s as store, aB as onBeforeUnmount, a_ as resolveComponent, bz as resolveDirective, bA as withDirectives, A as createElementBlock, C as openBlock, ap as createVNode, aj as unref, bE as PoolComponents, al as Components, W as router, bg as PoolPageNames } from "./index-73GArslZ.js";
import { u as useSelectedTokensRoute } from "./useSelectedTokensRoute-FZz8yy9f.js";
const _hoisted_1 = { class: "container" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      GenericPageHeader: lazyComponent(Components.GenericPageHeader),
      AddLiquidityForm: poolLazyComponent(PoolComponents.AddLiquidityForm)
    }
  },
  __name: "AddLiquidity",
  props: {
    parentLoading: { type: Boolean, default: false }
  },
  setup(__props) {
    const props = __props;
    const { t } = useTranslation();
    const { loading, withParentLoading } = useLoading({ parentLoading: () => props.parentLoading });
    const isLoggedIn = computed(() => store.getters.wallet.account.isLoggedIn);
    const firstToken = computed(() => store.getters.addLiquidity.firstToken);
    const secondToken = computed(() => store.getters.addLiquidity.secondToken);
    const setDataFromLiquidity = (params) => store.dispatch.addLiquidity.setDataFromLiquidity(params);
    const resetData = () => store.dispatch.addLiquidity.resetData();
    const { firstRouteAddress, secondRouteAddress, isValidRoute, parseCurrentRoute, updateRouteAfterSelectTokens } = useSelectedTokensRoute(async ({ firstAddress, secondAddress }) => {
      await setDataFromLiquidity({ firstAddress, secondAddress });
    });
    const containerLoading = computed(() => props.parentLoading || loading.value);
    const handleBack = () => {
      router.push({ name: PoolPageNames.Pool });
    };
    watch(isLoggedIn, (current, previous) => {
      if (previous && !current) {
        handleBack();
      }
    });
    watch([firstToken, secondToken], ([first, second]) => {
      updateRouteAfterSelectTokens(first, second);
    });
    onMounted(async () => {
      await withParentLoading(async () => {
        parseCurrentRoute();
        const firstAddress = isValidRoute.value && firstRouteAddress.value ? firstRouteAddress.value : XOR.address;
        const secondAddress = isValidRoute.value && secondRouteAddress.value ? secondRouteAddress.value : "";
        await setDataFromLiquidity({ firstAddress, secondAddress });
      });
    });
    onBeforeUnmount(() => {
      void resetData();
    });
    return (_ctx, _cache) => {
      const _component_generic_page_header = resolveComponent("generic-page-header");
      const _component_add_liquidity_form = resolveComponent("add-liquidity-form");
      const _directive_loading = resolveDirective("loading");
      return withDirectives((openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_generic_page_header, {
          "has-button-back": "",
          title: unref(t)("addLiquidity.title"),
          tooltip: unref(t)("pool.description"),
          onBack: handleBack
        }, null, 8, ["title", "tooltip"]),
        createVNode(_component_add_liquidity_form, { onBack: handleBack })
      ])), [
        [_directive_loading, containerLoading.value]
      ]);
    };
  }
});
export {
  _sfc_main as default
};
