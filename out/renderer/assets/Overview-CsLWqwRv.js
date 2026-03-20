import { aH as gql, aF as getCurrentIndexer, aG as IndexerType, z as defineComponent, aZ as components, c_ as soraStakingLazyComponent, c$ as SoraStakingComponents, a9 as ref, d1 as StakeDialogMode, u as useTranslation, G as useInternalConnect, U as useLoading, aA as watch, a_ as resolveComponent, bz as resolveDirective, bA as withDirectives, h as computed, A as createElementBlock, C as openBlock, D as createBaseVNode, aM as createCommentVNode, am as createBlock, ap as createVNode, aj as unref, d0 as SoraStakingPageNames, ao as withCtx, bQ as Fragment, bP as renderList, aO as createTextVNode, aN as toDisplayString, cw as TranslationConsts, s as store, W as router, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useSoraStaking } from "./useSoraStaking-B7oKU4Xa.js";
import "./useFormattedAmount-D-xkdlPs.js";
const SubqueryNominatorsCountQuery = gql`
  query NominatorsCountQuery {
    data: stakingStakers(orderBy: ID_DESC) {
      totalCount
    }
  }
`;
const SubsquidNominatorsCountQuery = gql`
  query NominatorsCountQuery {
    data: stakingStakersConnection(orderBy: id_DESC) {
      totalCount
    }
  }
`;
async function fetchData() {
  const indexer = getCurrentIndexer();
  let data;
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer;
      data = (await subqueryIndexer.services.explorer.fetchEntities(SubqueryNominatorsCountQuery))?.totalCount;
      break;
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer;
      data = (await subsquidIndexer.services.explorer.fetchEntitiesConnection(SubsquidNominatorsCountQuery))?.totalCount;
      break;
    }
  }
  return data;
}
const _hoisted_1 = { class: "container" };
const _hoisted_2 = { class: "header" };
const _hoisted_3 = { class: "staking-logo-container" };
const _hoisted_4 = { class: "staking-logo" };
const _hoisted_5 = { key: 0 };
const _hoisted_6 = { class: "additional-buttons" };
const _hoisted_7 = { class: "withdraw-content" };
const _hoisted_8 = { class: "withdraw-header" };
const _hoisted_9 = { class: "withdraw-info" };
const _hoisted_10 = { class: "withdraw-info-title" };
const _hoisted_11 = { class: "withdraw-info" };
const _hoisted_12 = { class: "withdraw-info-title" };
const _hoisted_13 = {
  key: 0,
  class: "withdraw-footer"
};
const _hoisted_14 = { class: "info" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Overview",
  props: {
    parentLoading: { type: Boolean }
  },
  setup(__props) {
    const props = __props;
    const TokenLogo = components.TokenLogo;
    const InfoLine = components.InfoLine;
    const FormattedAmountWithFiatValue = components.FormattedAmountWithFiatValue;
    const BackButton = soraStakingLazyComponent(SoraStakingComponents.BackButton);
    const StakeDialog = soraStakingLazyComponent(SoraStakingComponents.StakeDialog);
    const ClaimRewardsDialog = soraStakingLazyComponent(SoraStakingComponents.ClaimRewardsDialog);
    const PendingRewardsDialog = soraStakingLazyComponent(SoraStakingComponents.PendingRewardsDialog);
    const ValidatorsDialog = soraStakingLazyComponent(SoraStakingComponents.ValidatorsDialog);
    const WithdrawDialog = soraStakingLazyComponent(SoraStakingComponents.WithdrawDialog);
    const AllWithdrawsDialog = soraStakingLazyComponent(SoraStakingComponents.AllWithdrawsDialog);
    const EraCountdown = soraStakingLazyComponent(SoraStakingComponents.EraCountdown);
    const showStakeDialog = ref(false);
    const showClaimRewardsDialog = ref(false);
    const showPendingRewardsDialog = ref(false);
    const showValidatorsDialog = ref(false);
    const showWithdrawDialog = ref(false);
    const showAllWithdrawsDialog = ref(false);
    const stakeDialogMode = ref(StakeDialogMode.ADD);
    const { t } = useTranslation();
    const { isLoggedIn, connectSoraWallet } = useInternalConnect();
    const { loading } = useLoading();
    const parentLoadingValue = computed(() => Boolean(props.parentLoading) || loading.value);
    const {
      stakingInitialized,
      stakingAsset,
      rewardAsset,
      lockedFunds,
      lockedFundsFiat,
      unlockingFunds,
      unlockingFundsFiat,
      withdrawableFunds,
      withdrawableFundsFiat,
      withdrawableFundsFormatted,
      rewardedFundsFormatted,
      rewardedFundsFiat,
      totalStakedFormatted,
      unbondPeriod,
      unbondPeriodFormatted,
      minNominatorBondFormatted,
      validators,
      nextWithdrawalEra,
      accountLedger,
      currentEra,
      activeEra,
      maxApy
    } = useSoraStaking();
    const lockedFundsFormatted = computed(() => lockedFunds.value.toLocaleString());
    const unlockingFundsFormatted = computed(() => unlockingFunds.value.toLocaleString());
    const showWithdrawCard = computed(() => Boolean(accountLedger.value?.unlocking?.length));
    const withdrawButtonDisabled = computed(() => withdrawableFunds.value.isZero());
    const showNextWithdrawal = computed(() => Boolean(nextWithdrawalEra.value));
    const stakeMoreText = computed(
      () => lockedFunds.value.isZero() ? t("soraStaking.newStake.title") : t("soraStaking.actions.more")
    );
    const totalNominators = computed(() => store.state.staking.totalNominators);
    const dropdownMenuItems = computed(() => [
      {
        value: "pending-rewards",
        text: t("soraStaking.pendingRewardsDialog.title")
      },
      {
        value: "validators",
        text: t("soraStaking.info.validators")
      }
    ]);
    const fetchNominatorsCount = async () => {
      if (!activeEra.value) return;
      const nominatorsCount = await fetchData();
      if (nominatorsCount === void 0 || nominatorsCount === null) return;
      store.commit.staking.setTotalNominators(nominatorsCount);
    };
    watch(
      () => currentEra.value,
      () => {
        void fetchNominatorsCount();
      },
      { immediate: true }
    );
    const stakeNew = () => {
      router.push({ name: SoraStakingPageNames.ValidatorsType });
    };
    const stakeMore = () => {
      stakeDialogMode.value = StakeDialogMode.ADD;
      showStakeDialog.value = true;
    };
    const removeStake = () => {
      stakeDialogMode.value = StakeDialogMode.REMOVE;
      showStakeDialog.value = true;
    };
    const claimRewards = () => {
      showClaimRewardsDialog.value = true;
    };
    const showRewards = () => {
      showClaimRewardsDialog.value = false;
      showPendingRewardsDialog.value = true;
    };
    const showAllWithdraws = () => {
      showWithdrawDialog.value = false;
      showAllWithdrawsDialog.value = true;
    };
    const handleWithdraw = () => {
      showWithdrawDialog.value = true;
    };
    const handleStake = () => {
      showStakeDialog.value = false;
    };
    const handleNominate = () => {
      showValidatorsDialog.value = false;
    };
    const handleSelectDropdownMenuItem = (value) => {
      switch (value) {
        case "pending-rewards":
          showPendingRewardsDialog.value = true;
          break;
        case "validators":
          showValidatorsDialog.value = true;
          break;
      }
    };
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      const _component_s_dropdown_item = resolveComponent("s-dropdown-item");
      const _component_s_dropdown = resolveComponent("s-dropdown");
      const _component_s_card = resolveComponent("s-card");
      const _directive_button = resolveDirective("button");
      const _directive_loading = resolveDirective("loading");
      return withDirectives((openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          createVNode(unref(BackButton), {
            page: unref(SoraStakingPageNames).Staking
          }, null, 8, ["page"]),
          unref(stakingInitialized) ? (openBlock(), createBlock(_component_s_dropdown, {
            key: 0,
            class: "dropdown-menu-button",
            "popper-class": "dropdown-menu",
            type: "ellipsis",
            placement: "bottom-start",
            onSelect: handleSelectDropdownMenuItem
          }, {
            menu: withCtx(() => [
              (openBlock(true), createElementBlock(Fragment, null, renderList(dropdownMenuItems.value, ({ value, text }) => {
                return openBlock(), createBlock(_component_s_dropdown_item, {
                  key: value,
                  class: "dropdown-menu__item",
                  "data-test-name": value,
                  value
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(text), 1)
                  ]),
                  _: 2
                }, 1032, ["data-test-name", "value"]);
              }), 128))
            ]),
            default: withCtx(() => [
              createVNode(_component_s_button, {
                type: "action",
                class: "s-pressed",
                icon: "basic-more-vertical-24",
                tooltip: unref(t)("headerMenu.settings")
              }, null, 8, ["tooltip"])
            ]),
            _: 1
          })) : createCommentVNode("", true)
        ]),
        createBaseVNode("div", _hoisted_3, [
          createBaseVNode("div", _hoisted_4, [
            createVNode(unref(TokenLogo), {
              token: unref(stakingAsset),
              size: "large",
              class: "token-logo"
            }, null, 8, ["token"]),
            createVNode(unref(TokenLogo), {
              token: unref(rewardAsset),
              size: "medium",
              class: "reward-token-logo"
            }, null, 8, ["token"])
          ])
        ]),
        createBaseVNode("h1", null, toDisplayString(unref(t)("soraStaking.overview.title")), 1),
        !unref(stakingInitialized) ? (openBlock(), createElementBlock("p", _hoisted_5, toDisplayString(unref(t)("soraStaking.overview.description")), 1)) : createCommentVNode("", true),
        unref(isLoggedIn) ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
          createBaseVNode("div", _hoisted_6, [
            unref(stakingInitialized) ? (openBlock(), createBlock(_component_s_button, {
              key: 0,
              class: "additional-button s-typography-button--medium",
              onClick: claimRewards
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(unref(t)("soraStaking.actions.claim")), 1)
              ]),
              _: 1
            })) : createCommentVNode("", true),
            unref(stakingInitialized) ? (openBlock(), createBlock(_component_s_button, {
              key: 1,
              class: "additional-button s-typography-button--medium",
              disabled: unref(lockedFunds).isZero(),
              onClick: removeStake
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(unref(t)("soraStaking.actions.remove")), 1)
              ]),
              _: 1
            }, 8, ["disabled"])) : createCommentVNode("", true)
          ]),
          !unref(stakingInitialized) ? (openBlock(), createBlock(_component_s_button, {
            key: 0,
            class: "action-button s-typography-button--medium",
            type: "primary",
            onClick: stakeNew
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(unref(t)("soraStaking.newStake.title")), 1)
            ]),
            _: 1
          })) : createCommentVNode("", true),
          unref(stakingInitialized) ? (openBlock(), createBlock(_component_s_button, {
            key: 1,
            class: "action-button s-typography-button--medium",
            type: "primary",
            onClick: stakeMore
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(stakeMoreText.value), 1)
            ]),
            _: 1
          })) : createCommentVNode("", true),
          showWithdrawCard.value ? (openBlock(), createBlock(_component_s_card, {
            key: 2,
            class: "withdraw",
            "border-radius": "medium",
            shadow: "always",
            size: "mini"
          }, {
            default: withCtx(() => [
              createBaseVNode("div", _hoisted_7, [
                createBaseVNode("div", _hoisted_8, [
                  createBaseVNode("div", _hoisted_9, [
                    createBaseVNode("span", _hoisted_10, toDisplayString(unref(t)("soraStaking.withdraw.withdrawable")), 1),
                    createVNode(unref(FormattedAmountWithFiatValue), {
                      class: "withdraw-info-amount",
                      "asset-symbol": unref(stakingAsset)?.symbol,
                      "symbol-as-decimal": "",
                      "value-can-be-hidden": "",
                      value: unref(withdrawableFundsFormatted),
                      "fiat-value": unref(withdrawableFundsFiat)
                    }, null, 8, ["asset-symbol", "value", "fiat-value"])
                  ]),
                  createBaseVNode("div", _hoisted_11, [
                    createBaseVNode("span", _hoisted_12, toDisplayString(unref(t)("soraStaking.info.unstaking")), 1),
                    createVNode(unref(FormattedAmountWithFiatValue), {
                      class: "withdraw-info-amount",
                      "asset-symbol": unref(stakingAsset)?.symbol,
                      "symbol-as-decimal": "",
                      "value-can-be-hidden": "",
                      value: unlockingFundsFormatted.value,
                      "fiat-value": unref(unlockingFundsFiat)
                    }, null, 8, ["asset-symbol", "value", "fiat-value"])
                  ]),
                  createVNode(_component_s_button, {
                    class: "withdraw-button",
                    onClick: handleWithdraw,
                    disable: withdrawButtonDisabled.value,
                    type: "primary",
                    size: "small"
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(unref(t)("soraStaking.actions.withdraw")), 1)
                    ]),
                    _: 1
                  }, 8, ["disable"])
                ]),
                showNextWithdrawal.value ? (openBlock(), createElementBlock("div", _hoisted_13, [
                  createBaseVNode("div", null, [
                    createBaseVNode("span", null, toDisplayString(unref(t)("soraStaking.withdraw.nextWithdrawal")) + ": ", 1),
                    createVNode(unref(EraCountdown), {
                      class: "countdown",
                      "target-era": unref(nextWithdrawalEra)
                    }, null, 8, ["target-era"])
                  ]),
                  withDirectives((openBlock(), createElementBlock("div", {
                    class: "withdraw-see-all",
                    onClick: showAllWithdraws
                  }, [
                    createTextVNode(toDisplayString(unref(t)("soraStaking.withdraw.seeAll")), 1)
                  ])), [
                    [_directive_button]
                  ])
                ])) : createCommentVNode("", true)
              ])
            ]),
            _: 1
          })) : createCommentVNode("", true),
          createBaseVNode("div", _hoisted_14, [
            unref(stakingInitialized) ? (openBlock(), createBlock(unref(InfoLine), {
              key: 0,
              label: unref(t)("soraStaking.info.stakingBalance"),
              value: lockedFundsFormatted.value,
              "asset-symbol": unref(stakingAsset)?.symbol,
              "fiat-value": unref(lockedFundsFiat)
            }, null, 8, ["label", "value", "asset-symbol", "fiat-value"])) : createCommentVNode("", true),
            unref(stakingInitialized) ? (openBlock(), createBlock(unref(InfoLine), {
              key: 1,
              label: unref(t)("soraStaking.info.rewarded"),
              value: unref(rewardedFundsFormatted),
              "asset-symbol": unref(rewardAsset)?.symbol,
              "fiat-value": unref(rewardedFundsFiat)
            }, null, 8, ["label", "value", "asset-symbol", "fiat-value"])) : createCommentVNode("", true),
            unref(stakingInitialized) && !showWithdrawCard.value ? (openBlock(), createBlock(unref(InfoLine), {
              key: 2,
              label: unref(t)("soraStaking.info.unstaking"),
              value: unlockingFundsFormatted.value,
              "asset-symbol": unref(stakingAsset)?.symbol,
              "fiat-value": unref(unlockingFundsFiat)
            }, null, 8, ["label", "value", "asset-symbol", "fiat-value"])) : createCommentVNode("", true),
            unref(stakingInitialized) && !showWithdrawCard.value ? (openBlock(), createBlock(unref(InfoLine), {
              key: 3,
              label: unref(t)("soraStaking.withdraw.withdrawable"),
              value: unref(withdrawableFundsFormatted),
              "asset-symbol": unref(stakingAsset)?.symbol,
              "fiat-value": unref(withdrawableFundsFiat)
            }, null, 8, ["label", "value", "asset-symbol", "fiat-value"])) : createCommentVNode("", true),
            !unref(stakingInitialized) ? (openBlock(), createBlock(unref(InfoLine), {
              key: 4,
              label: unref(t)("soraStaking.info.totalLiquidityStaked"),
              value: unref(totalStakedFormatted)
            }, null, 8, ["label", "value"])) : createCommentVNode("", true),
            !unref(stakingInitialized) ? (openBlock(), createBlock(unref(InfoLine), {
              key: 5,
              label: unref(TranslationConsts).APY,
              value: `${unref(maxApy)}%`
            }, null, 8, ["label", "value"])) : createCommentVNode("", true),
            createVNode(unref(InfoLine), {
              label: unref(t)("soraStaking.info.rewardToken"),
              value: unref(rewardAsset)?.symbol
            }, null, 8, ["label", "value"]),
            unref(unbondPeriod) ? (openBlock(), createBlock(unref(InfoLine), {
              key: 6,
              label: unref(t)("soraStaking.info.unstakingPeriod"),
              value: unref(unbondPeriodFormatted)
            }, null, 8, ["label", "value"])) : createCommentVNode("", true),
            !unref(stakingInitialized) ? (openBlock(), createBlock(unref(InfoLine), {
              key: 7,
              label: unref(t)("soraStaking.info.minimumStake"),
              value: unref(minNominatorBondFormatted),
              "asset-symbol": unref(stakingAsset)?.symbol,
              "is-formatted": ""
            }, null, 8, ["label", "value", "asset-symbol"])) : createCommentVNode("", true),
            totalNominators.value !== null ? (openBlock(), createBlock(unref(InfoLine), {
              key: 8,
              label: unref(t)("soraStaking.info.nominators"),
              value: `${totalNominators.value}`
            }, null, 8, ["label", "value"])) : createCommentVNode("", true),
            unref(validators).length ? (openBlock(), createBlock(unref(InfoLine), {
              key: 9,
              label: unref(t)("soraStaking.info.validators"),
              value: `${unref(validators).length}`
            }, null, 8, ["label", "value"])) : createCommentVNode("", true)
          ])
        ], 64)) : (openBlock(), createBlock(_component_s_button, {
          type: "primary",
          key: "disconnected",
          class: "action-wallet s-typography-button--large action-button",
          onClick: unref(connectSoraWallet)
        }, {
          default: withCtx(() => [
            createTextVNode(toDisplayString(unref(t)("connectWalletText")), 1)
          ]),
          _: 1
        }, 8, ["onClick"])),
        createVNode(unref(StakeDialog), {
          visible: showStakeDialog.value,
          "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => showStakeDialog.value = $event),
          mode: stakeDialogMode.value,
          "parent-loading": parentLoadingValue.value,
          onConfirm: handleStake
        }, null, 8, ["visible", "mode", "parent-loading"]),
        createVNode(unref(ClaimRewardsDialog), {
          visible: showClaimRewardsDialog.value,
          "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => showClaimRewardsDialog.value = $event),
          "parent-loading": parentLoadingValue.value,
          onShowRewards: showRewards
        }, null, 8, ["visible", "parent-loading"]),
        createVNode(unref(WithdrawDialog), {
          visible: showWithdrawDialog.value,
          "onUpdate:visible": _cache[2] || (_cache[2] = ($event) => showWithdrawDialog.value = $event),
          "parent-loading": parentLoadingValue.value,
          onShowAllWithdraws: showAllWithdraws
        }, null, 8, ["visible", "parent-loading"]),
        createVNode(unref(AllWithdrawsDialog), {
          visible: showAllWithdrawsDialog.value,
          "onUpdate:visible": _cache[3] || (_cache[3] = ($event) => showAllWithdrawsDialog.value = $event),
          "parent-loading": parentLoadingValue.value
        }, null, 8, ["visible", "parent-loading"]),
        createVNode(unref(PendingRewardsDialog), {
          visible: showPendingRewardsDialog.value,
          "onUpdate:visible": _cache[4] || (_cache[4] = ($event) => showPendingRewardsDialog.value = $event),
          "parent-loading": parentLoadingValue.value
        }, null, 8, ["visible", "parent-loading"]),
        createVNode(unref(ValidatorsDialog), {
          visible: showValidatorsDialog.value,
          "onUpdate:visible": _cache[5] || (_cache[5] = ($event) => showValidatorsDialog.value = $event),
          "parent-loading": parentLoadingValue.value,
          onConfirm: handleNominate
        }, null, 8, ["visible", "parent-loading"])
      ])), [
        [_directive_loading, parentLoadingValue.value]
      ]);
    };
  }
});
const Overview = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-56270ed7"]]);
export {
  Overview as default
};
