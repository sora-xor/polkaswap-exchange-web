import { z as defineComponent, u as useTranslation, c2 as useTransaction, bD as poolLazyComponent, bE as PoolComponents, ak as lazyComponent, al as Components, X as XOR, aA as watch, a4 as onMounted, aB as onBeforeUnmount, a9 as ref, a_ as resolveComponent, A as createElementBlock, C as openBlock, ap as createVNode, ao as withCtx, am as createBlock, aM as createCommentVNode, aj as unref, dM as FocusedField, h as computed, bb as normalizeClass, D as createBaseVNode, aN as toDisplayString, aq as withModifiers, aO as createTextVNode, bQ as Fragment, bP as renderList, ar as isRef, s as store, b5 as nextTick, O as Operation, F as FPNumber, aS as hasInsufficientXorForFee, aU as formatDecimalPlaces, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { u as useNetworkFeeWarning, a as useNetworkFeeDialog } from "./useNetworkFeeDialog-BJBwx4Px.js";
const _hoisted_1 = {
  slot: "top",
  class: "input-title"
};
const _hoisted_2 = {
  slot: "right",
  class: "el-buttons el-buttons--between"
};
const _hoisted_3 = { slot: "bottom" };
const _hoisted_4 = { class: "locked-part-percent" };
const MAX_PART = 100;
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Form",
  props: {
    parentLoading: { type: Boolean, default: false }
  },
  emits: ["back"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const rootRef = ref(null);
    const sliderInputRef = ref(null);
    const sliderDragButtonRef = ref(null);
    const { t } = useTranslation();
    const { formatCodecNumber, getFPNumber } = useFormattedAmount();
    const { loading, withNotifications } = useTransaction();
    const { allowFeePopup, isXorSufficientForNextTx, networkFees } = useNetworkFeeWarning();
    const {
      showWarningFeeDialog,
      isWarningFeeDialogConfirmed,
      openWarningFeeDialog,
      closeWarningFeeDialog,
      confirmNetworkFeeWariningDialog,
      waitOnFeeWarningConfirmation
    } = useNetworkFeeDialog();
    const removePart = computed(() => store.state.removeLiquidity.removePart);
    const liquidityAmount = computed(() => store.state.removeLiquidity.liquidityAmount);
    const firstTokenAmount = computed(() => store.state.removeLiquidity.firstTokenAmount);
    const secondTokenAmount = computed(() => store.state.removeLiquidity.secondTokenAmount);
    const focusedField = computed(() => store.state.removeLiquidity.focusedField);
    const liquidity = computed(() => store.getters.removeLiquidity.liquidity);
    const liquidityBalanceFull = computed(() => store.getters.removeLiquidity.liquidityBalanceFull);
    const liquidityBalance = computed(() => store.getters.removeLiquidity.liquidityBalance);
    const demeterLockedBalance = computed(() => store.getters.removeLiquidity.demeterLockedBalance);
    const ceresLockedBalance = computed(() => store.getters.removeLiquidity.ceresLockedBalance);
    const firstToken = computed(() => store.getters.removeLiquidity.firstToken);
    const secondToken = computed(() => store.getters.removeLiquidity.secondToken);
    const firstTokenBalance = computed(() => store.getters.removeLiquidity.firstTokenBalance);
    const secondTokenBalance = computed(() => store.getters.removeLiquidity.secondTokenBalance);
    const shareOfPool = computed(() => store.getters.removeLiquidity.shareOfPool);
    const price = computed(() => store.getters.removeLiquidity.price);
    const priceReversed = computed(() => store.getters.removeLiquidity.priceReversed);
    const xor = computed(() => store.getters.assets.xor);
    const isConfirmTxDisabled = computed(() => store.state.wallet.transactions.isConfirmTxDialogDisabled);
    const shouldBalanceBeHidden = computed(() => Boolean(store.state.wallet.settings.shouldBalanceBeHidden));
    const combinedParentLoading = computed(() => Boolean(props.parentLoading) || loading.value);
    const confirmDialogVisible = ref(false);
    const RemoveLiquidityConfirm = poolLazyComponent(PoolComponents.RemoveLiquidityConfirm);
    const RemoveLiquidityTransactionDetails = poolLazyComponent(PoolComponents.RemoveLiquidityTransactionDetails);
    const SlippageTolerance = lazyComponent(Components.SlippageTolerance);
    const NetworkFeeWarningDialog = lazyComponent(Components.NetworkFeeWarningDialog);
    const TokenInput = lazyComponent(Components.TokenInput);
    const XOR_SYMBOL = XOR.symbol;
    const networkFee = computed(() => networkFees.value?.[Operation.RemoveLiquidity] ?? "0");
    const formattedFee = computed(() => formatCodecNumber(networkFee.value));
    const sliderValue = computed(() => {
      const value = removePart.value;
      return value ? Number(value) : void 0;
    });
    const isEmptyAmount = computed(() => {
      return !Number(liquidityAmount.value) || !firstTokenAmount.value || !secondTokenAmount.value;
    });
    const liquidityLocked = computed(() => liquidityBalance.value.isZero());
    const locks = computed(
      () => [
        { balance: demeterLockedBalance.value, lock: "Demeter Farming" },
        { balance: ceresLockedBalance.value, lock: "Ceres Liquidity Locker" }
      ].reduce((acc, { balance, lock }) => {
        if (!balance.isZero()) {
          acc.push({
            lock,
            percent: getLockedPercent(balance)
          });
        }
        return acc;
      }, [])
    );
    const isInsufficientBalance = computed(() => {
      const liquidityAmountValue = getFPNumber(liquidityAmount.value || "0");
      const firstAmountValue = getFPNumber(firstTokenAmount.value || "0");
      const secondAmountValue = getFPNumber(secondTokenAmount.value || "0");
      return FPNumber.gt(liquidityAmountValue, liquidityBalance.value) || FPNumber.gt(firstAmountValue, firstTokenBalance.value) || FPNumber.gt(secondAmountValue, secondTokenBalance.value);
    });
    const isInsufficientXorForFee = computed(
      () => Boolean(xor.value) && hasInsufficientXorForFee(xor.value, networkFee.value)
    );
    const removePartCharClass = computed(() => {
      const length = removePart.value?.length ?? 0;
      const charClassName = { 3: "three", 2: "two" }[length] ?? "one";
      return `${charClassName}-char`;
    });
    const isMaxButtonAvailable = computed(() => {
      if (shouldBalanceBeHidden.value) return false;
      return !liquidityLocked.value && Number(removePart.value || 0) !== MAX_PART;
    });
    const setFocusedField = (field) => {
      store.commit.removeLiquidity.setFocusedField(field);
    };
    const resetFocusedField = () => {
      store.commit.removeLiquidity.resetFocusedField();
    };
    const setRemovePart = async (value) => {
      await store.dispatch.removeLiquidity.setRemovePart(value);
    };
    const setFirstTokenAmount = async (value) => {
      await store.dispatch.removeLiquidity.setFirstTokenAmount(String(value));
    };
    const setSecondTokenAmount = async (value) => {
      await store.dispatch.removeLiquidity.setSecondTokenAmount(String(value));
    };
    const removeLiquidityAction = async () => {
      await store.dispatch.removeLiquidity.removeLiquidity();
    };
    const getTokenMaxAmount = (tokenBalance) => tokenBalance.toString();
    const getLockedPercent = (lockedBalance) => {
      if (liquidityBalanceFull.value.isZero()) return "0";
      const percent = lockedBalance.div(liquidityBalanceFull.value).mul(FPNumber.HUNDRED);
      return formatDecimalPlaces(percent, true);
    };
    const handleRemovePartChange = async (value) => {
      if (Number(value) !== Number(removePart.value)) {
        await setRemovePart(String(value));
      }
    };
    const focusSliderInput = () => {
      setFocusedField(FocusedField.Percent);
      sliderInputRef.value?.focus();
    };
    const confirmOrExecute = async (handler) => {
      if (isConfirmTxDisabled.value) {
        await handler();
      } else {
        confirmDialogVisible.value = true;
      }
    };
    const isXorSufficientForNextOperation = () => {
      const params = { type: Operation.RemoveLiquidity };
      if (firstToken.value?.address === XOR.address) {
        params.amount = getFPNumber(firstTokenAmount.value || "0");
        params.isXor = true;
      }
      return isXorSufficientForNextTx(params);
    };
    const withdrawLiquidity = async () => {
      await withNotifications(async () => {
        await removeLiquidityAction();
        emit("back");
      });
      confirmDialogVisible.value = false;
    };
    const handleRemoveLiquidity = async () => {
      if (allowFeePopup.value && !isXorSufficientForNextOperation()) {
        openWarningFeeDialog();
        await waitOnFeeWarningConfirmation();
        if (!isWarningFeeDialogConfirmed.value) {
          closeWarningFeeDialog();
          return;
        }
        isWarningFeeDialogConfirmed.value = false;
        closeWarningFeeDialog();
      }
      await confirmOrExecute(withdrawLiquidity);
    };
    const addListenerToSliderDragButton = async () => {
      await nextTick();
      const root = rootRef.value;
      if (!root) return;
      sliderDragButtonRef.value = root.querySelector(".slider-container .el-slider__button");
      sliderInputRef.value = root.querySelector(".s-input--remove-part .el-input__inner");
      sliderDragButtonRef.value?.addEventListener("mousedown", focusSliderInput);
    };
    const removeListenerFromSliderDragButton = () => {
      sliderDragButtonRef.value?.removeEventListener("mousedown", focusSliderInput);
    };
    watch(
      liquidity,
      async () => {
        const field = focusedField.value;
        if (!field) {
          await setRemovePart(removePart.value || "");
          return;
        }
        if (field === FocusedField.First || field === FocusedField.Second) {
          const isFirstToken = field === FocusedField.First;
          const balance = Number(getTokenMaxAmount(isFirstToken ? firstTokenBalance.value : secondTokenBalance.value));
          const amount = Number(isFirstToken ? firstTokenAmount.value : secondTokenAmount.value);
          const setValue = isFirstToken ? setFirstTokenAmount : setSecondTokenAmount;
          const value = String(Number.isFinite(balance) ? Math.min(balance, amount) : amount);
          await setValue(value);
          return;
        }
        await setRemovePart(removePart.value || "");
      },
      { deep: true }
    );
    onMounted(addListenerToSliderDragButton);
    onBeforeUnmount(removeListenerFromSliderDragButton);
    __expose({
      handleRemoveLiquidity,
      confirmDialogVisible,
      showWarningFeeDialog
    });
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      const _component_s_slider = resolveComponent("s-slider");
      const _component_s_float_input = resolveComponent("s-float-input");
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_form = resolveComponent("s-form");
      return openBlock(), createElementBlock("div", {
        ref_key: "rootRef",
        ref: rootRef
      }, [
        createVNode(_component_s_form, {
          class: "el-form--actions",
          "show-message": false
        }, {
          default: withCtx(() => [
            createVNode(_component_s_float_input, {
              ref_key: "removePart",
              ref: removePart,
              size: "medium",
              class: normalizeClass(["s-input--remove-part", removePartCharClass.value]),
              value: removePart.value,
              decimals: 0,
              disabled: liquidityLocked.value,
              max: MAX_PART,
              onInput: handleRemovePartChange,
              onFocus: _cache[1] || (_cache[1] = ($event) => setFocusedField(unref(FocusedField).Percent)),
              onBlur: resetFocusedField
            }, {
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_1, toDisplayString(unref(t)("removeLiquidity.amount")), 1),
                createBaseVNode("div", _hoisted_2, [
                  _cache[6] || (_cache[6] = createBaseVNode("span", { class: "percent" }, "%", -1)),
                  isMaxButtonAvailable.value ? (openBlock(), createBlock(_component_s_button, {
                    key: 0,
                    class: "el-button--max s-typography-button--small",
                    type: "primary",
                    alternative: "",
                    size: "mini",
                    "border-radius": "mini",
                    onClick: _cache[0] || (_cache[0] = withModifiers(($event) => handleRemovePartChange(MAX_PART), ["stop"]))
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(unref(t)("buttons.max")), 1)
                    ]),
                    _: 1
                  })) : createCommentVNode("", true)
                ]),
                createBaseVNode("div", _hoisted_3, [
                  createVNode(_component_s_slider, {
                    class: "slider-container",
                    value: sliderValue.value,
                    disabled: liquidityLocked.value,
                    "show-tooltip": false,
                    onInput: handleRemovePartChange
                  }, null, 8, ["value", "disabled"]),
                  (openBlock(true), createElementBlock(Fragment, null, renderList(locks.value, ({ percent, lock }) => {
                    return openBlock(), createElementBlock("div", {
                      key: lock,
                      class: "input-line input-line--footer locked-part"
                    }, [
                      createBaseVNode("span", _hoisted_4, toDisplayString(percent), 1),
                      createTextVNode(" " + toDisplayString(unref(t)("removeLiquidity.locked", { lock })), 1)
                    ]);
                  }), 128))
                ])
              ]),
              _: 1
            }, 8, ["class", "value", "disabled"]),
            createVNode(_component_s_icon, {
              class: "icon-divider",
              name: "arrows-arrow-bottom-24"
            }),
            createVNode(unref(TokenInput), {
              disabled: liquidityLocked.value,
              max: getTokenMaxAmount(firstTokenBalance.value),
              title: unref(t)("removeLiquidity.output"),
              token: firstToken.value,
              value: firstTokenAmount.value,
              onInput: setFirstTokenAmount,
              onFocus: _cache[2] || (_cache[2] = ($event) => setFocusedField(unref(FocusedField).First)),
              onBlur: resetFocusedField
            }, {
              balance: withCtx(() => [..._cache[7] || (_cache[7] = [
                createTextVNode("-", -1)
              ])]),
              _: 1
            }, 8, ["disabled", "max", "title", "token", "value"]),
            createVNode(_component_s_icon, {
              class: "icon-divider",
              name: "plus-16"
            }),
            createVNode(unref(TokenInput), {
              disabled: liquidityLocked.value,
              max: getTokenMaxAmount(secondTokenBalance.value),
              title: unref(t)("removeLiquidity.output"),
              token: secondToken.value,
              value: secondTokenAmount.value,
              onInput: setSecondTokenAmount,
              onFocus: _cache[3] || (_cache[3] = ($event) => setFocusedField(unref(FocusedField).Second)),
              onBlur: resetFocusedField
            }, {
              balance: withCtx(() => [..._cache[8] || (_cache[8] = [
                createTextVNode("-", -1)
              ])]),
              _: 1
            }, 8, ["disabled", "max", "title", "token", "value"]),
            createVNode(unref(SlippageTolerance), { class: "slippage-tolerance-settings" }),
            createVNode(_component_s_button, {
              type: "primary",
              class: "action-button s-typography-button--large",
              "border-radius": "small",
              disabled: liquidityLocked.value || isEmptyAmount.value || isInsufficientBalance.value || isInsufficientXorForFee.value,
              loading: unref(loading),
              onClick: handleRemoveLiquidity
            }, {
              default: withCtx(() => [
                isEmptyAmount.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(toDisplayString(unref(t)("buttons.enterAmount")), 1)
                ], 64)) : isInsufficientBalance.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: unref(t)("removeLiquidity.liquidity") })), 1)
                ], 64)) : isInsufficientXorForFee.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: unref(XOR_SYMBOL) })), 1)
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 3 }, [
                  createTextVNode(toDisplayString(unref(t)("removeLiquidity.remove")), 1)
                ], 64))
              ]),
              _: 1
            }, 8, ["disabled", "loading"]),
            price.value || priceReversed.value || networkFee.value || shareOfPool.value ? (openBlock(), createBlock(unref(RemoveLiquidityTransactionDetails), {
              key: 0,
              class: "info-line-container",
              "info-only": false
            })) : createCommentVNode("", true)
          ]),
          _: 1
        }),
        createVNode(unref(RemoveLiquidityConfirm), {
          visible: confirmDialogVisible.value,
          "onUpdate:visible": _cache[4] || (_cache[4] = ($event) => confirmDialogVisible.value = $event),
          "parent-loading": combinedParentLoading.value,
          onConfirm: withdrawLiquidity
        }, null, 8, ["visible", "parent-loading"]),
        createVNode(unref(NetworkFeeWarningDialog), {
          visible: unref(showWarningFeeDialog),
          "onUpdate:visible": _cache[5] || (_cache[5] = ($event) => isRef(showWarningFeeDialog) ? showWarningFeeDialog.value = $event : null),
          fee: formattedFee.value,
          onConfirm: unref(confirmNetworkFeeWariningDialog)
        }, null, 8, ["visible", "fee", "onConfirm"])
      ], 512);
    };
  }
});
const Form = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-0abd8ad6"]]);
export {
  Form as default
};
