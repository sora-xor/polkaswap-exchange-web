import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { retryOnEmptyResult } from '@/indexer/queries/retry';
import { resolveNetworkHistorySnapshotType } from '@/indexer/queries/network/snapshotType';
import { gql } from '@urql/core';

import type {
  SnapshotTypes,
  NetworkSnapshotEntity,
  ConnectionQueryResponse,
} from '@/lib/soraneo-wallet/src/services/indexer/types';

export type ChartData = {
  timestamp: number;
  value: number;
};

const PolkaswapNetworkTvlQuery = gql<ConnectionQueryResponse<NetworkSnapshotEntity>>`
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

const parse = (node: NetworkSnapshotEntity): ChartData => {
  const value = +node.liquidityUSD;

  return {
    timestamp: +node.timestamp * 1000,
    value: Number.isFinite(value) ? value : 0,
  };
};

export async function fetchData(from: number, to: number, type: SnapshotTypes): Promise<ChartData[]> {
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const requestType = resolveNetworkHistorySnapshotType(type);
  const data = await retryOnEmptyResult(
    async () =>
      polkaswapIndexer.services.explorer.fetchAllEntities(
        PolkaswapNetworkTvlQuery,
        { from, to, type: requestType },
        parse
      ),
    (value) => !value?.length
  );

  return data ?? [];
}
