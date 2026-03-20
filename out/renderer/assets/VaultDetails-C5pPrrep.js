import { z as defineComponent, aZ as components, ak as lazyComponent, al as Components, d3 as vaultLazyComponent, d4 as VaultComponents, u as useTranslation, U as useLoading, at as useRoute, au as useRouter, cn as reactive, d5 as VaultStatuses, d6 as VaultTypes, aw as KUSD, X as XOR, aA as watch, a4 as onMounted, h as computed, a_ as resolveComponent, A as createElementBlock, C as openBlock, ap as createVNode, aM as createCommentVNode, ao as withCtx, aj as unref, am as createBlock, D as createBaseVNode, aN as toDisplayString, bQ as Fragment, aO as createTextVNode, a9 as ref, bh as VaultPageNames, s as store, cY as HundredNumber, d7 as LtvTranslations, Z as ZeroStringValue, ad as asZeroValue, g as getAssetBalance, F as FPNumber, ay as api, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { g as getLtvStatus } from "./util-BnzJdZIz.js";
const _hoisted_1 = {
  key: 0,
  class: "vault-details-container"
};
const _hoisted_2 = { class: "vault-title s-flex" };
const _hoisted_3 = { class: "vault-title__container s-flex-column" };
const _hoisted_4 = { class: "vault-collateral s-flex-column" };
const _hoisted_5 = { class: "vault-collateral__details s-flex" };
const _hoisted_6 = { class: "vault-collateral__item s-flex-column" };
const _hoisted_7 = { class: "vault-label p3" };
const _hoisted_8 = { class: "vault-collateral__actions s-flex" };
const _hoisted_9 = { class: "vault-debt s-flex-column" };
const _hoisted_10 = { class: "vault-debt__details s-flex" };
const _hoisted_11 = { class: "vault-debt__item s-flex-column" };
const _hoisted_12 = { class: "vault-label p3" };
const _hoisted_13 = { class: "vault-debt__item s-flex-column" };
const _hoisted_14 = { class: "vault-label p3" };
const _hoisted_15 = { class: "vault-debt__actions s-flex" };
const _hoisted_16 = {
  key: 1,
  class: "vault-returned s-flex-column"
};
const _hoisted_17 = { class: "vault-label p3" };
const _hoisted_18 = { class: "position-info s-flex-column" };
const _hoisted_19 = { class: "position-info__details s-flex" };
const _hoisted_20 = { class: "position-info__item s-flex-column" };
const _hoisted_21 = { class: "vault-label p3" };
const _hoisted_22 = { class: "p3" };
const _hoisted_23 = { class: "position-info__item s-flex-column" };
const _hoisted_24 = { class: "vault-label p3" };
const _hoisted_25 = { class: "p3" };
const _hoisted_26 = { class: "position-info__item s-flex-column" };
const _hoisted_27 = { class: "vault-label p3" };
const _hoisted_28 = { class: "p3" };
const _hoisted_29 = { class: "ltv s-flex-column" };
const _hoisted_30 = { class: "ltv__title" };
const _hoisted_31 = { class: "ltv__value s-flex" };
const _hoisted_32 = { class: "ltv__legend s-flex" };
const _hoisted_33 = { class: "ltv__legend-item" };
const _hoisted_34 = { class: "ltv__legend-item" };
const _hoisted_35 = { class: "ltv__legend-item" };
const _hoisted_36 = {
  key: 1,
  class: "vault-details-container empty"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "VaultDetails",
  setup(__props) {
    const FormattedAmount = components.FormattedAmount;
    const PairTokenLogo = lazyComponent(Components.PairTokenLogo);
    const ValueStatus = lazyComponent(Components.ValueStatusWrapper);
    const AddCollateralDialog = vaultLazyComponent(VaultComponents.AddCollateralDialog);
    const BorrowMoreDialog = vaultLazyComponent(VaultComponents.BorrowMoreDialog);
    const RepayDebtDialog = vaultLazyComponent(VaultComponents.RepayDebtDialog);
    const CloseVaultDialog = vaultLazyComponent(VaultComponents.CloseVaultDialog);
    const LtvProgressBar = vaultLazyComponent(VaultComponents.LtvProgressBar);
    const VaultDetailsHistory = vaultLazyComponent(VaultComponents.VaultDetailsHistory);
    const PositionStatus = vaultLazyComponent(VaultComponents.PositionStatus);
    const { t } = useTranslation();
    const { Zero, getFiatAmountByFPNumber, getFPNumberFiatAmountByFPNumber } = useFormattedAmount();
    const { withApi } = useLoading();
    const route = useRoute();
    const routerInstance = useRouter();
    const showCloseVaultDialog = ref(false);
    const showAddCollateralDialog = ref(false);
    const showBorrowMoreDialog = ref(false);
    const showRepayDebtDialog = ref(false);
    const vaultSkeleton = reactive({
      id: 0,
      lockedAssetId: XOR.address,
      debtAssetId: KUSD.address,
      vaultType: VaultTypes.V2,
      status: VaultStatuses.Closed,
      returned: Zero
    });
    const isLoggedIn = computed(() => store.getters.wallet.account.isLoggedIn);
    const assetByAddress = computed(
      () => store.getters.assets.assetDataByAddress
    );
    const borrowTaxResolver = computed(
      () => store.getters.vault.getBorrowTax
    );
    const accountVaults = computed(() => store.state.vault.accountVaults);
    const closedAccountVaults = computed(() => store.state.vault.closedAccountVaults);
    const collaterals = computed(() => store.state.vault.collaterals);
    const averageCollateralPrices = computed(
      () => store.state.vault.averageCollateralPrices
    );
    const liquidationPenalty = computed(() => store.state.vault.liquidationPenalty);
    const percentFormat = computed(() => store.state.settings.percentFormat);
    const routeVaultId = computed(() => {
      const id = route.params.vault;
      if (id === void 0 || id === null) return null;
      const numeric = Number(id);
      return Number.isFinite(numeric) ? numeric : null;
    });
    const foundVault = computed(() => {
      const vaultId = routeVaultId.value;
      if (vaultId === null) return null;
      const opened = accountVaults.value.find(({ id }) => id === vaultId);
      if (opened) return opened;
      return closedAccountVaults.value.find(({ id }) => id === vaultId) ?? null;
    });
    const vault = computed(() => foundVault.value ?? vaultSkeleton);
    const isOpenedVault = (value) => {
      return Boolean(value && value.lockedAmount !== void 0);
    };
    const isClosedVault = (value) => !isOpenedVault(value);
    const status = computed(() => {
      const current = vault.value;
      if (!current) return VaultStatuses.Closed;
      return isOpenedVault(current) ? VaultStatuses.Opened : current.status;
    });
    const lockedAsset = computed(() => {
      const current = vault.value;
      if (!current) return null;
      return assetByAddress.value(current.lockedAssetId);
    });
    const debtAsset = computed(() => {
      const current = vault.value;
      if (!current) return null;
      return assetByAddress.value(current.debtAssetId);
    });
    const debtSymbol = computed(() => debtAsset.value?.symbol ?? "");
    const lockedSymbol = computed(() => lockedAsset.value?.symbol ?? "");
    const vaultTitle = computed(() => {
      if (!(debtSymbol.value && lockedSymbol.value)) return "";
      return `${debtSymbol.value} / ${lockedSymbol.value}`;
    });
    const collateralId = computed(() => {
      const current = vault.value;
      if (!current) return "";
      return api.kensetsu.serializeKey(current.lockedAssetId, current.debtAssetId);
    });
    const borrowTax = computed(() => {
      const current = vault.value;
      if (!current) return 0;
      return borrowTaxResolver.value(current.debtAssetId);
    });
    const collateral = computed(() => {
      const id = collateralId.value;
      if (!id) return null;
      return collaterals.value[id] ?? null;
    });
    const averageCollateralPrice = computed(() => {
      const id = collateralId.value;
      if (!id) return Zero;
      return averageCollateralPrices.value[id] ?? Zero;
    });
    const maxSafeDebt = computed(() => {
      const current = vault.value;
      if (!(current && isOpenedVault(current))) return null;
      const collateralVolume = averageCollateralPrice.value.mul(current.lockedAmount);
      return collateralVolume.mul(collateral.value?.riskParams.liquidationRatioReversed ?? 0).div(HundredNumber);
    });
    const ltvCoeff = computed(() => {
      const current = vault.value;
      if (!(maxSafeDebt.value && current && isOpenedVault(current))) return null;
      return current.debt.div(maxSafeDebt.value);
    });
    const maxLtv = computed(() => collateral.value?.riskParams.liquidationRatioReversed ?? HundredNumber);
    const adjustedLtv = computed(() => {
      if (!ltvCoeff.value) return null;
      return ltvCoeff.value.mul(maxLtv.value);
    });
    const ltv = computed(() => ltvCoeff.value?.isFinity() ? ltvCoeff.value.mul(HundredNumber) : null);
    const ltvNumber = computed(() => ltv.value?.toNumber() ?? 0);
    const formattedLtv = computed(() => {
      const percent = adjustedLtv.value?.toNumber() ?? 0;
      return percentFormat.value?.format?.(percent / HundredNumber) ?? `${percent}%`;
    });
    const ltvText = computed(() => LtvTranslations[getLtvStatus(ltvNumber.value)]);
    const formattedMaxLtv = computed(
      () => percentFormat.value?.format?.(maxLtv.value / HundredNumber) ?? `${maxLtv.value}%`
    );
    const availableToBorrow = computed(() => {
      const current = vault.value;
      if (!(maxSafeDebt.value && current && isOpenedVault(current))) return null;
      let available = maxSafeDebt.value.sub(current.debt);
      available = available.sub(available.mul(borrowTax.value));
      let totalAvailable = collateral.value?.riskParams.hardCap.sub(collateral.value.debtSupply) ?? Zero;
      totalAvailable = totalAvailable.sub(totalAvailable.mul(borrowTax.value));
      available = totalAvailable.lt(available) ? totalAvailable : available;
      return !available.isFinity() || available.isLteZero() ? Zero : available.dp(2);
    });
    const formattedAvailableToBorrow = computed(() => availableToBorrow.value?.toLocaleString(2) ?? ZeroStringValue);
    const fiatAvailableToBorrow = computed(() => {
      if (!(debtAsset.value && availableToBorrow.value)) return ZeroStringValue;
      return getFiatAmountByFPNumber(availableToBorrow.value, debtAsset.value) ?? ZeroStringValue;
    });
    const isAddCollateralUnavailable = computed(() => {
      const asset = lockedAsset.value;
      if (!asset) return true;
      return asZeroValue(getAssetBalance(asset));
    });
    const isBorrowMoreUnavailable = computed(() => {
      if (!(debtAsset.value && availableToBorrow.value)) return true;
      const availableUsd = getFPNumberFiatAmountByFPNumber(availableToBorrow.value, debtAsset.value);
      return availableUsd?.isLessThan(FPNumber.ONE) ?? false;
    });
    const isRepayDebtUnavailable = computed(() => {
      const current = vault.value;
      if (!current || !debtAsset.value || isClosedVault(current)) return true;
      const debtUsd = getFPNumberFiatAmountByFPNumber(current.debt, debtAsset.value);
      return debtUsd?.isLessThan(FPNumber.ONE) ?? false;
    });
    const formattedLockedAmount = computed(() => {
      const current = vault.value;
      if (!current || isClosedVault(current)) return ZeroStringValue;
      return current.lockedAmount.toLocaleString(2) ?? ZeroStringValue;
    });
    const fiatLockedAmount = computed(() => {
      const current = vault.value;
      if (!(current && lockedAsset.value && isOpenedVault(current))) return ZeroStringValue;
      return getFiatAmountByFPNumber(current.lockedAmount, lockedAsset.value) ?? ZeroStringValue;
    });
    const formattedDebtAmount = computed(() => {
      const current = vault.value;
      if (!current || isClosedVault(current)) return ZeroStringValue;
      return current.debt.toLocaleString(2) ?? ZeroStringValue;
    });
    const fiatDebt = computed(() => {
      const current = vault.value;
      if (!(debtAsset.value && current && isOpenedVault(current))) return ZeroStringValue;
      return getFiatAmountByFPNumber(current.debt, debtAsset.value) ?? ZeroStringValue;
    });
    const formattedLiquidationPenalty = computed(
      () => percentFormat.value?.format?.(liquidationPenalty.value / HundredNumber) ?? `${liquidationPenalty.value}%`
    );
    const stabilityFee = computed(() => collateral.value?.riskParams.stabilityFeeAnnual ?? null);
    const formattedStabilityFee = computed(() => {
      const percent = stabilityFee.value?.toNumber() ?? 0;
      return percentFormat.value?.format?.(percent / HundredNumber) ?? `${percent}%`;
    });
    const formattedReturnedAmount = computed(() => {
      const current = vault.value;
      if (!(current && isClosedVault(current))) return ZeroStringValue;
      return current.returned?.toLocaleString(2) ?? ZeroStringValue;
    });
    const fiatReturnedAmount = computed(() => {
      const current = vault.value;
      if (!(current && lockedAsset.value && isClosedVault(current))) return ZeroStringValue;
      return current.returned ? getFiatAmountByFPNumber(current.returned, lockedAsset.value) ?? ZeroStringValue : ZeroStringValue;
    });
    const goToVaults = () => {
      routerInstance.push({ name: VaultPageNames.Vaults });
    };
    const handleBack = () => {
      routerInstance.back();
    };
    const closePosition = () => {
      showCloseVaultDialog.value = true;
    };
    const addCollateral = () => {
      showAddCollateralDialog.value = true;
    };
    const borrowMore = () => {
      showBorrowMoreDialog.value = true;
    };
    const repayDebt = () => {
      showRepayDebtDialog.value = true;
    };
    const updateVaultSkeleton = (value) => {
      vaultSkeleton.id = value.id;
      vaultSkeleton.lockedAssetId = value.lockedAssetId;
      vaultSkeleton.debtAssetId = value.debtAssetId;
      vaultSkeleton.vaultType = value.vaultType;
      vaultSkeleton.status = isOpenedVault(value) ? VaultStatuses.Opened : value.status;
      vaultSkeleton.returned = isClosedVault(value) ? value.returned ?? Zero : Zero;
    };
    watch(
      foundVault,
      (value) => {
        if (value) {
          updateVaultSkeleton(value);
        }
      },
      { immediate: false }
    );
    onMounted(async () => {
      await withApi(async () => {
        if (!isLoggedIn.value) {
          goToVaults();
          return;
        }
        if (!foundVault.value) {
          goToVaults();
          return;
        }
        updateVaultSkeleton(foundVault.value);
      });
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_button = resolveComponent("s-button");
      const _component_s_divider = resolveComponent("s-divider");
      const _component_s_tooltip = resolveComponent("s-tooltip");
      const _component_s_card = resolveComponent("s-card");
      const _component_s_col = resolveComponent("s-col");
      const _component_s_row = resolveComponent("s-row");
      return vault.value ? (openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_s_button, {
          class: "vault-details-back",
          type: "action",
          size: "small",
          alternative: "",
          tooltip: unref(t)("backText"),
          onClick: handleBack
        }, {
          default: withCtx(() => [
            createVNode(_component_s_icon, {
              name: "arrows-chevron-left-rounded-24",
              size: "24"
            })
          ]),
          _: 1
        }, 8, ["tooltip"]),
        createVNode(_component_s_row, {
          class: "vault-details-main",
          gutter: 20
        }, {
          default: withCtx(() => [
            createVNode(_component_s_col, {
              xs: 12,
              sm: 12,
              md: 6,
              lg: 6
            }, {
              default: withCtx(() => [
                createVNode(_component_s_card, {
                  class: "vault details-card",
                  "border-radius": "small",
                  size: "big",
                  primary: ""
                }, {
                  default: withCtx(() => [
                    createBaseVNode("div", _hoisted_2, [
                      createVNode(unref(PairTokenLogo), {
                        class: "vault-icon",
                        size: "medium",
                        "first-token": debtAsset.value,
                        "second-token": lockedAsset.value
                      }, null, 8, ["first-token", "second-token"]),
                      createBaseVNode("div", _hoisted_3, [
                        createBaseVNode("h3", null, toDisplayString(vaultTitle.value), 1),
                        createVNode(unref(PositionStatus), { status: status.value }, null, 8, ["status"])
                      ])
                    ]),
                    createVNode(_component_s_divider),
                    ltv.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                      createBaseVNode("div", _hoisted_4, [
                        createBaseVNode("h4", null, toDisplayString(unref(t)("kensetsu.collateralDetails")), 1),
                        createBaseVNode("div", _hoisted_5, [
                          createBaseVNode("div", _hoisted_6, [
                            createBaseVNode("p", _hoisted_7, [
                              createTextVNode(toDisplayString(unref(t)("kensetsu.yourCollateral")) + " ", 1),
                              createVNode(_component_s_tooltip, {
                                slot: "suffix",
                                "border-radius": "mini",
                                content: unref(t)("kensetsu.yourCollateralDescription"),
                                placement: "top",
                                tabindex: "-1"
                              }, {
                                default: withCtx(() => [
                                  createVNode(_component_s_icon, {
                                    name: "info-16",
                                    size: "12px"
                                  })
                                ]),
                                _: 1
                              }, 8, ["content"])
                            ]),
                            createVNode(unref(FormattedAmount), {
                              "value-can-be-hidden": "",
                              value: formattedLockedAmount.value,
                              "asset-symbol": lockedSymbol.value
                            }, null, 8, ["value", "asset-symbol"]),
                            createVNode(unref(FormattedAmount), {
                              "value-can-be-hidden": "",
                              "is-fiat-value": "",
                              value: fiatLockedAmount.value
                            }, null, 8, ["value"])
                          ])
                        ]),
                        createBaseVNode("div", _hoisted_8, [
                          createVNode(_component_s_button, {
                            class: "s-typography-button--small",
                            size: "small",
                            disabled: isAddCollateralUnavailable.value,
                            onClick: addCollateral
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(unref(t)("kensetsu.addCollateral")), 1)
                            ]),
                            _: 1
                          }, 8, ["disabled"])
                        ])
                      ]),
                      createVNode(_component_s_divider),
                      createBaseVNode("div", _hoisted_9, [
                        createBaseVNode("h4", null, toDisplayString(unref(t)("kensetsu.debtDetails")), 1),
                        createBaseVNode("div", _hoisted_10, [
                          createBaseVNode("div", _hoisted_11, [
                            createBaseVNode("p", _hoisted_12, [
                              createTextVNode(toDisplayString(unref(t)("kensetsu.yourDebt")) + " ", 1),
                              createVNode(_component_s_tooltip, {
                                slot: "suffix",
                                "border-radius": "mini",
                                content: unref(t)("kensetsu.yourDebtDescription"),
                                placement: "top",
                                tabindex: "-1"
                              }, {
                                default: withCtx(() => [
                                  createVNode(_component_s_icon, {
                                    name: "info-16",
                                    size: "12px"
                                  })
                                ]),
                                _: 1
                              }, 8, ["content"])
                            ]),
                            createVNode(unref(FormattedAmount), {
                              "value-can-be-hidden": "",
                              value: formattedDebtAmount.value,
                              "asset-symbol": debtSymbol.value
                            }, null, 8, ["value", "asset-symbol"]),
                            createVNode(unref(FormattedAmount), {
                              "value-can-be-hidden": "",
                              "is-fiat-value": "",
                              value: fiatDebt.value
                            }, null, 8, ["value"])
                          ]),
                          createBaseVNode("div", _hoisted_13, [
                            createBaseVNode("p", _hoisted_14, [
                              createTextVNode(toDisplayString(unref(t)("kensetsu.availableToBorrow")) + " ", 1),
                              createVNode(_component_s_tooltip, {
                                slot: "suffix",
                                "border-radius": "mini",
                                content: unref(t)("kensetsu.availableToBorrowDescription"),
                                placement: "top",
                                tabindex: "-1"
                              }, {
                                default: withCtx(() => [
                                  createVNode(_component_s_icon, {
                                    name: "info-16",
                                    size: "12px"
                                  })
                                ]),
                                _: 1
                              }, 8, ["content"])
                            ]),
                            createVNode(unref(FormattedAmount), {
                              "value-can-be-hidden": "",
                              value: formattedAvailableToBorrow.value,
                              "asset-symbol": debtSymbol.value
                            }, null, 8, ["value", "asset-symbol"]),
                            createVNode(unref(FormattedAmount), {
                              "value-can-be-hidden": "",
                              "is-fiat-value": "",
                              value: fiatAvailableToBorrow.value
                            }, null, 8, ["value"])
                          ])
                        ]),
                        createBaseVNode("div", _hoisted_15, [
                          createVNode(_component_s_button, {
                            class: "s-typography-button--small",
                            size: "small",
                            disabled: isRepayDebtUnavailable.value,
                            onClick: repayDebt
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(unref(t)("kensetsu.repayDebt")), 1)
                            ]),
                            _: 1
                          }, 8, ["disabled"]),
                          createVNode(_component_s_button, {
                            class: "s-typography-button--small",
                            type: "primary",
                            size: "small",
                            disabled: isBorrowMoreUnavailable.value,
                            onClick: borrowMore
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(unref(t)("kensetsu.borrowMore")), 1)
                            ]),
                            _: 1
                          }, 8, ["disabled"])
                        ])
                      ])
                    ], 64)) : (openBlock(), createElementBlock("div", _hoisted_16, [
                      createBaseVNode("p", _hoisted_17, [
                        createTextVNode(toDisplayString(unref(t)("kensetsu.totalCollateralReturned")) + " ", 1),
                        createVNode(_component_s_tooltip, {
                          slot: "suffix",
                          "border-radius": "mini",
                          content: unref(t)("kensetsu.totalCollateralReturnedDescription"),
                          placement: "top",
                          tabindex: "-1"
                        }, {
                          default: withCtx(() => [
                            createVNode(_component_s_icon, {
                              name: "info-16",
                              size: "12px"
                            })
                          ]),
                          _: 1
                        }, 8, ["content"])
                      ]),
                      createVNode(unref(FormattedAmount), {
                        "value-can-be-hidden": "",
                        value: formattedReturnedAmount.value,
                        "asset-symbol": lockedSymbol.value
                      }, null, 8, ["value", "asset-symbol"]),
                      createVNode(unref(FormattedAmount), {
                        "value-can-be-hidden": "",
                        "is-fiat-value": "",
                        value: fiatReturnedAmount.value
                      }, null, 8, ["value"])
                    ]))
                  ]),
                  _: 1
                }),
                ltv.value ? (openBlock(), createBlock(_component_s_button, {
                  key: 0,
                  class: "close-vault-button",
                  type: "link",
                  onClick: closePosition
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(unref(t)("kensetsu.closeVault")), 1)
                  ]),
                  _: 1
                })) : createCommentVNode("", true)
              ]),
              _: 1
            }),
            createVNode(_component_s_col, {
              xs: 12,
              sm: 12,
              md: 6,
              lg: 6
            }, {
              default: withCtx(() => [
                createVNode(_component_s_card, {
                  class: "details-card",
                  "border-radius": "small",
                  size: "big",
                  primary: ""
                }, {
                  default: withCtx(() => [
                    createBaseVNode("div", _hoisted_18, [
                      createBaseVNode("h4", null, toDisplayString(unref(t)("kensetsu.positionInfo")), 1),
                      createBaseVNode("div", _hoisted_19, [
                        createBaseVNode("div", _hoisted_20, [
                          createBaseVNode("p", _hoisted_21, [
                            createTextVNode(toDisplayString(unref(t)("kensetsu.liquidationPenalty")) + " ", 1),
                            createVNode(_component_s_tooltip, {
                              slot: "suffix",
                              "border-radius": "mini",
                              content: unref(t)("kensetsu.liquidationPenaltyDescription"),
                              placement: "top",
                              tabindex: "-1"
                            }, {
                              default: withCtx(() => [
                                createVNode(_component_s_icon, {
                                  name: "info-16",
                                  size: "12px"
                                })
                              ]),
                              _: 1
                            }, 8, ["content"])
                          ]),
                          createBaseVNode("p", _hoisted_22, toDisplayString(formattedLiquidationPenalty.value), 1)
                        ]),
                        createBaseVNode("div", _hoisted_23, [
                          createBaseVNode("p", _hoisted_24, [
                            createTextVNode(toDisplayString(unref(t)("kensetsu.interest")) + " ", 1),
                            createVNode(_component_s_tooltip, {
                              slot: "suffix",
                              "border-radius": "mini",
                              content: unref(t)("kensetsu.interestDescription"),
                              placement: "top",
                              tabindex: "-1"
                            }, {
                              default: withCtx(() => [
                                createVNode(_component_s_icon, {
                                  name: "info-16",
                                  size: "12px"
                                })
                              ]),
                              _: 1
                            }, 8, ["content"])
                          ]),
                          createBaseVNode("p", _hoisted_25, toDisplayString(formattedStabilityFee.value), 1)
                        ]),
                        createBaseVNode("div", _hoisted_26, [
                          createBaseVNode("p", _hoisted_27, [
                            _cache[4] || (_cache[4] = createTextVNode(" MAX LTV ", -1)),
                            createVNode(_component_s_tooltip, {
                              slot: "suffix",
                              "border-radius": "mini",
                              content: unref(t)("kensetsu.ltvMaxTooltip"),
                              placement: "top",
                              tabindex: "-1"
                            }, {
                              default: withCtx(() => [
                                createVNode(_component_s_icon, {
                                  name: "info-16",
                                  size: "12px"
                                })
                              ]),
                              _: 1
                            }, 8, ["content"])
                          ]),
                          createBaseVNode("p", _hoisted_28, toDisplayString(formattedMaxLtv.value), 1)
                        ])
                      ])
                    ]),
                    ltv.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                      createVNode(_component_s_divider),
                      createBaseVNode("div", _hoisted_29, [
                        createBaseVNode("h4", _hoisted_30, [
                          createTextVNode(toDisplayString(unref(t)("kensetsu.ltv")) + " ", 1),
                          createVNode(_component_s_tooltip, {
                            slot: "suffix",
                            "border-radius": "mini",
                            content: unref(t)("kensetsu.ltvDescription"),
                            placement: "top",
                            tabindex: "-1"
                          }, {
                            default: withCtx(() => [
                              createVNode(_component_s_icon, {
                                name: "info-16",
                                size: "12px"
                              })
                            ]),
                            _: 1
                          }, 8, ["content"])
                        ]),
                        createBaseVNode("div", _hoisted_31, [
                          createBaseVNode("h2", null, toDisplayString(formattedLtv.value), 1),
                          createVNode(unref(ValueStatus), {
                            class: "ltv__badge",
                            badge: "",
                            "error-icon-size": "15",
                            value: ltvNumber.value,
                            "get-status": unref(getLtvStatus)
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(ltvText.value), 1)
                            ]),
                            _: 1
                          }, 8, ["value", "get-status"])
                        ]),
                        createVNode(unref(LtvProgressBar), { percentage: ltvNumber.value }, null, 8, ["percentage"]),
                        createBaseVNode("div", _hoisted_32, [
                          createBaseVNode("div", _hoisted_33, [
                            _cache[5] || (_cache[5] = createBaseVNode("span", { class: "ltv__legend-icon success" }, null, -1)),
                            createTextVNode(" " + toDisplayString(unref(t)("kensetsu.positionSafe")), 1)
                          ]),
                          createBaseVNode("div", _hoisted_34, [
                            _cache[6] || (_cache[6] = createBaseVNode("span", { class: "ltv__legend-icon warning" }, null, -1)),
                            createTextVNode(" " + toDisplayString(unref(t)("kensetsu.liquidationClose")), 1)
                          ]),
                          createBaseVNode("div", _hoisted_35, [
                            _cache[7] || (_cache[7] = createBaseVNode("span", { class: "ltv__legend-icon error" }, null, -1)),
                            createTextVNode(" " + toDisplayString(unref(t)("kensetsu.highLiquidationRisk")), 1)
                          ])
                        ])
                      ])
                    ], 64)) : createCommentVNode("", true)
                  ]),
                  _: 1
                }),
                createVNode(unref(VaultDetailsHistory), {
                  id: vault.value.id,
                  "locked-asset": lockedAsset.value,
                  "debt-asset": debtAsset.value
                }, null, 8, ["id", "locked-asset", "debt-asset"])
              ]),
              _: 1
            })
          ]),
          _: 1
        }),
        ltv.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
          createVNode(unref(AddCollateralDialog), {
            visible: showAddCollateralDialog.value,
            "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => showAddCollateralDialog.value = $event),
            vault: vault.value,
            "locked-asset": lockedAsset.value,
            "debt-asset": debtAsset.value,
            "prev-ltv": adjustedLtv.value,
            "prev-available": availableToBorrow.value,
            collateral: collateral.value,
            "max-ltv": maxLtv.value,
            "average-collateral-price": averageCollateralPrice.value,
            "borrow-tax": borrowTax.value
          }, null, 8, ["visible", "vault", "locked-asset", "debt-asset", "prev-ltv", "prev-available", "collateral", "max-ltv", "average-collateral-price", "borrow-tax"]),
          createVNode(unref(BorrowMoreDialog), {
            visible: showBorrowMoreDialog.value,
            "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => showBorrowMoreDialog.value = $event),
            vault: vault.value,
            "debt-asset": debtAsset.value,
            "prev-ltv": adjustedLtv.value,
            available: availableToBorrow.value,
            collateral: collateral.value,
            "max-safe-debt": maxSafeDebt.value,
            "max-ltv": maxLtv.value,
            "borrow-tax": borrowTax.value
          }, null, 8, ["visible", "vault", "debt-asset", "prev-ltv", "available", "collateral", "max-safe-debt", "max-ltv", "borrow-tax"]),
          createVNode(unref(RepayDebtDialog), {
            visible: showRepayDebtDialog.value,
            "onUpdate:visible": _cache[2] || (_cache[2] = ($event) => showRepayDebtDialog.value = $event),
            vault: vault.value,
            "debt-asset": debtAsset.value,
            "prev-ltv": adjustedLtv.value,
            "max-safe-debt": maxSafeDebt.value,
            "max-ltv": maxLtv.value
          }, null, 8, ["visible", "vault", "debt-asset", "prev-ltv", "max-safe-debt", "max-ltv"]),
          createVNode(unref(CloseVaultDialog), {
            visible: showCloseVaultDialog.value,
            "onUpdate:visible": _cache[3] || (_cache[3] = ($event) => showCloseVaultDialog.value = $event),
            vault: vault.value,
            "locked-asset": lockedAsset.value,
            "debt-asset": debtAsset.value,
            onConfirm: goToVaults
          }, null, 8, ["visible", "vault", "locked-asset", "debt-asset"])
        ], 64)) : createCommentVNode("", true)
      ])) : (openBlock(), createElementBlock("div", _hoisted_36));
    };
  }
});
const VaultDetails = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-a6deedca"]]);
export {
  VaultDetails as default
};
