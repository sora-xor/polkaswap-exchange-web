import { h as computed, a9 as ref, b5 as nextTick, z as defineComponent, bt as mergeModels, aZ as components, ak as lazyComponent, u as useTranslation, H as useAssetsStore, bu as useModel, aA as watch, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, D as createBaseVNode, aj as unref, ar as isRef, A as createElementBlock, aM as createCommentVNode, aN as toDisplayString, c4 as ObjectInit, al as Components, s as store, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useAssets, f as filterAssetsByQuery } from "./useAssets-fqwOU5nr.js";
function useSearchInput() {
  const search = ref();
  const query = ref("");
  const searchQuery = computed(() => query.value.trim().toLowerCase());
  const handleClearSearch = () => {
    query.value = "";
  };
  const focusSearchInput = async () => {
    await nextTick();
    search.value?.focus?.();
  };
  const clearAndFocusSearch = async () => {
    handleClearSearch();
    await focusSearchInput();
  };
  return {
    search,
    query,
    searchQuery,
    handleClearSearch,
    focusSearchInput,
    clearAndFocusSearch
  };
}
function useSelectAssetTools() {
  const { sortByBalance, getAssetsWithBalances } = useAssets();
  return {
    sortByBalance,
    getAssetsWithBalances
  };
}
const _hoisted_1 = { class: "asset-lists-container" };
const _hoisted_2 = {
  key: 0,
  class: "network-label"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      DialogBase: components.DialogBase,
      SelectAssetList: lazyComponent(Components.SelectAssetList),
      SearchInput: components.SearchInput
    }
  },
  __name: "SelectAsset",
  props: /* @__PURE__ */ mergeModels({
    asset: { default: ObjectInit }
  }, {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["select"], ["update:visible"]),
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const { search, query, handleClearSearch, focusSearchInput } = useSearchInput();
    const { sortByBalance, getAssetsWithBalances } = useSelectAssetTools();
    const assetsStore = useAssetsStore();
    const isVisible = useModel(__props, "visible");
    const selectedNetwork = computed(() => store.getters.web3.selectedNetwork);
    const registeredAssets = computed(() => assetsStore.registeredAssets);
    const isSoraToEvm = computed(() => Boolean(store.state.bridge.isSoraToEvm));
    const shouldBalanceBeHidden = computed(() => Boolean(store.state.wallet.settings.shouldBalanceBeHidden));
    const assetsList = computed(() => {
      const assetsAddresses = Object.keys(registeredAssets.value ?? {});
      const excludeAddress = props.asset?.address;
      const list = getAssetsWithBalances(assetsAddresses, excludeAddress);
      return [...list].sort(sortByBalance);
    });
    const filteredAssets = computed(
      () => filterAssetsByQuery(assetsList.value, query.value, { useExternalAddress: !isSoraToEvm.value })
    );
    const hasFilteredAssets = computed(() => filteredAssets.value.length > 0);
    const label = computed(() => {
      if (isSoraToEvm.value) {
        return t("selectRegisteredAsset.search.networkLabelSora");
      }
      const network = selectedNetwork.value?.shortName ?? "";
      return t("selectRegisteredAsset.search.networkLabelEthereum", { network });
    });
    function selectAsset(asset) {
      emit("select", asset);
      isVisible.value = false;
    }
    watch(
      isVisible,
      (visible) => {
        if (visible) {
          void focusSearchInput();
        } else {
          handleClearSearch();
        }
      },
      { immediate: false }
    );
    return (_ctx, _cache) => {
      const _component_search_input = resolveComponent("search-input");
      const _component_select_asset_list = resolveComponent("select-asset-list");
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: isVisible.value,
        "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => isVisible.value = $event),
        title: unref(t)("selectRegisteredAsset.title"),
        "custom-class": "asset-select"
      }, {
        default: withCtx(() => [
          createVNode(_component_search_input, {
            ref_key: "search",
            ref: search,
            modelValue: unref(query),
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(query) ? query.value = $event : null),
            placeholder: unref(t)("selectRegisteredAsset.search.placeholder"),
            autofocus: "",
            onClear: unref(handleClearSearch),
            class: "asset-search"
          }, null, 8, ["modelValue", "placeholder", "onClear"]),
          createBaseVNode("div", _hoisted_1, [
            hasFilteredAssets.value ? (openBlock(), createElementBlock("h3", _hoisted_2, toDisplayString(label.value), 1)) : createCommentVNode("", true),
            createVNode(_component_select_asset_list, {
              assets: filteredAssets.value,
              "should-balance-be-hidden": shouldBalanceBeHidden.value,
              "is-sora-to-evm": isSoraToEvm.value,
              connected: "",
              onClick: selectAsset
            }, null, 8, ["assets", "should-balance-be-hidden", "is-sora-to-evm"])
          ])
        ]),
        _: 1
      }, 8, ["visible", "title"]);
    };
  }
});
const SelectAsset = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-2ae826d9"]]);
export {
  SelectAsset as default
};
