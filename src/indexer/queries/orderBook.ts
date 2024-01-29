import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/util';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import { OrderStatus } from '@/types/orderBook';
import type { OrderBookDealData, OrderBookWithStats, OrderBookUpdateData, OrderData } from '@/types/orderBook';

import type { OrderBookId } from '@sora-substrate/liquidity-proxy';
import type {
  SubqueryConnectionQueryResponse,
  SubquerySubscriptionPayload,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subquery/types';
import type { SubsquidConnectionQueryResponse } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subsquid/types';
import type {
  OrderBookEntity,
  OrderBookOrderEntity,
  OrderBookDealEntity,
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

type OrderBookEntityResponse = {
  data: OrderBookEntity;
};

type SubscriptionResponse<T> = {
  payload: T;
};

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

const SubqueryOrderBooksQuery = gql<SubqueryConnectionQueryResponse<OrderBookEntity>>`
  query SubqueryOrderBooksQuery($after: Cursor) {
    data: orderBooks(after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
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

const SubsquidOrderBooksQuery = gql<SubsquidConnectionQueryResponse<OrderBookEntity>>`
  query SubsquidOrderBooksQuery($after: Cursor) {
    data: orderBooksConnection(after: $after) {
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
  const { dexId, price, priceChangeDay, volumeDayUSD, status } = item;

  return {
    id: {
      dexId,
      base: item.baseAssetId ?? item.baseAsset.id,
      quote: item.quoteAssetId ?? item.quoteAsset.id,
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
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer as SubsquidIndexer;
      const response = await subsquidIndexer.services.explorer.fetchAllEntitiesConnection(
        SubsquidOrderBooksQuery,
        {},
        parseOrderBookEntity
      );
      return response;
    }
  }

  return null;
}

const SubqueryAccountOrdersQuery = gql<SubqueryConnectionQueryResponse<OrderBookOrderEntity>>`
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

const SubsquidAccountOrdersQuery = gql<SubsquidConnectionQueryResponse<OrderBookOrderEntity>>`
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
  const owner = item.accountId ?? (item as any).account.id;
  const orderBookId = item.orderBookId ?? item.orderBook.id;
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

const SubqueryOrderBookDataQuery = gql<OrderBookEntityResponse>`
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

const SubsquidOrderBookDataQuery = gql<OrderBookEntityResponse>`
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
  subscription SubqueryOrderBookDataSubscription($id: [ID!]) {
    payload: orderBooks(id: $id, mutation: [UPDATE]) {
      id
      mutation_type
      _entity
    }
  }
`;

const SubsquidOrderBookDataSubscription = gql<SubscriptionResponse<OrderBookEntity>>`
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

export async function subscribeOnOrderBookUpdates(
  dexId: number,
  baseAssetId: string,
  quoteAssetId: string,
  handler: (entity: OrderBookUpdateData) => void,
  errorHandler: () => void
): Promise<Nullable<FnWithoutArgs>> {
  const orderBookId = [dexId, baseAssetId, quoteAssetId].join('-');
  const variables = { id: orderBookId };
  const indexer = getCurrentIndexer();

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      const parseQuery = parseOrderBookResponse(dexId, baseAssetId, quoteAssetId);
      const parseSubscription = parseOrderBookMutation(dexId, baseAssetId, quoteAssetId);
      const response = await subqueryIndexer.services.explorer.request(SubqueryOrderBookDataQuery, variables);

      if (!response) return null;

      handler(parseQuery(response));

      const subscription = subqueryIndexer.services.explorer.createEntitySubscription(
        SubqueryOrderBookDataSubscription,
        variables,
        parseSubscription,
        handler,
        errorHandler
      );

      return subscription;
    }
    // case IndexerType.SUBSQUID: {
    //   const subsquidIndexer = indexer as SubsquidIndexer;
    //   const parseQuery = parseOrderBookResponse(dexId, baseAssetId, quoteAssetId);
    //   const response = await subsquidIndexer.services.explorer.request(SubsquidOrderBookDataQuery, variables);

    //   if (!response) return null;

    //   handler(parseQuery(response));

    //   const subscription = subsquidIndexer.services.explorer.createEntitySubscription(
    //     SubsquidOrderBookDataSubscription,
    //     variables,
    //     parseQuery,
    //     handler,
    //     errorHandler
    //   );

    //   return subscription;
    // }
  }

  return null;
}
