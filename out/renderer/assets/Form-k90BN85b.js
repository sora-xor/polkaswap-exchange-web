import { z as defineComponent, u as useTranslation, c2 as useTransaction, bD as poolLazyComponent, bE as PoolComponents, ak as lazyComponent, al as Components, aZ as components, aA as watch, aB as onBeforeUnmount, s as store, a9 as ref, a_ as resolveComponent, A as createElementBlock, C as openBlock, ap as createVNode, ao as withCtx, aM as createCommentVNode, aj as unref, d2 as FocusedField, h as computed, g as getAssetBalance, bQ as Fragment, aO as createTextVNode, aN as toDisplayString, am as createBlock, D as createBaseVNode, ar as isRef, M as getMaxValue, az as XSTUSD, X as XOR, O as Operation, cu as isMaxButtonAvailable, cv as hasInsufficientBalance, b2 as sanitizeHtml, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useNetworkFeeWarning, a as useNetworkFeeDialog } from "./useNetworkFeeDialog-BJBwx4Px.js";
import { u as useTokenSelect } from "./useTokenSelect-DZ9bQ0SE.js";
import { u as usePoolTokenPair } from "./usePoolTokenPair-mkXLQGop.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = {
  key: 0,
  class: "info-line-container"
};
const _hoisted_2 = { class: "info-line-container__title" };
const _hoisted_3 = ["innerHTML"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Form",
  emits: ["back"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const emit = __emit;
    const { t } = useTranslation();
    const poolTokenPair = usePoolTokenPair();
    const { formatCodecNumber, getFPNumber } = useFormattedAmount();
    const { isSelectAssetLoading, withSelectAssetLoading } = useTokenSelect();
    const { allowFeePopup, isXorSufficientForNextTx } = useNetworkFeeWarning();
    const {
      showWarningFeeDialog,
      isWarningFeeDialogConfirmed,
      openWarningFeeDialog,
      closeWarningFeeDialog,
      confirmNetworkFeeWariningDialog,
      waitOnFeeWarningConfirmation
    } = useNetworkFeeDialog();
    const { loading, withNotifications } = useTransaction();
    const shareOfPool = computed(() => store.getters.addLiquidity.shareOfPool);
    const liquidityInfo = computed(() => store.getters.addLiquidity.liquidityInfo);
    const isNotFirstLiquidityProvider = computed(() => store.getters.addLiquidity.isNotFirstLiquidityProvider);
    const isLoggedIn = computed(() => store.getters.wallet.account.isLoggedIn);
    const xor = computed(() => store.getters.assets.xor);
    const slippageToleranceValue = computed(() => store.state.settings.slippageTolerance);
    const isConfirmTxDisabled = computed(() => store.state.wallet.transactions.isConfirmTxDialogDisabled);
    const nodeIsConnected = computed(() => store.getters.settings.nodeIsConnected);
    const showSelectTokenDialog = ref(false);
    const isFirstTokenSelected = ref(false);
    const insufficientBalanceTokenSymbol = ref("");
    const confirmDialogVisible = ref(false);
    const AddLiquidityConfirm = poolLazyComponent(PoolComponents.AddLiquidityConfirm);
    const AddLiquidityTransactionDetails = poolLazyComponent(PoolComponents.AddLiquidityTransactionDetails);
    lazyComponent(Components.SelectToken);
    const SlippageTolerance = lazyComponent(Components.SlippageTolerance);
    const NetworkFeeWarningDialog = lazyComponent(Components.NetworkFeeWarningDialog);
    const TokenInput = lazyComponent(Components.TokenInput);
    const InfoLine = components.InfoLine;
    const firstToken = poolTokenPair.firstToken;
    const secondToken = poolTokenPair.secondToken;
    const firstTokenValue = poolTokenPair.firstTokenValue;
    const secondTokenValue = poolTokenPair.secondTokenValue;
    const networkFee = poolTokenPair.networkFee;
    const networkFees = poolTokenPair.networkFees;
    const emptyAssets = poolTokenPair.emptyAssets;
    const isAvailable = poolTokenPair.isAvailable;
    const price = poolTokenPair.price;
    const priceReversed = poolTokenPair.priceReversed;
    const areTokensSelected = computed(() => Boolean(firstToken.value && secondToken.value));
    const removeLiquidityFormattedFee = computed(
      () => formatCodecNumber(networkFees.value?.[Operation.RemoveLiquidity] ?? "0")
    );
    const isXorSufficientForNextOperation = () => {
      const params = {
        type: isAvailable.value ? Operation.AddLiquidity : Operation.CreatePair
      };
      if (firstToken.value?.address === XOR.address) {
        params.amount = getFPNumber(firstTokenValue.value);
        params.isXor = true;
      }
      return isXorSufficientForNextTx(params);
    };
    const isFirstMaxButtonAvailable = computed(() => {
      const token = firstToken.value;
      if (!(token && isLoggedIn.value)) return false;
      return isMaxButtonAvailable(token, firstTokenValue.value, networkFee.value, xor.value);
    });
    const isSecondMaxButtonAvailable = computed(() => {
      const token = secondToken.value;
      if (!(token && isLoggedIn.value)) return false;
      return isMaxButtonAvailable(token, secondTokenValue.value, networkFee.value, xor.value);
    });
    const isInsufficientBalance = computed(() => {
      if (isLoggedIn.value && areTokensSelected.value) {
        if (firstToken.value && hasInsufficientBalance(firstToken.value, firstTokenValue.value, networkFee.value)) {
          insufficientBalanceTokenSymbol.value = firstToken.value.symbol;
          return true;
        }
        if (secondToken.value && hasInsufficientBalance(secondToken.value, secondTokenValue.value, networkFee.value)) {
          insufficientBalanceTokenSymbol.value = secondToken.value.symbol;
          return true;
        }
      }
      insufficientBalanceTokenSymbol.value = "";
      return false;
    });
    const firstLiquidityProviderInfo = computed(
      () => sanitizeHtml(t("createPair.firstLiquidityProviderInfo"), {
        allowedTags: ["strong", "em", "span", "p", "br"],
        allowedAttributes: {
          "*": ["class"]
        }
      })
    );
    const setFirstTokenAddress = (address) => store.dispatch.addLiquidity.setFirstTokenAddress(address);
    const setSecondTokenAddress = (address) => store.dispatch.addLiquidity.setSecondTokenAddress(address);
    const setFirstTokenValue = (value) => store.dispatch.addLiquidity.setFirstTokenValue(value);
    const setSecondTokenValue = (value) => store.dispatch.addLiquidity.setSecondTokenValue(value);
    const addLiquidity = () => store.dispatch.addLiquidity.addLiquidity();
    const updateSubscriptions = () => store.dispatch.addLiquidity.updateSubscriptions();
    const resetSubscriptions = () => store.dispatch.addLiquidity.resetSubscriptions();
    const setFocusedField = (value) => store.commit.addLiquidity.setFocusedField(value);
    watch(
      nodeIsConnected,
      (connected) => {
        if (connected) {
          void updateSubscriptions();
        } else {
          void resetSubscriptions();
        }
      },
      { immediate: true }
    );
    onBeforeUnmount(() => {
      resetSubscriptions();
    });
    const handleTokenChange = async (value, setter) => {
      await setter(value);
    };
    const handleAddLiquidityMaxValue = async (token, setter) => {
      if (!token) return;
      await handleTokenChange(getMaxValue(token, networkFee.value), setter);
    };
    const handleAddLiquidity = async () => {
      if (allowFeePopup.value && !isXorSufficientForNextOperation()) {
        openWarningFeeDialog();
        await waitOnFeeWarningConfirmation();
        if (!isWarningFeeDialogConfirmed.value) {
          return;
        }
        isWarningFeeDialogConfirmed.value = false;
        closeWarningFeeDialog();
      }
      await confirmOrExecute(depositLiquidity);
    };
    const confirmOrExecute = async (handler) => {
      if (isConfirmTxDisabled.value) {
        await handler();
        return;
      }
      confirmDialogVisible.value = true;
    };
    const getTokenBalance = (token) => getAssetBalance(token);
    const openSelectTokenDialog = (isFirst) => {
      isFirstTokenSelected.value = isFirst;
      showSelectTokenDialog.value = true;
    };
    const selectToken = async (token) => {
      const address = token?.address;
      if (!address) return;
      await withSelectAssetLoading(async () => {
        if (isFirstTokenSelected.value) {
          await setFirstTokenAddress(address);
        } else {
          await setSecondTokenAddress(address);
        }
        if (firstToken.value?.address === XSTUSD.address && secondToken.value?.address === XOR.address) {
          await setFirstTokenAddress(XOR.address);
          await setSecondTokenAddress(XSTUSD.address);
        }
      });
    };
    const depositLiquidity = async () => {
      await withNotifications(async () => {
        await addLiquidity();
        emit("back");
      });
      confirmDialogVisible.value = false;
    };
    __expose({
      handleAddLiquidity,
      confirmDialogVisible,
      showWarningFeeDialog,
      depositLiquidity
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_button = resolveComponent("s-button");
      const _component_s_form = resolveComponent("s-form");
      return openBlock(), createElementBlock("div", null, [
        createVNode(_component_s_form, {
          class: "el-form--actions",
          "show-message": false
        }, {
          default: withCtx(() => [
            createVNode(unref(TokenInput), {
              balance: getTokenBalance(unref(firstToken)),
              "is-select-available": "",
              "is-max-available": isFirstMaxButtonAvailable.value,
              title: unref(t)("createPair.deposit"),
              token: unref(firstToken),
              "model-value": unref(firstTokenValue),
              disabled: !areTokensSelected.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => handleTokenChange($event, setFirstTokenValue)),
              onFocus: _cache[1] || (_cache[1] = ($event) => setFocusedField(unref(FocusedField).First)),
              onMax: _cache[2] || (_cache[2] = ($event) => handleAddLiquidityMaxValue($event, setFirstTokenValue)),
              onSelect: _cache[3] || (_cache[3] = ($event) => openSelectTokenDialog(true))
            }, null, 8, ["balance", "is-max-available", "title", "token", "model-value", "disabled"]),
            createVNode(_component_s_icon, {
              class: "icon-divider",
              name: "plus-16"
            }),
            createVNode(unref(TokenInput), {
              balance: getTokenBalance(unref(secondToken)),
              "is-select-available": "",
              "is-max-available": isSecondMaxButtonAvailable.value,
              title: unref(t)("createPair.deposit"),
              token: unref(secondToken),
              "model-value": unref(secondTokenValue),
              disabled: !areTokensSelected.value,
              "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => handleTokenChange($event, setSecondTokenValue)),
              onFocus: _cache[5] || (_cache[5] = ($event) => setFocusedField(unref(FocusedField).Second)),
              onMax: _cache[6] || (_cache[6] = ($event) => handleAddLiquidityMaxValue($event, setSecondTokenValue)),
              onSelect: _cache[7] || (_cache[7] = ($event) => openSelectTokenDialog(false))
            }, null, 8, ["balance", "is-max-available", "title", "token", "model-value", "disabled"]),
            createVNode(unref(SlippageTolerance), { class: "slippage-tolerance-settings" }),
            createVNode(_component_s_button, {
              type: "primary",
              class: "action-button s-typography-button--large",
              disabled: !areTokensSelected.value || unref(emptyAssets) || isInsufficientBalance.value,
              loading: unref(loading) || unref(isSelectAssetLoading),
              onClick: handleAddLiquidity
            }, {
              default: withCtx(() => [
                !areTokensSelected.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(toDisplayString(unref(t)("buttons.chooseTokens")), 1)
                ], 64)) : unref(emptyAssets) ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode(toDisplayString(unref(t)("buttons.enterAmount")), 1)
                ], 64)) : isInsufficientBalance.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: insufficientBalanceTokenSymbol.value })), 1)
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 3 }, [
                  createTextVNode(toDisplayString(unref(t)("createPair.supply")), 1)
                ], 64))
              ]),
              _: 1
            }, 8, ["disabled", "loading"]),
            areTokensSelected.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
              !(unref(isAvailable) && isNotFirstLiquidityProvider.value) && unref(emptyAssets) ? (openBlock(), createElementBlock("div", _hoisted_1, [
                createBaseVNode("p", _hoisted_2, toDisplayString(unref(t)("createPair.firstLiquidityProvider")), 1),
                createVNode(unref(InfoLine), null, {
                  "info-line-prefix": withCtx(() => [
                    createBaseVNode("p", {
                      class: "info-line--first-liquidity",
                      innerHTML: firstLiquidityProviderInfo.value
                    }, null, 8, _hoisted_3)
                  ]),
                  _: 1
                })
              ])) : createCommentVNode("", true),
              !unref(emptyAssets) || (liquidityInfo.value || {}).balance ? (openBlock(), createBlock(unref(AddLiquidityTransactionDetails), {
                key: 1,
                "info-only": false,
                class: "info-line-container"
              })) : createCommentVNode("", true)
            ], 64)) : createCommentVNode("", true)
          ]),
          _: 1
        }),
        createVNode(selectToken, {
          "is-add-liquidity": "",
          "append-to-body": "",
          visible: showSelectTokenDialog.value,
          "onUpdate:visible": _cache[8] || (_cache[8] = ($event) => showSelectTokenDialog.value = $event),
          connected: isLoggedIn.value,
          asset: isFirstTokenSelected.value ? unref(secondToken) : unref(firstToken),
          "is-first-token-selected": isFirstTokenSelected.value,
          "disabled-custom": isFirstTokenSelected.value,
          onSelect: selectToken
        }, null, 8, ["visible", "connected", "asset", "is-first-token-selected", "disabled-custom"]),
        createVNode(unref(AddLiquidityConfirm), {
          visible: confirmDialogVisible.value,
          "onUpdate:visible": _cache[9] || (_cache[9] = ($event) => confirmDialogVisible.value = $event),
          "parent-loading": unref(loading),
          "share-of-pool": shareOfPool.value,
          "first-token": unref(firstToken),
          "second-token": unref(secondToken),
          "first-token-value": unref(firstTokenValue),
          "second-token-value": unref(secondTokenValue),
          price: unref(price),
          "price-reversed": unref(priceReversed),
          "slippage-tolerance": slippageToleranceValue.value,
          "insufficient-balance-token-symbol": insufficientBalanceTokenSymbol.value,
          onConfirm: depositLiquidity
        }, null, 8, ["visible", "parent-loading", "share-of-pool", "first-token", "second-token", "first-token-value", "second-token-value", "price", "price-reversed", "slippage-tolerance", "insufficient-balance-token-symbol"]),
        createVNode(unref(NetworkFeeWarningDialog), {
          visible: unref(showWarningFeeDialog),
          "onUpdate:visible": _cache[10] || (_cache[10] = ($event) => isRef(showWarningFeeDialog) ? showWarningFeeDialog.value = $event : null),
          fee: removeLiquidityFormattedFee.value,
          onConfirm: unref(confirmNetworkFeeWariningDialog)
        }, null, 8, ["visible", "fee", "onConfirm"])
      ]);
    };
  }
});
const Form = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-f2a73317"]]);
export {
  Form as default
};
