import { z as defineComponent, aZ as components, ak as lazyComponent, u as useTranslation, G as useInternalConnect, c3 as useNotification, c2 as useTransaction, c0 as toRef, s as store, aA as watch, a4 as onMounted, aB as onBeforeUnmount, dA as onUnmounted, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, C as openBlock, bA as withDirectives, ap as createVNode, h as computed, aM as createCommentVNode, ao as withCtx, D as createBaseVNode, bb as normalizeClass, aN as toDisplayString, aj as unref, bQ as Fragment, am as createBlock, aO as createTextVNode, as as mergeProps, al as Components, b1 as resolveLibraryTheme, dB as groupRewardsByAssetsList, dC as RewardType, cC as KnownAssets, aK as KnownSymbols, F as FPNumber, aS as hasInsufficientXorForFee, J as ethersUtil, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { u as useSubscriptions } from "./useSubscriptions-B0wmcRcn.js";
import { u as useWalletConnect } from "./useWalletConnect-CJNIxFYX.js";
import "./index-FPtsBGoq.js";
const _hoisted_1 = { class: "rewards" };
const _hoisted_2 = { class: "rewards-content" };
const _hoisted_3 = {
  key: 0,
  class: "rewards-claiming-text"
};
const _hoisted_4 = {
  key: 1,
  class: "rewards-amount"
};
const _hoisted_5 = { class: "rewards-footer" };
const _hoisted_6 = {
  key: 0,
  class: "rewards-account"
};
const _hoisted_7 = { class: "rewards-account-group" };
const _hoisted_8 = ["src", "alt"];
const _hoisted_9 = { class: "rewards-account-group" };
const _hoisted_10 = { key: 1 };
const _hoisted_11 = {
  key: 2,
  class: "rewards-footer-hint"
};
const _hoisted_12 = {
  key: 2,
  class: "rewards-claiming-text--transaction"
};
const _hoisted_13 = {
  key: 0,
  class: "rewards-empty-state"
};
const _hoisted_14 = {
  key: 0,
  class: "rewards-block rewards-hint"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "Rewards",
    components: {
      RewardsGradientBox: lazyComponent(Components.RewardsGradientBox),
      RewardsAmountHeader: lazyComponent(Components.RewardsAmountHeader),
      RewardsAmountTable: lazyComponent(Components.RewardsAmountTable),
      GenericPageHeader: lazyComponent(Components.GenericPageHeader),
      TokensRow: lazyComponent(Components.TokensRow),
      SelectProviderDialog: lazyComponent(Components.SelectProviderDialog),
      InfoLine: components.InfoLine,
      FormattedAddress: components.FormattedAddress
    }
  },
  __name: "Rewards",
  props: {
    parentLoading: { type: Boolean, default: false }
  },
  setup(__props) {
    const props = __props;
    const parentLoadingRef = toRef(props, "parentLoading");
    const { t, tc, tOrdinal } = useTranslation();
    const { formatCodecNumber, getFiatAmountByCodecString } = useFormattedAmount();
    const { connectSoraWallet, isLoggedIn, soraAddress } = useInternalConnect();
    const {
      evmProvider,
      evmAddress,
      connectEvmWallet,
      disconnectEvmWallet,
      disconnectExternalNetwork,
      getEvmProviderIcon
    } = useWalletConnect();
    const { showAppNotification } = useNotification();
    const { loading, withNotifications } = useTransaction({ parentLoading: parentLoadingRef });
    const subscribeOnRewardsAction = () => store.dispatch.rewards.subscribeOnRewards();
    const unsubscribeFromRewardsAction = () => store.dispatch.rewards.unsubscribeFromRewards();
    const { subscriptionsDataLoading, withApi: withSubscriptionsApi } = useSubscriptions({
      parentLoading: parentLoadingRef,
      startSubscriptions: [subscribeOnRewardsAction],
      resetSubscriptions: [unsubscribeFromRewardsAction]
    });
    const feeFetching = computed(() => store.state.rewards.feeFetching);
    const rewardsFetching = computed(() => store.state.rewards.rewardsFetching);
    const rewardsClaiming = computed(() => store.state.rewards.rewardsClaiming);
    const transactionError = computed(() => store.state.rewards.transactionError);
    const transactionStep = computed(() => store.state.rewards.transactionStep);
    const receivedRewards = computed(() => store.state.rewards.receivedRewards);
    const fee = computed(() => store.state.rewards.fee);
    const vestedRewards = computed(() => store.state.rewards.vestedRewards);
    const crowdloanRewards = computed(() => store.state.rewards.crowdloanRewards);
    const internalRewards = computed(() => store.state.rewards.internalRewards);
    const externalRewards = computed(() => store.state.rewards.externalRewards);
    const selectedVestedRewards = computed(() => store.state.rewards.selectedVested);
    const selectedInternalRewards = computed(() => store.state.rewards.selectedInternal);
    const selectedExternalRewards = computed(() => store.state.rewards.selectedExternal);
    const selectedCrowdloanRewards = computed(() => store.state.rewards.selectedCrowdloan);
    const xor = computed(() => store.getters.assets.xor);
    const rewardsAvailable = computed(() => store.getters.rewards.rewardsAvailable);
    const externalRewardsAvailable = computed(() => store.getters.rewards.externalRewardsAvailable);
    const externalRewardsSelected = computed(() => store.getters.rewards.externalRewardsSelected);
    const internalRewardsAvailable = computed(() => store.getters.rewards.internalRewardsAvailable);
    const vestedRewardsAvailable = computed(() => store.getters.rewards.vestedRewardsAvailable);
    const rewardsByAssetsList = computed(() => store.getters.rewards.rewardsByAssetsList);
    const libraryTheme = computed(() => resolveLibraryTheme(store));
    const setSelectedRewardsAction = (payload) => store.dispatch.rewards.setSelectedRewards(payload);
    const getExternalRewardsAction = (address) => store.dispatch.rewards.getExternalRewards(address);
    const claimRewardsAction = (payload) => store.dispatch.rewards.claimRewards(payload);
    const resetRewards = () => store.commit.rewards.reset();
    const transactionStepsCount = computed(() => externalRewardsSelected.value ? 2 : 1);
    const rewardsReceivedFlag = computed(() => receivedRewards.value.length !== 0);
    const rewardsReceived = rewardsReceivedFlag;
    const rewardsAmountHeaderItems = computed(
      () => rewardsReceivedFlag.value ? receivedRewards.value : rewardsByAssetsList.value
    );
    const rewardTokens = computed(() => rewardsAmountHeaderItems.value.map((item) => item.asset));
    const rewardTokenSymbols = computed(
      () => rewardTokens.value.map((item) => item.symbol)
    );
    const gradientSymbol = computed(() => rewardTokenSymbols.value.length === 1 ? rewardTokenSymbols.value[0] : "");
    const externalRewardsGroupItems = computed(() => [
      {
        type: [RewardType.External, t("rewards.groups.external")],
        limit: groupRewardsByAssetsList(externalRewards.value),
        rewards: externalRewards.value
      }
    ]);
    const vestedRewadsGroupItems = computed(() => {
      const rewards = vestedRewards.value?.rewards ?? [];
      const pswap = KnownAssets.get(KnownSymbols.PSWAP);
      return [
        {
          type: [RewardType.Strategic, t("rewards.groups.strategic")],
          title: t("rewards.claimableAmountDoneVesting"),
          limit: [
            {
              amount: FPNumber.fromCodecValue(vestedRewards.value?.limit ?? 0, pswap.decimals).toCodecString(),
              asset: pswap
            }
          ],
          total: {
            amount: FPNumber.fromCodecValue(vestedRewards.value?.total ?? 0, pswap.decimals).toLocaleString(),
            asset: pswap
          },
          rewards
        }
      ];
    });
    const crowdloanRewardsGroupItems = computed(
      () => Object.entries(crowdloanRewards.value).map(([tag, rewards]) => ({
        type: [RewardType.Crowdloan, tag],
        title: tag,
        limit: rewards.map((item) => ({
          ...item,
          total: {
            amount: FPNumber.fromCodecValue(item.total ?? 0, item.asset.decimals).toLocaleString(),
            asset: item.asset
          }
        }))
      }))
    );
    const selectedInternalRewardsModel = computed({
      get: () => internalRewardsAvailable.value && selectedInternalRewards.value !== null,
      set(flag) {
        const selectedInternal = flag ? internalRewards.value : null;
        void setSelectedRewardsAction({ selectedInternal });
      }
    });
    const selectedExternalRewardsModel = computed({
      get: () => selectedExternalRewards.value.length !== 0,
      set(flag) {
        const selectedExternal = flag ? externalRewards.value : [];
        void setSelectedRewardsAction({ selectedExternal });
      }
    });
    const selectedVestedRewardsModel = computed({
      get: () => vestedRewardsAvailable.value && selectedVestedRewards.value !== null,
      set(flag) {
        const selectedVested = flag ? vestedRewards.value : null;
        void setSelectedRewardsAction({ selectedVested });
      }
    });
    const selectedCrowdloanRewardsModel = computed({
      get: () => Object.keys(selectedCrowdloanRewards.value),
      set(value) {
        const selectedCrowdloan = value.reduce((buffer, tag) => {
          const rewards = crowdloanRewards.value[tag];
          if (rewards) buffer[tag] = rewards;
          return buffer;
        }, {});
        void setSelectedRewardsAction({ selectedCrowdloan });
      }
    });
    const isInsufficientBalance = computed(() => hasInsufficientXorForFee(xor.value, fee.value));
    const feeInfo = computed(() => ({
      label: t("networkFeeText"),
      labelTooltip: t("networkFeeTooltipText"),
      value: formatCodecNumber(fee.value),
      assetSymbol: KnownSymbols.XOR
    }));
    const claimingInProgressOrFinished = computed(
      () => rewardsClaiming.value || transactionError.value || rewardsReceivedFlag.value
    );
    const claimingStatusMessage = computed(
      () => rewardsReceivedFlag.value ? t("rewards.claiming.success") : t("rewards.claiming.pending")
    );
    const transactionStatusMessage = computed(() => {
      if (rewardsReceivedFlag.value) {
        return t("rewards.transactions.success");
      }
      const order = tOrdinal(transactionStep.value);
      const translationKey = transactionError.value ? "rewards.transactions.failed" : "rewards.transactions.confimation";
      return t(translationKey, { order, total: transactionStepsCount.value });
    });
    const hintText = computed(() => {
      if (!isLoggedIn.value) return t("rewards.hint.connectAccounts");
      if (rewardsAvailable.value) {
        const symbols = rewardTokenSymbols.value.join(` ${t("rewards.andText")} `);
        const transactions = tc("transactionText", transactionStepsCount.value);
        const count = transactionStepsCount.value > 1 ? transactionStepsCount.value : "";
        const destination = transactionStepsCount.value > 1 ? t("rewards.signing.accounts") : t("rewards.signing.extension");
        return t("rewards.hint.howToClaimRewards", { symbols, transactions, count, destination });
      }
      return "";
    });
    const externalRewardsHintText = computed(() => {
      if (!evmAddress.value) return t("rewards.hint.connectExternalAccount");
      if (!externalRewardsAvailable.value) return t("rewards.hint.connectAnotherAccount");
      return "";
    });
    const actionButtonLoading = computed(() => rewardsFetching.value || feeFetching.value);
    const actionButtonText = computed(() => {
      if (actionButtonLoading.value) return "";
      if (!isLoggedIn.value) return t("connectWalletText");
      if (transactionError.value) return t("retryText");
      if (isInsufficientBalance.value) {
        return t("insufficientBalanceText", { tokenSymbol: KnownSymbols.XOR });
      }
      if (!rewardsClaiming.value) return t("rewards.action.signAndClaim");
      if (externalRewardsAvailable.value && transactionStep.value === 1) {
        return t("rewards.action.pendingExternal");
      }
      if (!externalRewardsAvailable.value || transactionStep.value === 2) {
        return t("rewards.action.pendingInternal");
      }
      return "";
    });
    const actionButtonDisabled = computed(
      () => rewardsClaiming.value || isLoggedIn.value && (!rewardsAvailable.value || isInsufficientBalance.value)
    );
    const changeWalletEvm = computed(() => Boolean(evmProvider.value));
    const viewLoading = computed(() => parentLoadingRef.value || subscriptionsDataLoading.value || loading.value);
    const checkExternalRewards = async (showNotification = false) => {
      if (!isLoggedIn.value) return;
      await getRewardsProcess(showNotification);
    };
    const getRewardsProcess = async (showNotification = false) => {
      await getExternalRewardsAction(evmAddress.value);
      if (!rewardsAvailable.value && showNotification) {
        showAppNotification(t("rewards.notification.empty"));
      }
    };
    const claimRewardsProcess = async () => {
      const internalAddress = soraAddress.value;
      const externalAddress = evmAddress.value;
      if (!internalAddress) return;
      if (externalAddress && externalRewardsSelected.value) {
        const isConnected = await ethersUtil.checkAccountIsConnected(externalAddress);
        if (!isConnected) return;
      }
      await withNotifications(async () => {
        await claimRewardsAction({ internalAddress, externalAddress });
      });
    };
    const handleAction = async () => {
      if (!isLoggedIn.value) {
        connectSoraWallet();
        return;
      }
      if (rewardsAvailable.value) {
        await claimRewardsProcess();
      }
    };
    watch(
      evmAddress,
      () => {
        void checkExternalRewards();
      },
      { flush: "post" }
    );
    onMounted(async () => {
      await withSubscriptionsApi(async () => {
        await checkExternalRewards();
      });
    });
    onBeforeUnmount(() => {
      disconnectExternalNetwork();
    });
    onUnmounted(() => {
      resetRewards();
    });
    return (_ctx, _cache) => {
      const _component_tokens_row = resolveComponent("tokens-row");
      const _component_rewards_amount_header = resolveComponent("rewards-amount-header");
      const _component_rewards_amount_table = resolveComponent("rewards-amount-table");
      const _component_s_divider = resolveComponent("s-divider");
      const _component_formatted_address = resolveComponent("formatted-address");
      const _component_s_button = resolveComponent("s-button");
      const _component_info_line = resolveComponent("info-line");
      const _component_rewards_gradient_box = resolveComponent("rewards-gradient-box");
      const _component_select_provider_dialog = resolveComponent("select-provider-dialog");
      const _directive_button = resolveDirective("button");
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        withDirectives((openBlock(), createElementBlock("div", _hoisted_2, [
          createVNode(_component_rewards_gradient_box, {
            class: "rewards-block",
            symbol: gradientSymbol.value
          }, {
            default: withCtx(() => [
              createBaseVNode("div", {
                class: normalizeClass(["rewards-box", libraryTheme.value])
              }, [
                createVNode(_component_tokens_row, { assets: rewardTokens.value }, null, 8, ["assets"]),
                claimingInProgressOrFinished.value ? (openBlock(), createElementBlock("div", _hoisted_3, toDisplayString(claimingStatusMessage.value), 1)) : createCommentVNode("", true),
                unref(isLoggedIn) ? (openBlock(), createElementBlock("div", _hoisted_4, [
                  createVNode(_component_rewards_amount_header, { items: rewardsAmountHeaderItems.value }, null, 8, ["items"]),
                  !claimingInProgressOrFinished.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                    internalRewards.value ? (openBlock(), createBlock(_component_rewards_amount_table, {
                      key: 0,
                      class: "rewards-table",
                      modelValue: selectedInternalRewardsModel.value,
                      "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectedInternalRewardsModel.value = $event),
                      title: unref(t)("rewards.events.LiquidityProvision"),
                      items: [internalRewards.value],
                      theme: libraryTheme.value,
                      "is-codec-string": ""
                    }, null, 8, ["modelValue", "title", "items", "theme"])) : createCommentVNode("", true),
                    createVNode(_component_rewards_amount_table, {
                      class: "rewards-table",
                      modelValue: selectedVestedRewardsModel.value,
                      "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => selectedVestedRewardsModel.value = $event),
                      title: unref(t)("rewards.groups.strategic"),
                      items: vestedRewadsGroupItems.value,
                      theme: libraryTheme.value,
                      "is-codec-string": ""
                    }, null, 8, ["modelValue", "title", "items", "theme"]),
                    Object.keys(crowdloanRewards.value).length ? (openBlock(), createBlock(_component_rewards_amount_table, {
                      key: 1,
                      class: "rewards-table",
                      modelValue: selectedCrowdloanRewardsModel.value,
                      "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => selectedCrowdloanRewardsModel.value = $event),
                      title: unref(t)("rewards.groups.crowdloan"),
                      items: crowdloanRewardsGroupItems.value,
                      theme: libraryTheme.value,
                      "is-codec-string": ""
                    }, null, 8, ["modelValue", "title", "items", "theme"])) : createCommentVNode("", true),
                    createVNode(_component_rewards_amount_table, {
                      class: "rewards-table",
                      modelValue: selectedExternalRewardsModel.value,
                      "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => selectedExternalRewardsModel.value = $event),
                      title: unref(t)("rewards.groups.external"),
                      items: externalRewardsGroupItems.value,
                      "show-table": !!externalRewards.value.length,
                      theme: libraryTheme.value,
                      "simple-group": ""
                    }, {
                      default: withCtx(() => [
                        createBaseVNode("div", _hoisted_5, [
                          createVNode(_component_s_divider),
                          unref(evmAddress) ? (openBlock(), createElementBlock("div", _hoisted_6, [
                            createBaseVNode("div", _hoisted_7, [
                              unref(evmProvider) ? (openBlock(), createElementBlock("img", {
                                key: 0,
                                src: unref(getEvmProviderIcon)(unref(evmProvider)),
                                alt: unref(evmProvider),
                                class: "rewards-account-logo"
                              }, null, 8, _hoisted_8)) : createCommentVNode("", true),
                              createVNode(_component_formatted_address, {
                                value: unref(evmAddress),
                                symbols: 8
                              }, null, 8, ["value"])
                            ]),
                            createBaseVNode("div", _hoisted_9, [
                              changeWalletEvm.value ? withDirectives((openBlock(), createElementBlock("span", {
                                key: 0,
                                class: "rewards-account-btn",
                                onClick: _cache[3] || (_cache[3] = //@ts-ignore
                                (...args) => unref(connectEvmWallet) && unref(connectEvmWallet)(...args))
                              }, [
                                createTextVNode(toDisplayString(unref(t)("changeAccountText")), 1)
                              ])), [
                                [_directive_button]
                              ]) : (openBlock(), createElementBlock("span", _hoisted_10, toDisplayString(unref(t)("connectedText")), 1)),
                              changeWalletEvm.value ? withDirectives((openBlock(), createElementBlock("span", {
                                key: 2,
                                class: "rewards-account-btn disconnect",
                                onClick: _cache[4] || (_cache[4] = //@ts-ignore
                                (...args) => unref(disconnectEvmWallet) && unref(disconnectEvmWallet)(...args))
                              }, [
                                createTextVNode(toDisplayString(unref(t)("disconnectWalletText")), 1)
                              ])), [
                                [_directive_button]
                              ]) : createCommentVNode("", true)
                            ])
                          ])) : (openBlock(), createBlock(_component_s_button, {
                            key: 1,
                            class: "rewards-connect-button",
                            type: "tertiary",
                            onClick: unref(connectEvmWallet)
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(unref(t)("rewards.action.connectExternalWallet")), 1)
                            ]),
                            _: 1
                          }, 8, ["onClick"])),
                          externalRewardsHintText.value ? (openBlock(), createElementBlock("div", _hoisted_11, toDisplayString(externalRewardsHintText.value), 1)) : createCommentVNode("", true)
                        ])
                      ]),
                      _: 1
                    }, 8, ["modelValue", "title", "items", "show-table", "theme"]),
                    fee.value && unref(isLoggedIn) && rewardsAvailable.value && !claimingInProgressOrFinished.value ? (openBlock(), createBlock(_component_info_line, mergeProps({ key: 2 }, feeInfo.value, {
                      class: ["rewards-fee", libraryTheme.value],
                      "fiat-value": unref(getFiatAmountByCodecString)(fee.value),
                      "is-formatted": ""
                    }), null, 16, ["class", "fiat-value"])) : createCommentVNode("", true)
                  ], 64)) : createCommentVNode("", true)
                ])) : createCommentVNode("", true),
                claimingInProgressOrFinished.value ? (openBlock(), createElementBlock("div", _hoisted_12, toDisplayString(transactionStatusMessage.value), 1)) : createCommentVNode("", true)
              ], 2)
            ]),
            _: 1
          }, 8, ["symbol"]),
          !claimingInProgressOrFinished.value && (hintText.value || !(unref(rewardsReceived) || unref(loading))) ? (openBlock(), createElementBlock("div", _hoisted_13, [
            hintText.value ? (openBlock(), createElementBlock("div", _hoisted_14, toDisplayString(hintText.value), 1)) : createCommentVNode("", true),
            !(unref(rewardsReceived) || unref(loading)) ? (openBlock(), createBlock(_component_s_button, {
              key: 1,
              class: "rewards-block rewards-action-button s-typography-button--large",
              "data-test-name": "LoginAndGet",
              type: "primary",
              onClick: handleAction,
              loading: actionButtonLoading.value,
              disabled: actionButtonDisabled.value
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(actionButtonText.value), 1)
              ]),
              _: 1
            }, 8, ["loading", "disabled"])) : createCommentVNode("", true)
          ])) : createCommentVNode("", true)
        ])), [
          [_directive_loading, viewLoading.value]
        ]),
        createVNode(_component_select_provider_dialog)
      ]);
    };
  }
});
const Rewards = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-3f90f76a"]]);
export {
  Rewards as default
};
