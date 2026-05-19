import { FPNumber } from '@sora-substrate/math';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { retryOnEmptyResult } from '@/indexer/queries/retry';
import { resolveNetworkHistorySnapshotType } from '@/indexer/queries/network/snapshotType';
import { gql } from '@urql/core';

import type {
  SnapshotTypes,
  NetworkSnapshotEntity,
  ConnectionQueryResponse,
  QueryData,
} from '@/lib/soraneo-wallet/src/services/indexer/types';

export type NetworkSnapshot = {
  accounts: FPNumber;
  activeAccounts: FPNumber;
  transactions: FPNumber;
  bridgeIncomingTransactions: FPNumber;
  bridgeOutgoingTransactions: FPNumber;
};

export type NetworkSnapshotData = NetworkSnapshot & {
  timestamp: number;
};

const PolkaswapStatsQuery = gql<ConnectionQueryResponse<NetworkSnapshotEntity>>`
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

type NetworkAccountActivityEntity = {
  activeAccounts: number;
};

const PolkaswapNetworkAccountActivityQuery = gql<QueryData<NetworkAccountActivityEntity>>`
  query NetworkAccountActivityQuery($from: Int!, $to: Int!) {
    data: networkAccountActivity(from: $from, to: $to) {
      activeAccounts
    }
  }
`;

const parse = (node: NetworkSnapshotEntity): NetworkSnapshotData => {
  return {
    timestamp: +node.timestamp * 1000,
    accounts: new FPNumber(node.accounts),
    activeAccounts: FPNumber.ZERO,
    transactions: new FPNumber(node.transactions),
    bridgeIncomingTransactions: new FPNumber(node.bridgeIncomingTransactions),
    bridgeOutgoingTransactions: new FPNumber(node.bridgeOutgoingTransactions),
  };
};

export async function fetchData(from: number, to: number, type: SnapshotTypes): Promise<NetworkSnapshotData[]> {
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const requestType = resolveNetworkHistorySnapshotType(type);
  const data = await retryOnEmptyResult(
    async () =>
      polkaswapIndexer.services.explorer.fetchAllEntities(PolkaswapStatsQuery, { from, to, type: requestType }, parse),
    (value) => !value?.length
  );

  return data ?? [];
}

/**
 * Fetches the unique count of accounts that participated in transactions over
 * the exact stats range. This remains separate from rolling snapshots because
 * summing per-snapshot unique counts would double-count repeat accounts.
 */
export async function fetchActiveAccounts(from: number, to: number): Promise<FPNumber> {
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const response = await retryOnEmptyResult(
    async () => polkaswapIndexer.services.explorer.request(PolkaswapNetworkAccountActivityQuery, { from, to }),
    (value) => !value
  );
  const activeAccounts = response?.data?.activeAccounts;

  return new FPNumber(
    typeof activeAccounts === 'number' &&
      Number.isFinite(activeAccounts) &&
      activeAccounts > 0 &&
      activeAccounts <= Number.MAX_SAFE_INTEGER
      ? Math.trunc(activeAccounts)
      : 0
  );
}
