import { aF as getCurrentIndexer, aG as IndexerType, aH as gql, z as defineComponent, ak as lazyComponent, a_ as resolveComponent, am as createBlock, C as openBlock, as as mergeProps, h as computed, aj as unref, al as Components, ch as subscribeOnOrderBookUpdates } from "./index-73GArslZ.js";
import { u as useOrderBook } from "./useOrderBook-BhgjjoQG.js";
import { u as usePiniaTelemetry } from "./usePiniaTelemetry-DKBIwNF3.js";
import { u as useOrderBookStore } from "./index-BDxnS5Vu.js";
import "./useFormattedAmount-D-xkdlPs.js";
const preparePriceData = (item) => {
  const { open, close, low, high } = item.price;
  return [+open, +close, +low, +high];
};
const transformSnapshot = (item) => {
  const timestamp = +item.timestamp * 1e3;
  const price = preparePriceData(item);
  const volume = +item.volumeUSD;
  return { timestamp, price, volume };
};
const subqueryOrderBookPriceFilter = (orderBookId, type) => {
  return {
    orderBookId: {
      equalTo: orderBookId
    },
    type: {
      equalTo: type
    }
  };
};
const subsquidOrderBookPriceFilter = (orderBookId, type) => {
  return {
    orderBook: { id_eq: orderBookId },
    type_eq: type
  };
};
const SubqueryOrderBookPriceQuery = gql`
  query SubqueryOrderBookPriceQuery($after: Cursor, $filter: OrderBookSnapshotFilter, $first: Int = 100) {
    data: orderBookSnapshots(after: $after, first: $first, filter: $filter, orderBy: [TIMESTAMP_DESC]) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          price
          timestamp
          volumeUSD
        }
      }
    }
  }
`;
const SubsquidOrderBookPriceQuery = gql`
  query SubsquidOrderBookPriceQuery($after: String, $where: OrderBookSnapshotWhereInput, $first: Int = 100) {
    data: orderBookSnapshotsConnection(after: $after, first: $first, where: $where, orderBy: timestamp_DESC) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          price {
            close
            high
            low
            open
          }
          timestamp
          volumeUSD
        }
      }
    }
  }
`;
async function fetchOrderBookPriceData(orderBookId, type, first, after) {
  const indexer = getCurrentIndexer();
  let data;
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer;
      const filter = subqueryOrderBookPriceFilter(orderBookId, type);
      const variables = { filter, first, after };
      data = await subqueryIndexer.services.explorer.fetchEntities(SubqueryOrderBookPriceQuery, variables);
      break;
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer;
      const where = subsquidOrderBookPriceFilter(orderBookId, type);
      const variables = { where, first, after };
      data = await subsquidIndexer.services.explorer.fetchEntitiesConnection(SubsquidOrderBookPriceQuery, variables);
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
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      PriceChartWidget: lazyComponent(Components.PriceChartWidget)
    }
  },
  __name: "BookChartsWidget",
  setup(__props) {
    const { baseAsset, quoteAsset, dexId, orderBookId: storeOrderBookId } = useOrderBook();
    const orderBookStore = useOrderBookStore();
    const orderBookId = computed(() => {
      if (!(baseAsset.value && quoteAsset.value && dexId.value)) return null;
      return [dexId.value, baseAsset.value.address, quoteAsset.value.address].join("-");
    });
    const requestMethod = fetchOrderBookPriceData;
    const requestSubscription = computed(() => {
      if (!orderBookId.value) return null;
      return async (callback) => await subscribeOnOrderBookUpdates(orderBookId.value, callback, console.error);
    });
    usePiniaTelemetry("order-book", [{ store: orderBookStore, storeId: "orderBook" }], {
      metadata: () => ({
        widget: "book-charts",
        orderBookId: storeOrderBookId.value || orderBookId.value,
        baseAsset: baseAsset.value?.symbol ?? null,
        quoteAsset: quoteAsset.value?.symbol ?? null
      })
    });
    return (_ctx, _cache) => {
      const _component_price_chart_widget = resolveComponent("price-chart-widget");
      return openBlock(), createBlock(_component_price_chart_widget, mergeProps(_ctx.$attrs, {
        "base-asset": unref(baseAsset),
        "quote-asset": unref(quoteAsset),
        "request-entity-id": orderBookId.value,
        "request-method": unref(requestMethod),
        "request-subscription": requestSubscription.value,
        "is-available": "",
        class: "order-book-chart"
      }), null, 16, ["base-asset", "quote-asset", "request-entity-id", "request-method", "request-subscription"]);
    };
  }
});
export {
  _sfc_main as default
};
