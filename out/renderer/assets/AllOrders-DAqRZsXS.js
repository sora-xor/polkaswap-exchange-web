import { aF as getCurrentIndexer, aG as IndexerType, aH as gql, F as FPNumber, a7 as PriceVariant, z as defineComponent, U as useLoading, v as useWalletStore, a4 as onMounted, am as createBlock, C as openBlock, aj as unref, h as computed, a9 as ref } from "./index-73GArslZ.js";
import { O as OrderStatus, F as Filter } from "./orderBook-BhgledRv.js";
import { u as useOrderBookUserOrders } from "./useOrderBookUserOrders-B0IscmbH.js";
import { _ as _sfc_main$1 } from "./OrderTable.vue_vue_type_style_index_0_lang-Bu4g82aO.js";
import "./index-BDxnS5Vu.js";
import "./useFormattedAmount-D-xkdlPs.js";
const parseSide = (isBuy) => {
  return isBuy ? PriceVariant.Buy : PriceVariant.Sell;
};
const parseTimestamp = (unixTimestamp) => {
  return unixTimestamp * 1e3;
};
const SubqueryAccountOrdersQuery = gql`
  query SubqueryAccountOrdersQuery($after: Cursor, $filter: OrderBookOrderFilter) {
    data: orderBookOrders(orderBy: TIMESTAMP_DESC, after: $after, filter: $filter) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          type
          orderId
          orderBookId
          accountId
          timestamp
          isBuy
          price
          amount
          amountFilled
          lifetime
          expiresAt
          status
        }
      }
    }
  }
`;
const SubsquidAccountOrdersQuery = gql`
  query SubsquidAccountOrdersQuery($after: Cursor, $where: OrderBookOrderWhereInput) {
    data: orderBookOrdersConnection(orderBy: timestamp_DESC, after: $after, where: $filter) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          type
          orderId
          orderBook {
            id
          }
          account {
            id
          }
          timestamp
          isBuy
          price
          amount
          amountFilled
          lifetime
          expiresAt
          status
        }
      }
    }
  }
`;
const parseOrderEntity = (item) => {
  const owner = "accountId" in item ? item.accountId : item.account.id;
  const orderBookId = "orderBookId" in item ? item.orderBookId : item.orderBook.id;
  const [dexId, base, quote] = orderBookId.split("-");
  const originalAmount = new FPNumber(item.amount);
  const filledAmount = new FPNumber(item.amountFilled);
  const amount = originalAmount.sub(filledAmount);
  return {
    orderBookId: {
      dexId: Number(dexId),
      base,
      quote
    },
    owner,
    time: parseTimestamp(item.timestamp),
    side: parseSide(item.isBuy),
    price: new FPNumber(item.price),
    originalAmount,
    amount,
    id: item.orderId ?? 0,
    lifespan: parseTimestamp(item.lifetime),
    expiresAt: parseTimestamp(item.expiresAt),
    status: item.status
  };
};
const subqueryAccountOrdersFilter = (accountAddress, id) => {
  const filter = {
    and: [{ accountId: { equalTo: accountAddress } }, { status: { notEqualTo: OrderStatus.Active } }]
  };
  if (id) {
    const orderBookId = [id.dexId, id.base, id.quote].join("-");
    filter.and.push({
      orderBookId: { equalTo: orderBookId }
    });
  }
  return filter;
};
const subsquidAccountOrdersFilter = (accountAddress, id) => {
  const where = {
    account: { id_eq: accountAddress },
    status_not_eq: OrderStatus.Active
  };
  if (id) {
    const orderBookId = [id.dexId, id.base, id.quote].join("-");
    where.orderBook = { id_eq: orderBookId };
  }
  return where;
};
async function fetchOrderBookAccountOrders(accountAddress, id) {
  const indexer = getCurrentIndexer();
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const filter = subqueryAccountOrdersFilter(accountAddress, id);
      const variables = { filter };
      const subqueryIndexer = indexer;
      const orders = await subqueryIndexer.services.explorer.fetchAllEntities(
        SubqueryAccountOrdersQuery,
        variables,
        parseOrderEntity
      );
      return orders;
    }
    case IndexerType.SUBSQUID: {
      const where = subsquidAccountOrdersFilter(accountAddress, id);
      const variables = { where };
      const subsquidIndexer = indexer;
      const orders = await subsquidIndexer.services.explorer.fetchAllEntitiesConnection(
        SubsquidAccountOrdersQuery,
        variables,
        parseOrderEntity
      );
      return orders;
    }
  }
  return null;
}
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "AllOrders",
  props: {
    filter: { default: "" }
  },
  setup(__props) {
    const props = __props;
    const { loading, withLoading } = useLoading();
    const walletStore = useWalletStore();
    const { currentOrderBook } = useOrderBookUserOrders();
    const orders = ref([]);
    const accountAddress = computed(() => walletStore.address);
    const fetchOrders = async () => {
      const address = accountAddress.value;
      if (!address) {
        orders.value = [];
        return;
      }
      await withLoading(async () => {
        const data = await fetchOrderBookAccountOrders(address, currentOrderBook.value?.orderBookId);
        orders.value = data ?? [];
      });
    };
    const filtered = computed(() => {
      if (props.filter !== Filter.executed) {
        return orders.value;
      }
      return orders.value.filter((item) => item.status === OrderStatus.Filled);
    });
    onMounted(fetchOrders);
    return (_ctx, _cache) => {
      return openBlock(), createBlock(_sfc_main$1, {
        orders: filtered.value,
        "parent-loading": unref(loading)
      }, null, 8, ["orders", "parent-loading"]);
    };
  }
});
export {
  _sfc_main as default
};
