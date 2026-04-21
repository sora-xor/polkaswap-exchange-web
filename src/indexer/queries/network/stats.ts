import { FPNumber } from '@sora-substrate/math';
import { getCurrentIndexer, SubqueryIndexer, SubsquidIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { IndexerType } from '@/indexer/queries/indexerConsts';
import { retryOnEmptyResult } from '@/indexer/queries/retry';
import { gql } from '@urql/core';

import type { SnapshotTypes, NetworkSnapshotEntity, ConnectionQueryResponse } from '@/lib/soraneo-wallet/src/services/indexer/types';

export type NetworkSnapshot = {
  accounts: FPNumber;
  transactions: FPNumber;
  bridgeIncomingTransactions: FPNumber;
  bridgeOutgoingTransactions: FPNumber;
};

export type NetworkSnapshotData = NetworkSnapshot & {
  timestamp: number;
};

const SubqueryStatsQuery = gql<ConnectionQueryResponse<NetworkSnapshotEntity>>`
  query StatsQuery($after: Cursor, $type: SnapshotType, $from: Int, $to: Int) {
    data: networkSnapshots(
      after: $after
      orderBy: TIMESTAMP_DESC
      filter: {
        and: [
          { type: { equalTo: $type } }
          { timestamp: { lessThanOrEqualTo: $from } }
          { timestamp: { greaterThanOrEqualTo: $to } }
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
          accounts
          transactions
          bridgeIncomingTransactions
          bridgeOutgoingTransactions
        }
      }
    }
  }
`;

const SubsquidStatsQuery = gql<ConnectionQueryResponse<NetworkSnapshotEntity>>`
  query StatsQuery($after: String, $type: SnapshotType, $from: Int, $to: Int) {
    data: networkSnapshotsConnection(
      after: $after
      orderBy: timestamp_DESC
      where: { AND: [{ type_eq: $type }, { timestamp_lte: $from }, { timestamp_gte: $to }] }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          timestamp
          accounts
          transactions
          bridgeIncomingTransactions
          bridgeOutgoingTransactions
        }
      }
    }
  }
`;

const parse = (node: NetworkSnapshotEntity): NetworkSnapshotData => {
  return {
    timestamp: +node.timestamp * 1000,
    accounts: new FPNumber(node.accounts),
    transactions: new FPNumber(node.transactions),
    bridgeIncomingTransactions: new FPNumber(node.bridgeIncomingTransactions),
    bridgeOutgoingTransactions: new FPNumber(node.bridgeOutgoingTransactions),
  };
};

export async function fetchData(from: number, to: number, type: SnapshotTypes): Promise<NetworkSnapshotData[]> {
  const indexer = getCurrentIndexer();
  let data: Nullable<NetworkSnapshotData[]>;
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      data = await retryOnEmptyResult(
        async () => subqueryIndexer.services.explorer.fetchAllEntities(SubqueryStatsQuery, { from, to, type }, parse),
        (value) => !value?.length
      );
      break;
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer as SubsquidIndexer;
      data = await retryOnEmptyResult(
        async () =>
          subsquidIndexer.services.explorer.fetchAllEntitiesConnection(SubsquidStatsQuery, { from, to, type }, parse),
        (value) => !value?.length
      );
      break;
    }
  }

  return data ?? [];
}
