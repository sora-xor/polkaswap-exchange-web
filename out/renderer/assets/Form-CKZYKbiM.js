import { z as defineComponent, aZ as components, ak as lazyComponent, al as Components, u as useTranslation, H as useAssetsStore, G as useInternalConnect, c2 as useTransaction, X as XOR, cm as debouncedInputHandler, aA as watch, a4 as onMounted, aB as onBeforeUnmount, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aj as unref, h as computed, an as createSlots, aO as createTextVNode, aN as toDisplayString, a9 as ref, A as createElementBlock, bQ as Fragment, aK as KnownSymbols, aM as createCommentVNode, ar as isRef, as as mergeProps, ad as asZeroValue, ay as api, M as getMaxValue, O as Operation, s as store, F as FPNumber, cu as isMaxButtonAvailable, cv as hasInsufficientBalance, aS as hasInsufficientXorForFee, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useConfirmDialog } from "./useConfirmDialog-CVL8UdZp.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { u as useSwapAmounts } from "./useSwapAmounts-COuMA7gl.js";
import { u as useTokenSelect } from "./useTokenSelect-DZ9bQ0SE.js";
import { u as useSwapStore } from "./swap-DtWqRzUD.js";
import { i as isSelectableAsset } from "./utils-BPrAXW0V.js";
import { a as getVisibleSwapTokenBalance, c as calcFiatDifference, g as getDifferenceStatus, D as DifferenceStatus } from "./swap-sOuQz5wL.js";
const _hoisted_1 = { class: "swap-form" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "SwapFormWidget",
    components: {
      FormattedAmount: components.FormattedAmount,
      InfoLine: components.InfoLine
    }
  },
  __name: "Form",
  props: {
    parentLoading: { type: Boolean, default: false }
  },
  setup(__props) {
    const BaseWidget = lazyComponent(Components.BaseWidget);
    const SwapSettings = lazyComponent(Components.SwapSettings);
    const SwapConfirm = lazyComponent(Components.SwapConfirm);
    const SwapStatusActionBadge = lazyComponent(Components.SwapStatusActionBadge);
    const SwapTransactionDetails = lazyComponent(Components.SwapTransactionDetails);
    const SwapLossWarningDialog = lazyComponent(Components.SwapLossWarningDialog);
    const SlippageTolerance = lazyComponent(Components.SlippageTolerance);
    const SelectToken = lazyComponent(Components.SelectToken);
    const TokenInput = lazyComponent(Components.TokenInput);
    const ValueStatusWrapper = lazyComponent(Components.ValueStatusWrapper);
    const props = __props;
    const { t } = useTranslation();
    const swapStore = useSwapStore();
    const assetsStore = useAssetsStore();
    const {
      tokenFrom,
      tokenTo,
      fromValue,
      toValue,
      areTokensSelected,
      hasZeroAmount,
      areZeroAmounts,
      isZeroFromAmount,
      isZeroToAmount,
      setTokenFromAddress,
      setTokenToAddress,
      setFromValue,
      setToValue
    } = useSwapAmounts();
    const { isLoggedIn, connectSoraWallet } = useInternalConnect();
    const { confirmDialogVisible, confirmOrExecute } = useConfirmDialog();
    const { isSelectAssetLoading, withSelectAssetLoading } = useTokenSelect();
    const { loading, withApi, withNotifications } = useTransaction({
      parentLoading: computed(() => props.parentLoading)
    });
    const {
      getFPNumber,
      getFPNumberFromCodec,
      formatCodecNumber,
      formatStringValue,
      getFiatAmountByCodecString,
      getFPNumberFiatAmountByFPNumber
    } = useFormattedAmount();
    const networkFees = computed(() => store.state.wallet.settings.networkFees);
    const networkFee = computed(() => networkFees.value[Operation.Swap]);
    const slippageToleranceValue = computed(() => store.state.settings.slippageTolerance);
    const xor = computed(() => assetsStore.assetDataByAddress(XOR.address));
    const liquiditySource = computed(() => swapStore.swapLiquiditySource);
    const debugEnabled = computed(() => Boolean(store.getters?.settings?.debugEnabled));
    const nodeIsConnected = computed(() => Boolean(store.getters?.settings?.nodeIsConnected));
    const swapMarketAlgorithm = computed(() => swapStore.swapMarketAlgorithm);
    const isAvailable = computed(() => swapStore.isAvailable);
    const allowLossPopup = computed(() => swapStore.allowLossPopup);
    const isExchangeB = computed(() => swapStore.isExchangeB);
    const selectedDexId = computed(() => swapStore.selectedDexId);
    const showSettings = ref(false);
    const showSelectTokenDialog = ref(false);
    const lossWarningVisibility = ref(false);
    const isTokenFromSelected = ref(false);
    const quoteSubscription = ref(null);
    const quoteLoading = ref(false);
    const xorSymbol = ` ${XOR.symbol}`;
    const fiatDifference = computed(() => calcFiatDifference(fromFiatAmount.value, toFiatAmount.value).toFixed(2));
    const fiatDifferenceFormatted = computed(() => formatStringValue(fiatDifference.value));
    const isErrorFiatDifferenceStatus = computed(
      () => getDifferenceStatus(Number(fiatDifference.value) || 0) === DifferenceStatus.Error
    );
    const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
    const tokenFromSymbol = computed(() => tokenFrom.value?.symbol ?? "");
    const isXorOutputSwap = computed(() => tokenTo.value?.address === XOR.address);
    const preparedForSwap = computed(() => isLoggedIn.value && areTokensSelected.value);
    const fromFiatAmount = computed(() => {
      if (!tokenFrom.value || !fromValue.value) return FPNumber.ZERO;
      return getFPNumberFiatAmountByFPNumber(new FPNumber(fromValue.value), tokenFrom.value) ?? FPNumber.ZERO;
    });
    const toFiatAmount = computed(() => {
      if (!tokenTo.value || !toValue.value) return FPNumber.ZERO;
      return getFPNumberFiatAmountByFPNumber(new FPNumber(toValue.value), tokenTo.value) ?? FPNumber.ZERO;
    });
    const isMaxSwapAvailable = computed(() => {
      if (!preparedForSwap.value || !tokenFrom.value) return false;
      return isMaxButtonAvailable(tokenFrom.value, fromValue.value, networkFee.value, xor.value, isXorOutputSwap.value);
    });
    const isInsufficientLiquidity = computed(
      () => isAvailable.value && preparedForSwap.value && !areZeroAmounts.value && hasZeroAmount.value
    );
    const isInsufficientBalance = computed(() => {
      if (!tokenFrom.value) return false;
      return preparedForSwap.value && hasInsufficientBalance(tokenFrom.value, fromValue.value, networkFee.value);
    });
    const isInsufficientXorForFee = computed(() => {
      const result = preparedForSwap.value && hasInsufficientXorForFee(xor.value, networkFee.value, isXorOutputSwap.value);
      if (result || !isXorOutputSwap.value) {
        return result;
      }
      const xorBalance = getFPNumberFromCodec(xor.value.balance?.transferable ?? "0", xor.value.decimals);
      const fpNetworkFee = getFPNumberFromCodec(networkFee.value, xor.value.decimals).sub(xorBalance);
      const fpAmount = getFPNumber(toValue.value || "0", xor.value.decimals).sub(
        FPNumber.gt(fpNetworkFee, FPNumber.ZERO) ? fpNetworkFee : FPNumber.ZERO
      );
      return FPNumber.lte(fpAmount, FPNumber.ZERO);
    });
    const isConfirmSwapDisabled = computed(
      () => !areTokensSelected.value || !swapStore.isAvailable || areZeroAmounts.value || isInsufficientLiquidity.value || isInsufficientBalance.value || isInsufficientXorForFee.value
    );
    const recountSwapValues = debouncedInputHandler(async () => {
      await runRecountSwapValues();
    }, 100);
    function getTokenBalance(token) {
      return getVisibleSwapTokenBalance(token, isLoggedIn.value);
    }
    function resetFieldFrom() {
      setFromValue("");
    }
    function resetFieldTo() {
      setToValue("");
    }
    async function handleInputFieldFrom(value) {
      swapStore.setExchangeB(false);
      if (!areTokensSelected.value || asZeroValue(value)) {
        resetFieldTo();
      }
      if (value === fromValue.value) return;
      setFromValue(value);
      recountSwapValues();
    }
    async function handleInputFieldTo(value) {
      swapStore.setExchangeB(true);
      if (!areTokensSelected.value || asZeroValue(value)) {
        resetFieldFrom();
      }
      if (value === toValue.value) return;
      setToValue(value);
      recountSwapValues();
    }
    async function runRecountSwapValues() {
      const value = isExchangeB.value ? toValue.value : fromValue.value;
      const quote = swapStore.swapQuote;
      if (!areTokensSelected.value || asZeroValue(value) || !quote) {
        swapStore.setAmountWithoutImpact();
        swapStore.setLiquidityProviderFee();
        swapStore.setRewards();
        swapStore.setRoute();
        swapStore.setDistribution();
        swapStore.selectDexId();
        return;
      }
      const setOppositeValue = isExchangeB.value ? setFromValue : setToValue;
      const resetOppositeValue = isExchangeB.value ? resetFieldFrom : resetFieldTo;
      const oppositeToken = isExchangeB.value ? tokenFrom.value : tokenTo.value;
      try {
        const {
          dexId,
          result: { amount, amountWithoutImpact, fee, rewards, route, distribution }
        } = quote(
          tokenFrom.value.address,
          tokenTo.value.address,
          value,
          isExchangeB.value,
          [liquiditySource.value].filter(Boolean)
        );
        if (debugEnabled.value) {
          const rpcResult = await api.swap.getResultRpc(
            tokenFrom.value.address,
            tokenTo.value.address,
            value,
            isExchangeB.value,
            liquiditySource.value ?? void 0
          );
          console.table({
            frontend: amount,
            backend: rpcResult.amount,
            difference: +amount - +rpcResult.amount
          });
        }
        setOppositeValue(getFPNumberFromCodec(amount, oppositeToken.decimals).toString());
        swapStore.setAmountWithoutImpact(amountWithoutImpact);
        swapStore.setLiquidityProviderFee(fee);
        swapStore.setRewards(rewards);
        swapStore.setRoute(route);
        swapStore.setDistribution(distribution);
        swapStore.selectDexId(dexId);
      } catch (error) {
        console.error(error);
        resetOppositeValue();
      }
    }
    function resetQuoteSubscription() {
      quoteSubscription.value?.unsubscribe();
      quoteSubscription.value = null;
    }
    async function refreshSwapQuotesConfiguration() {
      try {
        await api.swap.update();
      } catch (error) {
        console.warn("[swap] api.swap.update skipped", error);
      }
    }
    async function subscribeOnQuote() {
      resetQuoteSubscription();
      if (!areTokensSelected.value) {
        quoteLoading.value = false;
        swapStore.setSubscriptionPayload();
        await runRecountSwapValues();
        return;
      }
      quoteLoading.value = true;
      const observableQuote = api.swap.getDexesSwapQuoteObservable(
        tokenFrom.value.address,
        tokenTo.value.address
      );
      if (observableQuote) {
        quoteSubscription.value = observableQuote.subscribe({
          next: (quoteData) => {
            const { quote, isAvailable: isAvailable2, liquiditySources } = quoteData;
            swapStore.setSubscriptionPayload({ quote, isAvailable: isAvailable2, liquiditySources });
            recountSwapValues();
            quoteLoading.value = false;
          },
          error: (error) => {
            console.error("[swap] quote subscription failed", error);
            swapStore.setSubscriptionPayload();
            quoteLoading.value = false;
            void runRecountSwapValues();
          },
          complete: () => {
            quoteLoading.value = false;
          }
        });
      } else {
        swapStore.setSubscriptionPayload();
        quoteLoading.value = false;
        await runRecountSwapValues();
      }
    }
    async function enableSwapSubscriptions(withApiRefresh = false) {
      if (withApiRefresh) {
        await refreshSwapQuotesConfiguration();
      }
      swapStore.updateSubscriptions();
      await subscribeOnQuote();
    }
    function resetSwapSubscriptions() {
      swapStore.resetSubscriptions();
      resetQuoteSubscription();
      quoteLoading.value = false;
      swapStore.setSubscriptionPayload();
      void runRecountSwapValues();
    }
    function openSelectTokenDialog(isFrom) {
      isTokenFromSelected.value = isFrom;
      showSelectTokenDialog.value = true;
    }
    async function handleSelectToken(token) {
      if (!isSelectableAsset(token)) return;
      await withSelectAssetLoading(async () => {
        if (isTokenFromSelected.value) {
          await setTokenFromAddress(token.address);
        } else {
          await setTokenToAddress(token.address);
        }
      });
    }
    function handleSwapClick() {
      if (isErrorFiatDifferenceStatus.value && allowLossPopup.value) {
        lossWarningVisibility.value = true;
      } else {
        handleConfirm();
      }
    }
    function handleConfirm() {
      confirmOrExecute(exchangeTokens);
    }
    async function exchangeTokens() {
      if (isConfirmSwapDisabled.value) return;
      await withNotifications(async () => {
        await api.swap.execute(
          tokenFrom.value,
          tokenTo.value,
          fromValue.value,
          toValue.value,
          slippageToleranceValue.value,
          isExchangeB.value,
          liquiditySource.value,
          selectedDexId.value
        );
        resetFieldFrom();
        resetFieldTo();
        swapStore.setExchangeB(false);
      });
    }
    function handleFocusField(exchangeB = false) {
      const isZeroValue = exchangeB ? isZeroToAmount.value : isZeroFromAmount.value;
      const previous = isExchangeB.value;
      swapStore.setExchangeB(exchangeB);
      if (isZeroValue) {
        resetFieldFrom();
        resetFieldTo();
      }
      if (previous !== isExchangeB.value) {
        recountSwapValues();
      }
    }
    async function handleSwitchTokens() {
      if (!areTokensSelected.value) return;
      await swapStore.switchTokens();
      await subscribeOnQuote();
      recountSwapValues();
    }
    function handleMaxValue() {
      if (!tokenFrom.value) return;
      swapStore.setExchangeB(false);
      const max = getMaxValue(tokenFrom.value, networkFee.value);
      handleInputFieldFrom(max);
    }
    function openSettingsDialog() {
      showSettings.value = true;
    }
    watch(
      [() => tokenFrom.value?.address ?? "", () => tokenTo.value?.address ?? ""],
      ([fromAddress, toAddress], [prevFromAddress, prevToAddress]) => {
        if (fromAddress === prevFromAddress && toAddress === prevToAddress) return;
        void subscribeOnQuote();
      }
    );
    watch(liquiditySource, () => {
      runRecountSwapValues();
    });
    watch(nodeIsConnected, async (connected) => {
      if (connected) {
        await enableSwapSubscriptions(true);
      } else {
        resetSwapSubscriptions();
      }
    });
    onMounted(async () => {
      await withApi(async () => {
        await enableSwapSubscriptions(true);
      });
    });
    onBeforeUnmount(() => {
      resetSwapSubscriptions();
      swapStore.reset();
    });
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      const _component_formatted_amount = resolveComponent("formatted-amount");
      const _component_s_icon = resolveComponent("s-icon");
      const _component_info_line = resolveComponent("info-line");
      return openBlock(), createBlock(unref(BaseWidget), mergeProps({
        class: "swap-widget",
        title: unref(t)("exchange.Swap")
      }, _ctx.$attrs), {
        filters: withCtx(() => [
          createVNode(unref(SwapStatusActionBadge), null, {
            label: withCtx(() => [
              createTextVNode(toDisplayString(unref(t)("marketText")) + ":", 1)
            ]),
            value: withCtx(() => [
              createTextVNode(toDisplayString(swapMarketAlgorithm.value), 1)
            ]),
            action: withCtx(() => [
              createVNode(_component_s_button, {
                class: "el-button--settings",
                type: "action",
                icon: "basic-settings-24",
                onClick: openSettingsDialog
              })
            ]),
            _: 1
          })
        ]),
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createVNode(unref(TokenInput), {
              "data-test-name": "swapFrom",
              "is-select-available": "",
              balance: getTokenBalance(unref(tokenFrom)),
              "is-max-available": isMaxSwapAvailable.value,
              title: unref(t)("transfers.from"),
              token: unref(tokenFrom),
              "model-value": unref(fromValue),
              "onUpdate:modelValue": handleInputFieldFrom,
              onFocus: _cache[0] || (_cache[0] = ($event) => handleFocusField(false)),
              onMax: handleMaxValue,
              onSelect: _cache[1] || (_cache[1] = ($event) => openSelectTokenDialog(true))
            }, null, 8, ["balance", "is-max-available", "title", "token", "model-value"]),
            createVNode(_component_s_button, {
              class: "el-button--switch-tokens",
              "data-test-name": "switchToken",
              type: "action",
              icon: "arrows-swap-90-24",
              disabled: !unref(areTokensSelected),
              onClick: handleSwitchTokens
            }, null, 8, ["disabled"]),
            createVNode(unref(TokenInput), {
              "data-test-name": "swapTo",
              "is-select-available": "",
              balance: getTokenBalance(unref(tokenTo)),
              title: unref(t)("transfers.to"),
              token: unref(tokenTo),
              "model-value": unref(toValue),
              "onUpdate:modelValue": handleInputFieldTo,
              onFocus: _cache[2] || (_cache[2] = ($event) => handleFocusField(true)),
              onSelect: _cache[3] || (_cache[3] = ($event) => openSelectTokenDialog(false))
            }, createSlots({ _: 2 }, [
              unref(tokenTo) ? {
                name: "fiat-amount-append",
                fn: withCtx(() => [
                  createVNode(unref(ValueStatusWrapper), {
                    value: fiatDifference.value,
                    badge: "",
                    class: "price-difference__value"
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_formatted_amount, { value: fiatDifferenceFormatted.value }, {
                        default: withCtx(() => [..._cache[8] || (_cache[8] = [
                          createTextVNode("%", -1)
                        ])]),
                        _: 1
                      }, 8, ["value"])
                    ]),
                    _: 1
                  }, 8, ["value"])
                ]),
                key: "0"
              } : void 0
            ]), 1032, ["balance", "title", "token", "model-value"]),
            createVNode(unref(SlippageTolerance), { class: "slippage-tolerance-settings" }),
            !unref(isLoggedIn) ? (openBlock(), createBlock(_component_s_button, {
              key: 0,
              type: "primary",
              class: "action-button s-typography-button--large",
              onClick: unref(connectSoraWallet)
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(unref(t)("connectWalletText")), 1)
              ]),
              _: 1
            }, 8, ["onClick"])) : (openBlock(), createBlock(_component_s_button, {
              key: 1,
              class: "action-button s-typography-button--large",
              "data-test-name": "confirmSwap",
              type: "primary",
              disabled: isConfirmSwapDisabled.value,
              loading: unref(loading) || quoteLoading.value || unref(isSelectAssetLoading),
              onClick: handleSwapClick
            }, {
              default: withCtx(() => [
                !unref(areTokensSelected) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(toDisplayString(unref(t)("buttons.chooseTokens")), 1)
                ], 64)) : !isAvailable.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode(toDisplayString(unref(t)("pairIsNotCreated")), 1)
                ], 64)) : unref(areZeroAmounts) ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                  createTextVNode(toDisplayString(unref(t)("buttons.enterAmount")), 1)
                ], 64)) : isInsufficientLiquidity.value ? (openBlock(), createElementBlock(Fragment, { key: 3 }, [
                  createTextVNode(toDisplayString(unref(t)("swap.insufficientLiquidity")), 1)
                ], 64)) : isInsufficientBalance.value ? (openBlock(), createElementBlock(Fragment, { key: 4 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: tokenFromSymbol.value })), 1)
                ], 64)) : isInsufficientXorForFee.value ? (openBlock(), createElementBlock(Fragment, { key: 5 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: unref(KnownSymbols).XOR })), 1)
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 6 }, [
                  isErrorFiatDifferenceStatus.value ? (openBlock(), createBlock(_component_s_icon, {
                    key: 0,
                    name: "notifications-alert-triangle-24",
                    size: "18",
                    class: "action-button-icon"
                  })) : createCommentVNode("", true),
                  createTextVNode(" " + toDisplayString(unref(t)("exchange.Swap")), 1)
                ], 64))
              ]),
              _: 1
            }, 8, ["disabled", "loading"])),
            createVNode(unref(SwapTransactionDetails), {
              disabled: !unref(areTokensSelected) || unref(hasZeroAmount),
              class: "swap-details"
            }, {
              reference: withCtx(() => [
                createVNode(_component_info_line, {
                  label: unref(t)("networkFeeText"),
                  "label-tooltip": unref(t)("networkFeeTooltipText"),
                  value: networkFeeFormatted.value,
                  "asset-symbol": xorSymbol,
                  "fiat-value": unref(getFiatAmountByCodecString)(networkFee.value),
                  "is-formatted": "",
                  class: "swap-details-info-line"
                }, null, 8, ["label", "label-tooltip", "value", "fiat-value"])
              ]),
              _: 1
            }, 8, ["disabled"]),
            createVNode(unref(SelectToken), {
              visible: showSelectTokenDialog.value,
              "onUpdate:visible": _cache[4] || (_cache[4] = ($event) => showSelectTokenDialog.value = $event),
              connected: unref(isLoggedIn),
              asset: isTokenFromSelected.value ? unref(tokenTo) : unref(tokenFrom),
              onSelect: handleSelectToken
            }, null, 8, ["visible", "connected", "asset"]),
            createVNode(unref(SwapLossWarningDialog), {
              visible: lossWarningVisibility.value,
              "onUpdate:visible": _cache[5] || (_cache[5] = ($event) => lossWarningVisibility.value = $event),
              value: fiatDifferenceFormatted.value,
              onConfirm: handleConfirm
            }, null, 8, ["visible", "value"]),
            createVNode(unref(SwapConfirm), {
              visible: unref(confirmDialogVisible),
              "onUpdate:visible": _cache[6] || (_cache[6] = ($event) => isRef(confirmDialogVisible) ? confirmDialogVisible.value = $event : null),
              "is-insufficient-balance": isInsufficientBalance.value,
              onConfirm: exchangeTokens
            }, null, 8, ["visible", "is-insufficient-balance"]),
            createVNode(unref(SwapSettings), {
              visible: showSettings.value,
              "onUpdate:visible": _cache[7] || (_cache[7] = ($event) => showSettings.value = $event)
            }, null, 8, ["visible"])
          ])
        ]),
        _: 1
      }, 16, ["title"]);
    };
  }
});
const SwapFormWidget = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-a2f06353"]]);
export {
  SwapFormWidget as default
};
