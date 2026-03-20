import { z as defineComponent, u as useTranslation, at as useRoute, bf as RewardsTabsItems, a_ as resolveComponent, A as createElementBlock, C as openBlock, am as createBlock, ap as createVNode, ao as withCtx, bQ as Fragment, bP as renderList, aj as unref, h as computed, bH as normalizeProps, bI as guardReactiveProps, c0 as toRef, s as store, W as router } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "container rewards-tabs" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "RewardsTabs"
  },
  __name: "RewardsTabs",
  props: {
    parentLoading: { type: Boolean, default: false }
  },
  setup(__props) {
    const props = __props;
    const parentLoading = toRef(props, "parentLoading");
    const { t } = useTranslation();
    const route = useRoute();
    const rewardsTabsItems = Object.values(RewardsTabsItems);
    const windowWidth = computed(() => store.state.settings.windowWidth);
    const currentTab = computed(() => route.name);
    const handleChangeTab = (name) => {
      router.push({ name });
    };
    return (_ctx, _cache) => {
      const _component_s_tab = resolveComponent("s-tab");
      const _component_s_tabs = resolveComponent("s-tabs");
      const _component_router_view = resolveComponent("router-view");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        (openBlock(), createBlock(_component_s_tabs, {
          class: "rewards-tabs__tabs",
          key: windowWidth.value,
          value: currentTab.value,
          type: "card",
          onInput: handleChangeTab
        }, {
          default: withCtx(() => [
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(rewardsTabsItems), (rewardsTab, index) => {
              return openBlock(), createBlock(_component_s_tab, {
                key: rewardsTab,
                label: unref(t)(`rewards.${unref(rewardsTabsItems)[index]}`),
                name: rewardsTab
              }, null, 8, ["label", "name"]);
            }), 128))
          ]),
          _: 1
        }, 8, ["value"])),
        createVNode(_component_router_view, normalizeProps(guardReactiveProps({
          parentLoading: parentLoading.value,
          ..._ctx.$attrs
        })), null, 16)
      ]);
    };
  }
});
export {
  _sfc_main as default
};
