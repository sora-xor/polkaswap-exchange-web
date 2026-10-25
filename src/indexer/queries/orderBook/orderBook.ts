import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/sdk';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { gql } from '@urql/core';

import { isJsonRecord, parseIndexerJson } from '@/utils/indexerParsing';

import type { OrderBookDealData, OrderBookUpdateData } from '@/types/orderBook';

import type { PolkaswapSubscriptionPayload } from '@/lib/soraneo-wallet/src/services/indexer/polkaswap/types';
import type { OrderBookEntity, QueryData } from '@/lib/soraneo-wallet/src/services/indexer/types';

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

const MAX_SAFE_UNIX_TIMESTAMP = Math.floor(Number.MAX_SAFE_INTEGER / 1000);

/** Converts indexer seconds to safe milliseconds or rejects invalid timestamps. */
const parseTimestamp = (unixTimestamp: unknown): Nullable<number> =>
  typeof unixTimestamp === 'number' &&
  Number.isSafeInteger(unixTimestamp) &&
  unixTimestamp >= 0 &&
  unixTimestamp <= MAX_SAFE_UNIX_TIMESTAMP
    ? unixTimestamp * 1000
    : null;

/** Normalizes indexer financial values to finite FP numbers, defaulting invalid values to zero. */
const parseFinancialValue = (value: unknown, allowNegative = false): FPNumber => {
  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    (typeof value === 'string' && !value.trim()) ||
    (typeof value === 'number' && !Number.isFinite(value))
  ) {
    return FPNumber.ZERO;
  }

  const parsed = new FPNumber(value);
  return parsed.isFinity() && (allowNegative || !parsed.isLtZero()) ? parsed : FPNumber.ZERO;
};

const isJsonArray = (value: unknown): value is unknown[] => Array.isArray(value);

/** Invalid or wrong-shape deal payloads are treated as an empty recent-trades list. */
const parseDeals = (lastDeals?: string): OrderBookDealData[] => {
  const deals = parseIndexerJson(lastDeals, [] as unknown[], isJsonArray);

  return deals.filter(isJsonRecord).flatMap((deal) => {
    const timestamp = parseTimestamp(deal.timestamp);
    if (timestamp === null) return [];

    return [
      {
        price: parseFinancialValue(deal.price),
        amount: parseFinancialValue(deal.amount),
        side: parseSide(deal.isBuy === true),
        timestamp,
      },
    ];
  });
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
        price: parseFinancialValue(price),
        priceChange: parseFinancialValue(priceChangeDay, true),
        volume: parseFinancialValue(volumeDayUSD),
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
        price: parseFinancialValue(price),
        priceChange: parseFinancialValue(price_change_day, true),
        volume: parseFinancialValue(volume_day_u_s_d),
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
