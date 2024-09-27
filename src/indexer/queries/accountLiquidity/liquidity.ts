import { FPNumber } from '@sora-substrate/math';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type {
  AccountLiquiditySnapshotEntity,
  ConnectionQueryResponse,
  ConnectionQueryResponseData,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

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

const subqueryAccountLiquiditySnapshotFilter = (accountLiquidityId: string) => {
  return {
    accountLiquidityId: {
      equalTo: accountLiquidityId,
    },
  };
};

const SubqueryAccountLiquiditySnapshotsQuery = gql<ConnectionQueryResponse<AccountLiquiditySnapshotEntity>>`
  query SubqueryAccountLiquiditySnapshotsQuery($after: Cursor = "", $first: Int = null, filter: AccountLiquiditySnapshotFilter) {
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
  const indexer = getCurrentIndexer();
  const id = [accountId, poolId].join('-');

  let data!: Nullable<ConnectionQueryResponseData<AccountLiquiditySnapshotEntity>>;

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      const filter = subqueryAccountLiquiditySnapshotFilter(id);
      const variables = { filter, first, after };
      data = await subqueryIndexer.services.explorer.fetchEntities(SubqueryAccountLiquiditySnapshotsQuery, variables);
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
