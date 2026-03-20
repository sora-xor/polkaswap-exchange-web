import { aF as getCurrentIndexer, aG as IndexerType, bn as retryOnEmptyResult, aH as gql, F as FPNumber, z as defineComponent, ak as lazyComponent, al as Components, aZ as components, a9 as ref, e as useSettingsStore, I as storeToRefs, U as useLoading, u as useTranslation, aA as watch, a4 as onMounted, ab as getCurrentScope, ac as onScopeDispose, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, aj as unref, h as computed, aO as createTextVNode, aN as toDisplayString, as as mergeProps, bo as last, X as XOR, bp as formatAmountWithSuffix, bq as calcPriceChange, aU as formatDecimalPlaces } from "./index-73GArslZ.js";
import { N as NETWORK_STATS_FILTERS, S as SECONDS_IN_TYPE } from "./snapshots-C2HRhynI.js";
import { u as useChartSpec, s as src_default } from "./component-CFIRMeyp.js";
const SubqueryNetworkVolumeQuery = gql`
  query NetworkVolumeQuery($after: Cursor, $fees: Boolean!, $type: SnapshotType, $from: Int, $to: Int) {
    data: networkSnapshots(
      after: $after
      orderBy: TIMESTAMP_DESC
      filter: {
        and: [
          { type: { equalTo: $type } }
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
          volumeUSD @skip(if: $fees)
          fees @include(if: $fees)
        }
      }
    }
  }
`;
const SubsquidNetworkVolumeQuery = gql`
  query NetworkVolumeQuery($after: String, $fees: Boolean!, $type: SnapshotType, $from: Int, $to: Int) {
    data: networkSnapshotsConnection(
      after: $after
      orderBy: timestamp_DESC
      where: { AND: [{ type_eq: $type }, { timestamp_lte: $from }, { timestamp_gte: $to }] }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          timestamp
          volumeUSD @skip(if: $fees)
          fees @include(if: $fees)
        }
      }
    }
  }
`;
const parse = (fees) => (node) => {
  const value = fees ? FPNumber.fromCodecValue(node.fees) : new FPNumber(node.volumeUSD);
  return {
    timestamp: +node.timestamp * 1e3,
    value: value.isFinity() ? value : FPNumber.ZERO
  };
};
async function fetchData(fees, from, to, type) {
  const indexer = getCurrentIndexer();
  let data;
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer;
      data = await retryOnEmptyResult(
        async () => subqueryIndexer.services.explorer.fetchAllEntities(
          SubqueryNetworkVolumeQuery,
          { fees, from, to, type },
          parse(fees)
        ),
        (value) => !value?.length
      );
      break;
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer;
      data = await retryOnEmptyResult(
        async () => subsquidIndexer.services.explorer.fetchAllEntitiesConnection(
          SubsquidNetworkVolumeQuery,
          { fees, from, to, type },
          parse(fees)
        ),
        (value) => !value?.length
      );
      break;
    }
  }
  return data ?? [];
}
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "BarChart",
  props: {
    fees: { type: Boolean, default: false },
    parentLoading: { type: Boolean, default: false }
  },
  setup(__props) {
    const getTotalValue = (data2) => data2.reduce((acc, item) => acc.add(item.value), FPNumber.ZERO);
    const iterate = (prevTimestamp, currentTimestamp, difference) => {
      const buffer = [];
      while ((currentTimestamp += difference) < prevTimestamp) {
        buffer.push({
          timestamp: currentTimestamp,
          value: FPNumber.ZERO
        });
      }
      return buffer.reverse();
    };
    const normalizeTo = (sample, difference, from, to) => {
      const prevTimestamp = last(sample)?.timestamp ?? from;
      const buffer = iterate(prevTimestamp, to, difference);
      sample.push(...buffer);
    };
    const normalizeData = (collection, difference, from, to) => {
      const sample = [];
      for (const item of collection) {
        normalizeTo(sample, difference, from, item.timestamp);
        sample.push(item);
      }
      normalizeTo(sample, difference, from, to);
      return sample;
    };
    const props = __props;
    const BaseWidget = lazyComponent(Components.BaseWidget);
    const ChartSkeleton = lazyComponent(Components.ChartSkeleton);
    const PriceChange = lazyComponent(Components.PriceChange);
    const StatsFilter = lazyComponent(Components.StatsFilter);
    const { FormattedAmount } = components;
    const chart = ref(null);
    const filters = NETWORK_STATS_FILTERS;
    const filter = ref(filters[0]);
    const settingsStore = useSettingsStore();
    const { exchangeRate, currencySymbol } = storeToRefs(settingsStore);
    const nodeIsConnected = computed(() => settingsStore.nodeIsConnected);
    const hasResolvedData = ref(false);
    const parentLoading = computed(() => props.parentLoading);
    const { loading, withLoading, withParentLoading } = useLoading({ parentLoading });
    const { t } = useTranslation();
    const { gridSpec, xAxisSpec, yAxisSpec, tooltipSpec, barSeriesSpec } = useChartSpec();
    const loadingState = computed(() => parentLoading.value || loading.value || !hasResolvedData.value);
    const data = ref([]);
    const prevData = ref([]);
    const isFetchingError = ref(false);
    const chartKey = computed(
      () => props.fees ? void 0 : `bar-chart-${currencySymbol.value}-rate-${exchangeRate.value}`
    );
    const symbol = computed(() => props.fees ? XOR.symbol : currencySymbol.value);
    const title = computed(() => props.fees ? "Fees" : "Volume");
    const tooltip = computed(() => t(props.fees ? "tooltips.fees" : "tooltips.volume"));
    const total = computed(() => getTotalValue(data.value));
    const amount = computed(
      () => props.fees ? formatAmountWithSuffix(total.value) : formatAmountWithSuffix(total.value.mul(exchangeRate.value))
    );
    const priceChange = computed(() => calcPriceChange(total.value, getTotalValue(prevData.value)));
    const chartSpec = computed(() => ({
      dataset: {
        source: data.value.map((item) => [item.timestamp, item.value.toNumber()]),
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
          const { data: datum } = params[0];
          const [, value] = datum;
          if (props.fees) {
            return `${formatDecimalPlaces(value)} ${XOR.symbol}`;
          }
          const currencyAmount = new FPNumber(value).mul(exchangeRate.value);
          return `${currencySymbol.value} ${formatDecimalPlaces(currencyAmount)}`;
        }
      }),
      series: [
        barSeriesSpec({
          itemStyle: {
            color: "#C86FFF"
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
            const aTime = now - seconds * count;
            const bTime = aTime - seconds * count;
            const [curr, prev] = await Promise.all([
              fetchData(props.fees, now, aTime, type),
              fetchData(props.fees, aTime, bTime, type)
            ]);
            data.value = Object.freeze(normalizeData(curr, seconds * 1e3, now * 1e3, aTime * 1e3));
            prevData.value = Object.freeze(prev);
            isFetchingError.value = false;
            hasResolvedData.value = curr.length > 0 || prev.length > 0 || nodeIsConnected.value;
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
        title: title.value,
        tooltip: tooltip.value
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
                  createTextVNode(toDisplayString(symbol.value), 1)
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
