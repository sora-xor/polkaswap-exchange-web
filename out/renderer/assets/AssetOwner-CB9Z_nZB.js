import { z as defineComponent, cV as dashboardLazyComponent, aZ as components, G as useInternalConnect, u as useTranslation, h as computed, a9 as ref, $ as getCurrentInstance, a_ as resolveComponent, A as createElementBlock, C as openBlock, am as createBlock, ap as createVNode, ao as withCtx, D as createBaseVNode, aO as createTextVNode, aj as unref, aN as toDisplayString, bQ as Fragment, bP as renderList, cW as DashboardComponents, W as router, bi as DashboardPageNames, s as store, cX as resolveStaticAssetUrl, T as Theme, b1 as resolveLibraryTheme, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "asset-owner-container" };
const _hoisted_2 = { class: "p1" };
const _hoisted_3 = { class: "p1" };
const _hoisted_4 = { class: "p1" };
const _hoisted_5 = { class: "p1" };
const _hoisted_6 = { class: "p1" };
const _hoisted_7 = { class: "p1" };
const _hoisted_8 = { class: "p1" };
const _hoisted_9 = { class: "asset-title s-flex" };
const _hoisted_10 = { class: "asset-title__text s-flex-column" };
const _hoisted_11 = { class: "asset-title__name" };
const _hoisted_12 = { class: "p3 asset-title__symbol asset__label" };
const _hoisted_13 = { class: "asset-details s-flex" };
const _hoisted_14 = { class: "asset-details__item s-flex-column" };
const _hoisted_15 = {
  key: 1,
  class: "p3 asset-details__fiat"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      TokenLogo: components.TokenLogo,
      FormattedAmount: components.FormattedAmount,
      CreateTokenDialog: dashboardLazyComponent(DashboardComponents.CreateTokenDialog)
    }
  },
  __name: "AssetOwner",
  setup(__props, { expose: __expose }) {
    const { isLoggedIn, connectSoraWallet } = useInternalConnect();
    const { t } = useTranslation();
    const libraryTheme = computed(() => resolveLibraryTheme(store));
    const assets = computed(() => store.getters.dashboard.ownedAssets);
    const showCreateTokenDialog = ref(false);
    const isNotLoggedInOrEmptyAssets = computed(() => !(isLoggedIn.value && assets.value.length));
    const resolvedTheme = computed(() => libraryTheme.value === Theme.DARK ? Theme.DARK : Theme.LIGHT);
    const noAssetsImg = computed(() => resolveStaticAssetUrl(`asset-owner/${resolvedTheme.value}-hero.png`));
    const noAssetsImgDemo = computed(() => resolveStaticAssetUrl(`asset-owner/${resolvedTheme.value}.png`));
    function handleCreateAsset() {
      showCreateTokenDialog.value = true;
    }
    function handleOpenAssetDetails(asset) {
      router.push({ name: DashboardPageNames.AssetOwnerDetails, params: { asset: asset.address } });
    }
    __expose({
      showCreateTokenDialog,
      handleCreateAsset,
      isNotLoggedInOrEmptyAssets,
      assets,
      isLoggedIn,
      handleOpenAssetDetails
    });
    const instance = getCurrentInstance();
    if (instance?.proxy) {
      Object.defineProperties(instance.proxy, {
        showCreateTokenDialog: { value: showCreateTokenDialog },
        handleCreateAsset: { value: handleCreateAsset },
        isNotLoggedInOrEmptyAssets: { value: isNotLoggedInOrEmptyAssets },
        assets: { value: assets },
        isLoggedIn: { value: isLoggedIn },
        handleOpenAssetDetails: { value: handleOpenAssetDetails }
      });
    }
    return (_ctx, _cache) => {
      const _component_s_image = resolveComponent("s-image");
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_button = resolveComponent("s-button");
      const _component_s_card = resolveComponent("s-card");
      const _component_s_col = resolveComponent("s-col");
      const _component_s_row = resolveComponent("s-row");
      const _component_token_logo = resolveComponent("token-logo");
      const _component_s_divider = resolveComponent("s-divider");
      const _component_formatted_amount = resolveComponent("formatted-amount");
      const _component_create_token_dialog = resolveComponent("create-token-dialog");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        isNotLoggedInOrEmptyAssets.value ? (openBlock(), createBlock(_component_s_row, { key: 0 }, {
          default: withCtx(() => [
            createVNode(_component_s_col, {
              class: "no-assets__first-col",
              xs: 12,
              sm: 12,
              md: 6,
              lg: 6
            }, {
              default: withCtx(() => [
                createVNode(_component_s_card, {
                  class: "no-assets",
                  "border-radius": "small",
                  shadow: "always",
                  size: "big",
                  primary: ""
                }, {
                  default: withCtx(() => [
                    createVNode(_component_s_image, {
                      lazy: "",
                      fit: "cover",
                      draggable: "false",
                      src: noAssetsImg.value
                    }, null, 8, ["src"]),
                    _cache[5] || (_cache[5] = createBaseVNode("h2", { class: "no-assets-text negative-margin--top" }, "Create & launch your token on SORA Network in seconds!", -1)),
                    _cache[6] || (_cache[6] = createBaseVNode("p", { class: "p1 no-assets-text" }, " Launch your unique token efficiently and securely using the established infrastructure of the SORA Network. ", -1)),
                    createBaseVNode("p", _hoisted_2, [
                      createVNode(_component_s_icon, {
                        class: "item-icon",
                        name: "basic-check-mark-24",
                        size: "14"
                      }),
                      _cache[1] || (_cache[1] = createTextVNode(" Full token ownership ", -1))
                    ]),
                    createBaseVNode("p", _hoisted_3, [
                      createVNode(_component_s_icon, {
                        class: "item-icon",
                        name: "basic-check-mark-24",
                        size: "14"
                      }),
                      _cache[2] || (_cache[2] = createTextVNode(" Management dashboard with charts ", -1))
                    ]),
                    createBaseVNode("p", _hoisted_4, [
                      createVNode(_component_s_icon, {
                        class: "item-icon",
                        name: "basic-check-mark-24",
                        size: "14"
                      }),
                      _cache[3] || (_cache[3] = createTextVNode(" Enable decentralization ", -1))
                    ]),
                    !unref(isLoggedIn) ? (openBlock(), createBlock(_component_s_button, {
                      key: 0,
                      class: "no-assets-action s-typography-button--large",
                      type: "primary",
                      onClick: unref(connectSoraWallet)
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(unref(t)("connectWalletText")), 1)
                      ]),
                      _: 1
                    }, 8, ["onClick"])) : (openBlock(), createBlock(_component_s_button, {
                      key: 1,
                      class: "no-assets-action s-typography-button--large",
                      type: "primary",
                      icon: "various-atom-24",
                      onClick: handleCreateAsset
                    }, {
                      default: withCtx(() => [..._cache[4] || (_cache[4] = [
                        createTextVNode(" CREATE ASSET ", -1)
                      ])]),
                      _: 1
                    }))
                  ]),
                  _: 1
                })
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
                  class: "no-assets-demo",
                  "border-radius": "small",
                  shadow: "always",
                  size: "big",
                  primary: ""
                }, {
                  default: withCtx(() => [
                    createVNode(_component_s_image, {
                      class: "negative-margin--left",
                      lazy: "",
                      fit: "cover",
                      draggable: "false",
                      src: noAssetsImgDemo.value
                    }, null, 8, ["src"]),
                    _cache[11] || (_cache[11] = createBaseVNode("h2", { class: "no-assets-text" }, "Dashboard preview", -1)),
                    createBaseVNode("p", _hoisted_5, [
                      createVNode(_component_s_icon, {
                        class: "item-icon",
                        name: "basic-check-mark-24",
                        size: "14"
                      }),
                      _cache[7] || (_cache[7] = createTextVNode(" Burn & mint supply ", -1))
                    ]),
                    createBaseVNode("p", _hoisted_6, [
                      createVNode(_component_s_icon, {
                        class: "item-icon",
                        name: "basic-check-mark-24",
                        size: "14"
                      }),
                      _cache[8] || (_cache[8] = createTextVNode(" Provide liquidity ", -1))
                    ]),
                    createBaseVNode("p", _hoisted_7, [
                      createVNode(_component_s_icon, {
                        class: "item-icon",
                        name: "basic-check-mark-24",
                        size: "14"
                      }),
                      _cache[9] || (_cache[9] = createTextVNode(" Send token ", -1))
                    ]),
                    createBaseVNode("p", _hoisted_8, [
                      createVNode(_component_s_icon, {
                        class: "item-icon",
                        name: "basic-check-mark-24",
                        size: "14"
                      }),
                      _cache[10] || (_cache[10] = createTextVNode(" See statistics ", -1))
                    ])
                  ]),
                  _: 1
                })
              ]),
              _: 1
            })
          ]),
          _: 1
        })) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
          createVNode(_component_s_row, null, {
            default: withCtx(() => [
              createVNode(_component_s_col, {
                xs: 12,
                sm: 6,
                md: 6,
                lg: 6
              }, {
                default: withCtx(() => [..._cache[12] || (_cache[12] = [
                  createBaseVNode("h3", { class: "has-assets__title" }, "Your managed tokens", -1)
                ])]),
                _: 1
              }),
              createVNode(_component_s_col, {
                class: "s-flex has-assets__action-container",
                xs: 12,
                sm: 6,
                md: 6,
                lg: 6
              }, {
                default: withCtx(() => [
                  createVNode(_component_s_button, {
                    class: "s-typography-button--large has-assets__action",
                    icon: "various-atom-24",
                    type: "secondary",
                    onClick: handleCreateAsset
                  }, {
                    default: withCtx(() => [..._cache[13] || (_cache[13] = [
                      createTextVNode(" CREATE ASSET ", -1)
                    ])]),
                    _: 1
                  })
                ]),
                _: 1
              })
            ]),
            _: 1
          }),
          createVNode(_component_s_row, null, {
            default: withCtx(() => [
              (openBlock(true), createElementBlock(Fragment, null, renderList(assets.value, (asset) => {
                return openBlock(), createBlock(_component_s_col, {
                  key: asset.address,
                  xs: 12,
                  sm: 6,
                  md: 6,
                  lg: 4
                }, {
                  default: withCtx(() => [
                    createVNode(_component_s_card, {
                      class: "asset",
                      "border-radius": "small",
                      shadow: "always",
                      size: "big",
                      primary: "",
                      clickable: "",
                      onClick: ($event) => handleOpenAssetDetails(asset)
                    }, {
                      default: withCtx(() => [
                        createBaseVNode("div", _hoisted_9, [
                          createVNode(_component_token_logo, {
                            class: "asset-title__icon",
                            size: "big",
                            token: asset
                          }, null, 8, ["token"]),
                          createBaseVNode("div", _hoisted_10, [
                            createBaseVNode("h3", _hoisted_11, toDisplayString(asset.name), 1),
                            createBaseVNode("p", _hoisted_12, toDisplayString(asset.symbol), 1)
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
                        _cache[17] || (_cache[17] = createBaseVNode("p", { class: "p3 asset-text asset__label" }, "Mint & burn, send the token in the details page", -1)),
                        createVNode(_component_s_divider),
                        createBaseVNode("div", _hoisted_13, [
                          createBaseVNode("div", _hoisted_14, [
                            _cache[14] || (_cache[14] = createBaseVNode("p", { class: "p3 asset__label" }, "Price", -1)),
                            asset.fiat ? (openBlock(), createBlock(_component_formatted_amount, {
                              key: 0,
                              "is-fiat-value": "",
                              value: asset.fiat
                            }, null, 8, ["value"])) : (openBlock(), createElementBlock("p", _hoisted_15, "n/a"))
                          ]),
                          _cache[15] || (_cache[15] = createBaseVNode("div", { class: "asset-details__item s-flex-column" }, [
                            createBaseVNode("p", { class: "p3 asset__label" }, "1D Change"),
                            createBaseVNode("p", { class: "p3 asset-details__fiat" }, "n/a")
                          ], -1)),
                          _cache[16] || (_cache[16] = createBaseVNode("div", { class: "asset-details__item s-flex-column" }, [
                            createBaseVNode("p", { class: "p3 asset__label" }, "1D Volume"),
                            createBaseVNode("p", { class: "p3 asset-details__fiat" }, "n/a")
                          ], -1))
                        ])
                      ]),
                      _: 2
                    }, 1032, ["onClick"])
                  ]),
                  _: 2
                }, 1024);
              }), 128))
            ]),
            _: 1
          })
        ], 64)),
        createVNode(_component_create_token_dialog, {
          visible: showCreateTokenDialog.value,
          "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => showCreateTokenDialog.value = $event)
        }, null, 8, ["visible"])
      ]);
    };
  }
});
const AssetOwner = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-726841fd"]]);
export {
  AssetOwner as default
};
