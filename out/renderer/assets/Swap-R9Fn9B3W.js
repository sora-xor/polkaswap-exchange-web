import { X as XOR, z as defineComponent, u as useTranslation, U as useLoading, aA as watch, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, as as mergeProps, h as computed, a9 as ref, aO as createTextVNode, aN as toDisplayString, aj as unref, V as PageNames, s as store, aP as _export_sfc } from "./index-73GArslZ.js";
import SwapDistributionWidget from "./Distribution-DtEkTwFB.js";
import SwapFormWidget from "./Form-CKZYKbiM.js";
import SwapTransactionDetailsWidget from "./TransactionDetails-B3mx2cO7.js";
import SwapTransactionsWidget from "./Transactions-CQkT6Jzz.js";
import CustomiseWidget from "./Customise-CFyCy5rs.js";
import { _ as _sfc_main$3 } from "./PriceChart.vue_vue_type_style_index_0_lang-BAAUSv-6.js";
import { _ as _sfc_main$4 } from "./Grid.vue_vue_type_style_index_0_lang-r8JOs3S3.js";
import { _ as _sfc_main$1 } from "./SupplyChart.vue_vue_type_script_setup_true_lang-S9jcH_2c.js";
import { _ as _sfc_main$2 } from "./TokenPriceChart.vue_vue_type_script_setup_true_lang-DMczEIuJ.js";
import { u as usePiniaTelemetry } from "./usePiniaTelemetry-DKBIwNF3.js";
import { u as useSelectedTokensRoute } from "./useSelectedTokensRoute-FZz8yy9f.js";
import { u as useSwapAmounts } from "./useSwapAmounts-COuMA7gl.js";
import { u as useSwapStore } from "./swap-DtWqRzUD.js";
import "./useFormattedAmount-D-xkdlPs.js";
import "./swap-sOuQz5wL.js";
import "./useConfirmDialog-CVL8UdZp.js";
import "./useTokenSelect-DZ9bQ0SE.js";
import "./utils-BPrAXW0V.js";
import "./useWidgetTokenSelect-CzOdir7j.js";
import "./Base-QFob0qUB.js";
import "./index-C1Moop9t.js";
import "./component-CFIRMeyp.js";
import "./pick-DD6Hsmr0.js";
import "./icons-Dp8k03eO.js";
import "./PriceChange-DVhzQTTr.js";
import "./FormattedAmount-CpadAVnm.js";
import "./snapshots-C2HRhynI.js";
const normalizeSwapRouteTokens = (firstAddress = "", secondAddress = "") => {
  if (firstAddress && secondAddress) {
    return { firstAddress, secondAddress };
  }
  return { firstAddress: XOR.address, secondAddress: "" };
};
const SWAP_GRID_ID = "swapGrid:v2";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{ name: "SwapPage" },
  __name: "Swap",
  setup(__props) {
    const { t, tc } = useTranslation();
    const { loading, withApi } = useLoading();
    const swapStore = useSwapStore();
    const { tokenFrom, tokenTo, setTokenFromAddress, setTokenToAddress } = useSwapAmounts();
    usePiniaTelemetry("swap", [{ store: swapStore, storeId: "swap" }], {
      metadata: () => ({
        tokenFrom: tokenFrom.value?.symbol ?? null,
        tokenTo: tokenTo.value?.symbol ?? null
      })
    });
    const customizePopper = ref(false);
    const options = ref({ edit: false });
    const widgets = ref({
      [
        "swapChart"
        /* Chart */
      ]: true,
      [
        "swapDistribution"
        /* Distribution */
      ]: true,
      [
        "swapTransactionDetails"
        /* TransactionDetails */
      ]: false,
      [
        "swapTransactions"
        /* Transactions */
      ]: false,
      [
        "swapTokenPriceChart"
        /* TokenPriceChart */
      ]: false,
      [
        "swapSupplyChart"
        /* SupplyChart */
      ]: false
    });
    const DefaultLayouts = {
      lg: [
        {
          x: 5,
          y: 0,
          w: 6,
          h: 20,
          minW: 4,
          minH: 20,
          i: "swapForm"
          /* Form */
        },
        {
          x: 5,
          y: 20,
          w: 6,
          h: 3,
          minW: 2,
          minH: 3,
          maxH: 3,
          i: "customise"
          /* Customise */
        },
        {
          x: 5,
          y: 24,
          w: 6,
          h: 8,
          minW: 4,
          minH: 8,
          i: "swapDistribution"
          /* Distribution */
        },
        {
          x: 5,
          y: 24,
          w: 6,
          h: 8,
          minW: 4,
          minH: 8,
          i: "swapTransactionDetails"
          /* TransactionDetails */
        },
        {
          x: 5,
          y: 24,
          w: 6,
          h: 16,
          minW: 4,
          minH: 16,
          i: "swapSupplyChart"
          /* SupplyChart */
        },
        {
          x: 11,
          y: 0,
          w: 8,
          h: 20,
          minW: 4,
          minH: 16,
          i: "swapChart"
          /* Chart */
        },
        {
          x: 11,
          y: 20,
          w: 8,
          h: 20,
          minW: 4,
          minH: 20,
          i: "swapTransactions"
          /* Transactions */
        },
        {
          x: 11,
          y: 20,
          w: 8,
          h: 20,
          minW: 4,
          minH: 16,
          i: "swapTokenPriceChart"
          /* TokenPriceChart */
        }
      ],
      md: [
        {
          x: 3,
          y: 0,
          w: 4,
          h: 20,
          minW: 4,
          minH: 20,
          i: "swapForm"
          /* Form */
        },
        {
          x: 3,
          y: 20,
          w: 4,
          h: 3,
          minW: 2,
          minH: 3,
          maxH: 3,
          i: "customise"
          /* Customise */
        },
        {
          x: 3,
          y: 24,
          w: 4,
          h: 8,
          minW: 4,
          minH: 8,
          i: "swapDistribution"
          /* Distribution */
        },
        {
          x: 3,
          y: 24,
          w: 4,
          h: 8,
          minW: 4,
          minH: 8,
          i: "swapTransactionDetails"
          /* TransactionDetails */
        },
        {
          x: 3,
          y: 24,
          w: 4,
          h: 12,
          minW: 4,
          minH: 12,
          i: "swapSupplyChart"
          /* SupplyChart */
        },
        {
          x: 7,
          y: 0,
          w: 6,
          h: 20,
          minW: 4,
          minH: 16,
          i: "swapChart"
          /* Chart */
        },
        {
          x: 7,
          y: 20,
          w: 6,
          h: 20,
          minW: 4,
          minH: 20,
          i: "swapTransactions"
          /* Transactions */
        },
        {
          x: 7,
          y: 20,
          w: 6,
          h: 20,
          minW: 4,
          minH: 16,
          i: "swapTokenPriceChart"
          /* TokenPriceChart */
        }
      ],
      sm: [
        {
          x: 1,
          y: 0,
          w: 4,
          h: 20,
          minW: 4,
          minH: 20,
          i: "swapForm"
          /* Form */
        },
        {
          x: 1,
          y: 20,
          w: 4,
          h: 3,
          minW: 2,
          minH: 3,
          maxH: 3,
          i: "customise"
          /* Customise */
        },
        {
          x: 1,
          y: 24,
          w: 4,
          h: 9,
          minW: 4,
          minH: 9,
          i: "swapDistribution"
          /* Distribution */
        },
        {
          x: 1,
          y: 24,
          w: 4,
          h: 9,
          minW: 4,
          minH: 9,
          i: "swapTransactionDetails"
          /* TransactionDetails */
        },
        {
          x: 1,
          y: 24,
          w: 4,
          h: 20,
          minW: 4,
          minH: 16,
          i: "swapSupplyChart"
          /* SupplyChart */
        },
        {
          x: 5,
          y: 0,
          w: 6,
          h: 20,
          minW: 4,
          minH: 20,
          i: "swapChart"
          /* Chart */
        },
        {
          x: 5,
          y: 20,
          w: 6,
          h: 20,
          minW: 4,
          minH: 20,
          i: "swapTransactions"
          /* Transactions */
        },
        {
          x: 5,
          y: 40,
          w: 6,
          h: 20,
          minW: 4,
          minH: 16,
          i: "swapTokenPriceChart"
          /* TokenPriceChart */
        }
      ],
      xs: [
        {
          x: 0,
          y: 0,
          w: 4,
          h: 3,
          minW: 2,
          minH: 3,
          maxH: 3,
          i: "customise"
          /* Customise */
        },
        {
          x: 0,
          y: 4,
          w: 4,
          h: 20,
          minW: 4,
          minH: 20,
          i: "swapForm"
          /* Form */
        },
        {
          x: 0,
          y: 24,
          w: 4,
          h: 8,
          minW: 4,
          minH: 8,
          i: "swapDistribution"
          /* Distribution */
        },
        {
          x: 0,
          y: 24,
          w: 4,
          h: 8,
          minW: 4,
          minH: 8,
          i: "swapTransactionDetails"
          /* TransactionDetails */
        },
        {
          x: 4,
          y: 0,
          w: 4,
          h: 20,
          minW: 4,
          minH: 20,
          i: "swapChart"
          /* Chart */
        },
        {
          x: 0,
          y: 32,
          w: 4,
          h: 16,
          minW: 4,
          minH: 16,
          i: "swapTransactions"
          /* Transactions */
        },
        {
          x: 4,
          y: 20,
          w: 4,
          h: 20,
          minW: 4,
          minH: 20,
          i: "swapTokenPriceChart"
          /* TokenPriceChart */
        },
        {
          x: 4,
          y: 20,
          w: 4,
          h: 20,
          minW: 4,
          minH: 20,
          i: "swapSupplyChart"
          /* SupplyChart */
        }
      ],
      xss: [
        {
          x: 0,
          y: 0,
          w: 4,
          h: 3,
          minW: 2,
          minH: 3,
          maxH: 3,
          i: "customise"
          /* Customise */
        },
        {
          x: 0,
          y: 4,
          w: 4,
          h: 20,
          minW: 4,
          minH: 20,
          i: "swapForm"
          /* Form */
        },
        {
          x: 0,
          y: 24,
          w: 4,
          h: 8,
          minW: 4,
          minH: 8,
          i: "swapDistribution"
          /* Distribution */
        },
        {
          x: 0,
          y: 24,
          w: 4,
          h: 8,
          minW: 4,
          minH: 8,
          i: "swapTransactionDetails"
          /* TransactionDetails */
        },
        {
          x: 0,
          y: 36,
          w: 4,
          h: 20,
          minW: 4,
          minH: 20,
          i: "swapChart"
          /* Chart */
        },
        {
          x: 0,
          y: 56,
          w: 4,
          h: 20,
          minW: 4,
          minH: 20,
          i: "swapTokenPriceChart"
          /* TokenPriceChart */
        },
        {
          x: 0,
          y: 56,
          w: 4,
          h: 20,
          minW: 4,
          minH: 20,
          i: "swapTransactions"
          /* Transactions */
        },
        {
          x: 0,
          y: 56,
          w: 4,
          h: 20,
          minW: 4,
          minH: 20,
          i: "swapSupplyChart"
          /* SupplyChart */
        }
      ]
    };
    const isAvailable = computed(() => swapStore.isAvailable);
    const prevRoute = computed(() => store.state.router.prev);
    const { firstRouteAddress, secondRouteAddress, isValidRoute, parseCurrentRoute, updateRouteAfterSelectTokens } = useSelectedTokensRoute(async ({ firstAddress, secondAddress }) => {
      const normalizedPair = normalizeSwapRouteTokens(firstAddress, secondAddress);
      await setTokenFromAddress(normalizedPair.firstAddress);
      await setTokenToAddress(normalizedPair.secondAddress);
    });
    watch([tokenFrom, tokenTo], ([from, to]) => {
      if (from && to) {
        updateRouteAfterSelectTokens(from, to);
      }
    });
    const labels = computed(() => {
      const priceText = t("priceChartText");
      const aSymbol = tokenFrom.value?.symbol ?? "";
      const bSymbol = tokenTo.value?.symbol ?? "";
      const tokensText = aSymbol && bSymbol ? [aSymbol, bSymbol].filter(Boolean).join("/") : `(${t("orderBook.tokenPair")})`;
      return {
        [
          "swapForm"
          /* Form */
        ]: t("swapText"),
        [
          "swapDistribution"
          /* Distribution */
        ]: t("swap.route"),
        [
          "swapTransactionDetails"
          /* TransactionDetails */
        ]: t("transaction.title"),
        [
          "swapTransactions"
          /* Transactions */
        ]: tc("transactionText", 2),
        [
          "swapChart"
          /* Chart */
        ]: `${priceText} ${tokensText}`,
        [
          "swapTokenPriceChart"
          /* TokenPriceChart */
        ]: priceText,
        [
          "swapSupplyChart"
          /* SupplyChart */
        ]: t("createToken.tokenSupply.placeholder"),
        edit: t("editText")
      };
    });
    const pageLoading = computed(() => loading.value);
    const initializeSwapPage = async () => {
      await withApi(async () => {
        parseCurrentRoute();
        if (tokenFrom.value && tokenTo.value && prevRoute.value !== PageNames.OrderBook) {
          updateRouteAfterSelectTokens(tokenFrom.value, tokenTo.value);
        } else if (isValidRoute.value && firstRouteAddress.value && secondRouteAddress.value) {
          await setTokenFromAddress(firstRouteAddress.value);
          await setTokenToAddress(secondRouteAddress.value);
        } else if (!tokenFrom.value) {
          await setTokenFromAddress(XOR.address);
          await setTokenToAddress("");
        }
      });
    };
    void initializeSwapPage().catch((error) => {
      console.error("[swap] failed to initialize route tokens", error);
    });
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createBlock(_sfc_main$4, {
        "grid-id": SWAP_GRID_ID,
        class: "swap-container",
        "auto-resize": "",
        draggable: options.value.edit,
        resizable: options.value.edit,
        lines: options.value.edit,
        loading: pageLoading.value,
        "default-layouts": DefaultLayouts,
        modelValue: widgets.value,
        "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => widgets.value = $event)
      }, {
        [
          "swapForm"
          /* Form */
        ]: withCtx((props) => [
          createVNode(SwapFormWidget, mergeProps(props, {
            "primary-title": "",
            full: ""
          }), null, 16)
        ]),
        [
          "swapChart"
          /* Chart */
        ]: withCtx((props) => [
          createVNode(_sfc_main$3, mergeProps(props, {
            "base-asset": unref(tokenFrom),
            "quote-asset": unref(tokenTo),
            "is-available": isAvailable.value,
            full: ""
          }), null, 16, ["base-asset", "quote-asset", "is-available"])
        ]),
        [
          "swapDistribution"
          /* Distribution */
        ]: withCtx((props) => [
          createVNode(SwapDistributionWidget, mergeProps(props, { full: "" }), null, 16)
        ]),
        [
          "swapTransactionDetails"
          /* TransactionDetails */
        ]: withCtx((props) => [
          createVNode(SwapTransactionDetailsWidget, mergeProps(props, { full: "" }), null, 16)
        ]),
        [
          "swapTransactions"
          /* Transactions */
        ]: withCtx((props) => [
          createVNode(SwapTransactionsWidget, mergeProps(props, {
            full: "",
            extensive: ""
          }), null, 16)
        ]),
        [
          "customise"
          /* Customise */
        ]: withCtx(({ reset, ...props }) => [
          createVNode(CustomiseWidget, mergeProps(props, {
            modelValue: customizePopper.value,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => customizePopper.value = $event),
            widgets: widgets.value,
            "onUpdate:widgets": _cache[1] || (_cache[1] = ($event) => widgets.value = $event),
            options: options.value,
            "onUpdate:options": _cache[2] || (_cache[2] = ($event) => options.value = $event),
            labels: labels.value,
            "pip-disabled": "",
            full: ""
          }), {
            default: withCtx(() => [
              createVNode(_component_s_button, { onClick: reset }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(unref(t)("resetText")), 1)
                ]),
                _: 1
              }, 8, ["onClick"])
            ]),
            _: 2
          }, 1040, ["modelValue", "widgets", "options", "labels"])
        ]),
        [
          "swapTokenPriceChart"
          /* TokenPriceChart */
        ]: withCtx((props) => [
          createVNode(_sfc_main$2, mergeProps(props, { full: "" }), null, 16)
        ]),
        [
          "swapSupplyChart"
          /* SupplyChart */
        ]: withCtx((props) => [
          createVNode(_sfc_main$1, mergeProps(props, { full: "" }), null, 16)
        ]),
        _: 2
      }, 1032, ["draggable", "resizable", "lines", "loading", "modelValue"]);
    };
  }
});
const Swap = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-dfd9c770"]]);
export {
  Swap as default
};
