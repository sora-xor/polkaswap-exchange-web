import { FPNumber } from '@sora-substrate/sdk';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { retryOnEmptyResult } from '@/indexer/queries/retry';
import { gql } from '@urql/core';
import { readMarketPrice } from '@/lib/soraneo-wallet/src/services/indexer/marketPrice';
import { fetchByAssetIds, marketRequestOptions } from '@/indexer/queries/asset/batches';

import type { OrderBookWithStats } from '@/types/orderBook';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import type { OrderBookEntity, ConnectionQueryResponse } from '@/lib/soraneo-wallet/src/services/indexer/types';

const makePolkaswapOrderBooksQuery = (exact: boolean) => gql<ConnectionQueryResponse<OrderBookEntity>>`
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
          ${exact ? 'priceExact' : ''}
          priceChangeDay
          volumeDayUSD
          status
        }
      }
    }
  }
`;
const PolkaswapOrderBooksQuery = makePolkaswapOrderBooksQuery(false);
const ExactPolkaswapOrderBooksQuery = makePolkaswapOrderBooksQuery(true);

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
      price: readMarketPrice(item.priceExact, price, 19),
      priceChange: new FPNumber(priceChangeDay ?? 0),
      volume: new FPNumber(volumeDayUSD ?? 0),
      status,
    },
  };
};

export async function fetchOrderBooks(assets?: Asset[]): Promise<Nullable<OrderBookWithStats[]>> {
  const ids = assets?.map((item) => item.address) ?? [];
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const query = (await polkaswapIndexer.services.explorer.supportsExactPrices())
    ? ExactPolkaswapOrderBooksQuery
    : PolkaswapOrderBooksQuery;

  return retryOnEmptyResult(
    () =>
      fetchByAssetIds(ids, (batch) => {
        const filter = batch.length ? { baseAssetId: { in: batch } } : undefined;
        return polkaswapIndexer.services.explorer.fetchAllEntities(
          query,
          { filter },
          parseOrderBookEntity,
          marketRequestOptions
        );
      }),
    (value) => !value?.length
  );
}
