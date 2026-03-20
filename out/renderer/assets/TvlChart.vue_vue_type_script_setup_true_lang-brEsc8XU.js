import { aF as getCurrentIndexer, aG as IndexerType, bn as retryOnEmptyResult, aH as gql, z as defineComponent, ak as lazyComponent, al as Components, aZ as components, e as useSettingsStore, I as storeToRefs, U as useLoading, u as useTranslation, aA as watch, a4 as onMounted, ab as getCurrentScope, ac as onScopeDispose, a9 as ref, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, aj as unref, h as computed, aO as createTextVNode, aN as toDisplayString, as as mergeProps, bp as formatAmountWithSuffix, bq as calcPriceChange, F as FPNumber, aU as formatDecimalPlaces, bs as first, bo as last } from "./index-73GArslZ.js";
import "./index-C1Moop9t.js";
import { N as NETWORK_STATS_FILTERS, S as SECONDS_IN_TYPE } from "./snapshots-C2HRhynI.js";
import { u as useChartSpec, s as src_default, L as LinearGradient } from "./component-CFIRMeyp.js";
const SubqueryNetworkTvlQuery = gql`
  query NetworkTvlQuery($after: Cursor, $type: SnapshotType, $from: Int, $to: Int) {
    data: networkSnapshots(
      after: $after
      orderBy: TIMESTAMP_DESC
      filter: {
        and: [
          { type: { equalTo: $type } }
          { timestamp: { lessThanOrEqualTo: $from } }
          { timestamp: { greaterThanOrEqualTo: $to } }
          { liquidityUSD: { greaterThan: "0" } }
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
          liquidityUSD
        }
      }
    }
  }
`;
const SubsquidNetworkTvlQuery = gql`
  query NetworkTvlQuery($after: String, $type: SnapshotType, $from: Int, $to: Int) {
    data: networkSnapshotsConnection(
      after: $after
      orderBy: timestamp_DESC
      where: { AND: [{ type_eq: $type }, { timestamp_lte: $from }, { timestamp_gte: $to }, { liquidityUSD_gt: "0" }] }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          timestamp
          liquidityUSD
        }
      }
    }
  }
`;
const parse = (node) => {
  const value = +node.liquidityUSD;
  return {
    timestamp: +node.timestamp * 1e3,
    value: Number.isFinite(value) ? value : 0
  };
};
async function fetchData(from, to, type) {
  const indexer = getCurrentIndexer();
  let data;
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer;
      data = await retryOnEmptyResult(
        async () => subqueryIndexer.services.explorer.fetchAllEntities(SubqueryNetworkTvlQuery, { from, to, type }, parse),
        (value) => !value?.length
      );
      break;
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer;
      data = await retryOnEmptyResult(
        async () => subsquidIndexer.services.explorer.fetchAllEntitiesConnection(
          SubsquidNetworkTvlQuery,
          { from, to, type },
          parse
        ),
        (value) => !value?.length
      );
      break;
    }
  }
  return data ?? [];
}
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "TvlChart",
  props: {
    parentLoading: { type: Boolean, default: false }
  },
  setup(__props) {
    const BaseWidget = lazyComponent(Components.BaseWidget);
    const ChartSkeleton = lazyComponent(Components.ChartSkeleton);
    const PriceChange = lazyComponent(Components.PriceChange);
    const StatsFilter = lazyComponent(Components.StatsFilter);
    const { FormattedAmount } = components;
    const props = __props;
    const filters = NETWORK_STATS_FILTERS;
    const filter = ref(filters[0]);
    const data = ref([]);
    const isFetchingError = ref(false);
    const settingsStore = useSettingsStore();
    const { exchangeRate, currencySymbol } = storeToRefs(settingsStore);
    const nodeIsConnected = computed(() => settingsStore.nodeIsConnected);
    const hasResolvedData = ref(false);
    const parentLoading = computed(() => props.parentLoading);
    const { loading, withLoading, withParentLoading } = useLoading({ parentLoading });
    const { t, TranslationConsts } = useTranslation();
    const { gridSpec, xAxisSpec, yAxisSpec, tooltipSpec, lineSeriesSpec } = useChartSpec();
    const loadingState = computed(() => parentLoading.value || loading.value || !hasResolvedData.value);
    const chart = ref(null);
    const chartKey = computed(() => `tvl-chart-${currencySymbol.value}-rate-${exchangeRate.value}`);
    const firstValue = computed(() => new FPNumber(first(data.value)?.value ?? 0));
    const lastValue = computed(() => new FPNumber(last(data.value)?.value ?? 0));
    const amount = computed(() => formatAmountWithSuffix(firstValue.value.mul(exchangeRate.value)));
    const priceChange = computed(() => calcPriceChange(firstValue.value, lastValue.value));
    const chartSpec = computed(() => ({
      dataset: {
        source: data.value.map((item) => [item.timestamp, item.value]),
        dimensions: ["timestamp", "value"]
      },
      grid: gridSpec({
        top: 20,
        left: 45
      }),
      xAxis: xAxisSpec(),
      yAxis: yAxisSpec({
        axisLabel: {
          formatter: (value) => {
            const val = new FPNumber(value).mul(exchangeRate.value);
            const formatted = formatAmountWithSuffix(val);
            return `${formatted.amount} ${formatted.suffix}`;
          }
        }
      }),
      tooltip: tooltipSpec({
        formatter: (params) => {
          const [, value] = params[0].data;
          const currencyValue = new FPNumber(value).mul(exchangeRate.value);
          return `${currencySymbol.value} ${formatDecimalPlaces(currencyValue)}`;
        }
      }),
      series: [
        lineSeriesSpec({
          areaStyle: {
            opacity: 0.8,
            color: new LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(248, 8, 123, 0.25)" },
              { offset: 1, color: "rgba(255, 49, 148, 0.03)" }
            ])
          }
        })
      ]
    }));
    const changeFilter = (next) => {
      filter.value = next;
      updateData();
    };
    const updateData = async () => {
      await withLoading(async () => {
        await withParentLoading(async () => {
          try {
            const { type, count } = filter.value;
            const seconds = SECONDS_IN_TYPE[type];
            const now = Math.floor(Date.now() / (seconds * 1e3)) * seconds;
            const to = now - seconds * count;
            data.value = Object.freeze(await fetchData(now, to, type));
            isFetchingError.value = false;
            hasResolvedData.value = data.value.length > 0 || nodeIsConnected.value;
          } catch (error) {
            console.error(error);
            isFetchingError.value = true;
            hasResolvedData.value = nodeIsConnected.value;
          }
        });
      });
    };
    watch(nodeIsConnected, (connected) => {
      if (!connected) {
        hasResolvedData.value = false;
        return;
      }
      if (!hasResolvedData.value) {
        void updateData();
      }
    });
    onMounted(() => {
      void updateData();
    });
    if (getCurrentScope()) {
      onScopeDispose(() => {
        chart.value = null;
        hasResolvedData.value = false;
      });
    }
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(BaseWidget), mergeProps(_ctx.$attrs, {
        title: unref(TranslationConsts).TVL,
        tooltip: unref(t)("tooltips.tvl")
      }), {
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
            loading: loadingState.value,
            "is-empty": data.value.length === 0,
            "is-error": isFetchingError.value,
            onRetry: updateData
          }, {
            default: withCtx(() => [
              createVNode(unref(FormattedAmount), {
                class: "chart-price",
                value: amount.value.amount
              }, {
                prefix: withCtx(() => [
                  createTextVNode(toDisplayString(unref(currencySymbol)), 1)
                ]),
                default: withCtx(() => [
                  createTextVNode(" " + toDisplayString(amount.value.suffix), 1)
                ]),
                _: 1
              }, 8, ["value"]),
              createVNode(unref(PriceChange), { value: priceChange.value }, null, 8, ["value"]),
              (openBlock(), createBlock(unref(src_default), {
                ref_key: "chart",
                ref: chart,
                class: "chart",
                key: chartKey.value,
                option: chartSpec.value,
                autoresize: ""
              }, null, 8, ["option"]))
            ]),
            _: 1
          }, 8, ["loading", "is-empty", "is-error"])
        ]),
        _: 1
      }, 16, ["title", "tooltip"]);
    };
  }
});
export {
  _sfc_main as _
};
