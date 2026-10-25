import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { gql } from '@urql/core';

import type { OCLH, SnapshotItem } from '@/types/chart';

import type {
  OrderBookSnapshotEntity,
  ConnectionQueryResponse,
  ConnectionQueryResponseData,
  SnapshotTypes,
} from '@/lib/soraneo-wallet/src/services/indexer/types';

const preparePriceData = (item: OrderBookSnapshotEntity): OCLH => {
  const { open, close, low, high } = item.price;

  return [+open, +close, +low, +high];
};

const transformSnapshot = (item: OrderBookSnapshotEntity): SnapshotItem => {
  const timestamp = +item.timestamp * 1000;
  const price = preparePriceData(item);
  const volume = +item.volumeUSD;
  return { timestamp, price, volume };
};

const polkaswapOrderBookPriceFilter = (orderBookId: string, type: SnapshotTypes) => {
  return {
    orderBookId: {
      equalTo: orderBookId,
    },
    type: {
      equalTo: type,
    },
  };
};

const PolkaswapOrderBookPriceQuery = gql<ConnectionQueryResponse<OrderBookSnapshotEntity>>`
  query PolkaswapOrderBookPriceQuery($after: Cursor, $filter: OrderBookSnapshotFilter, $first: Int = 100) {
    data: orderBookSnapshots(after: $after, first: $first, filter: $filter, orderBy: [TIMESTAMP_DESC]) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          price
          timestamp
          volumeUSD
        }
      }
    }
  }
`;

export async function fetchOrderBookPriceData(
  orderBookId: string,
  type: SnapshotTypes,
  first?: number,
  after?: string | null
): Promise<Nullable<ConnectionQueryResponseData<SnapshotItem>>> {
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const filter = polkaswapOrderBookPriceFilter(orderBookId, type);
  const data = await polkaswapIndexer.services.explorer.fetchEntities(PolkaswapOrderBookPriceQuery, {
    filter,
    first,
    after,
  });

  if (!data) return null;

  return {
    ...data,
    edges: data.edges.map((edge) => {
      return {
        ...edge,
        node: transformSnapshot(edge.node),
      };
    }),
  };
}
