import { b8 as MarketAlgorithms, z as defineComponent, ak as lazyComponent, al as Components, u as useTranslation, A as createElementBlock, C as openBlock, ap as createVNode, ao as withCtx, D as createBaseVNode, aN as toDisplayString, aj as unref, h as computed, s as store } from "./index-73GArslZ.js";
import { u as useSwapStore } from "./swap-DtWqRzUD.js";
import SwapSettingsHeader from "./Header-fErhsDrK.js";
const resolveMarketAlgorithms = (algorithms) => {
  return algorithms.length ? [...algorithms] : [MarketAlgorithms.SMART];
};
const resolveCurrentMarketAlgorithm = (isAvailable, selected, available) => {
  if (!isAvailable) return MarketAlgorithms.SMART;
  return available.includes(selected) ? selected : MarketAlgorithms.SMART;
};
const _hoisted_1 = { class: "market-algorithm" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "MarketAlgorithm",
  setup(__props) {
    const SettingsTabs = lazyComponent(Components.SettingsTabs);
    const { t, te } = useTranslation();
    const swapStore = useSwapStore();
    const marketAlgorithm = computed(() => store.state.settings.marketAlgorithm);
    const marketAlgorithms = computed(() => swapStore.marketAlgorithms);
    const marketAlgorithmsAvailable = computed(() => swapStore.marketAlgorithmsAvailable);
    const availableMarketAlgorithms = computed(() => resolveMarketAlgorithms(marketAlgorithms.value));
    const generateAlgorithmItem = (type) => `<span class="algorithm">${type}</span>`;
    const marketAlgorithmTabs = computed(
      () => availableMarketAlgorithms.value.map((name) => {
        const contentKey = `dexSettings.marketAlgorithms.${name}`;
        const content = te(contentKey) ? t(`dexSettings.marketAlgorithms.${name}`, {
          smartAlgorithm: generateAlgorithmItem(MarketAlgorithms.SMART),
          tbcAlgorithm: generateAlgorithmItem(MarketAlgorithms.TBC),
          xycAlgorithm: generateAlgorithmItem(MarketAlgorithms.XYK)
        }) : "";
        return {
          name,
          label: name,
          content
        };
      })
    );
    const currentMarketAlgorithm = computed(() => {
      return resolveCurrentMarketAlgorithm(
        marketAlgorithmsAvailable.value,
        marketAlgorithm.value,
        availableMarketAlgorithms.value
      );
    });
    const selectTab = (name) => {
      store.commit.settings.setMarketAlgorithm(name);
    };
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(SwapSettingsHeader, {
          title: unref(t)("dexSettings.marketAlgorithm")
        }, {
          "tooltip-content": withCtx(() => [
            createBaseVNode("strong", null, toDisplayString(unref(t)("marketAlgorithmText")), 1),
            createBaseVNode("span", null, toDisplayString(unref(t)("dexSettings.marketAlgorithmTooltip.main")), 1)
          ]),
          _: 1
        }, 8, ["title"]),
        createVNode(unref(SettingsTabs), {
          value: currentMarketAlgorithm.value,
          tabs: marketAlgorithmTabs.value,
          onInput: selectTab
        }, null, 8, ["value", "tabs"])
      ]);
    };
  }
});
export {
  _sfc_main as _
};
