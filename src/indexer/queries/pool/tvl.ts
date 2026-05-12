import { FPNumber } from '@sora-substrate/math';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { gql } from '@urql/core';

import type {
  PoolSnapshotEntity,
  ConnectionQueryResponse,
  ConnectionQueryResponseData,
  SnapshotTypes,
} from '@/lib/soraneo-wallet/src/services/indexer/types';

export type PoolTvlData = {
  timestamp: number;
  liquidityUSD: FPNumber;
  baseAssetReserves: FPNumber;
  targetAssetReserves: FPNumber;
};

const transformSnapshot = (item: PoolSnapshotEntity): PoolTvlData => {
  const timestamp = +item.timestamp * 1000;
  const liquidityUSD = new FPNumber(item.liquidityUSD);
  const baseAssetReserves = FPNumber.fromCodecValue(item.baseAssetReserves);
  const targetAssetReserves = FPNumber.fromCodecValue(item.targetAssetReserves);

  return {
    timestamp,
    liquidityUSD,
    baseAssetReserves,
    targetAssetReserves,
  };
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

const PolkaswapPoolTvlQuery = gql<ConnectionQueryResponse<PoolSnapshotEntity>>`
  query PolkaswapPoolPriceQuery($after: Cursor = "", $filter: PoolSnapshotFilter, $first: Int = null) {
    data: poolSnapshots(after: $after, first: $first, filter: $filter, orderBy: [TIMESTAMP_DESC]) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          timestamp
          liquidityUSD
          baseAssetReserves
          targetAssetReserves
        }
      }
    }
  }
`;

export async function fetchPoolTvlData(
  entityId: string,
  type: SnapshotTypes,
  first?: number,
  after?: string | null
): Promise<Nullable<ConnectionQueryResponseData<PoolTvlData>>> {
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const filter = polkaswapPoolFilter(entityId, type);
  const data = await polkaswapIndexer.services.explorer.fetchEntities(PolkaswapPoolTvlQuery, {
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
