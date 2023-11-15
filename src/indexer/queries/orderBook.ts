import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/util';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type { OrderBookDealData, OrderBookWithStats, OrderBookUpdateData } from '@/types/orderBook';

import type { LimitOrder } from '@sora-substrate/util/build/orderBook/types';
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

type OrderData = LimitOrder & {
  status: string;
};

/* eslint-disable camelcase */
type OrderBookEntityMutation = {
  price: string;
  price_change_day: number;
  volume_day_u_s_d: string;
  status: string;
  last_deals: string;
};
/* eslint-enable camelcase */

type OrderBookEntityResponse = {
  data: OrderBookEntity;
};

const { IndexerType } = WALLET_CONSTS;

const parseSide = (isBuy: boolean): PriceVariant => {
  return isBuy ? PriceVariant.Buy : PriceVariant.Sell;
};
const parseTimestamp = (unixTimestamp: number) => {
  return unixTimestamp * 1000;
};
const parseDeals = (lastDeals?: string): OrderBookDealData[] => {
  const deals = (lastDeals ? JSON.parse(lastDeals) : []) as OrderBookDeal[];

  return deals.map((deal) => ({
    price: new FPNumber(deal.price ?? 0),
    amount: new FPNumber(deal.amount ?? 0),
    side: parseSide(deal.isBuy),
    timestamp: parseTimestamp(deal.timestamp),
  }));
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

const parseOrderBookEntity = (item: OrderBookEntity): OrderBookWithStats => {
  const { dexId, baseAssetId, quoteAssetId, price, priceChangeDay, volumeDayUSD, status } = item;

  return {
    id: {
      dexId,
      base: baseAssetId,
      quote: quoteAssetId,
    },
    stats: {
      price: new FPNumber(price ?? 0),
      priceChange: new FPNumber(priceChangeDay ?? 0),
      volume: new FPNumber(volumeDayUSD ?? 0),
      status,
    },
  };
};

export async function fetchOrderBooks(): Promise<Nullable<OrderBookWithStats[]>> {
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

const parseOrderEntity =
  (dexId: number, base: string, quote: string, owner: string) =>
  (item: OrderBookMarketOrderEntity | OrderBookLimitOrderEntity): OrderData => {
    return {
      orderBookId: {
        dexId,
        base,
        quote,
      },
      owner,
      time: parseTimestamp(item.timestamp),
      side: parseSide(item.isBuy),
      price: new FPNumber(item.price),
      originalAmount: new FPNumber(item.amount),
      amount: new FPNumber('amountFilled' in item ? item.amountFilled : item.amount),
      id: 'orderId' in item ? item.orderId : 0,
      lifespan: parseTimestamp('lifetime' in item ? item.lifetime : 0),
      expiresAt: parseTimestamp('expiresAt' in item ? item.expiresAt : item.timestamp),
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
  const parse = parseOrderEntity(dexId, baseAssetId, quoteAssetId, accountAddress);

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      const [limitOrders, marketOrders] = await Promise.all([
        subqueryIndexer.services.explorer.fetchAllEntities(SubqueryAccountLimitOrdersQuery, variables, parse),
        subqueryIndexer.services.explorer.fetchAllEntities(SubqueryAccountMarketOrdersQuery, variables, parse),
      ]);

      return [...(limitOrders || []), ...(marketOrders || [])].sort((a, b) => +b.time - +a.time);
    }
  }

  return null;
}

const SubqueryOrderBookDataQuery = gql<OrderBookEntityResponse>`
  query OrderBookData($id: String!) {
    data: orderBook(id: $id) {
      price
      priceChangeDay
      volumeDayUSD
      status
      lastDeals
    }
  }
`;

const parseOrderBookResponse =
  (dexId: number, base: string, quote: string) =>
  (item: OrderBookEntityResponse): OrderBookUpdateData => {
    const { price, priceChangeDay, volumeDayUSD, status, lastDeals } = item.data;

    return {
      id: {
        dexId,
        base,
        quote,
      },
      stats: {
        price: new FPNumber(price ?? 0),
        priceChange: new FPNumber(priceChangeDay ?? 0),
        volume: new FPNumber(volumeDayUSD ?? 0),
        status,
      },
      deals: parseDeals(lastDeals),
    };
  };

const SubqueryOrderBookDataSubscription = gql<SubquerySubscriptionPayload<OrderBookEntityMutation>>`
  subscription OrderBookDataSubscription($id: [ID!]) {
    payload: orderBooks(id: $id, mutation: [UPDATE]) {
      id
      mutation_type
      _entity
    }
  }
`;

/* eslint-disable camelcase */
const parseOrderBookMutation =
  (dexId: number, base: string, quote: string) =>
  (item: OrderBookEntityMutation): OrderBookUpdateData => {
    const { price, price_change_day, volume_day_u_s_d, status, last_deals } = item;

    return {
      id: {
        dexId,
        base,
        quote,
      },
      stats: {
        price: new FPNumber(price ?? 0),
        priceChange: new FPNumber(price_change_day ?? 0),
        volume: new FPNumber(volume_day_u_s_d ?? 0),
        status,
      },
      deals: parseDeals(last_deals),
    };
  };
/* eslint-enable camelcase */

export async function subscribeOnOrderBookUpdates(
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
      const parseResponse = parseOrderBookResponse(dexId, baseAssetId, quoteAssetId);
      const parseMutation = parseOrderBookMutation(dexId, baseAssetId, quoteAssetId);
      const response = await subqueryIndexer.services.explorer.request(SubqueryOrderBookDataQuery, variables);

      if (!response) return null;

      handler(parseResponse(response));

      const subscription = subqueryIndexer.services.explorer.createEntitySubscription(
        SubqueryOrderBookDataSubscription,
        variables,
        parseMutation,
        handler,
        errorHandler
      );

      return subscription;
    }
  }

  return null;
}
