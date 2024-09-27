import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type { OCLH, SnapshotItem } from '@/types/chart';

import type {
  PoolSnapshotEntity,
  ConnectionQueryResponse,
  ConnectionQueryResponseData,
  SnapshotTypes,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

const preparePriceData = (item: PoolSnapshotEntity): OCLH => {
  const { open, close, low, high } = item.priceUSD;

  return [+open, +close, +low, +high];
};

const transformSnapshot = (item: PoolSnapshotEntity): SnapshotItem => {
  const timestamp = +item.timestamp * 1000;
  const price = preparePriceData(item);
  const volume = +item.volumeUSD;
  return { timestamp, price, volume };
};

const subqueryPoolPriceFilter = (poolId: string, type: SnapshotTypes) => {
  return {
    poolId: {
      equalTo: poolId,
    },
    type: {
      equalTo: type,
    },
  };
};

const SubqueryPoolPriceQuery = gql<ConnectionQueryResponse<PoolSnapshotEntity>>`
  query SubqueryPoolPriceQuery($after: Cursor = "", $filter: PoolSnapshotFilter, $first: Int = null) {
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
  const indexer = getCurrentIndexer();

  let data!: Nullable<ConnectionQueryResponseData<PoolSnapshotEntity>>;

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      const filter = subqueryPoolPriceFilter(entityId, type);
      const variables = { filter, first, after };
      data = await subqueryIndexer.services.explorer.fetchEntities(SubqueryPoolPriceQuery, variables);
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
