import { FPNumber } from '@sora-substrate/math';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { gql } from '@urql/core';

import type {
  AccountLiquiditySnapshotEntity,
  ConnectionQueryResponse,
  ConnectionQueryResponseData,
} from '@/lib/soraneo-wallet/src/services/indexer/types';

type LiquidityItem = {
  timestamp: number;
  poolTokens: FPNumber;
  liquidityUSD: FPNumber;
};

const transformSnapshot = (item: AccountLiquiditySnapshotEntity): LiquidityItem => {
  const timestamp = +item.timestamp * 1000;
  const poolTokens = FPNumber.fromCodecValue(item.poolTokens);
  const liquidityUSD = new FPNumber(item.liquidityUSD);

  return { timestamp, poolTokens, liquidityUSD };
};

const polkaswapAccountLiquiditySnapshotFilter = (accountLiquidityId: string) => {
  return {
    accountLiquidityId: {
      equalTo: accountLiquidityId,
    },
  };
};

const PolkaswapAccountLiquiditySnapshotsQuery = gql<ConnectionQueryResponse<AccountLiquiditySnapshotEntity>>`
  query PolkaswapAccountLiquiditySnapshotsQuery(
    $after: Cursor = ""
    $first: Int = null
    $filter: AccountLiquiditySnapshotFilter
  ) {
    data: accountLiquiditySnapshots(after: $after, first: $first, filter: $filter, orderBy: [TIMESTAMP_DESC]) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          timestamp
          poolTokens
          liquidityUSD
        }
      }
    }
  }
`;

export async function fetchAccountLiquidityData(
  accountId: string,
  poolId: string,
  first?: number,
  after?: string | null
): Promise<Nullable<ConnectionQueryResponseData<LiquidityItem>>> {
  const id = [accountId, poolId].join('-');
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const filter = polkaswapAccountLiquiditySnapshotFilter(id);
  const data = await polkaswapIndexer.services.explorer.fetchEntities(PolkaswapAccountLiquiditySnapshotsQuery, {
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
