import { FPNumber } from '@sora-substrate/util';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type {
  SubqueryConnectionQueryResponse,
  SubquerySubscriptionPayload,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subquery/types';
import type {
  OrderBookEntity,
  OrderBookLimitOrderEntity,
  OrderBookMarketOrderEntity,
  OrderBookDeal,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

type OrderBookData = {
  dexId: number;
  baseAssetId: string;
  quoteAssetId: string;
  price: FPNumber;
  priceChangeDay: FPNumber;
  volumeDayUSD: FPNumber;
  status: string;
};

const SubqueryOrderBooksQuery = gql<SubqueryConnectionQueryResponse<OrderBookEntity>>`
  query OrderBookQuery($after: Cursor) {
    data: orderBooks(after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
      edges {
        node {
          dexId
          baseAssetId
          quoteAssetId
          price
          priceChangeDay
          volumeDayUSD
          status
        }
      }
    }
  }
`;

const parseOrderBookEntity = (item: OrderBookEntity): OrderBookData => {
  const { dexId, baseAssetId, quoteAssetId, price, priceChangeDay, volumeDayUSD, status } = item;

  return {
    dexId,
    baseAssetId,
    quoteAssetId,
    price: new FPNumber(price ?? 0),
    priceChangeDay: new FPNumber(priceChangeDay ?? 0),
    volumeDayUSD: new FPNumber(volumeDayUSD ?? 0),
    status,
  };
};

export async function fetchOrderBooks(): Promise<Nullable<OrderBookData[]>> {
  const indexer = getCurrentIndexer();

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      const response = await subqueryIndexer.services.explorer.fetchAllEntities(
        SubqueryOrderBooksQuery,
        {},
        parseOrderBookEntity
      );
      return response;
    }
  }

  return null;
}

type OrderData = {
  timestamp: number;
  isBuy: boolean;
  price: FPNumber;
  amount: FPNumber;
  amountFilled: FPNumber;
  orderId: number | undefined;
  lifetime: number;
  expiresAt: number;
  status: string;
};

const SubqueryAccountMarketOrdersQuery = gql<SubqueryConnectionQueryResponse<OrderBookMarketOrderEntity>>`
  query AccountMarketOrdersQuery($after: Cursor, $orderBookId: String, $accountId: String) {
    data: orderBookMarketOrders(
      orderBy: TIMESTAMP_DESC
      after: $after
      filter: { and: [{ orderBookId: { equalTo: $orderBookId } }, { accountId: { equalTo: $accountId } }] }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
      edges {
        node {
          timestamp
          isBuy
          price
          amount
        }
      }
    }
  }
`;

const SubqueryAccountLimitOrdersQuery = gql<SubqueryConnectionQueryResponse<OrderBookLimitOrderEntity>>`
  query AccountLimitOrdersQuery($after: Cursor, $orderBookId: String, $accountId: String) {
    data: orderBookLimitOrders(
      orderBy: TIMESTAMP_DESC
      after: $after
      filter: {
        and: [
          { orderBookId: { equalTo: $orderBookId } }
          { accountId: { equalTo: $accountId } }
          { status: { notEqualTo: Active } }
        ]
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
      edges {
        node {
          timestamp
          isBuy
          price
          amount
          amountFilled
          orderId
          lifetime
          expiresAt
          status
        }
      }
    }
  }
`;

const parseOrderEntity = (item: OrderBookMarketOrderEntity | OrderBookLimitOrderEntity): OrderData => {
  return {
    timestamp: item.timestamp * 1000,
    isBuy: item.isBuy,
    price: new FPNumber(item.price),
    amount: new FPNumber(item.amount),
    amountFilled: new FPNumber('amountFilled' in item ? item.amountFilled : item.amount),
    orderId: 'orderId' in item ? item.orderId : undefined,
    lifetime: ('lifetime' in item ? item.lifetime : 0) * 1000,
    expiresAt: ('expiresAt' in item ? item.expiresAt : item.timestamp) * 1000,
    status: 'status' in item ? item.status : 'Filled',
  };
};

export async function fetchOrderBookAccountOrders(
  dexId: number,
  baseAssetId: string,
  quoteAssetId: string,
  accountAddress: string
): Promise<Nullable<OrderData[]>> {
  const orderBookId = [dexId, baseAssetId, quoteAssetId].join('-');
  const variables = { orderBookId, accountId: accountAddress };
  const indexer = getCurrentIndexer();

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      const [limitOrders, marketOrders] = await Promise.all([
        subqueryIndexer.services.explorer.fetchAllEntities(
          SubqueryAccountLimitOrdersQuery,
          variables,
          parseOrderEntity
        ),
        subqueryIndexer.services.explorer.fetchAllEntities(
          SubqueryAccountMarketOrdersQuery,
          variables,
          parseOrderEntity
        ),
      ]);

      return [...(limitOrders || []), ...(marketOrders || [])].sort((a, b) => +b.timestamp - +a.timestamp);
    }
  }

  return null;
}

/* eslint-disable camelcase */
type OrderBookEntityMutation = {
  price: string;
  price_change_day: number;
  volume_day_usd: string;
  last_deals: string;
};
/* eslint-enable camelcase */

type OrderBookEntityData = {
  data: OrderBookEntity;
};

type OrderBookUpdateData = {
  price: FPNumber;
  priceChangeDay: FPNumber;
  volumeDayUSD: FPNumber;
  lastDeals: OrderBookDeal[];
};

const SubqueryOrderBookDataQuery = gql<OrderBookEntityData>`
  query OrderBookData($id: ID!) {
    data: orderBook(id: $id:) {
      price
      priceChangeDay
      volumeDayUSD
      lastDeals
    }
  }
`;

const parseOrderBookData = (item: OrderBookEntityData): OrderBookUpdateData => {
  const { price, priceChangeDay, volumeDayUSD, lastDeals } = item.data;

  return {
    price: new FPNumber(price ?? 0),
    priceChangeDay: new FPNumber(priceChangeDay ?? 0),
    volumeDayUSD: new FPNumber(volumeDayUSD ?? 0),
    lastDeals: lastDeals ? JSON.parse(lastDeals) : ([] as OrderBookDeal[]),
  };
};

const SubqueryOrderBookSubscription = gql<SubquerySubscriptionPayload<OrderBookEntityMutation>>`
  subscription SubqueryOrderBookSubscription($id: ID!) {
    payload: orderBook(id: $id, mutation: [UPDATE]) {
      id
      mutation_type
      _entity
    }
  }
`;

/* eslint-disable camelcase */
const parseOrderBookMutation = (item: OrderBookEntityMutation): OrderBookUpdateData => {
  const { price, price_change_day, volume_day_usd, last_deals } = item;
  const lastDeals = last_deals ? JSON.parse(last_deals) : ([] as OrderBookDeal[]);

  return {
    price: new FPNumber(price ?? 0),
    priceChangeDay: new FPNumber(price_change_day ?? 0),
    volumeDayUSD: new FPNumber(volume_day_usd ?? 0),
    lastDeals,
  };
};
/* eslint-enable camelcase */

export async function subscribeOnOrderBook(
  dexId: number,
  baseAssetId: string,
  quoteAssetId: string,
  handler: (entity: OrderBookUpdateData) => void,
  errorHandler: () => void
): Promise<Nullable<VoidFunction>> {
  const orderBookId = [dexId, baseAssetId, quoteAssetId].join('-');
  const variables = { id: orderBookId };
  const indexer = getCurrentIndexer();

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      const initialState = await subqueryIndexer.services.explorer.request(SubqueryOrderBookDataQuery, variables);

      if (!initialState) return null;

      handler(parseOrderBookData(initialState));

      const subscription = subqueryIndexer.services.explorer.createEntitySubscription(
        SubqueryOrderBookSubscription,
        variables,
        parseOrderBookMutation,
        handler,
        errorHandler
      );

      return subscription;
    }
  }

  return null;
}
