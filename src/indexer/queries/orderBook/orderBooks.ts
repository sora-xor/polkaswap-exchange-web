import { FPNumber } from '@sora-substrate/sdk';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { retryOnEmptyResult } from '@/indexer/queries/retry';
import { gql } from '@urql/core';

import type { OrderBookWithStats } from '@/types/orderBook';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import type { OrderBookEntity, ConnectionQueryResponse } from '@/lib/soraneo-wallet/src/services/indexer/types';

const PolkaswapOrderBooksQuery = gql<ConnectionQueryResponse<OrderBookEntity>>`
  query PolkaswapOrderBooksQuery($after: Cursor, $filter: OrderBookFilter) {
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

const parseOrderBookEntity = (item: OrderBookEntity): OrderBookWithStats => {
  const { dexId, baseAssetReserves, quoteAssetReserves, price, priceChangeDay, volumeDayUSD, status } = item;

  return {
    id: {
      dexId,
      base: item.baseAssetId,
      quote: item.quoteAssetId,
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
  const filter = ids.length ? { baseAssetId: { in: ids } } : undefined;
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;

  return retryOnEmptyResult(
    async () =>
      polkaswapIndexer.services.explorer.fetchAllEntities(
        PolkaswapOrderBooksQuery,
        { filter },
        parseOrderBookEntity
      ),
    (value) => !value?.length
  );
}
