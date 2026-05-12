import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/sdk';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { gql } from '@urql/core';

import type { OrderBookDealData, OrderBookUpdateData } from '@/types/orderBook';

import type { PolkaswapSubscriptionPayload } from '@/lib/soraneo-wallet/src/services/indexer/polkaswap/types';
import type {
  OrderBookEntity,
  OrderBookDealEntity,
  QueryData,
} from '@/lib/soraneo-wallet/src/services/indexer/types';

type OrderBookEntityMutation = {
  price: string;
  price_change_day: number;
  volume_day_u_s_d: string;
  status: string;
  last_deals: string;
};

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

const PolkaswapOrderBookDataQuery = gql<QueryData<OrderBookEntity>>`
  query PolkaswapOrderBookDataQuery($id: String!) {
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

const PolkaswapOrderBookDataSubscription = gql<PolkaswapSubscriptionPayload<OrderBookEntityMutation>>`
  subscription PolkaswapOrderBookDataSubscription($id: [ID!]) {
    payload: orderBooks(id: $id, mutation: [UPDATE]) {
      id
      mutation_type
      _entity
    }
  }
`;

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

export async function subscribeOnOrderBookUpdates(
  orderBookId: string,
  handler: (entity: OrderBookUpdateData) => void | Promise<void>,
  errorHandler: () => void
): Promise<Nullable<FnWithoutArgs>> {
  const [dex, baseAssetId, quoteAssetId] = orderBookId.split('-');
  const dexId = Number(dex);
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const parseQuery = parseOrderBookResponse(dexId, baseAssetId, quoteAssetId);
  const response = await polkaswapIndexer.services.explorer.request(PolkaswapOrderBookDataQuery, { id: orderBookId });

  if (!response) return null;

  handler(parseQuery(response));

  const parseSubscription = parseOrderBookMutation(dexId, baseAssetId, quoteAssetId);
  return polkaswapIndexer.services.explorer.createEntitySubscription(
    PolkaswapOrderBookDataSubscription,
    { id: [orderBookId] },
    parseSubscription,
    handler,
    errorHandler
  );
}
