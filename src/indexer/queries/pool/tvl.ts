import { FPNumber } from '@sora-substrate/math';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type {
  PoolSnapshotEntity,
  ConnectionQueryResponse,
  ConnectionQueryResponseData,
  SnapshotTypes,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

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

const subqueryPoolFilter = (poolId: string, type: SnapshotTypes) => {
  return {
    poolId: {
      equalTo: poolId,
    },
    type: {
      equalTo: type,
    },
  };
};

const SubqueryPoolTvlQuery = gql<ConnectionQueryResponse<PoolSnapshotEntity>>`
  query SubqueryPoolPriceQuery($after: Cursor = "", $filter: PoolSnapshotFilter, $first: Int = null) {
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
  const indexer = getCurrentIndexer();

  let data!: Nullable<ConnectionQueryResponseData<PoolSnapshotEntity>>;

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      const filter = subqueryPoolFilter(entityId, type);
      const variables = { filter, first, after };
      data = await subqueryIndexer.services.explorer.fetchEntities(SubqueryPoolTvlQuery, variables);
      break;
    }
    case IndexerType.SUBSQUID: {
      break;
    }
  }

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
