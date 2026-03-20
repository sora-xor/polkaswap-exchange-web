import { z as defineComponent, aZ as components, ak as lazyComponent, au as useRouter, at as useRoute, u as useTranslation, a9 as ref, cF as soraStorage, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, C as openBlock, bA as withDirectives, c0 as toRef, bb as normalizeClass, h as computed, D as createBaseVNode, aM as createCommentVNode, ap as createVNode, aj as unref, aN as toDisplayString, bH as normalizeProps, bI as guardReactiveProps, al as Components, s as store, cy as BreakpointClass, V as PageNames, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "explore-container" };
const _hoisted_2 = { class: "explore-container-dropdown s-flex" };
const _hoisted_3 = {
  key: 0,
  class: "switcher"
};
const storageKey = "exploreAccountItems";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "ExploreContainer",
    inheritAttrs: false,
    components: {
      GenericPageHeader: lazyComponent(Components.GenericPageHeader),
      ResponsiveTabs: lazyComponent(Components.ResponsiveTabs),
      SearchInput: components.SearchInput
    }
  },
  __name: "Container",
  props: {
    parentLoading: { type: Boolean, default: false }
  },
  setup(__props) {
    const props = __props;
    const parentLoading = toRef(props, "parentLoading");
    const routerInstance = useRouter();
    const route = useRoute();
    const { t } = useTranslation();
    const collapsed = computed(() => Boolean(store.state?.settings?.menuCollapsed));
    const screenBreakpointClass = computed(
      () => store.state?.settings?.screenBreakpointClass ?? BreakpointClass.Desktop
    );
    const isLoggedIn = computed(() => Boolean(store.getters?.wallet?.account?.isLoggedIn));
    const exploreQuery = ref("");
    const accountItems = ref(
      (() => {
        const stored = soraStorage.get(storageKey);
        return stored ? JSON.parse(stored) : false;
      })()
    );
    const showDropdown = computed(() => {
      return ![BreakpointClass.LargeDesktop, BreakpointClass.HugeDesktop].includes(screenBreakpointClass.value);
    });
    const isAccountItemsOnly = computed({
      get: () => accountItems.value,
      set: (value) => {
        soraStorage.set(storageKey, value);
        accountItems.value = value;
      }
    });
    const pageName = computed(() => route.name);
    const tabs = computed(() => {
      return [
        { name: PageNames.ExploreTokens, icon: "finance-PSWAP-24" },
        { name: PageNames.ExploreFarming, icon: "various-toy-horse-24" },
        { name: PageNames.ExplorePools, icon: "basic-drop-24" },
        { name: PageNames.ExploreStaking, icon: "basic-layers-24" },
        { name: PageNames.ExploreBooks, icon: "music-CD-24" }
      ].map((tab) => ({
        ...tab,
        label: t(`pageTitle.${tab.name}`)
      }));
    });
    const switcherAvailable = computed(() => {
      if (!isLoggedIn.value) return false;
      return [PageNames.ExploreFarming, PageNames.ExplorePools, PageNames.ExploreStaking].includes(
        pageName.value
      );
    });
    const handleTabChange = (name) => {
      if (pageName.value === name) return;
      routerInstance.push({ name });
    };
    const resetSearch = () => {
      exploreQuery.value = "";
    };
    return (_ctx, _cache) => {
      const _component_responsive_tabs = resolveComponent("responsive-tabs");
      const _component_search_input = resolveComponent("search-input");
      const _component_s_switch = resolveComponent("s-switch");
      const _component_router_view = resolveComponent("router-view");
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        withDirectives((openBlock(), createElementBlock("div", {
          class: normalizeClass(["container container--explore", { "menu-collapsed": collapsed.value }])
        }, [
          createBaseVNode("div", _hoisted_2, [
            createVNode(_component_responsive_tabs, {
              "is-header": "",
              "is-mobile": showDropdown.value,
              tabs: tabs.value,
              "model-value": pageName.value,
              "onUpdate:modelValue": handleTabChange
            }, null, 8, ["is-mobile", "tabs", "model-value"]),
            createVNode(_component_search_input, {
              autofocus: "",
              class: "explore-search",
              modelValue: exploreQuery.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => exploreQuery.value = $event),
              placeholder: unref(t)("searchText"),
              onClear: resetSearch
            }, null, 8, ["modelValue", "placeholder"])
          ]),
          switcherAvailable.value ? (openBlock(), createElementBlock("div", _hoisted_3, [
            createVNode(_component_s_switch, {
              modelValue: isAccountItemsOnly.value,
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => isAccountItemsOnly.value = $event)
            }, null, 8, ["modelValue"]),
            createBaseVNode("span", null, toDisplayString(unref(t)("explore.showOnly", { entities: unref(t)("explore.myPositions") })), 1)
          ])) : createCommentVNode("", true),
          createVNode(_component_router_view, normalizeProps(guardReactiveProps({
            exploreQuery: exploreQuery.value,
            isAccountItemsOnly: isAccountItemsOnly.value,
            parentLoading: parentLoading.value,
            ..._ctx.$attrs
          })), null, 16)
        ], 2)), [
          [_directive_loading, parentLoading.value]
        ])
      ]);
    };
  }
});
const Container = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-04120231"]]);
export {
  Container as default
};
