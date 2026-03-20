import { z as defineComponent, bt as mergeModels, aZ as components, ak as lazyComponent, al as Components, bu as useModel, u as useTranslation, c2 as useTransaction, c3 as useNotification, X as XOR, h as computed, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aM as createCommentVNode, aj as unref, aN as toDisplayString, aq as withModifiers, A as createElementBlock, bQ as Fragment, aO as createTextVNode, ay as api, Z as ZeroStringValue, O as Operation, s as store, g as getAssetBalance } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "vault-close" };
const _hoisted_2 = { class: "vault-close__title s-flex" };
const _hoisted_3 = { class: "vault-close__error-card-header s-flex" };
const _hoisted_4 = { class: "vault-close__error-header s-flex-column" };
const _hoisted_5 = { class: "vault-close__error-title p3" };
const _hoisted_6 = { class: "vault-close__error-value" };
const _hoisted_7 = { class: "vault-close__error-badge" };
const _hoisted_8 = { class: "vault-close__error-message p3" };
const swapLink = "/#/swap/XOR/KUSD";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "CloseVaultDialog",
  props: /* @__PURE__ */ mergeModels({
    vault: { default: null },
    lockedAsset: { default: null },
    debtAsset: { default: null }
  }, {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["confirm", "close"], ["update:visible"]),
  setup(__props, { expose: __expose, emit: __emit }) {
    const DialogBase = components.DialogBase;
    const InfoLine = components.InfoLine;
    const ExternalLink = components.ExternalLink;
    const PairTokenLogo = lazyComponent(Components.PairTokenLogo);
    const props = __props;
    const emit = __emit;
    const isVisible = useModel(__props, "visible");
    const { t } = useTranslation();
    const { withNotifications, loading } = useTransaction();
    const { getFPNumberFromCodec, getFiatAmountByFPNumber, getFiatAmountByCodecString, formatCodecNumber, Zero } = useFormattedAmount();
    const { showAppAlert } = useNotification();
    const xorSymbol = XOR.symbol;
    const networkFees = computed(() => store.state.wallet.settings.networkFees);
    const accountXor = computed(() => store.getters.assets.xor);
    const vault = computed(() => props.vault);
    const lockedAsset = computed(() => props.lockedAsset);
    const debtAsset = computed(() => props.debtAsset);
    const networkFee = computed(() => networkFees.value?.[Operation.CloseVault] ?? ZeroStringValue);
    const fpNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value));
    const xorBalance = computed(() => getFPNumberFromCodec(accountXor.value?.balance?.transferable ?? ZeroStringValue));
    const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
    const isInsufficientXorForFee = computed(() => xorBalance.value.sub(fpNetworkFee.value).isLtZero());
    const debtSymbol = computed(() => debtAsset.value?.symbol ?? "");
    const lockedSymbol = computed(() => lockedAsset.value?.symbol ?? "");
    const vaultTitle = computed(
      () => debtSymbol.value && lockedSymbol.value ? `${debtSymbol.value} / ${lockedSymbol.value}` : ""
    );
    const formattedLockedAmount = computed(() => vault.value?.lockedAmount.toLocaleString() ?? ZeroStringValue);
    const fiatLockedAmount = computed(() => {
      if (!(vault.value && lockedAsset.value)) return ZeroStringValue;
      return getFiatAmountByFPNumber(vault.value.lockedAmount, lockedAsset.value) ?? ZeroStringValue;
    });
    const debt = computed(() => vault.value?.debt ?? Zero);
    const formattedDebtAmount = computed(() => debt.value.toLocaleString());
    const fiatDebt = computed(() => {
      if (!debtAsset.value) return ZeroStringValue;
      return getFiatAmountByFPNumber(debt.value, debtAsset.value) ?? ZeroStringValue;
    });
    const debtAssetBalanceFp = computed(
      () => getFPNumberFromCodec(getAssetBalance(debtAsset.value) ?? 0, debtAsset.value?.decimals)
    );
    const formattedDebtAssetBalance = computed(() => debtAssetBalanceFp.value.toLocaleString());
    const fiatDebtAssetBalance = computed(() => {
      if (!debtAsset.value) return ZeroStringValue;
      return getFiatAmountByFPNumber(debtAssetBalanceFp.value, debtAsset.value) ?? ZeroStringValue;
    });
    const isInsufficientBalance = computed(() => debt.value.gt(debtAssetBalanceFp.value));
    const diff = computed(() => debt.value.sub(debtAssetBalanceFp.value));
    const formattedDiff = computed(() => isInsufficientBalance.value ? diff.value.toLocaleString() : "");
    const diffWithSlippage = computed(() => diff.value.mul(1.02));
    const formattedDiffWithSlippage = computed(
      () => isInsufficientBalance.value ? diffWithSlippage.value.toLocaleString() : ""
    );
    const fiatDiffWithSlippage = computed(() => {
      if (!debtAsset.value) return ZeroStringValue;
      return getFiatAmountByFPNumber(diffWithSlippage.value, debtAsset.value) ?? ZeroStringValue;
    });
    const disabled = computed(() => loading.value || isInsufficientXorForFee.value || isInsufficientBalance.value);
    const errorMessage = computed(() => {
      if (isInsufficientXorForFee.value) {
        return t("insufficientBalanceText", { tokenSymbol: xorSymbol });
      }
      if (isInsufficientBalance.value) {
        return t("insufficientBalanceText", { tokenSymbol: debtSymbol.value });
      }
      return "";
    });
    const title = computed(() => t("kensetsu.closeVault"));
    const handleCloseVault = async () => {
      if (disabled.value) {
        if (errorMessage.value) {
          showAppAlert(errorMessage.value, t("errorText"));
        }
        return;
      }
      try {
        await withNotifications(async () => {
          if (!(vault.value && lockedAsset.value && debtAsset.value)) {
            throw new Error("[api.kensetsu.closeVault]: vault or asset is null");
          }
          await api.kensetsu.closeVault(vault.value, lockedAsset.value, debtAsset.value);
        });
      } catch (error) {
        console.error(error);
      }
      isVisible.value = false;
      emit("confirm");
    };
    const openSwap = () => {
      const win = window.open(swapLink, "_blank", "noopener,noreferrer");
      if (win) {
        win.opener = null;
        win.focus();
      }
    };
    __expose({
      handleCloseVault,
      openSwap,
      disabled,
      isInsufficientBalance,
      isInsufficientXorForFee,
      formattedDiff,
      formattedDiffWithSlippage,
      fiatDiffWithSlippage
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_button = resolveComponent("s-button");
      const _component_s_card = resolveComponent("s-card");
      return openBlock(), createBlock(unref(DialogBase), {
        title: title.value,
        visible: isVisible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isVisible.value = $event),
        tooltip: unref(t)("kensetsu.closeVaultDescription")
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("div", _hoisted_2, [
              createVNode(unref(PairTokenLogo), {
                class: "vault-close__icon",
                size: "medium",
                "first-token": debtAsset.value,
                "second-token": lockedAsset.value
              }, null, 8, ["first-token", "second-token"]),
              createBaseVNode("h3", null, toDisplayString(vaultTitle.value), 1)
            ]),
            createVNode(unref(InfoLine), {
              class: "vault-close__collateral",
              label: unref(t)("kensetsu.yourCollateral"),
              "label-tooltip": unref(t)("kensetsu.yourCollateralDescription"),
              value: formattedLockedAmount.value,
              "asset-symbol": lockedSymbol.value,
              "fiat-value": fiatLockedAmount.value,
              "is-formatted": ""
            }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"]),
            createVNode(unref(InfoLine), {
              class: "vault-close__debt",
              label: unref(t)("kensetsu.yourDebt"),
              "label-tooltip": unref(t)("kensetsu.yourDebtDescription"),
              value: formattedDebtAmount.value,
              "asset-symbol": debtSymbol.value,
              "fiat-value": fiatDebt.value,
              "is-formatted": ""
            }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"]),
            createVNode(unref(InfoLine), {
              class: "vault-close__balance",
              label: unref(t)("kensetsu.yourDebtTokenBalance", { tokenSymbol: debtSymbol.value }),
              value: formattedDebtAssetBalance.value,
              "asset-symbol": debtSymbol.value,
              "fiat-value": fiatDebtAssetBalance.value,
              "is-formatted": ""
            }, null, 8, ["label", "value", "asset-symbol", "fiat-value"]),
            isInsufficientBalance.value ? (openBlock(), createBlock(_component_s_card, {
              key: 0,
              class: "vault-close__error",
              "border-radius": "small",
              shadow: "always",
              size: "medium",
              pressed: ""
            }, {
              header: withCtx(() => [
                createBaseVNode("div", _hoisted_3, [
                  createBaseVNode("div", _hoisted_4, [
                    createBaseVNode("p", _hoisted_5, toDisplayString(unref(t)("kensetsu.requiredAmountWithSlippage")), 1),
                    createBaseVNode("h3", _hoisted_6, toDisplayString(formattedDiffWithSlippage.value), 1)
                  ]),
                  createBaseVNode("div", _hoisted_7, [
                    createVNode(_component_s_icon, {
                      class: "vault-close__error-icon",
                      name: "notifications-alert-triangle-24",
                      size: "24"
                    })
                  ])
                ])
              ]),
              default: withCtx(() => [
                createBaseVNode("p", _hoisted_8, toDisplayString(unref(t)("kensetsu.requiredAmountWithSlippageDescription", { tokenSymbol: debtSymbol.value, amount: formattedDiff.value })), 1),
                createVNode(_component_s_button, {
                  type: "primary",
                  class: "s-typography-button--large vault-close__button",
                  onClick: withModifiers(openSwap, ["prevent"])
                }, {
                  default: withCtx(() => [
                    createVNode(unref(ExternalLink), {
                      class: "vault-close__error-link s-typography-button--large",
                      tabindex: "-1",
                      title: unref(t)("kensetsu.openSwap"),
                      href: swapLink
                    }, null, 8, ["title"])
                  ]),
                  _: 1
                })
              ]),
              _: 1
            })) : createCommentVNode("", true),
            createVNode(_component_s_button, {
              type: "primary",
              class: "s-typography-button--large action-button vault-close__button",
              disabled: disabled.value,
              onClick: handleCloseVault
            }, {
              default: withCtx(() => [
                disabled.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(toDisplayString(errorMessage.value), 1)
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode(toDisplayString(title.value), 1)
                ], 64))
              ]),
              _: 1
            }, 8, ["disabled"]),
            createVNode(unref(InfoLine), {
              label: unref(t)("networkFeeText"),
              "label-tooltip": unref(t)("networkFeeTooltipText"),
              value: networkFeeFormatted.value,
              "asset-symbol": unref(xorSymbol),
              "fiat-value": unref(getFiatAmountByCodecString)(networkFee.value),
              "is-formatted": ""
            }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"])
          ])
        ]),
        _: 1
      }, 8, ["title", "visible", "tooltip"]);
    };
  }
});
export {
  _sfc_main as default
};
