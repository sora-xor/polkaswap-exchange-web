import { gql } from '@urql/core';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import type { SnapshotTypes, NetworkSnapshotEntity } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';
import type {
  SubqueryNetworkSnapshotEntity,
  SubqueryConnectionQueryResponse,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subquery/types';
import {
  SubsquidConnectionQueryResponse,
  SubsquidNetworkSnapshotEntity,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subsquid/types';

const { IndexerType } = WALLET_CONSTS;

export type ChartData = {
  timestamp: number;
  value: number;
};

const SubqueryNetworkTvlQuery = gql<SubqueryConnectionQueryResponse<SubqueryNetworkSnapshotEntity>>`
  query NetworkTvlQuery($after: Cursor, $type: SnapshotType, $from: Int, $to: Int) {
    data: networkSnapshots(
      after: $after
      orderBy: TIMESTAMP_DESC
      filter: {
        and: [
          { type: { equalTo: $type } }
          { timestamp: { lessThanOrEqualTo: $from } }
          { timestamp: { greaterThanOrEqualTo: $to } }
          { liquidityUSD: { greaterThan: "0" } }
        ]
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          timestamp
          liquidityUSD
        }
      }
    }
  }
`;

const SubsquidNetworkTvlQuery = gql<SubsquidConnectionQueryResponse<SubsquidNetworkSnapshotEntity>>`
  query NetworkTvlQuery($after: Cursor, $type: SnapshotType, $from: Int, $to: Int) {
    data: networkSnapshotsConnection(
      after: $after
      orderBy: timestamp_DESC
      where: { AND: [{ type_eq: $type }, { timestamp_lte: $from }, { timestamp_gte: $to }, { liquidityUSD_gt: "0" }] }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          timestamp
          liquidityUSD
        }
      }
    }
  }
`;

const parse = (node: NetworkSnapshotEntity): ChartData => {
  const value = +node.liquidityUSD;

  return {
    timestamp: +node.timestamp * 1000,
    value: Number.isFinite(value) ? value : 0,
  };
};

export async function fetchData(from: number, to: number, type: SnapshotTypes): Promise<ChartData[]> {
  const indexer = getCurrentIndexer();
  let data: Nullable<ChartData[]>;
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      data = await subqueryIndexer.services.explorer.fetchAllEntities(
        SubqueryNetworkTvlQuery,
        { from, to, type },
        parse
      );
      break;
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer as SubsquidIndexer;
      data = await subsquidIndexer.services.explorer.fetchAllEntitiesConnection(
        SubsquidNetworkTvlQuery,
        { from, to, type },
        parse
      );
      break;
    }
  }

  return data ?? [];
}
