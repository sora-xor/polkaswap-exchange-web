import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/util';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import { OrderStatus } from '@/types/orderBook';
import type { OrderBookDealData, OrderBookWithStats, OrderBookUpdateData, OrderData } from '@/types/orderBook';

import type { OrderBookId } from '@sora-substrate/liquidity-proxy';
import type { Asset } from '@sora-substrate/util/build/assets/types';
import type { SubquerySubscriptionPayload } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subquery/types';
import type {
  OrderBookEntity,
  OrderBookOrderEntity,
  OrderBookDealEntity,
  ConnectionQueryResponse,
  QueryData,
  SubscriptionPayload,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

/* eslint-disable camelcase */
type OrderBookEntityMutation = {
  price: string;
  price_change_day: number;
  volume_day_u_s_d: string;
  status: string;
  last_deals: string;
};
/* eslint-enable camelcase */

const { IndexerType } = WALLET_CONSTS;

const parseSide = (isBuy: boolean): PriceVariant => {
  return isBuy ? PriceVariant.Buy : PriceVariant.Sell;
};
const parseTimestamp = (unixTimestamp: number) => {
  return unixTimestamp * 1000;
};
const parseDeals = (lastDeals?: string): OrderBookDealData[] => {
  const deals = (lastDeals ? JSON.parse(lastDeals) : []) as OrderBookDealEntity[];

  return deals.map((deal) => ({
    price: new FPNumber(deal.price ?? 0),
    amount: new FPNumber(deal.amount ?? 0),
    side: parseSide(deal.isBuy),
    timestamp: parseTimestamp(deal.timestamp),
  }));
};

const SubqueryOrderBooksQuery = gql<ConnectionQueryResponse<OrderBookEntity>>`
  query SubqueryOrderBooksQuery($after: Cursor, $filter: OrderBookFilter) {
    data: orderBooks(after: $after, filter: $filter) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          dexId
          baseAssetId
          quoteAssetId
          baseAssetReserves
          quoteAssetReserves
          price
          priceChangeDay
          volumeDayUSD
          status
        }
      }
    }
  }
`;

const SubsquidOrderBooksQuery = gql<ConnectionQueryResponse<OrderBookEntity>>`
  query SubsquidOrderBooksQuery($after: String = null, $where: OrderBookWhereInput) {
    data: orderBooksConnection(orderBy: id_ASC, after: $after, where: $where) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          dexId
          baseAsset {
            id
          }
          quoteAsset {
            id
          }
          baseAssetReserves
          quoteAssetReserves
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
  const { dexId, baseAssetReserves, quoteAssetReserves, price, priceChangeDay, volumeDayUSD, status } = item;

  const base = 'baseAssetId' in item ? item.baseAssetId : item.baseAsset.id;
  const quote = 'quoteAssetId' in item ? item.quoteAssetId : item.quoteAsset.id;

  return {
    id: {
      dexId,
      base,
      quote,
    },
    stats: {
      baseAssetReserves,
      quoteAssetReserves,
      price: new FPNumber(price ?? 0),
      priceChange: new FPNumber(priceChangeDay ?? 0),
      volume: new FPNumber(volumeDayUSD ?? 0),
      status,
    },
  };
};

export async function fetchOrderBooks(assets?: Asset[]): Promise<Nullable<OrderBookWithStats[]>> {
  const ids = assets?.map((item) => item.address) ?? [];
  const indexer = getCurrentIndexer();

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const filter = ids.length ? { baseAssetId: { in: ids } } : undefined;
      const variables = { filter };
      const subqueryIndexer = indexer as SubqueryIndexer;
      const response = await subqueryIndexer.services.explorer.fetchAllEntities(
        SubqueryOrderBooksQuery,
        variables,
        parseOrderBookEntity
      );
      return response;
    }
    case IndexerType.SUBSQUID: {
      const where = ids.length ? { baseAsset: { id_in: ids } } : undefined;
      const variables = { where };
      const subsquidIndexer = indexer as SubsquidIndexer;
      const response = await subsquidIndexer.services.explorer.fetchAllEntitiesConnection(
        SubsquidOrderBooksQuery,
        variables,
        parseOrderBookEntity
      );
      return response;
    }
  }

  return null;
}

const SubqueryAccountOrdersQuery = gql<ConnectionQueryResponse<OrderBookOrderEntity>>`
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

const SubsquidAccountOrdersQuery = gql<ConnectionQueryResponse<OrderBookOrderEntity>>`
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

const parseOrderEntity = (item: OrderBookOrderEntity): OrderData => {
  const owner = 'accountId' in item ? item.accountId : item.account.id;
  const orderBookId = 'orderBookId' in item ? item.orderBookId : item.orderBook.id;
  const [dexId, base, quote] = orderBookId.split('-');
  const originalAmount = new FPNumber(item.amount);
  const filledAmount = new FPNumber(item.amountFilled);
  const amount = originalAmount.sub(filledAmount);

  return {
    orderBookId: {
      dexId: Number(dexId),
      base,
      quote,
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
    status: item.status,
  };
};

const subqueryAccountOrdersFilter = (accountAddress: string, id?: OrderBookId) => {
  const filter: any = {
    and: [{ accountId: { equalTo: accountAddress } }, { status: { notEqualTo: OrderStatus.Active } }],
  };

  if (id) {
    const orderBookId = [id.dexId, id.base, id.quote].join('-');

    filter.and.push({
      orderBookId: { equalTo: orderBookId },
    });
  }

  return filter;
};

const subsquidAccountOrdersFilter = (accountAddress: string, id?: OrderBookId) => {
  const where: any = {
    account: { id_eq: accountAddress },
    status_not_eq: OrderStatus.Active,
  };

  if (id) {
    const orderBookId = [id.dexId, id.base, id.quote].join('-');

    where.orderBook = { id_eq: orderBookId };
  }

  return where;
};

export async function fetchOrderBookAccountOrders(
  accountAddress: string,
  id?: OrderBookId
): Promise<Nullable<OrderData[]>> {
  const indexer = getCurrentIndexer();

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const filter = subqueryAccountOrdersFilter(accountAddress, id);
      const variables = { filter };
      const subqueryIndexer = indexer as SubqueryIndexer;
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
      const subsquidIndexer = indexer as SubsquidIndexer;
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

const SubqueryOrderBookDataQuery = gql<QueryData<OrderBookEntity>>`
  query SubqueryOrderBookDataQuery($id: String!) {
    data: orderBook(id: $id) {
      price
      priceChangeDay
      volumeDayUSD
      status
      lastDeals
    }
  }
`;

const SubsquidOrderBookDataQuery = gql<QueryData<OrderBookEntity>>`
  query SubsquidOrderBookDataQuery($id: String!) {
    data: orderBookById(id: $id) {
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
  (item: QueryData<OrderBookEntity>): OrderBookUpdateData => {
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
  subscription SubqueryOrderBookDataSubscription($id: [ID!]) {
    payload: orderBooks(id: $id, mutation: [UPDATE]) {
      id
      mutation_type
      _entity
    }
  }
`;

const SubsquidOrderBookDataSubscription = gql<SubscriptionPayload<OrderBookEntity>>`
  subscription SubsquidOrderBookDataSubscription($id: String!) {
    payload: orderBookById(id: $id) {
      price
      priceChangeDay
      volumeDayUSD
      status
      lastDeals
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

const parseOrderBookUpdate =
  (dexId: number, base: string, quote: string) =>
  (item: OrderBookEntity): OrderBookUpdateData => {
    const { price, priceChangeDay, volumeDayUSD, status, lastDeals } = item;

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

export async function subscribeOnOrderBookUpdates(
  dexId: number,
  baseAssetId: string,
  quoteAssetId: string,
  handler: (entity: OrderBookUpdateData) => void | Promise<void>,
  errorHandler: () => void
): Promise<Nullable<FnWithoutArgs>> {
  const orderBookId = [dexId, baseAssetId, quoteAssetId].join('-');
  const variables = { id: orderBookId };
  const indexer = getCurrentIndexer();

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      const parseQuery = parseOrderBookResponse(dexId, baseAssetId, quoteAssetId);
      const response = await subqueryIndexer.services.explorer.request(SubqueryOrderBookDataQuery, variables);

      if (!response) return null;

      handler(parseQuery(response));

      const parseSubscription = parseOrderBookMutation(dexId, baseAssetId, quoteAssetId);
      const subscription = subqueryIndexer.services.explorer.createEntitySubscription(
        SubqueryOrderBookDataSubscription,
        variables,
        parseSubscription,
        handler,
        errorHandler
      );

      return subscription;
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer as SubsquidIndexer;
      const parseQuery = parseOrderBookResponse(dexId, baseAssetId, quoteAssetId);
      const response = await subsquidIndexer.services.explorer.request(SubsquidOrderBookDataQuery, variables);

      if (!response) return null;

      handler(parseQuery(response));

      const parseSubscription = parseOrderBookUpdate(dexId, baseAssetId, quoteAssetId);
      const subscription = subsquidIndexer.services.explorer.createEntitySubscription(
        SubsquidOrderBookDataSubscription,
        variables,
        parseSubscription,
        handler,
        errorHandler
      );

      return subscription;
    }
  }

  return null;
}
