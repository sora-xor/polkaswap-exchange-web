import { FPNumber } from '@sora-substrate/math';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { retryOnEmptyResult } from '@/indexer/queries/retry';
import { resolveNetworkHistorySnapshotType } from '@/indexer/queries/network/snapshotType';
import { gql } from '@urql/core';

import {
  ModuleMethods,
  ModuleNames,
  SnapshotTypes,
  type ConnectionQueryResponse,
  type HistoryElement,
  type NetworkSnapshotEntity,
} from '@/lib/soraneo-wallet/src/services/indexer/types';

type ChartData = {
  timestamp: number;
  value: FPNumber;
};

const BLOCK_BACKFILL_TYPES = new Set<SnapshotTypes>([SnapshotTypes.HOUR, SnapshotTypes.DAY]);
const SWAP_VOLUME_METHODS = new Set<string>([
  ModuleMethods.LiquidityProxySwap,
  ModuleMethods.LiquidityProxySwapTransfer,
  ModuleMethods.LiquidityProxySwapTransferBatch,
]);

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

const PolkaswapSwapVolumeQuery = gql<ConnectionQueryResponse<HistoryElement>>`
  query NetworkSwapVolumeQuery($after: Cursor, $from: Int, $to: Int) {
    data: historyElements(
      after: $after
      orderBy: [TIMESTAMP_DESC, ID_DESC]
      filter: {
        and: [
          { timestamp: { lessThanOrEqualTo: $from } }
          { timestamp: { greaterThan: $to } }
          { module: { equalTo: "liquidityProxy" } }
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
          module
          method
          execution
          data
        }
      }
    }
  }
`;

const parseFees = (node: NetworkSnapshotEntity): ChartData => {
  const value = FPNumber.fromCodecValue(node.fees);

  return {
    timestamp: +node.timestamp * 1000,
    value: value.isFinity() ? value : FPNumber.ZERO,
  };
};

/** Converts a natural decimal indexer value into a finite, non-negative amount. */
const parseNaturalAmount = (value: unknown): FPNumber => {
  if (typeof value !== 'string' && typeof value !== 'number') return FPNumber.ZERO;

  const amount = new FPNumber(value);

  return amount.isFinity() && !amount.isLtZero() ? amount : FPNumber.ZERO;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

/** Uses the larger side of a swap as its USD volume, matching indexer snapshot semantics. */
const parseSwapAmount = (data: unknown): FPNumber => {
  if (!isRecord(data)) return FPNumber.ZERO;

  const baseAmount = parseNaturalAmount(data.baseAssetAmountUSD);
  const targetAmount = parseNaturalAmount(data.targetAssetAmountUSD);

  return FPNumber.gt(baseAmount, targetAmount) ? baseAmount : targetAmount;
};

/** Sums receiver USD amounts for swap-and-transfer batches that do not expose base/target USD fields. */
const parseSwapTransferBatchAmount = (data: unknown): FPNumber => {
  if (!isRecord(data) || !Array.isArray(data.receivers)) return FPNumber.ZERO;

  return data.receivers.reduce((total, receiver) => {
    const amountUSD = isRecord(receiver) ? receiver.amountUSD : undefined;

    return total.add(parseNaturalAmount(amountUSD));
  }, FPNumber.ZERO);
};

/**
 * Reads exchange volume from successful swap history rows instead of broad
 * network snapshots, which can include non-trading events such as asset burns.
 */
const parseSwapVolume = (node: HistoryElement): ChartData => {
  if (node.module !== ModuleNames.LiquidityProxy || !SWAP_VOLUME_METHODS.has(node.method) || !node.execution.success) {
    return {
      timestamp: +node.timestamp * 1000,
      value: FPNumber.ZERO,
    };
  }

  const value =
    node.method === ModuleMethods.LiquidityProxySwapTransferBatch
      ? parseSwapTransferBatchAmount(node.data)
      : parseSwapAmount(node.data);

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
  from: number,
  to: number
): Promise<ChartData[]> => {
  const data = await retryOnEmptyResult(
    async () =>
      polkaswapIndexer.services.explorer.fetchAllEntities(
        PolkaswapNetworkBlockFeesQuery,
        { from, to, type: SnapshotTypes.BLOCK },
        parseFees
      ),
    (value) => !value?.length
  );

  return data ?? [];
};

/** Aggregates parsed swap rows into fixed chart buckets for the selected filter granularity. */
const aggregateSwapVolume = (items: ChartData[], bucketSize: number): ChartData[] => {
  const buckets = new Map<number, FPNumber>();

  for (const item of items) {
    if (item.value.isZero()) continue;

    const timestamp = getBucketTimestamp(item.timestamp, bucketSize * 1000);

    buckets.set(timestamp, (buckets.get(timestamp) ?? FPNumber.ZERO).add(item.value));
  }

  return Array.from(buckets, ([timestamp, value]) => ({ timestamp, value })).sort((a, b) => b.timestamp - a.timestamp);
};

/** Fetches exchange volume from swap history so unrelated asset events cannot affect the Volume chart. */
const fetchSwapVolume = async (
  polkaswapIndexer: PolkaswapIndexer,
  from: number,
  to: number,
  type: SnapshotTypes
): Promise<ChartData[]> => {
  const data = await polkaswapIndexer.services.explorer.fetchAllEntities(
    PolkaswapSwapVolumeQuery,
    { from, to },
    parseSwapVolume
  );
  const bucketSize = type === SnapshotTypes.HOUR ? 3600 : 86400;

  return aggregateSwapVolume(data ?? [], bucketSize);
};

/** Fetches network fee snapshots and fills sparse aggregate buckets from block-level fee data. */
const fetchFees = async (
  polkaswapIndexer: PolkaswapIndexer,
  from: number,
  to: number,
  type: SnapshotTypes
): Promise<ChartData[]> => {
  const requestType = resolveNetworkHistorySnapshotType(type);
  const data = await retryOnEmptyResult(
    async () =>
      polkaswapIndexer.services.explorer.fetchAllEntities(
        PolkaswapNetworkFeesQuery,
        { from, to, type: requestType },
        parseFees
      ),
    (value) => !value?.length
  );

  const aggregateData = data ?? [];

  if (!shouldBackfillFromBlocks(aggregateData, from, to, type)) {
    return aggregateData;
  }

  const blockBackfill = await fetchBlockBackfill(polkaswapIndexer, from, to);
  const bucketSize = type === SnapshotTypes.HOUR ? 3600 : 86400;
  const aggregatedBackfill = aggregateBlockBackfill(blockBackfill, aggregateData, bucketSize);

  return [...aggregateData, ...aggregatedBackfill].sort((a, b) => b.timestamp - a.timestamp);
};

export async function fetchData(fees: boolean, from: number, to: number, type: SnapshotTypes): Promise<ChartData[]> {
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;

  return fees ? fetchFees(polkaswapIndexer, from, to, type) : fetchSwapVolume(polkaswapIndexer, from, to, type);
}
