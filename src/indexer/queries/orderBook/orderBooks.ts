import { FPNumber } from '@sora-substrate/sdk';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type { OrderBookWithStats } from '@/types/orderBook';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import type {
  OrderBookEntity,
  ConnectionQueryResponse,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

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
