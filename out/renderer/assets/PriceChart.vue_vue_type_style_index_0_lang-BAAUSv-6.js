import { aF as getCurrentIndexer, aG as IndexerType, bn as retryOnEmptyResult, aH as gql, z as defineComponent, ak as lazyComponent, aZ as components, br as SnapshotTypes, U as useLoading, u as useTranslation, cm as debouncedInputHandler, aA as watch, a4 as onMounted, aB as onBeforeUnmount, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, aj as unref, a9 as ref, h as computed, aI as WALLET_CONSTS, aJ as renderSlot, A as createElementBlock, bQ as Fragment, bP as renderList, aM as createCommentVNode, D as createBaseVNode, aN as toDisplayString, bb as normalizeClass, bH as normalizeProps, bI as guardReactiveProps, al as Components, b5 as nextTick, cn as reactive, bo as last, bJ as isEqual, F as FPNumber, bq as calcPriceChange, bp as formatAmountWithSuffix, aU as formatDecimalPlaces, s as store, co as getCurrency, cp as getTextWidth } from "./index-73GArslZ.js";
import "./index-C1Moop9t.js";
import { p as pick } from "./pick-DD6Hsmr0.js";
import { a as useThemePalette, u as useChartSpec, s as src_default, L as LinearGradient, c as createThemePalette } from "./component-CFIRMeyp.js";
import { S as SvgIcons } from "./icons-Dp8k03eO.js";
import PriceChange from "./PriceChange-DVhzQTTr.js";
import { T as Timeframes, S as SECONDS_IN_TYPE } from "./snapshots-C2HRhynI.js";
const preparePriceData = (item) => {
  const { open, close, low, high } = item.priceUSD;
  return [+open, +close, +low, +high];
};
const transformSnapshot = (item) => {
  const timestamp = +item.timestamp * 1e3;
  const price = preparePriceData(item);
  const volume = +item.volume.amountUSD;
  return { timestamp, price, volume };
};
const subqueryAssetPriceFilter = (assetAddress, type) => {
  return {
    assetId: {
      equalTo: assetAddress
    },
    type: {
      equalTo: type
    }
  };
};
const SubqueryAssetPriceQuery = gql`
  query SubqueryAssetPriceQuery($after: Cursor = "", $filter: AssetSnapshotFilter, $first: Int = null) {
    data: assetSnapshots(after: $after, first: $first, filter: $filter, orderBy: [TIMESTAMP_DESC]) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          priceUSD
          timestamp
          volume
        }
      }
    }
  }
`;
const subsquidAssetPriceFilter = (assetAddress, type) => {
  return {
    asset: { id_eq: assetAddress },
    type_eq: type
  };
};
const SubsquidAssetPriceQuery = gql`
  query SubsquidAssetPriceQuery($after: String = null, $filter: AssetSnapshotWhereInput, $first: Int = 1000) {
    data: assetSnapshotsConnection(after: $after, first: $first, where: $filter, orderBy: [timestamp_DESC]) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          priceUSD {
            close
            high
            low
            open
          }
          volume {
            amountUSD
          }
          timestamp
        }
      }
    }
  }
`;
async function fetchAssetPriceData(entityId, type, first, after) {
  const indexer = getCurrentIndexer();
  let data;
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer;
      const filter = subqueryAssetPriceFilter(entityId, type);
      const variables = { filter, first, after };
      data = await retryOnEmptyResult(
        async () => subqueryIndexer.services.explorer.fetchEntities(SubqueryAssetPriceQuery, variables),
        (value) => !value?.edges?.length
      );
      break;
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer;
      if (after === "") {
        after = null;
      }
      const filter = subsquidAssetPriceFilter(entityId, type);
      const variables = { filter, first, after };
      data = await retryOnEmptyResult(
        async () => subsquidIndexer.services.explorer.fetchEntitiesConnection(SubsquidAssetPriceQuery, variables),
        (value) => !value?.edges?.length
      );
      break;
    }
  }
  if (!data) return null;
  return {
    ...data,
    edges: data.edges.map((edge) => {
      return {
        ...edge,
        node: transformSnapshot(edge.node)
      };
    })
  };
}
const _hoisted_1 = {
  key: 0,
  class: "token-title"
};
const _hoisted_2 = { key: 0 };
const USD_SYMBOL = "USD";
const LABEL_PADDING = 4;
const AXIS_OFFSET = 8;
const SYNC_INTERVAL = 6 * 1e3;
const ZOOM_ID = "chartZoom";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "PriceChartWidget",
    components: {
      TokenLogo: components.TokenLogo,
      FormattedAmount: components.FormattedAmount,
      BaseWidget: lazyComponent(Components.BaseWidget),
      SvgIconButton: lazyComponent(Components.SvgIconButton),
      TokensRow: lazyComponent(Components.TokensRow),
      StatsFilter: lazyComponent(Components.StatsFilter),
      ChartSkeleton: lazyComponent(Components.ChartSkeleton)
    }
  },
  __name: "PriceChart",
  props: {
    baseAsset: {},
    quoteAsset: {},
    requestEntityId: {},
    requestMethod: { type: Function },
    requestSubscription: { type: Function },
    isAvailable: { type: Boolean },
    parentLoading: { type: Boolean }
  },
  setup(__props) {
    const CHART_TYPE_ICONS = {
      [
        "line"
        /* LINE */
      ]: SvgIcons.LineIcon,
      [
        "candlestick"
        /* CANDLE */
      ]: SvgIcons.CandleIcon
    };
    const SNAPSHOT_TYPES = SnapshotTypes ?? {
      DEFAULT: "default",
      HOUR: "hour",
      DAY: "day"
    };
    const LINE_CHART_FILTERS = [
      { name: Timeframes.FIVE_MINUTES, label: "5M", type: SNAPSHOT_TYPES.DEFAULT, count: 48 },
      {
        name: Timeframes.FIFTEEN_MINUTES,
        label: "15M",
        type: SNAPSHOT_TYPES.DEFAULT,
        count: 48 * 3,
        group: 3
      },
      {
        name: Timeframes.THIRTY_MINUTES,
        label: "30M",
        type: SNAPSHOT_TYPES.DEFAULT,
        count: 48 * 6,
        group: 6
      },
      { name: Timeframes.HOUR, label: "1H", type: SNAPSHOT_TYPES.HOUR, count: 48 },
      { name: Timeframes.FOUR_HOURS, label: "4H", type: SNAPSHOT_TYPES.HOUR, count: 48 * 4, group: 4 },
      { name: Timeframes.DAY, label: "1D", type: SNAPSHOT_TYPES.DAY, count: 90 },
      { name: Timeframes.YEAR, label: "1Y", type: SNAPSHOT_TYPES.DAY, count: 365 },
      { name: Timeframes.ALL, label: "ALL", type: SNAPSHOT_TYPES.DAY, count: Infinity }
    ];
    const AXIS_LABEL_CSS = {
      fontFamily: "Sora",
      fontSize: 10
    };
    const defaultRequestSubscription = (callback) => {
      const sub = setInterval(callback, SYNC_INTERVAL * 5);
      const unsub = () => clearInterval(sub);
      return unsub;
    };
    const signific = (value) => (positive, negative, zero) => FPNumber.gt(value, FPNumber.ZERO) ? positive : FPNumber.lt(value, FPNumber.ZERO) ? negative : zero;
    const formatChange = (value) => {
      const sign = signific(value)("+", "", "");
      const priceChange2 = formatDecimalPlaces(value, true);
      return `${sign}${priceChange2}`;
    };
    const formatAmount = (value, precision2) => value.toLocaleString(precision2);
    const formatPrice = (value, precision2, symbol2) => `${formatAmount(value, precision2)} ${symbol2}`;
    const dividePrice = (priceA, priceB) => priceB !== 0 ? priceA / priceB : 0;
    const dividePrices = (priceA, priceB) => priceA.map((price, index) => dividePrice(price, priceB[index]));
    const mergeSnapshots = (a, b) => {
      const timestamp = a?.timestamp ?? b?.timestamp;
      const price = b?.price && a?.price ? dividePrices(a.price, b.price) : a?.price ?? [0, 0, 0, 0];
      const volume = b?.volume && a?.volume ? Math.min(b.volume, a.volume) : a?.volume ?? 0;
      return { timestamp, price, volume };
    };
    const normalizeSnapshots = (collection, difference, lastTimestamp) => {
      const sample = [];
      for (const item of collection) {
        const buffer = [];
        const prevTimestamp = last(sample)?.timestamp ?? lastTimestamp;
        let currentTimestamp = item.timestamp;
        while ((currentTimestamp += difference) < prevTimestamp) {
          buffer.push({
            timestamp: currentTimestamp,
            price: [item.price[1], item.price[1], item.price[1], item.price[1]],
            volume: 0
          });
        }
        sample.push(...buffer.reverse(), item);
      }
      return sample;
    };
    const getPrecision = (value) => {
      let precision2 = 2;
      if (value === 0 || !Number.isFinite(value)) return precision2;
      let abs = Math.abs(value);
      while (Math.floor(abs) <= 0) {
        abs *= 10;
        precision2++;
      }
      return precision2;
    };
    const props = __props;
    const parentLoading = computed(() => props.parentLoading ?? false);
    const { loading, withApi } = useLoading({ parentLoading });
    useTranslation();
    const { theme } = useThemePalette();
    const palette = computed(() => theme.value ?? createThemePalette());
    const { gridSpec, xAxisSpec, yAxisSpec, tooltipSpec, lineSeriesSpec, barSeriesSpec, candlestickSeriesSpec } = useChartSpec();
    const FontWeightRate = WALLET_CONSTS.FontWeightRate;
    const currency = computed(() => store.state.wallet?.settings?.currency);
    const currencies = computed(() => store.state.wallet?.settings?.currencies ?? []);
    const exchangeRate = computed(() => store.state.wallet?.settings?.exchangeRate ?? 1);
    const currencySymbol = computed(() => store.state.wallet?.settings?.currencySymbol ?? USD_SYMBOL);
    const chart = ref(null);
    const isFetchingError = ref(false);
    const dataset = ref(Object.freeze([]));
    const zoomStart = ref(0);
    const zoomEnd = ref(100);
    const precision = ref(2);
    const limits = reactive({ min: Infinity, max: 0 });
    const chartType = ref(
      "line"
      /* LINE */
    );
    const selectedFilter = ref(LINE_CHART_FILTERS[0]);
    const isReversedChart = ref(false);
    let snapshotBuffer = {};
    let pageInfos = {};
    const priceUpdateRequestId = ref(0);
    let priceUpdateSubscription = null;
    let priceUpdateTimestampSync = null;
    const baseAsset = computed(() => props.baseAsset ?? null);
    const quoteAsset = computed(() => props.quoteAsset ?? null);
    const inputTokensAddresses = computed(() => {
      const filtered = [baseAsset.value, quoteAsset.value].filter((token) => Boolean(token));
      return filtered.map((token) => token.address);
    });
    const tokenA = computed(() => isReversedChart.value ? quoteAsset.value : baseAsset.value);
    const tokenB = computed(() => isReversedChart.value ? baseAsset.value : quoteAsset.value);
    const tokens = computed(() => [tokenA.value, tokenB.value].filter((token) => Boolean(token)));
    const tokensAddresses = computed(() => tokens.value.map((token) => token.address));
    const isTokensPair = computed(() => tokensAddresses.value.length === 2);
    const reversible = computed(() => isTokensPair.value && !props.requestEntityId);
    const entities = computed(() => props.requestEntityId ? [props.requestEntityId] : tokensAddresses.value);
    const fallbackFiatSymbol = computed(
      () => getCurrency(currency.value, currencies.value)?.key.toUpperCase() ?? USD_SYMBOL
    );
    const symbol = computed(() => tokenB.value?.symbol ?? fallbackFiatSymbol.value);
    const chartTypeButtons = computed(
      () => [
        "line",
        "candlestick"
        /* CANDLE */
      ].map((type) => ({
        type,
        icon: CHART_TYPE_ICONS[type],
        active: chartType.value === type
      }))
    );
    const filters = LINE_CHART_FILTERS;
    const chartIsLoading = computed(() => parentLoading.value || loading.value);
    const currentPrice = computed(() => new FPNumber(dataset.value[0]?.price[1] ?? 0));
    const currentPriceFormatted = computed(() => toAmount(currentPrice.value, precision.value));
    const timeDifference = computed(() => SECONDS_IN_TYPE[selectedFilter.value.type] * 1e3);
    const chartData = computed(() => {
      const ordered = dataset.value.slice().reverse();
      const group = selectedFilter.value.group;
      const groups = [];
      for (let i = 0; i < ordered.length; i++) {
        if (!group || i % group === 0) {
          groups.push([ordered[i].timestamp, ...ordered[i].price, ordered[i].volume]);
        } else {
          const lastGroup = last(groups);
          if (lastGroup) {
            lastGroup[2] = ordered[i].price[1];
            lastGroup[3] = Math.min(lastGroup[3], ordered[i].price[2]);
            lastGroup[4] = Math.max(lastGroup[4], ordered[i].price[3]);
            lastGroup[5] = lastGroup[5] + (ordered[i].volume ?? 0);
          }
        }
      }
      return Object.freeze(groups);
    });
    const chartKey = computed(
      () => isTokensPair.value ? void 0 : `price-chart-${symbol.value}-rate-${exchangeRate.value}`
    );
    const visibleChartItemsRange = computed(() => {
      const itemsCount = chartData.value.length;
      if (!itemsCount) return [0, 0];
      const startIndex = Math.floor(itemsCount * zoomStart.value / 100);
      const endIndex = Math.max(Math.ceil(itemsCount * zoomEnd.value / 100) - 1, startIndex);
      return [startIndex, endIndex];
    });
    const priceChange = computed(() => {
      const [startIndex, endIndex] = visibleChartItemsRange.value;
      const rangeStartPrice = new FPNumber(chartData.value[startIndex]?.[2] ?? 0);
      const rangeClosePrice = new FPNumber(chartData.value[endIndex]?.[2] ?? 0);
      return calcPriceChange(rangeClosePrice, rangeStartPrice);
    });
    const gridLeftOffset = computed(() => {
      const maxLabel = limits.max * 10;
      const axisLabelWidth = getTextWidth(
        new FPNumber(maxLabel).toLocaleString(precision.value),
        AXIS_LABEL_CSS.fontFamily,
        AXIS_LABEL_CSS.fontSize
      );
      return AXIS_OFFSET + 2 * LABEL_PADDING + axisLabelWidth;
    });
    const chartSpec = computed(() => {
      const withVolume = entities.value.length === 1;
      const priceGrid = gridSpec({ top: 20, left: gridLeftOffset.value });
      const volumeGrid = gridSpec({ height: 72, left: gridLeftOffset.value });
      const priceXAxis = xAxisSpec({
        boundaryGap: chartType.value === "line" ? false : [5e-3, 5e-3],
        axisLabel: { show: true },
        axisLine: {
          show: true,
          lineStyle: { color: palette.value.color.base.content.tertiary }
        },
        axisPointer: { label: { show: true } }
      });
      const volumeXAxis = xAxisSpec({
        gridIndex: 1,
        boundaryGap: false,
        axisLabel: { show: true },
        axisPointer: { type: "none" }
      });
      const priceYAxis = yAxisSpec({
        axisLabel: {
          formatter: (value) => toAmount(value, precision.value),
          showMaxLabel: false,
          showMinLabel: false
        },
        axisPointer: {
          label: {
            precision: precision.value,
            formatter: ({ value }) => toAmount(value, precision.value)
          }
        },
        min: "dataMin",
        max: "dataMax"
      });
      const volumeYAxis = yAxisSpec({
        gridIndex: 1,
        splitNumber: 2,
        axisLabel: {
          formatter: (value) => {
            const val = new FPNumber(value).mul(exchangeRate.value);
            const { amount, suffix } = formatAmountWithSuffix(val);
            return `${amount} ${suffix}`;
          },
          showMaxLabel: true
        }
      });
      const dataZoom = {
        id: ZOOM_ID,
        type: "inside",
        xAxisIndex: [0, 1],
        start: 0,
        end: 100,
        minValueSpan: timeDifference.value * 11
      };
      const tooltip = tooltipSpec({
        axisPointer: { type: "cross" },
        formatter: (params) => {
          const { data, seriesType } = params[0];
          const [, open, close, low, high, volume] = data;
          const rows = [];
          const closeFp = new FPNumber(close);
          if (seriesType === "candlestick") {
            const openFp = new FPNumber(open);
            const change = calcPriceChange(closeFp, openFp);
            const changeColor = signific(change)(
              palette.value.color.status.success,
              palette.value.color.status.error,
              palette.value.color.base.content.primary
            );
            rows.push(
              { title: "Open", data: toPrice(openFp, precision.value) },
              { title: "High", data: toPrice(high, precision.value) },
              { title: "Low", data: toPrice(low, precision.value) },
              { title: "Close", data: toPrice(closeFp, precision.value) },
              { title: "Change", data: formatChange(change), color: changeColor }
            );
          } else {
            rows.push({ title: "Price", data: toPrice(closeFp, precision.value) });
          }
          if (withVolume) {
            rows.push({ title: "Volume", data: `${currencySymbol.value} ${toAmount(volume, 2)}` });
          }
          return `
        <table>
          ${rows.map(
            (row) => `
            <tr>
              <td align="right" style="color:${palette.value.color.base.content.secondary}">${row.title}</td>
              <td style="color:${row.color ?? palette.value.color.base.content.primary}">${row.data}</td>
            </tr>
          `
          ).join("")}
        </table>
      `;
        }
      });
      const priceSeries = chartType.value === "line" ? lineSeriesSpec({
        encode: { y: "close" },
        areaStyle: {
          opacity: 0.8,
          color: new LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(248, 8, 123, 0.25)" },
            { offset: 1, color: "rgba(255, 49, 148, 0.03)" }
          ])
        }
      }) : candlestickSeriesSpec();
      const volumeSeries = {
        ...barSeriesSpec({}),
        barMaxWidth: 10,
        xAxisIndex: 1,
        yAxisIndex: 1,
        itemStyle: {
          color: ({ data }) => {
            const [, open, close] = data;
            if (open > close) return palette.value.color.status.error;
            if (open < close) return palette.value.color.status.success;
            return palette.value.color.base.content.secondary;
          },
          opacity: 0.7
        },
        encode: { y: "volume" }
      };
      const spec = {
        animation: false,
        axisPointer: { link: [{ xAxisIndex: "all" }] },
        color: [palette.value.color.theme.accent, palette.value.color.status.success],
        dataset: {
          source: chartData.value,
          dimensions: ["timestamp", "open", "close", "low", "high", "volume"]
        },
        dataZoom: [dataZoom],
        grid: [priceGrid],
        xAxis: [priceXAxis],
        yAxis: [priceYAxis],
        tooltip,
        series: [priceSeries]
      };
      if (withVolume) {
        priceGrid.bottom = 120;
        priceXAxis.axisLabel.show = false;
        priceXAxis.axisPointer.label.show = false;
        spec.grid.push(volumeGrid);
        spec.xAxis.push(volumeXAxis);
        spec.yAxis.push(volumeYAxis);
        spec.series.push(volumeSeries);
      }
      return spec;
    });
    const toAmount = (amount, digits) => {
      const fp = amount instanceof FPNumber ? amount : new FPNumber(amount);
      const value = isTokensPair.value ? fp : fp.mul(exchangeRate.value);
      return formatAmount(value, digits);
    };
    const toPrice = (price, digits) => {
      const fp = price instanceof FPNumber ? price : new FPNumber(price);
      const value = isTokensPair.value ? fp : fp.mul(exchangeRate.value);
      return formatPrice(value, digits, symbol.value);
    };
    const isAllHistoricalPricesFetched = () => {
      return Object.entries(pageInfos).some(([address, pageInfo]) => {
        const bufferIsFilled = (snapshotBuffer[address] ?? []).length === dataset.value.length;
        return !pageInfo.hasNextPage && bufferIsFilled;
      });
    };
    const requestIsAllowed = (entitiesSnapshot) => {
      if (isTokensPair.value && !(props.isAvailable ?? false)) return false;
      return isEqual(entitiesSnapshot)(entities.value);
    };
    const fillSnapshotBuffer = (entityId, normalized) => {
      const existingNodes = snapshotBuffer[entityId] ?? [];
      snapshotBuffer = {
        ...snapshotBuffer,
        [entityId]: Object.freeze([...existingNodes, ...normalized])
      };
    };
    const updateDataset = (items) => {
      dataset.value = Object.freeze(items);
    };
    const clearData = (saveReversedState = false, clearBuffer = false) => {
      snapshotBuffer = clearBuffer ? {} : pick(entities.value, snapshotBuffer);
      pageInfos = clearBuffer ? {} : pick(entities.value, pageInfos);
      dataset.value = Object.freeze([]);
      zoomStart.value = 0;
      zoomEnd.value = 100;
      limits.min = Infinity;
      limits.max = 0;
      precision.value = 2;
      if (!saveReversedState) {
        isReversedChart.value = false;
      }
    };
    const requestData = async (entityId, type, count, hasNextPage = true, endCursor) => {
      const nodes = [];
      let cursor = endCursor;
      let remaining = count;
      let nextPage = hasNextPage;
      do {
        const maxCount = getCurrentIndexer().type === WALLET_CONSTS.IndexerType.SUBSQUID ? 1e3 : 100;
        const first = Math.min(remaining, maxCount);
        const requestMethod = props.requestMethod ?? fetchAssetPriceData;
        const response = await requestMethod(entityId, type, first, cursor);
        if (!response) {
          return { nodes, hasNextPage: false, endCursor: cursor };
        }
        nextPage = response.pageInfo.hasNextPage;
        cursor = response.pageInfo.endCursor;
        nodes.push(...response.edges.map((edge) => edge.node));
        remaining -= response.edges.length;
      } while (nextPage && remaining > 0);
      return { nodes, hasNextPage: nextPage, endCursor: cursor };
    };
    const fetchData = async (entityId) => {
      const { type, count } = selectedFilter.value;
      const pageInfoBuffer = pageInfos[entityId];
      const hasNextPage = pageInfoBuffer?.hasNextPage ?? true;
      const endCursor = pageInfoBuffer?.endCursor;
      const snapshotsBuffer = snapshotBuffer[entityId] ?? [];
      const snapshotsUsedCount = dataset.value.length;
      const snapshotsUnused = snapshotsBuffer.slice(snapshotsUsedCount);
      if (snapshotsUnused.length >= count || !hasNextPage) {
        return snapshotsUnused;
      }
      const { nodes, ...pageInfo } = await requestData(entityId, type, count, hasNextPage, endCursor);
      const lastTimestamp = last(snapshotsUnused)?.timestamp ?? last(dataset.value)?.timestamp ?? Date.now();
      const snapshotsNormalized = normalizeSnapshots(nodes, timeDifference.value, lastTimestamp);
      fillSnapshotBuffer(entityId, snapshotsNormalized);
      pageInfos = { ...pageInfos, [entityId]: pageInfo };
      return [...snapshotsUnused, ...snapshotsNormalized];
    };
    const fetchDataLastUpdates = async (entitiesSnapshot) => {
      const lastUpdates = {};
      await Promise.all(
        entitiesSnapshot.map(async (entityId) => {
          try {
            const update = await requestData(entityId, selectedFilter.value.type, 1);
            const snapshot = update.nodes[0];
            lastUpdates[entityId] = snapshot;
          } catch {
            return null;
          }
        })
      );
      return lastUpdates;
    };
    const getUpdatedPrecision = (min, max) => {
      const boundaries = [max, min, max - min].map((value) => getPrecision(value));
      return Math.max(...boundaries);
    };
    const getHistoricalPrices = async () => {
      if (loading.value || isAllHistoricalPricesFetched()) {
        return;
      }
      const addresses = [...entities.value];
      const requestId = Date.now();
      priceUpdateRequestId.value = requestId;
      await withApi(async () => {
        try {
          const snapshots = await Promise.all(addresses.map((address) => fetchData(address)));
          if (!(requestIsAllowed(addresses) && priceUpdateRequestId.value === requestId)) return;
          const datasetChunk = [];
          const size = Math.min(
            snapshots[0]?.length ?? Infinity,
            snapshots[1]?.length ?? Infinity,
            selectedFilter.value.count
          );
          let { min, max } = limits;
          for (let i = 0; i < size; i++) {
            const a = snapshots[0]?.[i];
            const b = snapshots[1]?.[i];
            const { timestamp, price, volume } = mergeSnapshots(a, b);
            if (price.some((part) => !Number.isFinite(part))) continue;
            if (price[0] === 0 && price[1] === 0) continue;
            datasetChunk.push({ timestamp, price, volume });
            min = Math.min(min, ...price);
            max = Math.max(max, ...price);
          }
          limits.min = min;
          limits.max = max;
          precision.value = getUpdatedPrecision(min, max);
          updateDataset([...dataset.value, ...datasetChunk]);
          isFetchingError.value = false;
        } catch (error) {
          isFetchingError.value = true;
          console.error(error);
        }
      });
    };
    const getCurrentSnapshotTimestamp = () => {
      const now = Math.floor(Date.now() / 1e3);
      const seconds = timeDifference.value / 1e3;
      const index = Math.floor(now / seconds);
      return seconds * index * 1e3;
    };
    const handlePriceTimestampSync = (entitiesSnapshot) => {
      if (!requestIsAllowed(entitiesSnapshot)) return;
      const timestamp = getCurrentSnapshotTimestamp();
      const lastItem = dataset.value[0];
      if (!lastItem || timestamp === lastItem.timestamp) return;
      const close = lastItem.price[1];
      const price = [close, close, close, close];
      const volume = 0;
      const item = { timestamp, price, volume };
      updateDataset([item, ...dataset.value]);
    };
    const fetchAndHandleUpdate = async (entitiesSnapshot) => {
      if (!requestIsAllowed(entitiesSnapshot)) return;
      const lastUpdates = await fetchDataLastUpdates(entitiesSnapshot);
      if (!lastUpdates) return;
      const datasetClone = [...dataset.value];
      const lastItem = datasetClone[0];
      const [a, b] = entitiesSnapshot.map((entityId) => lastUpdates[entityId]);
      const item = mergeSnapshots(a, b);
      if (item.price.some((part) => !Number.isFinite(part))) return;
      if (lastItem?.timestamp > item.timestamp) return;
      if (lastItem?.timestamp === item.timestamp) {
        datasetClone.shift();
      }
      datasetClone.unshift(item);
      const min = Math.min(limits.min, ...item.price);
      const max = Math.max(limits.max, ...item.price);
      precision.value = getUpdatedPrecision(min, max);
      limits.min = min;
      limits.max = max;
      updateDataset(datasetClone);
    };
    const getPriceUpdatesSubscription = async (entitiesSnapshot) => {
      const callback = () => fetchAndHandleUpdate(entitiesSnapshot);
      const requestSubscription = props.requestSubscription ?? defaultRequestSubscription;
      return await requestSubscription(callback);
    };
    const subscribeToPriceUpdates = async () => {
      unsubscribeFromPriceUpdates();
      if (!entities.value.length) return;
      const entitiesSnapshot = [...entities.value];
      priceUpdateSubscription = await getPriceUpdatesSubscription(entitiesSnapshot);
      priceUpdateTimestampSync = setInterval(() => handlePriceTimestampSync(entitiesSnapshot), SYNC_INTERVAL);
    };
    const unsubscribeFromPriceUpdates = () => {
      if (priceUpdateSubscription) {
        priceUpdateSubscription();
      }
      if (priceUpdateTimestampSync) {
        clearInterval(priceUpdateTimestampSync);
      }
      priceUpdateSubscription = null;
      priceUpdateTimestampSync = null;
    };
    const updatePrices = debouncedInputHandler(getHistoricalPrices, 250, { leading: false });
    const resetAndUpdatePrices = async (saveReversedState = false, clearBuffer = false) => {
      clearData(saveReversedState, clearBuffer);
      await updatePrices();
      await subscribeToPriceUpdates();
    };
    const forceUpdatePrices = debouncedInputHandler(resetAndUpdatePrices, 250, { leading: false });
    const changeFilter = async (filter) => {
      const prevType = selectedFilter.value.type;
      const { count, type } = filter;
      selectedFilter.value = filter;
      if (prevType !== type) {
        await forceUpdatePrices(true, true);
      } else if (dataset.value.length < count) {
        await updatePrices();
      } else {
        await resetChartTypeZoom();
      }
    };
    const resetChartTypeZoom = async () => {
      const { count, group } = selectedFilter.value;
      const items = chartData.value.length;
      const visible = count / (group ?? 1);
      const start = items > visible ? (items - visible) * 100 / items : 0;
      await setChartZoomLevel(start, 100);
    };
    const selectChartType = async (type) => {
      chartType.value = type;
      await setChartZoomLevel(zoomStart.value, zoomEnd.value);
    };
    const handleZoom = (event) => {
      event?.stop?.();
      if (event?.wheelDelta < 0 && zoomStart.value === 0 && zoomEnd.value === 100) {
        updatePrices();
      }
    };
    const changeZoomLevel = (event) => {
      const data = event?.batch?.[0];
      zoomStart.value = data?.start ?? 0;
      zoomEnd.value = data?.end ?? 0;
    };
    const setChartZoomLevel = async (start, end) => {
      await nextTick();
      const chartInstance = chart.value;
      chartInstance?.dispatchAction?.({
        type: "dataZoom",
        batch: [
          {
            dataZoomId: ZOOM_ID,
            start,
            end
          }
        ]
      });
    };
    const revertChart = () => {
      isReversedChart.value = !isReversedChart.value;
      forceUpdatePrices(true, false);
    };
    watch(inputTokensAddresses, (current, prev) => {
      if (!prev) return;
      if (!isEqual(current)(prev)) {
        const currentChartPair = isReversedChart.value ? [...prev].reverse() : prev;
        isReversedChart.value = false;
        if (!isEqual(current)(currentChartPair)) {
          forceUpdatePrices();
        }
      }
    });
    onMounted(() => {
      forceUpdatePrices();
    });
    onBeforeUnmount(() => {
      unsubscribeFromPriceUpdates();
    });
    return (_ctx, _cache) => {
      const _component_tokens_row = resolveComponent("tokens-row");
      const _component_s_button = resolveComponent("s-button");
      const _component_stats_filter = resolveComponent("stats-filter");
      const _component_svg_icon_button = resolveComponent("svg-icon-button");
      const _component_formatted_amount = resolveComponent("formatted-amount");
      const _component_chart_skeleton = resolveComponent("chart-skeleton");
      const _component_base_widget = resolveComponent("base-widget");
      return openBlock(), createBlock(_component_base_widget, normalizeProps(guardReactiveProps(_ctx.$attrs)), {
        title: withCtx(() => [
          renderSlot(_ctx.$slots, "title", {}, () => [
            createVNode(_component_tokens_row, {
              border: "",
              assets: tokens.value,
              size: "medium"
            }, null, 8, ["assets"]),
            tokenA.value ? (openBlock(), createElementBlock("div", _hoisted_1, [
              createBaseVNode("span", null, toDisplayString(tokenA.value.symbol), 1),
              tokenB.value ? (openBlock(), createElementBlock("span", _hoisted_2, "/" + toDisplayString(tokenB.value.symbol), 1)) : createCommentVNode("", true)
            ])) : createCommentVNode("", true),
            reversible.value ? (openBlock(), createBlock(_component_s_button, {
              key: 1,
              class: normalizeClass({ "s-pressed": isReversedChart.value }),
              disabled: chartIsLoading.value,
              size: "small",
              type: "action",
              alternative: "",
              icon: "arrows-swap-90-24",
              onClick: revertChart
            }, null, 8, ["class", "disabled"])) : createCommentVNode("", true)
          ])
        ]),
        filters: withCtx(() => [
          createVNode(_component_stats_filter, {
            "is-dropdown": "",
            filters: unref(filters),
            "model-value": selectedFilter.value,
            disabled: chartIsLoading.value,
            "onUpdate:modelValue": changeFilter
          }, null, 8, ["filters", "model-value", "disabled"]),
          (openBlock(true), createElementBlock(Fragment, null, renderList(chartTypeButtons.value, ({ type, icon, active }) => {
            return openBlock(), createBlock(_component_svg_icon_button, {
              key: type,
              icon,
              active,
              disabled: chartIsLoading.value,
              size: "small",
              onClick: ($event) => selectChartType(type)
            }, null, 8, ["icon", "active", "disabled", "onClick"]);
          }), 128))
        ]),
        types: withCtx(() => [
          renderSlot(_ctx.$slots, "types")
        ]),
        default: withCtx(() => [
          createVNode(_component_chart_skeleton, {
            loading: chartIsLoading.value,
            "is-empty": chartData.value.length === 0,
            "is-error": isFetchingError.value,
            onRetry: unref(updatePrices)
          }, {
            default: withCtx(() => [
              createVNode(_component_formatted_amount, {
                class: "charts-price",
                value: currentPriceFormatted.value,
                "font-weight-rate": unref(FontWeightRate).MEDIUM,
                "font-size-rate": unref(FontWeightRate).MEDIUM,
                "asset-symbol": symbol.value,
                "symbol-as-decimal": ""
              }, null, 8, ["value", "font-weight-rate", "font-size-rate", "asset-symbol"]),
              createVNode(PriceChange, { value: priceChange.value }, null, 8, ["value"]),
              (openBlock(), createBlock(unref(src_default), {
                ref_key: "chart",
                ref: chart,
                class: "chart",
                key: chartKey.value,
                option: chartSpec.value,
                autoresize: "",
                "onZr:mousewheel": handleZoom,
                onDatazoom: changeZoomLevel
              }, null, 8, ["option"]))
            ]),
            _: 1
          }, 8, ["loading", "is-empty", "is-error", "onRetry"])
        ]),
        _: 3
      }, 16);
    };
  }
});
export {
  _sfc_main as _
};
