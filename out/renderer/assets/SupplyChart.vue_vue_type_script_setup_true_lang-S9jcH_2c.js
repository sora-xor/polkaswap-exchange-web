import { aF as getCurrentIndexer, aG as IndexerType, bv as VAL, bw as PSWAP, r as requireLegacyStore, bx as waitForSoraNetworkFromEnv, aH as gql, F as FPNumber, z as defineComponent, ak as lazyComponent, al as Components, aZ as components, e as useSettingsStore, I as storeToRefs, U as useLoading, u as useTranslation, a4 as onMounted, aA as watch, ab as getCurrentScope, ac as onScopeDispose, a9 as ref, am as createBlock, C as openBlock, an as createSlots, ao as withCtx, h as computed, ap as createVNode, aj as unref, aq as withModifiers, aM as createCommentVNode, aO as createTextVNode, aN as toDisplayString, ar as isRef, as as mergeProps, bp as formatAmountWithSuffix, bq as calcPriceChange, aU as formatDecimalPlaces, bs as first, bo as last } from "./index-73GArslZ.js";
import { A as ASSET_SUPPLY_FILTERS, S as SECONDS_IN_TYPE } from "./snapshots-C2HRhynI.js";
import { a as useThemePalette, u as useChartSpec, s as src_default, c as createThemePalette } from "./component-CFIRMeyp.js";
import { u as useWidgetTokenSelect } from "./useWidgetTokenSelect-CzOdir7j.js";
const CIRCULATING_DIFF = {
  [VAL.address]: 334496093779e-4,
  [PSWAP.address]: 63450144206195e-4
};
const SubqueryAssetSupplyQuery = gql`
  query AssetSupplyQuery($after: Cursor, $type: SnapshotType, $id: String, $from: Int, $to: Int) {
    data: assetSnapshots(
      after: $after
      orderBy: TIMESTAMP_DESC
      filter: {
        and: [
          { type: { equalTo: $type } }
          { assetId: { equalTo: $id } }
          { timestamp: { lessThanOrEqualTo: $from } }
          { timestamp: { greaterThanOrEqualTo: $to } }
        ]
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          timestamp
          supply
          mint
          burn
        }
      }
    }
  }
`;
const SubsquidAssetSupplyQuery = gql`
  query AssetSupplyQuery($after: String, $type: SnapshotType, $id: String, $from: Int, $to: Int) {
    data: assetSnapshotsConnection(
      after: $after
      orderBy: timestamp_DESC
      where: { AND: [{ type_eq: $type }, { asset: { id_eq: $id } }, { timestamp_lte: $from }, { timestamp_gte: $to }] }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          timestamp
          supply
          mint
          burn
        }
      }
    }
  }
`;
const toNumber = (value) => {
  const fp = FPNumber.fromCodecValue(value);
  return fp.isFinity() ? fp.toNumber() : 0;
};
const parse = (node) => {
  return {
    timestamp: +node.timestamp * 1e3,
    value: toNumber(node.supply),
    mint: toNumber(node.mint),
    burn: toNumber(node.burn)
  };
};
async function fetchAssetSupplyData(id, from, to, type) {
  const indexer = getCurrentIndexer();
  let data;
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer;
      data = await subqueryIndexer.services.explorer.fetchAllEntities(
        SubqueryAssetSupplyQuery,
        { id, from, to, type },
        parse
      );
      break;
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer;
      data = await subsquidIndexer.services.explorer.fetchAllEntitiesConnection(
        SubsquidAssetSupplyQuery,
        { id, from, to, type },
        parse
      );
      break;
    }
  }
  const chartData = data ?? [];
  if (![VAL.address, PSWAP.address].includes(id)) {
    return chartData;
  }
  const env = requireLegacyStore()?.state?.wallet?.settings?.soraNetwork ?? await waitForSoraNetworkFromEnv();
  if (env !== "Prod") return chartData;
  const diff = CIRCULATING_DIFF[id];
  return chartData.map((item) => ({ ...item, value: item.value - diff }));
}
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "SupplyChart",
  props: {
    parentLoading: { type: Boolean, default: false },
    predefinedToken: { default: null },
    defaultAsset: { default: void 0 }
  },
  setup(__props) {
    const ChartSkeleton = lazyComponent(Components.ChartSkeleton);
    const PriceChange = lazyComponent(Components.PriceChange);
    const BaseWidget = lazyComponent(Components.BaseWidget);
    const StatsFilter = lazyComponent(Components.StatsFilter);
    const TokenSelectButton = lazyComponent(Components.TokenSelectButton);
    const SelectToken = lazyComponent(Components.SelectToken);
    const { FormattedAmount } = components;
    const props = __props;
    const predefinedToken = computed(() => props.predefinedToken);
    const filters = ASSET_SUPPLY_FILTERS;
    const filter = ref(filters[0]);
    const data = ref([]);
    const isFetchingError = ref(false);
    const settingsStore = useSettingsStore();
    const { exchangeRate } = storeToRefs(settingsStore);
    const parentLoading = computed(() => props.parentLoading);
    const { loading, withLoading, withParentLoading } = useLoading({ parentLoading });
    const { t } = useTranslation();
    const { theme } = useThemePalette();
    const { gridSpec, xAxisSpec, yAxisSpec, tooltipSpec, seriesSpec, lineSeriesSpec } = useChartSpec();
    const {
      selectedToken,
      areActionsDisabled,
      selectTokenIcon,
      tokenTabIndex,
      showSelectTokenDialog,
      handleSelectToken,
      changeToken,
      closeTokenDialog
    } = useWidgetTokenSelect({
      defaultAsset: props.defaultAsset,
      predefinedToken,
      parentLoading: () => parentLoading.value,
      loading: () => loading.value
    });
    const chart = ref(null);
    const palette = computed(() => theme.value ?? createThemePalette());
    const firstValue = computed(() => new FPNumber(first(data.value)?.value ?? 0));
    const lastValue = computed(() => new FPNumber(last(data.value)?.value ?? 0));
    const amount = computed(() => formatAmountWithSuffix(firstValue.value));
    const priceChange = computed(() => calcPriceChange(firstValue.value, lastValue.value));
    const chartSpec = computed(() => {
      const formatter = (value) => {
        const val = new FPNumber(value);
        const formatted = formatAmountWithSuffix(val);
        return `${formatted.amount} ${formatted.suffix}`;
      };
      const paletteValue = palette.value;
      return {
        dataset: {
          source: data.value.map((item) => [item.timestamp, item.value, item.mint, item.burn]),
          dimensions: ["timestamp", "supply", "mint", "burn"]
        },
        grid: gridSpec({
          top: 40,
          left: 50,
          right: 50
        }),
        xAxis: xAxisSpec(),
        yAxis: [
          yAxisSpec({
            name: "Remint\nBurn",
            nameGap: 12,
            nameTextStyle: {
              align: "right"
            },
            type: "log",
            min: 1,
            axisLabel: {
              formatter
            },
            splitLine: false
          }),
          yAxisSpec({
            name: "Supply",
            nameGap: 22,
            nameTextStyle: {
              align: "left"
            },
            axisLabel: {
              formatter
            }
          })
        ],
        tooltip: tooltipSpec({
          formatter: (params) => `
          <table>
            ${params.map(
            (param) => `
              <tr>
                <td>${param.marker} ${param.seriesName}</td>
                <td align="right">${formatDecimalPlaces(param.data[param.seriesIndex + 1])}</td>
              </tr>
            `
          ).join("")}
          </table>
        `
        }),
        series: [
          lineSeriesSpec({
            encode: { y: "value" },
            itemStyle: {
              color: paletteValue.color.status.info
            },
            name: "Supply",
            yAxisIndex: 1,
            areaStyle: void 0
          }),
          seriesSpec({
            type: "bar",
            encode: { y: "mint" },
            itemStyle: {
              color: paletteValue.color.status.success,
              opacity: 0.5
            },
            name: "Remint",
            yAxisIndex: 0,
            areaStyle: void 0
          }),
          seriesSpec({
            type: "bar",
            encode: { y: "burn" },
            itemStyle: {
              color: paletteValue.color.status.error,
              opacity: 0.5
            },
            name: "Burn",
            yAxisIndex: 0,
            areaStyle: void 0
          })
        ],
        legend: {
          orient: "horizontal",
          top: 0,
          left: "center",
          icon: "circle",
          textStyle: {
            color: paletteValue.color.base.content.primary,
            fontSize: 12,
            fontWeight: 400,
            lineHeight: 1.5
          },
          selectedMode: false
        }
      };
    });
    const changeFilter = (next) => {
      filter.value = next;
      updateData();
    };
    const onTokenChange = (token) => {
      changeToken(token);
      closeTokenDialog();
    };
    const updateData = async () => {
      await withLoading(async () => {
        await withParentLoading(async () => {
          try {
            const id = selectedToken.value.address;
            const { type, count } = filter.value;
            const seconds = SECONDS_IN_TYPE[type];
            const now = Math.floor(Date.now() / (seconds * 1e3)) * seconds;
            const aTime = now - seconds * count;
            data.value = Object.freeze(await fetchAssetSupplyData(id, now, aTime, type));
            isFetchingError.value = false;
          } catch (error) {
            console.error(error);
            isFetchingError.value = true;
          }
        });
      });
    };
    onMounted(updateData);
    watch(
      () => selectedToken.value.address,
      (current, previous) => {
        if (!previous || current === previous) return;
        updateData();
      }
    );
    if (getCurrentScope()) {
      onScopeDispose(() => {
        chart.value = null;
      });
    }
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(BaseWidget), mergeProps(_ctx.$attrs, {
        title: unref(t)("createToken.tokenSupply.placeholder"),
        tooltip: unref(t)("tooltips.supply")
      }), createSlots({
        filters: withCtx(() => [
          createVNode(unref(StatsFilter), {
            "is-dropdown": "",
            filters: unref(filters),
            "model-value": filter.value,
            "onUpdate:modelValue": changeFilter
          }, null, 8, ["filters", "model-value"])
        ]),
        default: withCtx(() => [
          createVNode(unref(ChartSkeleton), {
            loading: unref(areActionsDisabled),
            "is-empty": data.value.length === 0,
            "is-error": isFetchingError.value,
            onRetry: updateData
          }, {
            default: withCtx(() => [
              createVNode(unref(FormattedAmount), {
                class: "chart-price",
                value: amount.value.amount
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(amount.value.suffix), 1)
                ]),
                _: 1
              }, 8, ["value"]),
              createVNode(unref(PriceChange), { value: priceChange.value }, null, 8, ["value"]),
              createVNode(unref(src_default), {
                ref_key: "chart",
                ref: chart,
                class: "chart",
                option: chartSpec.value,
                autoresize: ""
              }, null, 8, ["option"])
            ]),
            _: 1
          }, 8, ["loading", "is-empty", "is-error"]),
          !predefinedToken.value ? (openBlock(), createBlock(unref(SelectToken), {
            key: 0,
            "disabled-custom": "",
            visible: unref(showSelectTokenDialog),
            "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isRef(showSelectTokenDialog) ? showSelectTokenDialog.value = $event : null),
            asset: unref(selectedToken),
            onSelect: onTokenChange
          }, null, 8, ["visible", "asset"])) : createCommentVNode("", true)
        ]),
        _: 2
      }, [
        !predefinedToken.value ? {
          name: "types",
          fn: withCtx(() => [
            createVNode(unref(TokenSelectButton), {
              icon: unref(selectTokenIcon),
              token: unref(selectedToken),
              tabindex: unref(tokenTabIndex),
              onClick: withModifiers(unref(handleSelectToken), ["stop"])
            }, null, 8, ["icon", "token", "tabindex", "onClick"])
          ]),
          key: "0"
        } : void 0
      ]), 1040, ["title", "tooltip"]);
    };
  }
});
export {
  _sfc_main as _
};
