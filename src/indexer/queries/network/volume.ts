import { FPNumber } from '@sora-substrate/math';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { retryOnEmptyResult } from '@/indexer/queries/retry';
import { resolveNetworkHistorySnapshotType } from '@/indexer/queries/network/snapshotType';
import { gql } from '@urql/core';

import {
  SnapshotTypes,
  type ConnectionQueryResponse,
  type NetworkSnapshotEntity,
} from '@/lib/soraneo-wallet/src/services/indexer/types';

type ChartData = {
  timestamp: number;
  value: FPNumber;
};

const BLOCK_BACKFILL_TYPES = new Set<SnapshotTypes>([SnapshotTypes.HOUR, SnapshotTypes.DAY]);

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

const PolkaswapNetworkBlockFeesQuery = gql<ConnectionQueryResponse<NetworkSnapshotEntity>>`
  query NetworkBlockFeesQuery($after: Cursor, $type: SnapshotType, $from: Int, $to: Int) {
    data: networkSnapshots(
      after: $after
      orderBy: TIMESTAMP_DESC
      filter: {
        and: [
          { type: { equalTo: $type } }
          { timestamp: { lessThanOrEqualTo: $from } }
          { timestamp: { greaterThanOrEqualTo: $to } }
          { fees: { greaterThan: "0" } }
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
          fees
        }
      }
    }
  }
`;

const PolkaswapNetworkBlockVolumeQuery = gql<ConnectionQueryResponse<NetworkSnapshotEntity>>`
  query NetworkBlockVolumeQuery($after: Cursor, $type: SnapshotType, $from: Int, $to: Int) {
    data: networkSnapshots(
      after: $after
      orderBy: TIMESTAMP_DESC
      filter: {
        and: [
          { type: { equalTo: $type } }
          { timestamp: { lessThanOrEqualTo: $from } }
          { timestamp: { greaterThanOrEqualTo: $to } }
          { volumeUSD: { greaterThan: "0" } }
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
          volumeUSD
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

/**
 * Maps an indexer timestamp to the chart bucket used by the selected snapshot type.
 */
const getBucketTimestamp = (timestamp: number, bucketSize: number): number => {
  return Math.floor(timestamp / bucketSize) * bucketSize;
};

/**
 * Detects sparse aggregate snapshots so the query can backfill from block-level data.
 */
const shouldBackfillFromBlocks = (data: ChartData[], from: number, to: number, type: SnapshotTypes): boolean => {
  if (!BLOCK_BACKFILL_TYPES.has(type)) return false;

  const bucketSize = type === SnapshotTypes.HOUR ? 3600 : 86400;
  const expectedBuckets = Math.ceil((from - to) / bucketSize);
  const existingBuckets = new Set(data.map((item) => getBucketTimestamp(item.timestamp / 1000, bucketSize)));

  return existingBuckets.size < expectedBuckets;
};

/**
 * Aggregates non-zero block snapshots into missing aggregate buckets without double-counting buckets already supplied
 * by the indexer.
 */
const aggregateBlockBackfill = (blocks: ChartData[], aggregateData: ChartData[], bucketSize: number): ChartData[] => {
  const occupiedBuckets = new Set(aggregateData.map((item) => getBucketTimestamp(item.timestamp, bucketSize * 1000)));
  const buckets = new Map<number, FPNumber>();

  for (const item of blocks) {
    const timestamp = getBucketTimestamp(item.timestamp, bucketSize * 1000);

    if (occupiedBuckets.has(timestamp)) continue;

    buckets.set(timestamp, (buckets.get(timestamp) ?? FPNumber.ZERO).add(item.value));
  }

  return Array.from(buckets, ([timestamp, value]) => ({ timestamp, value }));
};

const fetchBlockBackfill = async (
  polkaswapIndexer: PolkaswapIndexer,
  fees: boolean,
  from: number,
  to: number
): Promise<ChartData[]> => {
  const query = fees ? PolkaswapNetworkBlockFeesQuery : PolkaswapNetworkBlockVolumeQuery;
  const data = await retryOnEmptyResult(
    async () =>
      polkaswapIndexer.services.explorer.fetchAllEntities(
        query,
        { from, to, type: SnapshotTypes.BLOCK },
        parse(fees)
      ),
    (value) => !value?.length
  );

  return data ?? [];
};

export async function fetchData(fees: boolean, from: number, to: number, type: SnapshotTypes): Promise<ChartData[]> {
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const requestType = resolveNetworkHistorySnapshotType(type);
  const data = await retryOnEmptyResult(
    async () =>
      polkaswapIndexer.services.explorer.fetchAllEntities(
        PolkaswapNetworkVolumeQuery,
        { fees, from, to, type: requestType },
        parse(fees)
      ),
    (value) => !value?.length
  );

  const aggregateData = data ?? [];

  if (!shouldBackfillFromBlocks(aggregateData, from, to, type)) {
    return aggregateData;
  }

  const blockBackfill = await fetchBlockBackfill(polkaswapIndexer, fees, from, to);
  const bucketSize = type === SnapshotTypes.HOUR ? 3600 : 86400;
  const aggregatedBackfill = aggregateBlockBackfill(blockBackfill, aggregateData, bucketSize);

  return [...aggregateData, ...aggregatedBackfill].sort((a, b) => b.timestamp - a.timestamp);
}
