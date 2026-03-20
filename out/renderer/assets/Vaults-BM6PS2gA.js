import { z as defineComponent, d3 as vaultLazyComponent, ak as lazyComponent, aZ as components, u as useTranslation, G as useInternalConnect, a9 as ref, d5 as VaultStatuses, s as store, aA as watch, h as computed, a_ as resolveComponent, A as createElementBlock, C as openBlock, ap as createVNode, aM as createCommentVNode, D as createBaseVNode, ao as withCtx, am as createBlock, aO as createTextVNode, aj as unref, aN as toDisplayString, bQ as Fragment, bP as renderList, Z as ZeroStringValue, d7 as LtvTranslations, aq as withModifiers, d4 as VaultComponents, al as Components, W as router, bh as VaultPageNames, cy as BreakpointClass, dN as DsBreakpoints, aI as WALLET_CONSTS, ay as api, cY as HundredNumber, aP as _export_sfc } from "./index-73GArslZ.js";
import { g as getLtvStatus } from "./util-BnzJdZIz.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "vaults-container" };
const _hoisted_2 = { class: "vaults-header__title s-flex" };
const _hoisted_3 = { class: "vault-title s-flex" };
const _hoisted_4 = { class: "vault-title__container s-flex-column" };
const _hoisted_5 = { class: "vault-title__name" };
const _hoisted_6 = { class: "vault-details s-flex" };
const _hoisted_7 = { class: "vault-details__item s-flex-column" };
const _hoisted_8 = { class: "p4 vault__label" };
const _hoisted_9 = { class: "vault-details__item s-flex-column" };
const _hoisted_10 = { class: "p4 vault__label" };
const _hoisted_11 = { class: "vault-details__item s-flex-column" };
const _hoisted_12 = { class: "p4 vault__label" };
const _hoisted_13 = { class: "vault__ltv s-flex" };
const _hoisted_14 = { class: "p4 vault__label" };
const _hoisted_15 = { class: "vault__ltv-value s-flex" };
const _hoisted_16 = {
  key: 1,
  class: "vault-details s-flex"
};
const _hoisted_17 = { class: "vault-details__item centered s-flex-column" };
const _hoisted_18 = { class: "p4 vault__label" };
const _hoisted_19 = { class: "vaults-disclaimer s-flex" };
const _hoisted_20 = { class: "disclaimer s-flex-column" };
const _hoisted_21 = { class: "disclaimer__title s-flex" };
const _hoisted_22 = { class: "disclaimer__badge" };
const _hoisted_23 = { class: "disclaimer__description p4" };
const link = "https://medium.com/@shibarimoto/kensetsu-ken-356077ebee78";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      TokenLogo: components.TokenLogo,
      FormattedAmount: components.FormattedAmount,
      ExternalLink: components.ExternalLink,
      HistoryPagination: components.HistoryPagination,
      CreateVaultDialog: vaultLazyComponent(VaultComponents.CreateVaultDialog),
      GenericPageHeader: lazyComponent(Components.GenericPageHeader),
      PairTokenLogo: lazyComponent(Components.PairTokenLogo),
      ValueStatus: lazyComponent(Components.ValueStatusWrapper),
      ResponsiveTabs: lazyComponent(Components.ResponsiveTabs),
      ExploreOverallStats: vaultLazyComponent(VaultComponents.ExploreOverallStats),
      ExploreCollaterals: vaultLazyComponent(VaultComponents.ExploreCollaterals),
      PositionStatus: vaultLazyComponent(VaultComponents.PositionStatus)
    }
  },
  __name: "Vaults",
  setup(__props, { expose: __expose }) {
    const { t, TranslationConsts } = useTranslation();
    const { connectSoraWallet, isLoggedIn } = useInternalConnect();
    const { formatCodecNumber, formatStringValue, getFiatAmountByFPNumber, getFiatAmountByCodecString, Zero } = useFormattedAmount();
    const loading = ref(false);
    const showCreateVaultDialog = ref(false);
    const selectedTab = ref(VaultStatuses.Opened);
    const exploreQuery = ref("");
    const currentPage = ref(1);
    const pageAmount = ref(6);
    const isLtrDirection = ref(true);
    const windowWidth = computed(() => store.state.settings.windowWidth);
    const screenBreakpointClass = computed(() => store.state.settings.screenBreakpointClass);
    const openedVaults = computed(() => store.state.vault.accountVaults ?? []);
    const closedAccountVaults = computed(() => store.state.vault.closedAccountVaults ?? []);
    const collaterals = computed(() => store.state.vault.collaterals);
    const averageCollateralPrices = computed(
      () => store.state.vault.averageCollateralPrices
    );
    const getAsset = store.getters.assets.assetDataByAddress;
    const getBorrowTax = store.getters.vault.getBorrowTax;
    const selectCollateral = (address) => store.dispatch.vault.setCollateralTokenAddress(address);
    const selectDebt = (address) => store.dispatch.vault.setDebtTokenAddress(address);
    const resolvePageAmount = (width) => {
      if (width <= DsBreakpoints.sm) return 2;
      if (width <= DsBreakpoints.lg) return 4;
      if (width <= DsBreakpoints.xl) return 6;
      return 8;
    };
    watch(
      windowWidth,
      (width) => {
        const next = resolvePageAmount(width);
        if (next !== pageAmount.value) {
          pageAmount.value = next;
          currentPage.value = 1;
          isLtrDirection.value = true;
        }
      },
      { immediate: true }
    );
    const closedVaultsData = computed(
      () => closedAccountVaults.value.map((item) => ({
        ...item,
        lockedAsset: getAsset(item.lockedAssetId),
        debtAsset: getAsset(item.debtAssetId)
      }))
    );
    const closedVaults = computed(() => closedVaultsData.value.filter((vault) => vault.status === VaultStatuses.Closed));
    const liquidatedVaults = computed(
      () => closedVaultsData.value.filter((vault) => vault.status === VaultStatuses.Liquidated)
    );
    const openedVaultsData = computed(
      () => openedVaults.value.map((vault) => {
        const lockedAsset = getAsset(vault.lockedAssetId);
        const debtAsset = getAsset(vault.debtAssetId);
        const borrowTax = getBorrowTax(vault.debtAssetId);
        const collateralId = api.kensetsu.serializeKey(vault.lockedAssetId, vault.debtAssetId);
        const collateral = collaterals.value[collateralId];
        const averagePrice = averageCollateralPrices.value[collateralId] ?? Zero;
        const collateralVolume = averagePrice.mul(vault.lockedAmount);
        const ratio = collateral?.riskParams.liquidationRatioReversed ?? 0;
        const maxSafeDebt = collateralVolume.mul(ratio).div(HundredNumber);
        const maxSafeDebtWithoutTax = maxSafeDebt.sub(maxSafeDebt.mul(borrowTax));
        const ltvCoeff = vault.debt.div(maxSafeDebt);
        const ltv = ltvCoeff.isFinity() ? ltvCoeff.mul(HundredNumber) : null;
        const adjustedLtv = ltv ? ltvCoeff.mul(ratio) : null;
        const availableCoeff = maxSafeDebtWithoutTax.sub(vault.debt);
        let totalAvailable = collateral?.riskParams.hardCap.sub(collateral.debtSupply) ?? Zero;
        totalAvailable = totalAvailable.sub(totalAvailable.mul(borrowTax));
        let available = totalAvailable.lt(availableCoeff) ? totalAvailable : availableCoeff;
        available = !available.isFinity() || available.isLteZero() ? Zero : available.dp(2);
        return { ...vault, lockedAsset, debtAsset, ltv, adjustedLtv, available };
      })
    );
    const openedVaultsLength = computed(() => openedVaults.value.length);
    const closedVaultsLength = computed(() => closedVaults.value.length);
    const liquidatedVaultsLength = computed(() => liquidatedVaults.value.length);
    const hasVaults = computed(
      () => isLoggedIn.value && Boolean(openedVaultsLength.value + closedAccountVaults.value.length)
    );
    const showDropdown = computed(
      () => [BreakpointClass.Mobile, BreakpointClass.LargeMobile].includes(screenBreakpointClass.value)
    );
    const getVaultsLength = (status) => {
      switch (status) {
        case VaultStatuses.Closed:
          return closedVaultsLength.value;
        case VaultStatuses.Liquidated:
          return liquidatedVaultsLength.value;
        case VaultStatuses.Opened:
          return openedVaultsLength.value;
        default:
          return 0;
      }
    };
    const tabs = computed(
      () => Object.values(VaultStatuses).map((status) => ({
        name: status,
        label: `${t(`kensetsu.status.${status}`)} (${getVaultsLength(status)})`
      }))
    );
    const vaultsData = computed(() => {
      switch (selectedTab.value) {
        case VaultStatuses.Opened:
          return openedVaultsData.value;
        case VaultStatuses.Closed:
          return closedVaults.value;
        case VaultStatuses.Liquidated:
          return liquidatedVaults.value;
        default:
          return openedVaultsData.value;
      }
    });
    const total = computed(() => vaultsData.value.length);
    const lastPage = computed(() => Math.max(1, Math.ceil(total.value / pageAmount.value) || 1));
    const getPageItems = (items) => {
      const start = (currentPage.value - 1) * pageAmount.value;
      const end = start + pageAmount.value;
      return items.slice(start, end);
    };
    const filteredVaultsData = computed(() => getPageItems(vaultsData.value));
    watch(total, () => {
      currentPage.value = 1;
      isLtrDirection.value = true;
    });
    const handleTabChange = (tab) => {
      selectedTab.value = tab;
      currentPage.value = 1;
      isLtrDirection.value = true;
    };
    const handlePaginationClick = (button) => {
      let next = currentPage.value;
      switch (button) {
        case WALLET_CONSTS.PaginationButton.Prev:
          next -= 1;
          break;
        case WALLET_CONSTS.PaginationButton.Next:
          next += 1;
          if (next === lastPage.value) {
            isLtrDirection.value = false;
          }
          break;
        case WALLET_CONSTS.PaginationButton.First:
          next = 1;
          isLtrDirection.value = true;
          break;
        case WALLET_CONSTS.PaginationButton.Last:
          next = lastPage.value;
          isLtrDirection.value = false;
          break;
        default:
          next = 1;
      }
      currentPage.value = Math.min(Math.max(next, 1), lastPage.value);
    };
    const updateSearch = (search) => {
      exploreQuery.value = search;
    };
    const getVaultTitle = (lockedAsset, debtAsset) => {
      if (!(debtAsset && lockedAsset)) return "";
      return `${debtAsset.symbol} / ${lockedAsset.symbol}`;
    };
    const getLockedSymbol = (lockedAsset) => lockedAsset?.symbol ?? "";
    const getDebtSymbol = (debtAsset) => debtAsset?.symbol ?? "";
    const format = (value) => value?.toLocaleString(2) ?? ZeroStringValue;
    const formatFiat = (amount, asset) => {
      if (!(amount && asset)) return ZeroStringValue;
      return getFiatAmountByFPNumber(amount, asset) ?? ZeroStringValue;
    };
    const getLtvText = (ltv) => LtvTranslations[getLtvStatus(ltv.toNumber())];
    const toNumber = (value) => value?.toNumber() ?? 0;
    const handleCreateVault = () => {
      showCreateVaultDialog.value = true;
    };
    const handleCreateSelectedVault = async (lockedAsset, debtAsset) => {
      await selectCollateral(lockedAsset.address);
      await selectDebt(debtAsset.address);
      showCreateVaultDialog.value = true;
    };
    const handleOpenVaultDetails = (vault) => {
      router.push({ name: VaultPageNames.VaultDetails, params: { vault: `${vault.id}` } });
    };
    __expose({
      connectSoraWallet,
      handleCreateVault,
      handleCreateSelectedVault,
      handleOpenVaultDetails,
      filteredVaultsData,
      tabs,
      showCreateVaultDialog
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_tooltip = resolveComponent("s-tooltip");
      const _component_s_col = resolveComponent("s-col");
      const _component_s_button = resolveComponent("s-button");
      const _component_responsive_tabs = resolveComponent("responsive-tabs");
      const _component_s_row = resolveComponent("s-row");
      const _component_pair_token_logo = resolveComponent("pair-token-logo");
      const _component_position_status = resolveComponent("position-status");
      const _component_s_divider = resolveComponent("s-divider");
      const _component_formatted_amount = resolveComponent("formatted-amount");
      const _component_value_status = resolveComponent("value-status");
      const _component_s_card = resolveComponent("s-card");
      const _component_history_pagination = resolveComponent("history-pagination");
      const _component_explore_overall_stats = resolveComponent("explore-overall-stats");
      const _component_explore_collaterals = resolveComponent("explore-collaterals");
      const _component_external_link = resolveComponent("external-link");
      const _component_create_vault_dialog = resolveComponent("create-vault-dialog");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_s_row, { class: "vaults-header" }, {
          default: withCtx(() => [
            createVNode(_component_s_col, {
              xs: 12,
              sm: 6,
              md: 6,
              lg: 6
            }, {
              default: withCtx(() => [
                createBaseVNode("h2", _hoisted_2, [
                  _cache[1] || (_cache[1] = createTextVNode(" Kensetsu ", -1)),
                  createVNode(_component_s_tooltip, {
                    slot: "suffix",
                    "border-radius": "mini",
                    content: unref(t)("kensetsu.introDescription"),
                    placement: "top",
                    tabindex: "-1"
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_s_icon, {
                        class: "vaults-header__title-icon",
                        name: "info-16",
                        size: "16px"
                      })
                    ]),
                    _: 1
                  }, 8, ["content"])
                ])
              ]),
              _: 1
            }),
            createVNode(_component_s_col, {
              class: "s-flex vaults-header__action-container",
              xs: 12,
              sm: 6,
              md: 6,
              lg: 6
            }, {
              default: withCtx(() => [
                unref(isLoggedIn) ? (openBlock(), createBlock(_component_s_button, {
                  key: 0,
                  class: "vaults-header__action s-typography-button--large",
                  icon: "various-atom-24",
                  type: "primary",
                  onClick: handleCreateVault
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(unref(t)("kensetsu.createVaultAction")), 1)
                  ]),
                  _: 1
                })) : (openBlock(), createBlock(_component_s_button, {
                  key: 1,
                  class: "vaults-header__action s-typography-button--large",
                  type: "primary",
                  onClick: unref(connectSoraWallet)
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(unref(t)("connectWalletText")), 1)
                  ]),
                  _: 1
                }, 8, ["onClick"]))
              ]),
              _: 1
            }),
            hasVaults.value ? (openBlock(), createBlock(_component_s_col, {
              key: 0,
              xs: 12,
              sm: 12,
              md: 12,
              lg: 12
            }, {
              default: withCtx(() => [
                createVNode(_component_responsive_tabs, {
                  class: "vaults-header__tabs",
                  "is-mobile": showDropdown.value,
                  tabs: tabs.value,
                  "model-value": selectedTab.value,
                  "onUpdate:modelValue": handleTabChange
                }, null, 8, ["is-mobile", "tabs", "model-value"])
              ]),
              _: 1
            })) : createCommentVNode("", true)
          ]),
          _: 1
        }),
        hasVaults.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
          createVNode(_component_s_row, {
            class: "vaults-content",
            gutter: 24
          }, {
            default: withCtx(() => [
              (openBlock(true), createElementBlock(Fragment, null, renderList(filteredVaultsData.value, (vault) => {
                return openBlock(), createBlock(_component_s_col, {
                  key: "vault_" + vault.id,
                  xs: 12,
                  sm: 6,
                  md: 6,
                  lg: 4,
                  xl: 3
                }, {
                  default: withCtx(() => [
                    createVNode(_component_s_card, {
                      class: "vault",
                      "border-radius": "mini",
                      size: "medium",
                      primary: "",
                      clickable: "",
                      onClick: ($event) => handleOpenVaultDetails(vault)
                    }, {
                      default: withCtx(() => [
                        createBaseVNode("div", _hoisted_3, [
                          createVNode(_component_pair_token_logo, {
                            "first-token": vault.debtAsset,
                            "second-token": vault.lockedAsset,
                            size: "medium",
                            class: "vault-title__icon"
                          }, null, 8, ["first-token", "second-token"]),
                          createBaseVNode("div", _hoisted_4, [
                            createBaseVNode("h4", _hoisted_5, toDisplayString(getVaultTitle(vault.lockedAsset, vault.debtAsset)), 1),
                            createVNode(_component_position_status, { status: selectedTab.value }, null, 8, ["status"])
                          ]),
                          createVNode(_component_s_button, {
                            type: "action",
                            size: "small",
                            alternative: "",
                            tooltip: unref(t)("assets.details")
                          }, {
                            icon: withCtx(() => [
                              createVNode(_component_s_icon, {
                                name: "arrows-chevron-right-rounded-24",
                                size: "24"
                              })
                            ]),
                            _: 1
                          }, 8, ["tooltip"])
                        ]),
                        createVNode(_component_s_divider, { class: "vault-title__divider" }),
                        _ctx.isOpenedVault(vault) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                          createBaseVNode("div", _hoisted_6, [
                            createBaseVNode("div", _hoisted_7, [
                              createBaseVNode("p", _hoisted_8, [
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
                                      size: "11px"
                                    })
                                  ]),
                                  _: 1
                                }, 8, ["content"])
                              ]),
                              vault.lockedAsset ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                                createVNode(_component_formatted_amount, {
                                  "value-can-be-hidden": "",
                                  value: format(vault.lockedAmount),
                                  "asset-symbol": getLockedSymbol(vault.lockedAsset)
                                }, null, 8, ["value", "asset-symbol"]),
                                createVNode(_component_formatted_amount, {
                                  "value-can-be-hidden": "",
                                  "is-fiat-value": "",
                                  value: formatFiat(vault.lockedAmount, vault.lockedAsset)
                                }, null, 8, ["value"])
                              ], 64)) : createCommentVNode("", true)
                            ]),
                            createBaseVNode("div", _hoisted_9, [
                              createBaseVNode("p", _hoisted_10, [
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
                                      size: "11px"
                                    })
                                  ]),
                                  _: 1
                                }, 8, ["content"])
                              ]),
                              vault.debtAsset ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                                createVNode(_component_formatted_amount, {
                                  "value-can-be-hidden": "",
                                  value: format(vault.debt),
                                  "asset-symbol": getDebtSymbol(vault.debtAsset)
                                }, null, 8, ["value", "asset-symbol"]),
                                createVNode(_component_formatted_amount, {
                                  "value-can-be-hidden": "",
                                  "is-fiat-value": "",
                                  value: formatFiat(vault.debt, vault.debtAsset)
                                }, null, 8, ["value"])
                              ], 64)) : createCommentVNode("", true)
                            ]),
                            createBaseVNode("div", _hoisted_11, [
                              createBaseVNode("p", _hoisted_12, [
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
                                      size: "11px"
                                    })
                                  ]),
                                  _: 1
                                }, 8, ["content"])
                              ]),
                              vault.debtAsset ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                                createVNode(_component_formatted_amount, {
                                  "value-can-be-hidden": "",
                                  value: format(vault.available),
                                  "asset-symbol": getDebtSymbol(vault.debtAsset)
                                }, null, 8, ["value", "asset-symbol"]),
                                createVNode(_component_formatted_amount, {
                                  "value-can-be-hidden": "",
                                  "is-fiat-value": "",
                                  value: formatFiat(vault.available, vault.debtAsset)
                                }, null, 8, ["value"])
                              ], 64)) : createCommentVNode("", true)
                            ])
                          ]),
                          createVNode(_component_s_divider, { class: "vault__divider" }),
                          createBaseVNode("div", _hoisted_13, [
                            createBaseVNode("p", _hoisted_14, [
                              createTextVNode(toDisplayString(unref(TranslationConsts).LTV) + " ", 1),
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
                                    size: "11px"
                                  })
                                ]),
                                _: 1
                              }, 8, ["content"])
                            ]),
                            createBaseVNode("span", _hoisted_15, [
                              vault.ltv && vault.adjustedLtv ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                                createTextVNode(toDisplayString(format(vault.adjustedLtv)) + "% ", 1),
                                createVNode(_component_value_status, {
                                  class: "vault__ltv-badge",
                                  badge: "",
                                  value: toNumber(vault.ltv),
                                  "get-status": unref(getLtvStatus)
                                }, {
                                  default: withCtx(() => [
                                    createTextVNode(toDisplayString(getLtvText(vault.ltv)), 1)
                                  ]),
                                  _: 2
                                }, 1032, ["value", "get-status"])
                              ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                                createTextVNode("n/a")
                              ], 64))
                            ])
                          ])
                        ], 64)) : (openBlock(), createElementBlock("div", _hoisted_16, [
                          createBaseVNode("div", _hoisted_17, [
                            createBaseVNode("p", _hoisted_18, [
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
                                    size: "11px"
                                  })
                                ]),
                                _: 1
                              }, 8, ["content"])
                            ]),
                            vault.lockedAsset && vault.debtAsset ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                              createVNode(_component_formatted_amount, {
                                "value-can-be-hidden": "",
                                value: format(vault.returned),
                                "asset-symbol": getLockedSymbol(vault.lockedAsset)
                              }, null, 8, ["value", "asset-symbol"]),
                              createVNode(_component_formatted_amount, {
                                "value-can-be-hidden": "",
                                "is-fiat-value": "",
                                value: formatFiat(vault.returned, vault.lockedAsset)
                              }, null, 8, ["value"]),
                              createVNode(_component_s_button, {
                                class: "vault-details__action",
                                size: "small",
                                onClick: withModifiers(($event) => handleCreateSelectedVault(vault.lockedAsset, vault.debtAsset), ["stop"])
                              }, {
                                default: withCtx(() => [
                                  createTextVNode(toDisplayString(unref(t)("kensetsu.reopen")), 1)
                                ]),
                                _: 1
                              }, 8, ["onClick"])
                            ], 64)) : createCommentVNode("", true)
                          ])
                        ]))
                      ]),
                      _: 2
                    }, 1032, ["onClick"])
                  ]),
                  _: 2
                }, 1024);
              }), 128))
            ]),
            _: 1
          }),
          createVNode(_component_history_pagination, {
            class: "vaults-pagination",
            "current-page": currentPage.value,
            "page-amount": pageAmount.value,
            loading: loading.value,
            total: total.value,
            "last-page": lastPage.value,
            onPaginationClick: handlePaginationClick
          }, null, 8, ["current-page", "page-amount", "loading", "total", "last-page"]),
          createVNode(_component_s_divider, { class: "vaults-divider" })
        ], 64)) : createCommentVNode("", true),
        createVNode(_component_explore_overall_stats),
        createVNode(_component_explore_collaterals, {
          class: "vaults-stats",
          "explore-query": exploreQuery.value,
          onUpdateSearch: updateSearch,
          onOpen: handleCreateSelectedVault
        }, null, 8, ["explore-query"]),
        createBaseVNode("div", _hoisted_19, [
          createBaseVNode("div", _hoisted_20, [
            createBaseVNode("div", _hoisted_21, [
              createBaseVNode("div", _hoisted_22, [
                createVNode(_component_s_icon, {
                  class: "disclaimer__icon",
                  name: "notifications-alert-triangle-24",
                  size: "14"
                })
              ]),
              createBaseVNode("h4", null, toDisplayString(unref(t)("disclaimerTitle")), 1)
            ]),
            createBaseVNode("p", _hoisted_23, toDisplayString(unref(t)("kensetsu.disclaimerDescription")), 1),
            createVNode(_component_external_link, {
              class: "disclaimer__link p4",
              title: unref(t)("kensetsu.readMore"),
              href: link
            }, null, 8, ["title"])
          ])
        ]),
        createVNode(_component_create_vault_dialog, {
          visible: showCreateVaultDialog.value,
          "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => showCreateVaultDialog.value = $event)
        }, null, 8, ["visible"])
      ]);
    };
  }
});
const Vaults = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-8d4cc99c"]]);
export {
  Vaults as default
};
