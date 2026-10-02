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
  query NetworkVolumeQuery($after: Cursor, $type: SnapshotType, $from: Int, $to: Int) {
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
          volumeUSD
        }
      }
    }
  }
`;

const PolkaswapNetworkFeesQuery = gql<ConnectionQueryResponse<NetworkSnapshotEntity>>`
  query NetworkFeesQuery($after: Cursor, $type: SnapshotType, $from: Int, $to: Int) {
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
          fees
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

/** Parses a precomputed natural USD volume without using floating-point token math. */
const parseVolume = (node: NetworkSnapshotEntity): ChartData => {
  const value = new FPNumber(node.volumeUSD);

  return {
    timestamp: +node.timestamp * 1000,
    value: value.isFinity() && !value.isLtZero() ? value : FPNumber.ZERO,
  };
};

/** Parses the codec-denominated network fee stored by the indexer. */
const parseFees = (node: NetworkSnapshotEntity): ChartData => {
  const value = FPNumber.fromCodecValue(node.fees);

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

/** Fetches non-zero BLOCK snapshots for whichever network metric is requested. */
const fetchBlockBackfill = async (
  polkaswapIndexer: PolkaswapIndexer,
  fees: boolean,
  from: number,
  to: number
): Promise<ChartData[]> => {
  const query = fees ? PolkaswapNetworkBlockFeesQuery : PolkaswapNetworkBlockVolumeQuery;
  const parse = fees ? parseFees : parseVolume;
  const data = await retryOnEmptyResult(
    async () =>
      polkaswapIndexer.services.explorer.fetchAllEntities(query, { from, to, type: SnapshotTypes.BLOCK }, parse),
    (value) => !value?.length
  );

  return data ?? [];
};

/** Fetches a precomputed network metric and fills sparse aggregate buckets from BLOCK snapshots. */
const fetchSnapshots = async (
  polkaswapIndexer: PolkaswapIndexer,
  fees: boolean,
  from: number,
  to: number,
  type: SnapshotTypes
): Promise<ChartData[]> => {
  const query = fees ? PolkaswapNetworkFeesQuery : PolkaswapNetworkVolumeQuery;
  const parse = fees ? parseFees : parseVolume;
  const requestType = resolveNetworkHistorySnapshotType(type);
  const data = await retryOnEmptyResult(
    async () => polkaswapIndexer.services.explorer.fetchAllEntities(query, { from, to, type: requestType }, parse),
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
};

/**
 * Fetches precomputed network volume or fee history from the active Polkaswap indexer.
 */
export async function fetchData(fees: boolean, from: number, to: number, type: SnapshotTypes): Promise<ChartData[]> {
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;

  return fetchSnapshots(polkaswapIndexer, fees, from, to, type);
}
