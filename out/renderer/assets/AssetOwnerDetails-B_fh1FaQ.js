import { z as defineComponent, cV as dashboardLazyComponent, ak as lazyComponent, aZ as components, at as useRoute, u as useTranslation, G as useInternalConnect, e as useSettingsStore, aA as watch, a4 as onMounted, W as router, bi as DashboardPageNames, bC as waitUntil, h as computed, aB as onBeforeUnmount, a9 as ref, $ as getCurrentInstance, a_ as resolveComponent, A as createElementBlock, C as openBlock, ap as createVNode, ao as withCtx, aj as unref, am as createBlock, D as createBaseVNode, aN as toDisplayString, aM as createCommentVNode, c5 as FontWeightRate, c7 as FontSizeRate, aO as createTextVNode, cW as DashboardComponents, al as Components, X as XOR, V as PageNames, ay as api, c0 as toRef, Z as ZeroStringValue, s as store, aP as _export_sfc } from "./index-73GArslZ.js";
import { _ as _sfc_main$1 } from "./SupplyChart.vue_vue_type_script_setup_true_lang-S9jcH_2c.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { u as useSubscriptions } from "./useSubscriptions-B0wmcRcn.js";
import "./snapshots-C2HRhynI.js";
import "./component-CFIRMeyp.js";
import "./useWidgetTokenSelect-CzOdir7j.js";
const _hoisted_1 = {
  key: 0,
  class: "asset-owner-details-container"
};
const _hoisted_2 = { class: "asset-title s-flex" };
const _hoisted_3 = { class: "asset-title__text s-flex-column" };
const _hoisted_4 = { class: "asset-title__name" };
const _hoisted_5 = { class: "asset-balance s-flex" };
const _hoisted_6 = { class: "asset-balance__info" };
const _hoisted_7 = { class: "asset-supply s-flex" };
const _hoisted_8 = { class: "asset-supply__info" };
const _hoisted_9 = { class: "asset-supply-actions" };
const _hoisted_10 = {
  key: 0,
  class: "p3"
};
const _hoisted_11 = {
  key: 1,
  class: "p3"
};
const _hoisted_12 = { class: "p3 asset-stats-card__title" };
const _hoisted_13 = { class: "p3 asset-stats-card__title" };
const _hoisted_14 = { class: "p3 asset-stats-card__title" };
const _hoisted_15 = { class: "p3 asset-stats-card__title" };
const _hoisted_16 = { class: "p3 asset-stats-card__title" };
const _hoisted_17 = { class: "p3 asset-stats-card__title" };
const _hoisted_18 = {
  key: 1,
  class: "asset-owner-details-container empty"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      TokenLogo: components.TokenLogo,
      FormattedAmount: components.FormattedAmount,
      TokenAddress: components.TokenAddress,
      StatsSupplyChart: _sfc_main$1,
      PriceChartWidget: lazyComponent(Components.PriceChartWidget),
      MintDialog: dashboardLazyComponent(DashboardComponents.MintDialog),
      BurnDialog: dashboardLazyComponent(DashboardComponents.BurnDialog),
      SendDialog: dashboardLazyComponent(DashboardComponents.SendTokenDialog)
    }
  },
  __name: "AssetOwnerDetails",
  props: {
    parentLoading: { type: Boolean, default: false }
  },
  setup(__props, { expose: __expose }) {
    const FontSizeRate$1 = FontSizeRate;
    const FontWeightRate$1 = FontWeightRate;
    const props = __props;
    const parentLoading = toRef(props, "parentLoading");
    const route = useRoute();
    const { t } = useTranslation();
    const { formatCodecNumber, getFiatAmountByCodecString } = useFormattedAmount();
    const { isLoggedIn } = useInternalConnect();
    const settingsStore = useSettingsStore();
    const responsiveClass = computed(() => settingsStore.screenBreakpointClass);
    const assets = computed(() => store.getters.dashboard.ownedAssets);
    const balance = ref(ZeroStringValue);
    const supply = ref(ZeroStringValue);
    const showSendDialog = ref(false);
    const showBurnDialog = ref(false);
    const showMintDialog = ref(false);
    const balanceSubscription = ref(null);
    const supplySubscription = ref(null);
    const asset = computed(() => {
      const assetId = route.params.asset;
      if (!assetId) return null;
      return assets.value.find(({ address }) => address === assetId) ?? null;
    });
    const formattedBalance = computed(
      () => balance.value ? formatCodecNumber(balance.value, asset.value?.decimals) : "0"
    );
    const fiatBalance = computed(
      () => asset.value && balance.value ? getFiatAmountByCodecString(balance.value, asset.value) : ZeroStringValue
    );
    const hasFiat = computed(() => Boolean(fiatBalance.value));
    const formattedSupply = computed(
      () => supply.value ? formatCodecNumber(supply.value, asset.value?.decimals) : ZeroStringValue
    );
    const fiatSupply = computed(
      () => asset.value && supply.value ? getFiatAmountByCodecString(supply.value, asset.value) : ZeroStringValue
    );
    const isAddLiquidityDisabled = computed(() => !asset.value?.decimals);
    const hasFixedSupply = computed(() => !asset.value?.isMintable);
    function getForceRerenderKey(name) {
      return `${name}-${responsiveClass.value}`;
    }
    function handleBack() {
      router.back();
    }
    function openSendDialog() {
      showSendDialog.value = true;
    }
    function openMintDialog() {
      showMintDialog.value = true;
    }
    function openBurnDialog() {
      showBurnDialog.value = true;
    }
    function goToAddLiquidity() {
      if (!asset.value) return;
      router.push({ name: PageNames.AddLiquidity, params: { first: XOR.symbol, second: asset.value.address } });
    }
    function stopAssetSubscriptions() {
      balanceSubscription.value?.unsubscribe?.();
      supplySubscription.value?.unsubscribe?.();
      balanceSubscription.value = null;
      supplySubscription.value = null;
    }
    async function subscribeToCurrentAsset() {
      stopAssetSubscriptions();
      const target = asset.value;
      if (!target) return;
      balanceSubscription.value = api.assets.getAssetBalanceObservable(target).subscribe((result) => {
        balance.value = result.transferable;
      });
      supplySubscription.value = api.apiRx.query.tokens.totalIssuance(target.address).subscribe((result) => {
        supply.value = result.toString();
      });
    }
    const {
      withApi,
      updateSubscriptions,
      resetSubscriptions: resetTrackedSubscriptions
    } = useSubscriptions({
      parentLoading,
      loginSource: isLoggedIn,
      trackConnection: false,
      startSubscriptions: [subscribeToCurrentAsset],
      resetSubscriptions: [stopAssetSubscriptions]
    });
    watch(asset, async (next, previous) => {
      if (next === previous) return;
      if (!next) {
        stopAssetSubscriptions();
        return;
      }
      await updateSubscriptions();
    });
    onMounted(async () => {
      await withApi(async () => {
        if (!isLoggedIn.value) {
          router.push({ name: DashboardPageNames.AssetOwner });
          return;
        }
        await waitUntil(() => !parentLoading.value);
        if (!asset.value) {
          router.push({ name: DashboardPageNames.AssetOwner });
          return;
        }
        await updateSubscriptions();
      });
    });
    onBeforeUnmount(() => {
      stopAssetSubscriptions();
      resetTrackedSubscriptions();
    });
    __expose({
      asset,
      formattedBalance,
      fiatBalance,
      formattedSupply,
      fiatSupply,
      hasFiat,
      isAddLiquidityDisabled,
      hasFixedSupply,
      showSendDialog,
      showBurnDialog,
      showMintDialog,
      handleBack,
      openSendDialog,
      openMintDialog,
      openBurnDialog,
      goToAddLiquidity,
      getForceRerenderKey
    });
    const instance = getCurrentInstance();
    if (instance?.proxy) {
      Object.defineProperties(instance.proxy, {
        asset: { get: () => asset.value },
        formattedBalance: { get: () => formattedBalance.value },
        fiatBalance: { get: () => fiatBalance.value },
        formattedSupply: { get: () => formattedSupply.value },
        fiatSupply: { get: () => fiatSupply.value },
        hasFiat: { get: () => hasFiat.value },
        isAddLiquidityDisabled: { get: () => isAddLiquidityDisabled.value },
        hasFixedSupply: { get: () => hasFixedSupply.value },
        showSendDialog: { get: () => showSendDialog.value },
        showBurnDialog: { get: () => showBurnDialog.value },
        showMintDialog: { get: () => showMintDialog.value },
        handleBack: { value: handleBack },
        openSendDialog: { value: openSendDialog },
        openMintDialog: { value: openMintDialog },
        openBurnDialog: { value: openBurnDialog },
        goToAddLiquidity: { value: goToAddLiquidity },
        getForceRerenderKey: { value: getForceRerenderKey }
      });
    }
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_button = resolveComponent("s-button");
      const _component_token_address = resolveComponent("token-address");
      const _component_token_logo = resolveComponent("token-logo");
      const _component_s_divider = resolveComponent("s-divider");
      const _component_formatted_amount = resolveComponent("formatted-amount");
      const _component_s_card = resolveComponent("s-card");
      const _component_s_col = resolveComponent("s-col");
      const _component_price_chart_widget = resolveComponent("price-chart-widget");
      const _component_s_tooltip = resolveComponent("s-tooltip");
      const _component_s_row = resolveComponent("s-row");
      const _component_mint_dialog = resolveComponent("mint-dialog");
      const _component_burn_dialog = resolveComponent("burn-dialog");
      const _component_send_dialog = resolveComponent("send-dialog");
      return asset.value ? (openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_s_button, {
          class: "asset-owner-details-back",
          type: "action",
          size: "small",
          alternative: "",
          tooltip: unref(t)("assets.details"),
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
          class: "asset-owner-details-main",
          gutter: 20
        }, {
          default: withCtx(() => [
            createVNode(_component_s_col, {
              xs: 12,
              sm: 12,
              md: 5,
              lg: 5
            }, {
              default: withCtx(() => [
                createVNode(_component_s_card, {
                  class: "asset details-card",
                  "border-radius": "small",
                  shadow: "always",
                  size: "big",
                  primary: ""
                }, {
                  default: withCtx(() => [
                    _cache[5] || (_cache[5] = createBaseVNode("p", { class: "p3" }, "Your asset", -1)),
                    createBaseVNode("div", _hoisted_2, [
                      createBaseVNode("div", _hoisted_3, [
                        createBaseVNode("h3", _hoisted_4, toDisplayString(asset.value.name), 1),
                        createVNode(_component_token_address, {
                          address: asset.value.address,
                          symbol: asset.value.symbol
                        }, null, 8, ["address", "symbol"])
                      ]),
                      createVNode(_component_token_logo, {
                        class: "asset-title__icon",
                        size: "big",
                        token: asset.value
                      }, null, 8, ["token"])
                    ]),
                    createVNode(_component_s_divider),
                    createBaseVNode("div", _hoisted_5, [
                      createBaseVNode("div", _hoisted_6, [
                        _cache[3] || (_cache[3] = createBaseVNode("p", { class: "p3" }, "Your balance", -1)),
                        createVNode(_component_formatted_amount, {
                          class: "asset__value",
                          "value-can-be-hidden": "",
                          value: formattedBalance.value,
                          "font-size-rate": unref(FontSizeRate$1).MEDIUM,
                          "font-weight-rate": unref(FontWeightRate$1).MEDIUM
                        }, null, 8, ["value", "font-size-rate", "font-weight-rate"]),
                        fiatBalance.value ? (openBlock(), createBlock(_component_formatted_amount, {
                          key: 0,
                          "is-fiat-value": "",
                          "value-can-be-hidden": "",
                          value: fiatBalance.value
                        }, null, 8, ["value"])) : createCommentVNode("", true)
                      ]),
                      createVNode(_component_s_button, {
                        class: "s-typography-button--small",
                        size: "small",
                        onClick: openSendDialog
                      }, {
                        default: withCtx(() => [
                          createVNode(_component_s_icon, {
                            name: "finance-send-24",
                            size: "16"
                          }),
                          _cache[4] || (_cache[4] = createTextVNode(" Send ", -1))
                        ]),
                        _: 1
                      })
                    ])
                  ]),
                  _: 1
                }),
                createVNode(_component_s_card, {
                  class: "details-card",
                  "border-radius": "small",
                  shadow: "always",
                  size: "big",
                  primary: ""
                }, {
                  default: withCtx(() => [
                    createBaseVNode("div", _hoisted_7, [
                      createBaseVNode("div", _hoisted_8, [
                        createBaseVNode("h4", null, toDisplayString(asset.value.symbol) + " asset supply", 1),
                        createVNode(_component_formatted_amount, {
                          class: "asset__value",
                          value: formattedSupply.value,
                          "font-size-rate": unref(FontSizeRate$1).MEDIUM,
                          "font-weight-rate": unref(FontWeightRate$1).MEDIUM
                        }, null, 8, ["value", "font-size-rate", "font-weight-rate"]),
                        fiatSupply.value ? (openBlock(), createBlock(_component_formatted_amount, {
                          key: 0,
                          "is-fiat-value": "",
                          value: fiatSupply.value
                        }, null, 8, ["value"])) : createCommentVNode("", true)
                      ]),
                      createVNode(_component_s_button, {
                        class: "s-typography-button--small",
                        type: "primary",
                        size: "small",
                        disabled: isAddLiquidityDisabled.value,
                        onClick: goToAddLiquidity
                      }, {
                        default: withCtx(() => [
                          createVNode(_component_s_icon, {
                            name: "basic-drop-24",
                            size: "16"
                          }),
                          _cache[6] || (_cache[6] = createTextVNode(" Add liquidity ", -1))
                        ]),
                        _: 1
                      }, 8, ["disabled"])
                    ]),
                    createVNode(_component_s_divider),
                    createBaseVNode("div", _hoisted_9, [
                      createVNode(_component_s_button, {
                        class: "s-typography-button--small",
                        size: "small",
                        disabled: hasFixedSupply.value,
                        onClick: openMintDialog
                      }, {
                        default: withCtx(() => [
                          createVNode(_component_s_icon, {
                            name: "printer-16",
                            size: "16"
                          }),
                          _cache[7] || (_cache[7] = createTextVNode(" Mint more ", -1))
                        ]),
                        _: 1
                      }, 8, ["disabled"]),
                      createVNode(_component_s_button, {
                        class: "s-typography-button--small",
                        size: "small",
                        onClick: openBurnDialog
                      }, {
                        default: withCtx(() => [
                          createVNode(_component_s_icon, {
                            name: "basic-flame-24",
                            size: "16"
                          }),
                          _cache[8] || (_cache[8] = createTextVNode(" Burn ", -1))
                        ]),
                        _: 1
                      })
                    ]),
                    isAddLiquidityDisabled.value ? (openBlock(), createElementBlock("p", _hoisted_10, " Adding liquidity is not available because the asset is non-divisible. ")) : createCommentVNode("", true),
                    hasFixedSupply.value ? (openBlock(), createElementBlock("p", _hoisted_11, "Minting the asset is unavailable because it is not extensible.")) : createCommentVNode("", true)
                  ]),
                  _: 1
                }),
                (openBlock(), createBlock(_sfc_main$1, {
                  key: getForceRerenderKey("dashboard-supply-chart"),
                  class: "details-card",
                  "predefined-token": asset.value
                }, null, 8, ["predefined-token"]))
              ]),
              _: 1
            }),
            createVNode(_component_s_col, {
              xs: 12,
              sm: 12,
              md: 7,
              lg: 7
            }, {
              default: withCtx(() => [
                (openBlock(), createBlock(_component_price_chart_widget, {
                  key: getForceRerenderKey("dashboard-price-chart"),
                  class: "details-card",
                  "base-asset": asset.value,
                  "is-available": hasFiat.value
                }, null, 8, ["base-asset", "is-available"])),
                createVNode(_component_s_row, { gutter: 20 }, {
                  default: withCtx(() => [
                    createVNode(_component_s_col, {
                      xs: 6,
                      sm: 6,
                      md: 6,
                      lg: 4
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_s_card, {
                          class: "details-card",
                          "border-radius": "small",
                          shadow: "always",
                          size: "big",
                          primary: ""
                        }, {
                          default: withCtx(() => [
                            createBaseVNode("p", _hoisted_12, [
                              _cache[9] || (_cache[9] = createTextVNode(" HOLDERS ", -1)),
                              createVNode(_component_s_tooltip, {
                                slot: "suffix",
                                "border-radius": "mini",
                                content: "COMING SOON...",
                                placement: "top",
                                tabindex: "-1"
                              }, {
                                default: withCtx(() => [
                                  createVNode(_component_s_icon, {
                                    name: "info-16",
                                    size: "14px"
                                  })
                                ]),
                                _: 1
                              })
                            ]),
                            _cache[10] || (_cache[10] = createBaseVNode("div", { class: "asset-stats-card__value" }, "N/A", -1))
                          ]),
                          _: 1
                        })
                      ]),
                      _: 1
                    }),
                    createVNode(_component_s_col, {
                      xs: 6,
                      sm: 6,
                      md: 6,
                      lg: 4
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_s_card, {
                          class: "details-card",
                          "border-radius": "small",
                          shadow: "always",
                          size: "big",
                          primary: ""
                        }, {
                          default: withCtx(() => [
                            createBaseVNode("p", _hoisted_13, [
                              _cache[11] || (_cache[11] = createTextVNode(" TOTAL TXNS ", -1)),
                              createVNode(_component_s_tooltip, {
                                slot: "suffix",
                                "border-radius": "mini",
                                content: "COMING SOON...",
                                placement: "top",
                                tabindex: "-1"
                              }, {
                                default: withCtx(() => [
                                  createVNode(_component_s_icon, {
                                    name: "info-16",
                                    size: "14px"
                                  })
                                ]),
                                _: 1
                              })
                            ]),
                            _cache[12] || (_cache[12] = createBaseVNode("div", { class: "asset-stats-card__value" }, "N/A", -1))
                          ]),
                          _: 1
                        })
                      ]),
                      _: 1
                    }),
                    createVNode(_component_s_col, {
                      xs: 6,
                      sm: 6,
                      md: 6,
                      lg: 4
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_s_card, {
                          class: "details-card",
                          "border-radius": "small",
                          shadow: "always",
                          size: "big",
                          primary: ""
                        }, {
                          default: withCtx(() => [
                            createBaseVNode("p", _hoisted_14, [
                              _cache[13] || (_cache[13] = createTextVNode(" MINTED ", -1)),
                              createVNode(_component_s_tooltip, {
                                slot: "suffix",
                                "border-radius": "mini",
                                content: "COMING SOON...",
                                placement: "top",
                                tabindex: "-1"
                              }, {
                                default: withCtx(() => [
                                  createVNode(_component_s_icon, {
                                    name: "info-16",
                                    size: "14px"
                                  })
                                ]),
                                _: 1
                              })
                            ]),
                            _cache[14] || (_cache[14] = createBaseVNode("div", { class: "asset-stats-card__value" }, "N/A", -1))
                          ]),
                          _: 1
                        })
                      ]),
                      _: 1
                    }),
                    createVNode(_component_s_col, {
                      xs: 6,
                      sm: 6,
                      md: 6,
                      lg: 4
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_s_card, {
                          class: "details-card",
                          "border-radius": "small",
                          shadow: "always",
                          size: "big",
                          primary: ""
                        }, {
                          default: withCtx(() => [
                            createBaseVNode("p", _hoisted_15, [
                              _cache[15] || (_cache[15] = createTextVNode(" MINT TXNS ", -1)),
                              createVNode(_component_s_tooltip, {
                                slot: "suffix",
                                "border-radius": "mini",
                                content: "COMING SOON...",
                                placement: "top",
                                tabindex: "-1"
                              }, {
                                default: withCtx(() => [
                                  createVNode(_component_s_icon, {
                                    name: "info-16",
                                    size: "14px"
                                  })
                                ]),
                                _: 1
                              })
                            ]),
                            _cache[16] || (_cache[16] = createBaseVNode("div", { class: "asset-stats-card__value" }, "N/A", -1))
                          ]),
                          _: 1
                        })
                      ]),
                      _: 1
                    }),
                    createVNode(_component_s_col, {
                      xs: 6,
                      sm: 6,
                      md: 6,
                      lg: 4
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_s_card, {
                          class: "details-card",
                          "border-radius": "small",
                          shadow: "always",
                          size: "big",
                          primary: ""
                        }, {
                          default: withCtx(() => [
                            createBaseVNode("p", _hoisted_16, [
                              _cache[17] || (_cache[17] = createTextVNode(" BURNED ", -1)),
                              createVNode(_component_s_tooltip, {
                                slot: "suffix",
                                "border-radius": "mini",
                                content: "COMING SOON...",
                                placement: "top",
                                tabindex: "-1"
                              }, {
                                default: withCtx(() => [
                                  createVNode(_component_s_icon, {
                                    name: "info-16",
                                    size: "14px"
                                  })
                                ]),
                                _: 1
                              })
                            ]),
                            _cache[18] || (_cache[18] = createBaseVNode("div", { class: "asset-stats-card__value" }, "N/A", -1))
                          ]),
                          _: 1
                        })
                      ]),
                      _: 1
                    }),
                    createVNode(_component_s_col, {
                      xs: 6,
                      sm: 6,
                      md: 6,
                      lg: 4
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_s_card, {
                          class: "details-card",
                          "border-radius": "small",
                          shadow: "always",
                          size: "big",
                          primary: ""
                        }, {
                          default: withCtx(() => [
                            createBaseVNode("p", _hoisted_17, [
                              _cache[19] || (_cache[19] = createTextVNode(" BURN TXNS ", -1)),
                              createVNode(_component_s_tooltip, {
                                slot: "suffix",
                                "border-radius": "mini",
                                content: "COMING SOON...",
                                placement: "top",
                                tabindex: "-1"
                              }, {
                                default: withCtx(() => [
                                  createVNode(_component_s_icon, {
                                    name: "info-16",
                                    size: "14px"
                                  })
                                ]),
                                _: 1
                              })
                            ]),
                            _cache[20] || (_cache[20] = createBaseVNode("div", { class: "asset-stats-card__value" }, "N/A", -1))
                          ]),
                          _: 1
                        })
                      ]),
                      _: 1
                    })
                  ]),
                  _: 1
                })
              ]),
              _: 1
            })
          ]),
          _: 1
        }),
        createVNode(_component_mint_dialog, {
          visible: showMintDialog.value,
          "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => showMintDialog.value = $event),
          asset: asset.value,
          "editable-fiat": hasFiat.value
        }, null, 8, ["visible", "asset", "editable-fiat"]),
        createVNode(_component_burn_dialog, {
          visible: showBurnDialog.value,
          "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => showBurnDialog.value = $event),
          asset: asset.value,
          balance: balance.value,
          "editable-fiat": hasFiat.value
        }, null, 8, ["visible", "asset", "balance", "editable-fiat"]),
        createVNode(_component_send_dialog, {
          visible: showSendDialog.value,
          "onUpdate:visible": _cache[2] || (_cache[2] = ($event) => showSendDialog.value = $event),
          asset: asset.value,
          balance: balance.value,
          "editable-fiat": hasFiat.value
        }, null, 8, ["visible", "asset", "balance", "editable-fiat"])
      ])) : (openBlock(), createElementBlock("div", _hoisted_18));
    };
  }
});
const AssetOwnerDetails = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-6b146206"]]);
export {
  AssetOwnerDetails as default
};
