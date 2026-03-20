import { z as defineComponent, c4 as ObjectInit, aZ as components, ak as lazyComponent, al as Components, u as useTranslation, H as useAssetsStore, v as useWalletStore, e as useSettingsStore, U as useLoading, a9 as ref, aA as watch, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, aM as createCommentVNode, aj as unref, h as computed, A as createElementBlock, bQ as Fragment, aN as toDisplayString, aq as withModifiers, ay as api, b5 as nextTick, dh as sortAssets, X as XOR, di as getAssetsSubset, dj as FilterOptions, aP as _export_sfc } from "./index-73GArslZ.js";
import { i as isSelectableAsset } from "./utils-BPrAXW0V.js";
const _hoisted_1 = { key: 0 };
const _hoisted_2 = { key: 1 };
const _hoisted_3 = {
  key: 2,
  class: "token-list_text"
};
const _hoisted_4 = ["onClick"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "SelectToken",
  props: {
    visible: { type: Boolean },
    connected: { type: Boolean, default: false },
    asset: { default: ObjectInit },
    disabledCustom: { type: Boolean, default: false },
    isFirstTokenSelected: { type: Boolean, default: false },
    isAddLiquidity: { type: Boolean, default: false },
    filter: { type: Function, default: () => true },
    appendToBody: { type: Boolean, default: false }
  },
  emits: ["update:visible", "select", "close"],
  setup(__props, { emit: __emit }) {
    const DialogBase = components.DialogBase;
    const SelectAssetList = lazyComponent(Components.SelectAssetList);
    components.TokenAddress;
    const SearchInput = components.SearchInput;
    const AssetsFilter = components.AssetsFilter;
    const AddAssetDetailsCard = components.AddAssetDetailsCard;
    const isNonEmptyBalance = (asset) => Boolean(asset.balance) && Boolean(+asset.balance.transferable);
    const getNonWhitelistDivisibleAssets = (assets2, whitelist2) => {
      return assets2.reduce((buffer, asset) => {
        if (!api.assets.isWhitelist(asset, whitelist2) && asset.decimals) {
          buffer[asset.address] = asset;
        }
        return buffer;
      }, {});
    };
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const assetsStore = useAssetsStore();
    const walletStore = useWalletStore();
    const settingsStore = useSettingsStore();
    const { loading, withLoading } = useLoading();
    const searchRef = ref(null);
    const query = ref("");
    const isVisible = ref(props.visible);
    const tabValue = ref(
      "assets"
      /* Assets */
    );
    watch(
      () => props.visible,
      (value) => {
        isVisible.value = value;
      }
    );
    watch(isVisible, async (value) => {
      emit("update:visible", value);
      if (value) {
        tabValue.value = "assets";
        await nextTick();
        clearAndFocusSearch();
      }
    });
    const searchQuery = computed(() => query.value.trim().toLowerCase());
    const clearSearch = () => {
      query.value = "";
    };
    const focusSearchInput = () => {
      const instance = searchRef.value;
      instance?.focus?.();
    };
    const clearAndFocusSearch = () => {
      clearSearch();
      focusSearchInput();
    };
    const handleClearSearch = () => {
      clearAndFocusSearch();
    };
    const closeDialog = () => {
      emit("close");
      isVisible.value = false;
    };
    const shouldBalanceBeHidden = computed(() => settingsStore.shouldBalanceBeHidden);
    const libraryTheme = computed(() => settingsStore.libraryTheme);
    const whitelist = computed(() => walletStore.whitelist ?? {});
    const whitelistIdsBySymbol = computed(() => walletStore.whitelistIdsBySymbol ?? {});
    const isLoggedIn = computed(() => walletStore.isLoggedIn);
    const assets = computed(() => walletStore.assets ?? []);
    const accountAssets = computed(() => walletStore.accountAssets ?? []);
    const pinnedAssetsAddresses = computed(() => walletStore.pinnedAssets ?? []);
    const selectedAssetsFilter = computed(
      () => settingsStore.assetsFilter ?? FilterOptions.All
    );
    const nonWhitelistAssets = computed(() => getNonWhitelistDivisibleAssets(assets.value, whitelist.value));
    const nonWhitelistAccountAssets = computed(() => getNonWhitelistDivisibleAssets(accountAssets.value, whitelist.value));
    const mainLPSources = computed(() => {
      const mainSourceAddresses = api.dex.poolBaseAssetsIds;
      return assets.value.filter((asset) => mainSourceAddresses.includes(asset.address));
    });
    const filterWhitelistedAssets = (items) => {
      return items.filter((asset) => api.assets.isWhitelist(asset, whitelist.value));
    };
    const whitelistAssets = computed(() => {
      if (props.isAddLiquidity) {
        const filtered = props.isFirstTokenSelected ? filterWhitelistedAssets(mainLPSources.value) : filterWhitelistedAssets(assets.value.filter((asset) => asset.address !== XOR.address));
        return getAssetsSubset(filtered, selectedAssetsFilter.value);
      }
      return getAssetsSubset(filterWhitelistedAssets(assets.value), selectedAssetsFilter.value);
    });
    const getAssetWithBalance = (address) => assetsStore.assetDataByAddress(address);
    const getAssetsWithBalances = (addresses, excludeAddress) => {
      return addresses.reduce((buffer, address) => {
        if (address === excludeAddress) return buffer;
        const asset = getAssetWithBalance(address);
        if (asset) buffer.push(asset);
        return buffer;
      }, []);
    };
    const sortByBalance = (a, b) => {
      const aEmpty = !isNonEmptyBalance(a);
      const bEmpty = !isNonEmptyBalance(b);
      if (aEmpty === bEmpty) return sortAssets(a, b);
      return aEmpty && !bEmpty ? 1 : -1;
    };
    const filterAssetsByQuery = (items, isRegisteredAssets = false) => (queryValue) => {
      if (!queryValue) return items;
      const searchValue = queryValue.toLowerCase().trim();
      const addressField = isRegisteredAssets ? "externalAddress" : "address";
      return items.filter((asset) => {
        const name = asset.name?.toLowerCase?.();
        const symbol = asset.symbol?.toLowerCase?.();
        const address = asset[addressField]?.toLowerCase?.();
        return name?.includes?.(searchValue) || symbol?.includes?.(searchValue) || address === searchValue;
      });
    };
    const whitelistAssetsList = computed(() => {
      const addresses = whitelistAssets.value.map((asset) => asset.address);
      const excludeAddress = props.asset?.address;
      return getAssetsWithBalances(addresses, excludeAddress).sort(sortByBalance);
    });
    const filteredWhitelistTokens = computed(() => {
      const filtered = filterAssetsByQuery(whitelistAssetsList.value)(searchQuery.value);
      const pinnedOrderMap = new Map(pinnedAssetsAddresses.value.map((address, index) => [address, index]));
      return [...filtered].sort((a, b) => {
        const aIndex = pinnedOrderMap.get(a.address);
        const bIndex = pinnedOrderMap.get(b.address);
        if (aIndex !== void 0 && bIndex !== void 0) return aIndex - bIndex;
        if (aIndex !== void 0) return -1;
        if (bIndex !== void 0) return 1;
        return 0;
      });
    });
    const sortedNonWhitelistAccountAssets = computed(() => {
      const excludeAddress = props.asset?.address;
      const addresses = Object.keys(nonWhitelistAccountAssets.value);
      return getAssetsWithBalances(addresses, excludeAddress).sort(sortByBalance);
    });
    const isCustomTabActive = computed(
      () => tabValue.value === "custom"
      /* Custom */
    );
    const activeAssetsList = computed(() => {
      const list = isCustomTabActive.value ? sortedNonWhitelistAccountAssets.value : filteredWhitelistTokens.value;
      return list.filter(props.filter);
    });
    const activeSearchPlaceholder = computed(
      () => t(isCustomTabActive.value ? "selectToken.custom.search" : "selectToken.searchPlaceholder")
    );
    const alreadyAttached = computed(() => Boolean(nonWhitelistAccountAssets.value[searchQuery.value]));
    const customAsset = computed(() => nonWhitelistAssets.value[searchQuery.value] ?? null);
    const shouldAssetsListBeShown = computed(
      () => !(isCustomTabActive.value && !activeAssetsList.value.length && searchQuery.value)
    );
    const hasReadyAssetsForActiveTab = computed(
      () => isCustomTabActive.value ? Boolean(sortedNonWhitelistAccountAssets.value.length) : Boolean(whitelistAssetsList.value.length)
    );
    const shouldAssetsListBeRendered = computed(
      () => shouldAssetsListBeShown.value && (Boolean(activeAssetsList.value.length) || hasReadyAssetsForActiveTab.value)
    );
    const assetsListSize = computed(() => isCustomTabActive.value ? 5 : 6);
    const selectAsset = (asset) => {
      if (!isSelectableAsset(asset)) return;
      clearSearch();
      emit("select", asset);
      closeDialog();
    };
    const handleAddAsset = async () => {
      if (!customAsset.value) return;
      if (isLoggedIn.value) {
        await withLoading(async () => {
          await walletStore.addAsset(customAsset.value?.address);
        });
        clearSearch();
      } else {
        selectAsset(customAsset.value);
      }
    };
    const handleRemoveCustomAsset = (asset) => {
      api.assets.removeAccountAsset(asset.address);
    };
    const handleTabChange = (name) => {
      tabValue.value = name;
      clearAndFocusSearch();
    };
    return (_ctx, _cache) => {
      const _component_s_tab = resolveComponent("s-tab");
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_tabs = resolveComponent("s-tabs");
      return openBlock(), createBlock(unref(DialogBase), {
        visible: isVisible.value,
        "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => isVisible.value = $event),
        title: unref(t)("selectToken.title"),
        "custom-class": "asset-select",
        "wrapper-class": "asset-select-wrapper",
        "append-to-body": __props.appendToBody,
        "modal-append-to-body": __props.appendToBody
      }, {
        default: withCtx(() => [
          createVNode(_component_s_tabs, {
            value: tabValue.value,
            class: "s-tabs--exchange",
            type: "rounded",
            onInput: handleTabChange
          }, {
            default: withCtx(() => [
              createVNode(unref(SearchInput), {
                ref_key: "searchRef",
                ref: searchRef,
                modelValue: query.value,
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => query.value = $event),
                placeholder: activeSearchPlaceholder.value,
                autofocus: "",
                onClear: handleClearSearch,
                class: "token-search neumorphic s-focused s-border-radius-small s-size-big s-input--prefix"
              }, null, 8, ["modelValue", "placeholder"]),
              createVNode(_component_s_tab, {
                label: unref(t)("selectToken.assets.title"),
                name: "assets"
              }, {
                default: withCtx(() => [
                  createVNode(unref(AssetsFilter), { class: "token-filter-options" })
                ]),
                _: 1
              }, 8, ["label"]),
              createVNode(_component_s_tab, {
                disabled: __props.disabledCustom,
                label: unref(t)("selectToken.custom.title"),
                name: "custom",
                class: "asset-select__info"
              }, {
                default: withCtx(() => [
                  customAsset.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                    alreadyAttached.value ? (openBlock(), createElementBlock("span", _hoisted_1, toDisplayString(unref(t)("selectToken.custom.alreadyAttached")), 1)) : (openBlock(), createBlock(unref(AddAssetDetailsCard), {
                      key: 1,
                      asset: customAsset.value,
                      theme: libraryTheme.value,
                      whitelist: whitelist.value,
                      "whitelist-ids-by-symbol": whitelistIdsBySymbol.value,
                      loading: unref(loading),
                      onAdd: handleAddAsset
                    }, null, 8, ["asset", "theme", "whitelist", "whitelist-ids-by-symbol", "loading"]))
                  ], 64)) : searchQuery.value ? (openBlock(), createElementBlock("span", _hoisted_2, toDisplayString(unref(t)("selectToken.custom.notFound")), 1)) : createCommentVNode("", true),
                  __props.connected && sortedNonWhitelistAccountAssets.value.length ? (openBlock(), createElementBlock("div", _hoisted_3, toDisplayString(sortedNonWhitelistAccountAssets.value.length) + " " + toDisplayString(unref(t)("selectToken.custom.text")), 1)) : createCommentVNode("", true)
                ]),
                _: 1
              }, 8, ["disabled", "label"]),
              shouldAssetsListBeRendered.value ? (openBlock(), createBlock(unref(SelectAssetList), {
                key: 0,
                assets: activeAssetsList.value,
                size: assetsListSize.value,
                connected: __props.connected,
                "should-balance-be-hidden": shouldBalanceBeHidden.value,
                "has-fiat-value": "",
                onClick: selectAsset
              }, {
                action: withCtx((token) => [
                  isCustomTabActive.value ? (openBlock(), createElementBlock("div", {
                    key: 0,
                    class: "token-item__remove",
                    onClick: withModifiers(($event) => handleRemoveCustomAsset(token), ["stop"])
                  }, [
                    createVNode(_component_s_icon, { name: "basic-trash-24" })
                  ], 8, _hoisted_4)) : createCommentVNode("", true)
                ]),
                _: 1
              }, 8, ["assets", "size", "connected", "should-balance-be-hidden"])) : createCommentVNode("", true)
            ]),
            _: 1
          }, 8, ["value"])
        ]),
        _: 1
      }, 8, ["visible", "title", "append-to-body", "modal-append-to-body"]);
    };
  }
});
const SelectToken = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-cc31d1f8"]]);
export {
  SelectToken as default
};
