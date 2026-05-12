import { FPNumber } from '@sora-substrate/math';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { retryOnEmptyResult } from '@/indexer/queries/retry';
import { gql } from '@urql/core';

import type {
  SnapshotTypes,
  NetworkSnapshotEntity,
  ConnectionQueryResponse,
} from '@/lib/soraneo-wallet/src/services/indexer/types';

type ChartData = {
  timestamp: number;
  value: FPNumber;
};

const PolkaswapNetworkVolumeQuery = gql<ConnectionQueryResponse<NetworkSnapshotEntity>>`
  query NetworkVolumeQuery($after: Cursor, $fees: Boolean!, $type: SnapshotType, $from: Int, $to: Int) {
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
          volumeUSD @skip(if: $fees)
          fees @include(if: $fees)
        }
      }
    }
  }
`;

const parse =
  (fees: boolean) =>
  (node: NetworkSnapshotEntity): ChartData => {
    const value = fees ? FPNumber.fromCodecValue(node.fees) : new FPNumber(node.volumeUSD);

    return {
      timestamp: +node.timestamp * 1000,
      value: value.isFinity() ? value : FPNumber.ZERO,
    };
  };

export async function fetchData(fees: boolean, from: number, to: number, type: SnapshotTypes): Promise<ChartData[]> {
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const data = await retryOnEmptyResult(
    async () =>
      polkaswapIndexer.services.explorer.fetchAllEntities(
        PolkaswapNetworkVolumeQuery,
        { fees, from, to, type },
        parse(fees)
      ),
    (value) => !value?.length
  );

  return data ?? [];
}
