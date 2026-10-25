import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { gql } from '@urql/core';

import type { OCLH, SnapshotItem } from '@/types/chart';

import type {
  PoolSnapshotEntity,
  ConnectionQueryResponse,
  ConnectionQueryResponseData,
  SnapshotTypes,
} from '@/lib/soraneo-wallet/src/services/indexer/types';

const preparePriceData = (item: PoolSnapshotEntity): OCLH => {
  const { open, close, low, high } = item.priceUSD;

  return [+open, +close, +low, +high];
};

const transformSnapshot = (item: PoolSnapshotEntity): SnapshotItem => {
  const timestamp = +item.timestamp * 1000;
  const price = preparePriceData(item);
  const volume = +item.volumeUSD;
  const baseVolume = BigInt(item.baseAssetVolume);
  const targetVolume = BigInt(item.targetAssetVolume);

  return { timestamp, price, volume, baseVolume, targetVolume };
};

const polkaswapPoolFilter = (poolId: string, type: SnapshotTypes) => {
  return {
    poolId: {
      equalTo: poolId,
    },
    type: {
      equalTo: type,
    },
  };
};

const PolkaswapPoolPriceQuery = gql<ConnectionQueryResponse<PoolSnapshotEntity>>`
  query PolkaswapPoolPriceQuery($after: Cursor = "", $filter: PoolSnapshotFilter, $first: Int = null) {
    data: poolSnapshots(after: $after, first: $first, filter: $filter, orderBy: [TIMESTAMP_DESC]) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          timestamp
          priceUSD
          volumeUSD
          baseAssetVolume
          targetAssetVolume
        }
      }
    }
  }
`;

export async function fetchPoolPriceData(
  entityId: string,
  type: SnapshotTypes,
  first?: number,
  after?: string | null
): Promise<Nullable<ConnectionQueryResponseData<SnapshotItem>>> {
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const filter = polkaswapPoolFilter(entityId, type);
  const data = await polkaswapIndexer.services.explorer.fetchEntities(PolkaswapPoolPriceQuery, {
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
