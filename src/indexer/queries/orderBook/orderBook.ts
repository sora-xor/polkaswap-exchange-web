import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/sdk';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type { OrderBookDealData, OrderBookUpdateData } from '@/types/orderBook';

import type { SubquerySubscriptionPayload } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subquery/types';
import type {
  OrderBookEntity,
  OrderBookDealEntity,
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
  orderBookId: string,
  handler: (entity: OrderBookUpdateData) => void | Promise<void>,
  errorHandler: () => void
): Promise<Nullable<FnWithoutArgs>> {
  const [dex, baseAssetId, quoteAssetId] = orderBookId.split('-');
  const dexId = Number(dex);
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
