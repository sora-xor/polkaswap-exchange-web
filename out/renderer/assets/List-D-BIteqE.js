import { dO as formatAmountWithSuffix, x as useNumberFormatter, w as BalanceType, dP as formatAssetBalance, ad as asZeroValue, z as defineComponent, aZ as components, u as useTranslation, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, A as createElementBlock, aM as createCommentVNode, aJ as renderSlot, c0 as toRef, aj as unref, aq as withModifiers, ap as createVNode, aI as WALLET_CONSTS, D as createBaseVNode, bH as normalizeProps, bI as guardReactiveProps, aO as createTextVNode, aN as toDisplayString, as as mergeProps, s as store, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
const extractBalance = (asset, balanceType = BalanceType.Transferable) => {
  const balance = asset?.balance;
  if (!balance) return null;
  if (balanceType === BalanceType.Transferable) return balance.transferable ?? null;
  return balance[balanceType] ?? null;
};
function useAssetFormatting() {
  const formattedAmount = useFormattedAmount();
  const numberFormatter = useNumberFormatter();
  const formatAssetBalance$1 = (asset, options = {}) => {
    if (!asset) return options.formattedZero ?? "";
    const {
      internal = true,
      formattedZero = "",
      showZeroBalance = true,
      balanceType = BalanceType.Transferable
    } = options;
    if (!internal) {
      return formatAssetBalance(asset, { internal, formattedZero, showZeroBalance });
    }
    const balance = extractBalance(asset, balanceType);
    if (!balance || !showZeroBalance && asZeroValue(balance)) {
      return formattedZero;
    }
    return numberFormatter.formatCodecNumber(balance, asset.decimals);
  };
  const formatAssetDisplay = (asset, options = {}) => {
    const value = formatAssetBalance$1(asset ?? null, options);
    const balanceType = options.balanceType ?? BalanceType.Transferable;
    const fiat = asset ? formattedAmount.getFiatBalance(asset, balanceType) : null;
    return { value, fiat };
  };
  const formatAmountWithFiat = (amount, asset, isCodecString = false) => {
    return formattedAmount.getFiatAmount(amount, asset, isCodecString);
  };
  const formatAmountWithSuffixHelper = (value, precision) => formatAmountWithSuffix(value, precision);
  return {
    ...formattedAmount,
    ...numberFormatter,
    formatAssetBalance: formatAssetBalance$1,
    formatAssetDisplay,
    formatAmountWithFiat,
    formatAmountWithSuffix: formatAmountWithSuffixHelper
  };
}
const _hoisted_1 = { class: "asset-select-list__empty" };
const _hoisted_2 = {
  key: 0,
  class: "asset__balance-container"
};
const _hoisted_3 = ["onClick", "title"];
const _hoisted_4 = {
  key: 2,
  class: "asset__balance"
};
const _hoisted_5 = ["onClick", "title"];
const FormattedZeroSymbol = "-";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "SelectAssetList",
    components: {
      AssetList: components.AssetList,
      PinIcon: components.PinIcon,
      FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue
    }
  },
  __name: "List",
  props: {
    assets: { default: () => [] },
    connected: { type: Boolean, default: false },
    shouldBalanceBeHidden: { type: Boolean, default: false },
    isSoraToEvm: { type: Boolean, default: true }
  },
  setup(__props) {
    const props = __props;
    const assets = toRef(props, "assets");
    const connected = toRef(props, "connected");
    const { t } = useTranslation();
    const { formatAssetBalance: formatAssetBalance2, getFiatBalance, getAssetFiatPrice } = useAssetFormatting();
    const FontSizeRate = WALLET_CONSTS.FontSizeRate;
    const FontWeightRate = WALLET_CONSTS.FontWeightRate;
    const getPinnedAssetHandler = (type) => {
      const accountMutations = store.commit?.wallet?.account;
      return type === "add" ? accountMutations?.setPinnedAsset : accountMutations?.removePinnedAsset;
    };
    const isAssetPinned = (asset) => {
      const checker = store.getters?.wallet?.account?.isAssetPinned;
      return typeof checker === "function" ? checker(asset) : false;
    };
    const togglePinnedAsset = (asset) => {
      const handler = isAssetPinned(asset) ? getPinnedAssetHandler("remove") : getPinnedAssetHandler("add");
      handler?.(asset);
    };
    const formatBalance = (asset) => {
      return formatAssetBalance2(asset, {
        internal: props.isSoraToEvm,
        showZeroBalance: false,
        formattedZero: FormattedZeroSymbol
      });
    };
    const shouldFiatBeShown = (asset) => {
      return Boolean(props.isSoraToEvm && getAssetFiatPrice(asset));
    };
    return (_ctx, _cache) => {
      const _component_pin_icon = resolveComponent("pin-icon");
      const _component_formatted_amount_with_fiat_value = resolveComponent("formatted-amount-with-fiat-value");
      const _component_asset_list = resolveComponent("asset-list");
      return openBlock(), createBlock(_component_asset_list, mergeProps({ assets: assets.value }, _ctx.$attrs, {
        selectable: false,
        class: "asset-select-list",
        "data-test-name": "selectToken"
      }), {
        "list-empty": withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            _cache[0] || (_cache[0] = createBaseVNode("span", { class: "empty-results-icon" }, null, -1)),
            createTextVNode(" " + toDisplayString(unref(t)("selectToken.emptyListMessage")), 1)
          ])
        ]),
        default: withCtx((token) => [
          connected.value ? (openBlock(), createElementBlock("div", _hoisted_2, [
            formatBalance(token) !== FormattedZeroSymbol ? (openBlock(), createElementBlock("button", {
              key: 0,
              onClick: withModifiers(($event) => togglePinnedAsset(token), ["stop"]),
              class: "pin-button",
              title: isAssetPinned(token) ? unref(t)("addAsset.unpinAsset") : unref(t)("addAsset.pinAsset")
            }, [
              createVNode(_component_pin_icon, {
                "is-pinned": isAssetPinned(token)
              }, null, 8, ["is-pinned"])
            ], 8, _hoisted_3)) : createCommentVNode("", true),
            formatBalance(token) !== FormattedZeroSymbol ? (openBlock(), createBlock(_component_formatted_amount_with_fiat_value, {
              key: 1,
              "value-class": "asset__balance",
              "value-can-be-hidden": "",
              value: formatBalance(token),
              "font-size-rate": unref(FontSizeRate).MEDIUM,
              "has-fiat-value": shouldFiatBeShown(token),
              "fiat-value": unref(getFiatBalance)(token),
              "fiat-font-size-rate": unref(FontSizeRate).MEDIUM,
              "fiat-font-weight-rate": unref(FontWeightRate).MEDIUM
            }, null, 8, ["value", "font-size-rate", "has-fiat-value", "fiat-value", "fiat-font-size-rate", "fiat-font-weight-rate"])) : (openBlock(), createElementBlock("span", _hoisted_4, [
              createBaseVNode("button", {
                onClick: withModifiers(($event) => togglePinnedAsset(token), ["stop"]),
                class: "pin-button",
                title: isAssetPinned(token) ? unref(t)("addAsset.unpinAsset") : unref(t)("addAsset.pinAsset")
              }, [
                createVNode(_component_pin_icon, {
                  "is-pinned": isAssetPinned(token)
                }, null, 8, ["is-pinned"])
              ], 8, _hoisted_5)
            ]))
          ])) : createCommentVNode("", true),
          renderSlot(_ctx.$slots, "action", normalizeProps(guardReactiveProps(token)), void 0, true)
        ]),
        _: 3
      }, 16, ["assets"]);
    };
  }
});
const List = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-8923bef8"]]);
export {
  List as default
};
