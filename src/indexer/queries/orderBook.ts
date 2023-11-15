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

const OrderBookSubscription = gql<SubquerySubscriptionPayload<OrderBookEntityMutation>>`
  subscription SubqueryOrderBookSubscription($id: ID!) {
    payload: orderBook(id: $id, mutation: [UPDATE]) {
      id
      mutation_type
      _entity
    }
  }
`;
