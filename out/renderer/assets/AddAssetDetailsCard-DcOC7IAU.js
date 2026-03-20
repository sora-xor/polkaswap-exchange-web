import { z as defineComponent, bT as mapActions, bU as mapGetters, bV as mapState, bW as NotificationMixin, bX as LoadingMixin, dY as RouteNames, P as useRouterStore, dZ as Theme, bS as TranslationMixin, ay as api, dS as getCssVariableValue, aP as _export_sfc, a_ as resolveComponent, A as createElementBlock, C as openBlock, ap as createVNode, D as createBaseVNode, ao as withCtx, bQ as Fragment, bP as renderList, aN as toDisplayString, cd as normalizeStyle, aO as createTextVNode } from "./index-73GArslZ.js";
import AssetListItem from "./AssetListItem-BDm2NqjW.js";
import WalletBase from "./WalletBase-cZmYm1f_.js";
const AddAssetMixin = defineComponent({
  mixins: [NotificationMixin, LoadingMixin],
  props: {
    tokenDetailsPageOpened: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      selectedAsset: null,
      selectedAssets: [],
      search: ""
    };
  },
  computed: {
    ...mapState("wallet/account", ["assets", "accountAssets"]),
    ...mapGetters("wallet/account", ["accountAssetsAddressTable"]),
    searchValue() {
      return this.search ? this.search.trim().toLowerCase() : "";
    }
  },
  methods: {
    ...mapActions("wallet/account", ["addAsset"]),
    navigate(options) {
      useRouterStore(this.$pinia).navigate(options);
    },
    getSoughtAssets(assets) {
      return assets.filter(
        ({ name, symbol, address }) => address.toLowerCase() === this.searchValue || symbol.toLowerCase().includes(this.searchValue) || name.toLowerCase().includes(this.searchValue)
      );
    },
    resetSearch() {
      this.search = "";
    },
    async addAccountAsset(addedAsset) {
      const asset = addedAsset || {};
      await this.withLoading(async () => await this.addAsset(asset.address));
      this.navigate({ name: RouteNames.Wallet, params: { asset: addedAsset } });
      this.showAppNotification(this.t("addAsset.success", { symbol: asset.symbol || "" }), "success");
    },
    handleSelectAsset(asset) {
      if (asset) {
        const assetIndex = this.selectedAssets.findIndex((a) => a.address === asset.address);
        if (assetIndex >= 0) {
          this.selectedAssets.splice(assetIndex, 1);
        } else {
          this.selectedAssets.push(asset);
        }
      }
    }
  }
});
const _sfc_main = defineComponent({
  components: {
    WalletBase,
    AssetListItem
  },
  mixins: [TranslationMixin, LoadingMixin, AddAssetMixin],
  props: {
    selectAssets: {
      required: true,
      type: Array
    },
    theme: {
      default: Theme.Light,
      type: String
    },
    assetTypeKey: {
      required: true,
      type: String
    }
  },
  emits: ["add"],
  data() {
    return {
      isConfirmed: false
    };
  },
  computed: {
    ...mapGetters("wallet/account", ["whitelist", "whitelistIdsBySymbol"]),
    isCardPrimary() {
      return this.theme !== Theme.Dark;
    },
    height() {
      const itemHeight = parseFloat(getCssVariableValue("--s-asset-item-height--fiat"));
      const itemHeightFixed = itemHeight + 1;
      const gutter = 16;
      const count = this.selectAssets.length;
      const size = Math.min(count, 2);
      const preview = Number(size < count) * (gutter + itemHeight / 2);
      const height = itemHeightFixed * size + gutter * (size - 1) + preview;
      return `${height}px`;
    },
    warningMessage() {
      const assetType = this.tc(`addAsset.assetType.${this.assetTypeKey}`, 1);
      const assetTypePlural = this.tc(`addAsset.assetType.${this.assetTypeKey}`, this.selectAssets.length);
      const purchaseAssetType = this.selectAssets.length === 1 ? this.tc("addAsset.warningMessage", 1, { assetType }) : this.tc("addAsset.warningMessage", this.selectAssets.length, { assetTypePlural });
      return this.tc("addAsset.warningMessageText", this.selectAssets.length, {
        assetType,
        assetTypePlural,
        purchaseAssetType
      });
    }
  },
  methods: {
    isWhitelist(asset) {
      return api.assets.isWhitelist(asset, this.whitelist);
    },
    isBlacklist(asset) {
      return api.assets.isBlacklist(asset, this.whitelistIdsBySymbol);
    },
    assetCardStatus(asset) {
      return this.isWhitelist(asset) ? "success" : "error";
    },
    assetNatureText(asset) {
      const isWhitelist = this.isWhitelist(asset);
      const isBlacklist = this.isBlacklist(asset);
      if (isWhitelist) {
        return this.t("addAsset.approved");
      }
      if (isBlacklist) {
        return this.t("addAsset.scam");
      }
      return this.t("addAsset.unknown");
    },
    async handleAddAssets() {
      this.$emit("add");
      this.selectAssets.forEach((asset) => {
        this.addAccountAsset(asset);
      });
    }
  }
});
const _hoisted_1 = { class: "add-asset-details" };
const _hoisted_2 = { class: "asset-list-container" };
const _hoisted_3 = { class: "asset-nature" };
const _hoisted_4 = { class: "p2" };
const _hoisted_5 = { class: "warning-text p4" };
const _hoisted_6 = { class: "add-asset-details_confirm" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_s_card = resolveComponent("s-card");
  const _component_asset_list_item = resolveComponent("asset-list-item");
  const _component_s_scrollbar = resolveComponent("s-scrollbar");
  const _component_s_switch = resolveComponent("s-switch");
  const _component_s_button = resolveComponent("s-button");
  return openBlock(), createElementBlock("div", _hoisted_1, [
    createVNode(_component_s_scrollbar, {
      class: "asset-list-scrollbar",
      style: normalizeStyle({ height: _ctx.height })
    }, {
      default: withCtx(() => [
        createBaseVNode("div", _hoisted_2, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.selectAssets, (asset) => {
            return openBlock(), createElementBlock("div", {
              key: asset.address
            }, [
              createVNode(_component_s_card, {
                shadow: "always",
                size: "small",
                "border-radius": "mini"
              }, {
                default: withCtx(() => [
                  createVNode(_component_asset_list_item, {
                    asset,
                    pinnable: false
                  }, {
                    append: withCtx(() => [
                      createVNode(_component_s_card, {
                        size: "mini",
                        status: _ctx.assetCardStatus(asset),
                        primary: ""
                      }, {
                        default: withCtx(() => [
                          createBaseVNode("div", _hoisted_3, toDisplayString(_ctx.assetNatureText(asset)), 1)
                        ]),
                        _: 2
                      }, 1032, ["status"])
                    ]),
                    _: 2
                  }, 1032, ["asset"])
                ]),
                _: 2
              }, 1024)
            ]);
          }), 128))
        ])
      ]),
      _: 1
    }, 8, ["style"]),
    createVNode(_component_s_card, {
      status: "warning",
      primary: _ctx.isCardPrimary,
      shadow: "always",
      class: "add-asset-details_text"
    }, {
      default: withCtx(() => [
        createBaseVNode("div", _hoisted_4, toDisplayString(_ctx.t("addAsset.warningTitle")), 1),
        createBaseVNode("div", _hoisted_5, toDisplayString(_ctx.warningMessage), 1)
      ]),
      _: 1
    }, 8, ["primary"]),
    createBaseVNode("div", _hoisted_6, [
      createVNode(_component_s_switch, {
        modelValue: _ctx.isConfirmed,
        "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => _ctx.isConfirmed = $event),
        disabled: _ctx.loading
      }, null, 8, ["modelValue", "disabled"]),
      createBaseVNode("span", null, toDisplayString(_ctx.t("addAsset.understand")), 1)
    ]),
    createVNode(_component_s_button, {
      class: "add-asset-details_action s-typography-button--large",
      type: "primary",
      disabled: !_ctx.selectAssets.length || !_ctx.isConfirmed || _ctx.loading,
      onClick: _ctx.handleAddAssets
    }, {
      default: withCtx(() => [
        createTextVNode(toDisplayString(_ctx.tc("addAssetsText", _ctx.selectAssets.length)), 1)
      ]),
      _: 1
    }, 8, ["disabled", "onClick"])
  ]);
}
const AddAssetDetailsCard = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-af90e386"]]);
const AddAssetDetailsCard$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AddAssetDetailsCard
}, Symbol.toStringTag, { value: "Module" }));
export {
  AddAssetMixin as A,
  AddAssetDetailsCard as a,
  AddAssetDetailsCard$1 as b
};
