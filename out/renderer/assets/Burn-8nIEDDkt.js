import { z as defineComponent, aZ as components, ak as lazyComponent, d as dayjs, dv as durationPlugin, U as useLoading, c0 as toRef, u as useTranslation, G as useInternalConnect, cn as reactive, F as FPNumber, a9 as ref, h as computed, a4 as onMounted, bx as waitForSoraNetworkFromEnv, aI as WALLET_CONSTS, aB as onBeforeUnmount, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, C as openBlock, ap as createVNode, ao as withCtx, bQ as Fragment, bP as renderList, am as createBlock, bA as withDirectives, bb as normalizeClass, aM as createCommentVNode, D as createBaseVNode, aj as unref, aN as toDisplayString, X as XOR, aO as createTextVNode, al as Components, s as store, aP as _export_sfc } from "./index-73GArslZ.js";
import BurnDialog from "./BurnDialog-BMfd40cm.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { f as fetchData } from "./burnXor-CuYTXNGC.js";
const solswapMarkUrl = "" + new URL("solswap-mark-Dum6MJcA.svg", import.meta.url).href;
const _hoisted_1 = { class: "burn-container s-flex-column" };
const _hoisted_2 = ["src"];
const _hoisted_3 = { class: "description centered p4" };
const _hoisted_4 = { class: "info-card-container s-flex" };
const _hoisted_5 = { class: "info-card-item s-flex-column" };
const _hoisted_6 = { class: "info-card-value" };
const _hoisted_7 = { class: "info-card-item s-flex-column" };
const _hoisted_8 = { class: "info-card-title" };
const _hoisted_9 = { class: "info-card-value" };
const _hoisted_10 = { class: "burn-info__content s-flex-column" };
const _hoisted_11 = { class: "burn-info__desc s-flex" };
const _hoisted_12 = { class: "burn-info__badge" };
const zeroString = "0";
const blockDuration = 6e3;
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      GenericPageHeader: lazyComponent(Components.GenericPageHeader),
      InfoLine: components.InfoLine,
      ExternalLink: components.ExternalLink,
      BurnDialog
    }
  },
  __name: "Burn",
  props: {
    parentLoading: { type: Boolean, default: false }
  },
  setup(__props, { expose: __expose }) {
    dayjs.extend(durationPlugin);
    const props = __props;
    const parentLoadingRef = toRef(props, "parentLoading");
    const { loading, withLoading, withApi } = useLoading({ parentLoading: parentLoadingRef });
    const { t } = useTranslation();
    const { getFPNumber, getFiatAmountByString } = useFormattedAmount();
    const { isLoggedIn, connectSoraWallet, soraAddress } = useInternalConnect();
    const xor = XOR;
    const blockNumber = computed(() => store.state.wallet.settings.blockNumber);
    const soraNetwork = computed(() => store.state.wallet.settings.soraNetwork);
    const campaignsObj = reactive({
      solswap: {
        id: "solswap",
        title: "Burn XOR for SOLSWAP (SS)",
        description: "Starting at block 25,043,003 on the SORA 2 network, burn XOR to reserve SOLSWAP (SS). 100% of supply (100,000,000 SS) is distributed via fair launch at 100 SOLSWAP per 1 XOR burned.",
        link: "https://t.me/solswap_io",
        receivedAsset: { symbol: "SS", address: "", name: "SOLSWAP", decimals: 18 },
        rate: "0.01",
        max: 1e8,
        min: 1,
        from: 25043003,
        fromTimestamp: 1717693074001,
        to: 6e7,
        toTimestamp: 1893456e6
      }
    });
    const campaignOrder = ["solswap"];
    const campaigns = computed(() => campaignOrder.map((key) => campaignsObj[key]));
    const createDefaultBurned = () => ({
      solswap: new FPNumber(0)
    });
    const totalXorBurned = reactive(createDefaultBurned());
    const accountXorBurned = reactive(createDefaultBurned());
    const timeLeftFormatted = reactive({
      solswap: "30D"
    });
    const ended = reactive({
      solswap: false
    });
    const burnDialogVisible = ref(false);
    const selectedReceivedAsset = ref(campaignsObj.solswap.receivedAsset);
    const selectedRate = ref(campaignsObj.solswap.rate);
    const selectedMax = ref(campaignsObj.solswap.max);
    const selectedMin = ref(campaignsObj.solswap.min);
    const intervalId = ref(null);
    const decimalDelimiter = FPNumber.DELIMITERS_CONFIG.decimal;
    const escapedDecimalDelimiter = decimalDelimiter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const decimalOnlyZerosRegExp = new RegExp(`${escapedDecimalDelimiter}0+$`);
    const trailingZerosRegExp = new RegExp(`(${escapedDecimalDelimiter}\\d*?[1-9])0+$`);
    const danglingDecimalRegExp = new RegExp(`${escapedDecimalDelimiter}$`);
    const minBlock = computed(() => Math.min(...campaignOrder.map((key) => campaignsObj[key].from)));
    const maxBlock = computed(() => Math.max(...campaignOrder.map((key) => campaignsObj[key].to)));
    function trimTrailingZeros(value) {
      return value.replace(decimalOnlyZerosRegExp, "").replace(trailingZerosRegExp, "$1").replace(danglingDecimalRegExp, "");
    }
    function formatAmount(value, precision) {
      const formatted = precision === void 0 ? value.toLocaleString() : value.toLocaleString(precision);
      return trimTrailingZeros(formatted);
    }
    function getFormattedXor(rate) {
      return formatAmount(getFPNumber(rate));
    }
    function getFormattedXorFiat(rate) {
      return getFiatAmountByString(rate, xor);
    }
    function getFormattedTotalXorBurned(id) {
      return totalXorBurned[id] ? formatAmount(totalXorBurned[id]) : zeroString;
    }
    function getFormattedTotalReserved(id, rate) {
      return totalXorBurned[id] ? formatAmount(totalXorBurned[id].div(rate), 3) : zeroString;
    }
    function getFormattedAccountXorBurned(id) {
      return accountXorBurned[id] ? formatAmount(accountXorBurned[id]) : zeroString;
    }
    function getFormattedAccountReserved(id, rate) {
      return accountXorBurned[id] ? formatAmount(accountXorBurned[id].div(rate), 3) : zeroString;
    }
    function calcCountdown() {
      const currentBlock = blockNumber.value;
      for (const campaign of campaigns.value) {
        const msLeft = (campaign.to - currentBlock) * blockDuration;
        if (msLeft <= 0) {
          timeLeftFormatted[campaign.id] = "0D 0H 0M";
          ended[campaign.id] = true;
          continue;
        }
        ended[campaign.id] = false;
        const expires = dayjs.duration(msLeft);
        timeLeftFormatted[campaign.id] = expires.format("D[D] HH[H] mm[M]");
      }
    }
    async function fetchStatistics() {
      const burns = await fetchData(minBlock.value, maxBlock.value);
      const address = soraAddress.value;
      const accountTotals = createDefaultBurned();
      const overallTotals = createDefaultBurned();
      for (const campaign of campaigns.value) {
        const campaignBurns = burns.filter(({ blockHeight }) => blockHeight >= campaign.from && blockHeight <= campaign.to);
        const accountsBurned = campaignBurns.reduce((acc, { address: burnAddress, amount }) => {
          const current = acc[burnAddress] ?? new FPNumber(0);
          acc[burnAddress] = current.add(amount);
          return acc;
        }, {});
        const minBurned = new FPNumber(campaign.rate).mul(campaign.min);
        Object.entries(accountsBurned).forEach(([burnAddress, amount]) => {
          if (!amount.gte(minBurned)) return;
          overallTotals[campaign.id] = overallTotals[campaign.id].add(amount);
          if (address && burnAddress === address) {
            accountTotals[campaign.id] = accountTotals[campaign.id].add(amount);
          }
        });
      }
      for (const key of campaignOrder) {
        accountXorBurned[key] = accountTotals[key];
        totalXorBurned[key] = overallTotals[key];
      }
    }
    async function fetchDataAndCalcCountdown() {
      await withLoading(async () => {
        calcCountdown();
        await fetchStatistics();
      });
    }
    function handleBurnClick(id) {
      const campaign = campaignsObj[id];
      selectedReceivedAsset.value = campaign.receivedAsset;
      selectedRate.value = campaign.rate;
      selectedMax.value = campaign.max;
      selectedMin.value = campaign.min;
      burnDialogVisible.value = true;
    }
    function handleBurnConfirm(done) {
      if (done) {
        loading.value = true;
      }
    }
    __expose({
      campaigns,
      handleBurnClick,
      burnDialogVisible,
      selectedReceivedAsset,
      selectedRate,
      selectedMax,
      selectedMin,
      handleBurnConfirm,
      loading,
      timeLeftFormatted,
      ended,
      totalXorBurned,
      accountXorBurned
    });
    onMounted(async () => {
      await withApi(async () => {
        const network = soraNetwork.value ?? await waitForSoraNetworkFromEnv();
        if (network !== WALLET_CONSTS.SoraNetwork.Prod) {
          campaignsObj.solswap.from = 0;
          campaignsObj.solswap.to = 1e4;
        }
        await fetchDataAndCalcCountdown();
        intervalId.value = window.setInterval(() => {
          void fetchDataAndCalcCountdown();
        }, 6e4);
      });
    });
    onBeforeUnmount(() => {
      if (intervalId.value) {
        clearInterval(intervalId.value);
      }
    });
    return (_ctx, _cache) => {
      const _component_generic_page_header = resolveComponent("generic-page-header");
      const _component_external_link = resolveComponent("external-link");
      const _component_info_line = resolveComponent("info-line");
      const _component_s_button = resolveComponent("s-button");
      const _component_s_form = resolveComponent("s-form");
      const _component_s_col = resolveComponent("s-col");
      const _component_s_row = resolveComponent("s-row");
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_card = resolveComponent("s-card");
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_s_row, {
          class: "burn-row",
          gutter: 16,
          justify: "center"
        }, {
          default: withCtx(() => [
            (openBlock(true), createElementBlock(Fragment, null, renderList(campaigns.value, ({ id, title, description, link, receivedAsset, rate, disabledText }) => {
              return openBlock(), createBlock(_component_s_col, {
                key: id,
                class: "burn-column s-flex",
                xs: 12,
                sm: 12,
                md: 12,
                lg: 6,
                xl: 6
              }, {
                default: withCtx(() => [
                  withDirectives((openBlock(), createBlock(_component_s_form, {
                    class: normalizeClass(["container container--burn el-form--actions", { disabled: ended[id] }]),
                    "show-message": false
                  }, {
                    default: withCtx(() => [
                      id === "solswap" ? (openBlock(), createElementBlock("img", {
                        key: 0,
                        class: "campaign-logo",
                        src: unref(solswapMarkUrl),
                        alt: "SOLSWAP logo"
                      }, null, 8, _hoisted_2)) : createCommentVNode("", true),
                      createVNode(_component_generic_page_header, {
                        class: "page-header--burn",
                        title
                      }, null, 8, ["title"]),
                      createBaseVNode("p", _hoisted_3, toDisplayString(description), 1),
                      createVNode(_component_external_link, {
                        class: "p4 link",
                        title: "Read more",
                        href: link
                      }, null, 8, ["href"]),
                      createVNode(_component_info_line, {
                        label: `1 ${receivedAsset.symbol}`,
                        value: getFormattedXor(rate),
                        "asset-symbol": unref(xor).symbol,
                        "fiat-value": getFormattedXorFiat(rate)
                      }, null, 8, ["label", "value", "asset-symbol", "fiat-value"]),
                      createVNode(_component_info_line, {
                        label: `Your reserved ${receivedAsset.symbol} tokens`,
                        value: getFormattedAccountReserved(id, rate),
                        "asset-symbol": receivedAsset.symbol,
                        "value-can-be-hidden": ""
                      }, null, 8, ["label", "value", "asset-symbol"]),
                      createVNode(_component_info_line, {
                        label: "Your burned XOR tokens",
                        value: getFormattedAccountXorBurned(id),
                        "asset-symbol": unref(xor).symbol,
                        "value-can-be-hidden": ""
                      }, null, 8, ["value", "asset-symbol"]),
                      createBaseVNode("div", _hoisted_4, [
                        createBaseVNode("div", _hoisted_5, [
                          _cache[1] || (_cache[1] = createBaseVNode("span", { class: "info-card-title" }, "TOTAL XOR BURNED", -1)),
                          createBaseVNode("span", _hoisted_6, toDisplayString(getFormattedTotalXorBurned(id)), 1)
                        ]),
                        createBaseVNode("div", _hoisted_7, [
                          createBaseVNode("span", _hoisted_8, "TOTAL " + toDisplayString(receivedAsset.symbol) + " RESERVED", 1),
                          createBaseVNode("span", _hoisted_9, toDisplayString(getFormattedTotalReserved(id, rate)), 1)
                        ])
                      ]),
                      !unref(isLoggedIn) ? (openBlock(), createBlock(_component_s_button, {
                        key: 1,
                        type: "primary",
                        class: "action-button s-typography-button--large",
                        onClick: unref(connectSoraWallet)
                      }, {
                        default: withCtx(() => [
                          createTextVNode(toDisplayString(unref(t)("connectWalletText")), 1)
                        ]),
                        _: 1
                      }, 8, ["onClick"])) : (openBlock(), createBlock(_component_s_button, {
                        key: 2,
                        class: "action-button s-typography-button--large",
                        type: "primary",
                        disabled: ended[id],
                        loading: __props.parentLoading || !ended[id] && unref(loading),
                        onClick: ($event) => handleBurnClick(id)
                      }, {
                        default: withCtx(() => [
                          ended[id] ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                            createTextVNode(toDisplayString(disabledText ?? "TIME IS OVER"), 1)
                          ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                            createTextVNode("BURN MY XOR")
                          ], 64))
                        ]),
                        _: 2
                      }, 1032, ["disabled", "loading", "onClick"]))
                    ]),
                    _: 2
                  }, 1032, ["class"])), [
                    [_directive_loading, __props.parentLoading]
                  ])
                ]),
                _: 2
              }, 1024);
            }), 128))
          ]),
          _: 1
        }),
        createVNode(_component_s_card, {
          class: "burn-info",
          "border-radius": "small",
          shadow: "always",
          size: "medium",
          pressed: ""
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_10, [
              createBaseVNode("div", _hoisted_11, [
                _cache[2] || (_cache[2] = createBaseVNode("p", { class: "description p4" }, " The 'Burn XOR' is a community-proposed initiative. It’s not officially endorsed by any centralized authority or organization. Participation and interaction with the 'Burn XOR' should be considered with understanding of its community-driven nature. ", -1)),
                createBaseVNode("div", _hoisted_12, [
                  createVNode(_component_s_icon, {
                    class: "burn-info__icon",
                    name: "notifications-alert-triangle-24",
                    size: "24"
                  })
                ])
              ])
            ])
          ]),
          _: 1
        }),
        createVNode(BurnDialog, {
          visible: burnDialogVisible.value,
          "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => burnDialogVisible.value = $event),
          "received-asset": selectedReceivedAsset.value,
          "burned-asset": unref(xor),
          rate: selectedRate.value,
          max: selectedMax.value,
          min: selectedMin.value,
          onConfirm: handleBurnConfirm
        }, null, 8, ["visible", "received-asset", "burned-asset", "rate", "max", "min"])
      ]);
    };
  }
});
const Burn = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-b7ede95a"]]);
export {
  Burn as default
};
