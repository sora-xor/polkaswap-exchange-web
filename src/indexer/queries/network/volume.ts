import { FPNumber } from '@sora-substrate/math';
import { gql } from '@urql/core';

import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { SnapshotTypes, type ConnectionQueryResponse } from '@/lib/soraneo-wallet/src/services/indexer/types';
import { archivedCounterDaysQuery, mergeArchivedCountDays } from './archivedCounts';
import { resolveNetworkHistorySnapshotType } from './snapshotType';
import { retryOnEmptyResult } from '../retry';

type Range = { start: number; end: number };
/** The four event counts with disjoint time coverage on a network snapshot. */
export type NetworkCounts = {
  transactions: FPNumber | null;
  accounts: FPNumber | null;
  bridgeIncomingTransactions: FPNumber | null;
  bridgeOutgoingTransactions: FPNumber | null;
};
/** Counter-only, complete archive days that can be shown separately from an incomplete range. */
export type ArchiveDayCounts = {
  date: string;
  transactions: string | null;
  bridgeIncomingTransactions: string | null;
  bridgeOutgoingTransactions: string | null;
};
type PeriodCounts = {
  counts: NetworkCounts | null;
  retainedTransactionsComplete: boolean;
  archivedDays: ArchiveDayCounts[];
};
type RawCounts = { [K in keyof NetworkCounts]: number | null };
type Row = RawCounts & {
  id: string;
  timestamp: number;
  volumeUSD: string;
  fees: string;
  flowAggregation: string;
  flowBucketStart: number;
  flowBucketEnd: number;
};
type Observation<T> = { timestamp: number; value: T | null };
export type FlowPoint = Observation<FPNumber>;
type Projection<T> = { zero: T; read: (row: Block) => T; add: (left: T, right: T) => T };
type Explorer = PolkaswapIndexer['services']['explorer'];

const HOUR = 3600;
const DAY = 86400;
const PAGE_SIZE = 100;
const MAX_RECOVERY_REQUESTS = 24;
const MAX_BLOCKS = 800;
const MAX_OPEN_BUCKET_LAG = 120;

const flowQuery = gql<ConnectionQueryResponse<Row>>`
  query NetworkChartFlows($after: Cursor, $type: SnapshotType!, $start: Int!, $end: Int!) {
    data: networkSnapshots(
      first: 100
      after: $after
      orderBy: TIMESTAMP_DESC
      filter: {
        and: [
          { type: { equalTo: $type } }
          { timestamp: { greaterThanOrEqualTo: $start } }
          { timestamp: { lessThanOrEqualTo: $end } }
        ]
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          timestamp
          volumeUSD
          fees
          accounts
          transactions
          bridgeIncomingTransactions
          bridgeOutgoingTransactions
          flowAggregation
          flowBucketStart
          flowBucketEnd
        }
      }
    }
  }
`;

type Block = Pick<Row, 'id' | 'timestamp' | 'volumeUSD' | 'fees' | keyof NetworkCounts>;
const blocksQuery = gql<ConnectionQueryResponse<Block>>`
  query NetworkChartGapBlocks($after: Cursor, $start: Int!, $end: Int!) {
    data: networkSnapshots(
      first: 100
      after: $after
      orderBy: TIMESTAMP_DESC
      filter: {
        and: [
          { type: { equalTo: BLOCK } }
          { timestamp: { greaterThanOrEqualTo: $start } }
          { timestamp: { lessThanOrEqualTo: $end } }
        ]
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          timestamp
          volumeUSD
          fees
          accounts
          transactions
          bridgeIncomingTransactions
          bridgeOutgoingTransactions
        }
      }
    }
  }
`;

type Anchor = Pick<Block, 'id' | 'timestamp'>;
const anchorsQuery = gql<{ before: { nodes: Anchor[] }; after: { nodes: Anchor[] } }>`
  query NetworkChartGapAnchors($start: Int!, $end: Int!) {
    before: networkSnapshots(
      first: 1
      orderBy: TIMESTAMP_DESC
      filter: { type: { equalTo: BLOCK }, timestamp: { lessThan: $start } }
    ) {
      nodes {
        id
        timestamp
      }
    }
    after: networkSnapshots(
      first: 1
      orderBy: TIMESTAMP_ASC
      filter: { type: { equalTo: BLOCK }, timestamp: { greaterThan: $end } }
    ) {
      nodes {
        id
        timestamp
      }
    }
  }
`;

/** UTC buckets intersecting a closed interval, clipped at the selection boundaries. */
function buckets(range: Range, size: number): Range[] {
  const result: Range[] = [];
  for (let time = Math.floor(range.start / size) * size; time <= range.end; time += size) {
    result.push({ start: Math.max(time, range.start), end: Math.min(time + size - 1, range.end) });
  }
  return result;
}

/** Coalesce only adjacent missing buckets so queries never cross a known bucket. */
function gaps<T>(intervals: Range[], known: Map<number, T>): Range[] {
  const missing: Range[] = [];
  for (const interval of intervals) {
    if (known.has(interval.start)) continue;
    const previous = missing[missing.length - 1];
    if (previous?.end === interval.start - 1) previous.end = interval.end;
    else missing.push({ ...interval });
  }
  return missing;
}

/** Invalid amounts cannot establish a zero or contribute to a financial total. */
function amount(row: Block, fees: boolean): FPNumber {
  const raw = fees ? row.fees : row.volumeUSD;
  if (typeof raw !== 'string' || !(fees ? /^\d{1,120}$/ : /^\d{1,100}(?:\.\d{1,8})?$/).test(raw)) {
    throw new Error('Invalid network flow amount');
  }
  return fees ? FPNumber.fromCodecValue(raw) : new FPNumber(raw);
}

/** Read only complete connections. Reject cyclic cursors, failed pages and work beyond the range budget. */
async function pages<T>(
  fetchPage: (cursor: string | null) => Promise<ConnectionQueryResponse<T>['data'] | null>,
  permit: () => boolean
): Promise<T[]> {
  const result: T[] = [];
  const cursors = new Set<string>();
  let cursor: string | null = null;
  for (;;) {
    const page = await retryOnEmptyResult(
      async () => {
        if (!permit()) throw new Error('Network flow page budget exhausted');
        return fetchPage(cursor);
      },
      (response) => !response
    );
    if (
      !page ||
      !Array.isArray(page.edges) ||
      page.edges.length > PAGE_SIZE ||
      typeof page.pageInfo?.hasNextPage !== 'boolean'
    )
      throw new Error('Incomplete network flow page');
    result.push(...page.edges.map(({ node }) => node));
    if (!page.pageInfo.hasNextPage) return result;
    cursor = page.pageInfo.endCursor;
    if (!cursor || cursors.has(cursor) || !page.edges.length) throw new Error('Invalid network flow cursor');
    cursors.add(cursor);
  }
}

/** Retrieve disjoint calendar observations. Rolling values and incomplete calendar intervals stay unknown. */
async function calendar<T>(
  explorer: Explorer,
  range: Range,
  size: number,
  projection: Projection<T>,
  permit: () => boolean,
  liveEnd: number | null
): Promise<Map<number, T>> {
  // The API owns the lower bound exclusively for projected calendar flows and returns an exclusive bucket end.
  const variables = {
    type: size === DAY ? SnapshotTypes.DAY : SnapshotTypes.HOUR,
    start: range.start - 1,
    end: range.end,
  };
  const rows = await pages<Row>((after) => explorer.fetchEntities(flowQuery, { ...variables, after }), permit);
  const values = new Map<number, T>();
  for (const row of rows) {
    if (row.flowAggregation !== 'CALENDAR' || row.flowBucketEnd === row.flowBucketStart) continue;
    const start = Math.max(range.start, Math.floor(row.timestamp / size) * size);
    const end = Math.min(range.end + 1, (Math.floor(row.timestamp / size) + 1) * size);
    const open = range.end === liveEnd && end === range.end + 1 && row.flowBucketEnd > range.end - MAX_OPEN_BUCKET_LAG;
    if (
      !Number.isSafeInteger(row.timestamp) ||
      row.timestamp < range.start ||
      row.timestamp > range.end ||
      row.flowBucketStart !== start ||
      !Number.isSafeInteger(row.flowBucketEnd) ||
      row.flowBucketEnd <= start ||
      row.flowBucketEnd > end ||
      (row.flowBucketEnd !== end && !open)
    )
      continue;
    if (values.has(start)) throw new Error('Overlapping network flow intervals');
    values.set(start, projection.read(row));
  }
  return values;
}

/** Parse the canonical BLOCK identity independently of ordering among blocks sharing a timestamp. */
function height(row?: Anchor): number | undefined {
  if (!row || !/^block-\d+$/.test(row.id) || !Number.isSafeInteger(row.timestamp)) return;
  const number = Number(row.id.slice(6));
  return Number.isSafeInteger(number) ? number : undefined;
}

/** Wake after the next live checkpoint, or release the timer immediately when the user leaves the range. */
function waitForCheckpoint(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, delayMs);
    signal.addEventListener('abort', finish, { once: true });
  });
}

/** Certify every height between both outside anchors, including real zero-activity gaps across a chain pause. */
async function recoverBlocks<T>(
  explorer: Explorer,
  range: Range,
  intervals: Range[],
  projection: Projection<T>,
  permit: () => boolean,
  trailingSignal?: AbortSignal
): Promise<Map<number, T>> {
  const readAnchors = () =>
    retryOnEmptyResult(
      async () => {
        if (!permit()) throw new Error('Network flow request budget exhausted');
        return explorer.request(anchorsQuery, range);
      },
      (response) => !response
    );
  let anchors = await readAnchors();
  if (trailingSignal) {
    // The first few seconds of a new UTC bucket can precede both its HOUR row and the next finalized block.
    // Keep the original selection fixed. Re-read only these two anchors, sharing the existing recovery budget.
    for (const delayMs of [6000, 12000, 24000, 48000]) {
      const before = anchors?.before.nodes[0];
      if (!before || height(before) === undefined || before.timestamp >= range.start || anchors?.after.nodes.length)
        break;
      await waitForCheckpoint(delayMs, trailingSignal);
      if (trailingSignal.aborted) return new Map();
      anchors = await readAnchors();
    }
  }
  const before = anchors?.before.nodes[0],
    after = anchors?.after.nodes[0];
  const first = height(before),
    last = height(after);
  if (
    !before ||
    !after ||
    first === undefined ||
    last === undefined ||
    before.timestamp >= range.start ||
    after.timestamp <= range.end ||
    last <= first ||
    last - first - 1 > MAX_BLOCKS
  )
    return new Map();
  const count = last - first - 1;
  const rows = count
    ? await pages<Block>((after) => explorer.fetchEntities(blocksQuery, { ...range, after }), permit)
    : [];
  if (rows.length !== count) return new Map();
  const covered = new Set<number>();
  const values = new Map(intervals.map(({ start }) => [start, projection.zero]));
  for (const row of rows) {
    const number = height(row);
    const bucket = intervals.find(({ start, end }) => row.timestamp >= start && row.timestamp <= end);
    if (number === undefined || number <= first || number >= last || covered.has(number) || !bucket) return new Map();
    covered.add(number);
    values.set(bucket.start, projection.add(values.get(bucket.start)!, projection.read(row)));
  }
  return values;
}

/**
 * Fetch calendar flows over (to, from]. Publish known bars immediately, then recover disjoint gaps within a
 * bounded request budget. A failed or oversized fallback leaves null observations, never synthetic zeroes.
 */
async function readCoveredFlow<T>(
  projection: Projection<T>,
  from: number,
  to: number,
  type: SnapshotTypes,
  onCalendar?: (points: Observation<T>[]) => void,
  signal: AbortSignal = new AbortController().signal,
  explorer: Explorer = (getCurrentIndexer() as PolkaswapIndexer).services.explorer
): Promise<Observation<T>[]> {
  const active = () => !signal.aborted;
  const granularity = resolveNetworkHistorySnapshotType(type);
  if (
    ![SnapshotTypes.HOUR, SnapshotTypes.DAY].includes(granularity) ||
    !Number.isSafeInteger(to) ||
    !Number.isSafeInteger(from) ||
    to < 0 ||
    from <= to ||
    from - to > 366 * DAY
  ) {
    throw new Error('Invalid network flow range');
  }
  const range = { start: to + 1, end: from };
  const size = granularity === SnapshotTypes.DAY ? DAY : HOUR;
  const intervals = buckets(range, size);
  let primaryRequests = 0;
  const now = Math.floor(Date.now() / 1000);
  const liveEnd = from >= now - 1 && from <= now ? from : null;
  const values = await calendar(
    explorer,
    range,
    size,
    projection,
    () => active() && ++primaryRequests <= Math.ceil(intervals.length / PAGE_SIZE) + 2,
    liveEnd
  );
  const points = (): Observation<T>[] =>
    intervals.map(({ start }) => ({ timestamp: start * 1000, value: values.get(start) ?? null }));
  onCalendar?.(points());

  let recoveryRequests = 0;
  const permit = () => active() && ++recoveryRequests <= MAX_RECOVERY_REQUESTS;
  for (const missing of gaps(intervals, values)) {
    if (!active() || recoveryRequests >= MAX_RECOVERY_REQUESTS) break;
    try {
      const hours = buckets(missing, HOUR);
      const hourly =
        size === DAY ? await calendar(explorer, missing, HOUR, projection, permit, liveEnd) : new Map<number, T>();
      const hourlyGaps = gaps(hours, hourly);
      const onlyLiveTail = values.size === intervals.length - 1 && hourlyGaps.length === 1 && missing.end === liveEnd;
      for (const gap of hourlyGaps) {
        if (!active() || recoveryRequests >= MAX_RECOVERY_REQUESTS) break;
        const within = hours.filter(({ start }) => start >= gap.start && start <= gap.end);
        try {
          const trailingSignal = onlyLiveTail && gap.end === liveEnd ? signal : undefined;
          const recovered = await recoverBlocks(explorer, gap, within, projection, permit, trailingSignal);
          for (const [start, value] of recovered) hourly.set(start, value);
        } catch {
          // An incomplete BLOCK connection affects this gap only.
        }
      }
      // A partial set of hours cannot establish a daily value, even when every observed amount is zero.
      for (const interval of buckets(missing, size)) {
        const parts = buckets(interval, HOUR);
        if (parts.every(({ start }) => hourly.has(start))) {
          values.set(
            interval.start,
            parts.reduce((sum, { start }) => projection.add(sum, hourly.get(start)!), projection.zero)
          );
        }
      }
    } catch {
      // Preserve the certified observations in other, disjoint gaps after an incomplete read.
    }
  }
  return points();
}

/** Fetch the trading-volume or fee series with the existing calendar and BLOCK fallback. */
export function fetchData(
  fees: boolean,
  from: number,
  to: number,
  type: SnapshotTypes,
  onCalendar?: (points: FlowPoint[]) => void,
  signal?: AbortSignal
): Promise<FlowPoint[]> {
  return readCoveredFlow(
    { zero: FPNumber.ZERO, read: (row) => amount(row, fees), add: (a, b) => a.add(b) },
    from,
    to,
    type,
    onCalendar,
    signal
  );
}

/** GraphQL counts are nonnegative integers. An unavailable count remains local to its metric. */
function count(value: unknown): FPNumber | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? new FPNumber(value) : null;
}

/** One missing observation invalidates the period total for the affected metric. */
function addCount(left: FPNumber | null, right: FPNumber | null): FPNumber | null {
  return left && right ? left.add(right) : null;
}

const countProjection: Projection<NetworkCounts> = {
  zero: {
    transactions: FPNumber.ZERO,
    accounts: FPNumber.ZERO,
    bridgeIncomingTransactions: FPNumber.ZERO,
    bridgeOutgoingTransactions: FPNumber.ZERO,
  },
  read: (row) => ({
    transactions: count(row.transactions),
    accounts: count(row.accounts),
    bridgeIncomingTransactions: count(row.bridgeIncomingTransactions),
    bridgeOutgoingTransactions: count(row.bridgeOutgoingTransactions),
  }),
  add: (left, right) => ({
    transactions: addCount(left.transactions, right.transactions),
    accounts: addCount(left.accounts, right.accounts),
    bridgeIncomingTransactions: addCount(left.bridgeIncomingTransactions, right.bridgeIncomingTransactions),
    bridgeOutgoingTransactions: addCount(left.bridgeOutgoingTransactions, right.bridgeOutgoingTransactions),
  }),
};

/** Read event counters together so their coverage, pagination and gap recovery agree. */
export async function readNetworkPeriodCounts(
  from: number,
  to: number,
  type: SnapshotTypes,
  signal?: AbortSignal
): Promise<PeriodCounts> {
  const archivedDays: ArchiveDayCounts[] = [];
  let archiveReader: PolkaswapIndexer['services']['explorer'] | undefined;
  if (type === SnapshotTypes.DAY) {
    try {
      archiveReader = (getCurrentIndexer() as PolkaswapIndexer).services.explorer.captureNetworkOnly();
    } catch {
      // An indexer without a frozen uncached session can still serve its ordinary calendar rows.
    }
  }
  let observations = await readCoveredFlow(countProjection, from, to, type, undefined, signal, archiveReader);
  const retainedTransactionsComplete =
    observations.length > 0 && observations.every(({ value }) => value?.transactions != null);
  if (
    archiveReader &&
    !signal?.aborted &&
    observations.some(
      ({ value }) =>
        !value ||
        value.transactions === null ||
        value.bridgeIncomingTransactions === null ||
        value.bridgeOutgoingTransactions === null
    )
  ) {
    try {
      const archived = await archiveReader.request(archivedCounterDaysQuery, { start: to + 1, end: from + 1 });
      if (!signal?.aborted) {
        const original = observations;
        observations = mergeArchivedCountDays(original, to + 1, from + 1, archived ?? null);
        observations.forEach((observation, i) => {
          const second = observation.timestamp / 1000;
          if (observation === original[i] || !observation.value || second % DAY || second + DAY > from + 1) return;
          const { transactions, bridgeIncomingTransactions, bridgeOutgoingTransactions } = observation.value;
          archivedDays.push({
            date: new Date(observation.timestamp).toISOString().slice(0, 10),
            transactions: transactions?.toString() ?? null,
            bridgeIncomingTransactions: bridgeIncomingTransactions?.toString() ?? null,
            bridgeOutgoingTransactions: bridgeOutgoingTransactions?.toString() ?? null,
          });
        });
      }
    } catch {
      // Existing coverage remains usable if the selected indexer does not support historical counter days.
    }
  }
  let total = countProjection.zero;
  for (const observation of observations) {
    if (!observation.value) return { counts: null, retainedTransactionsComplete: false, archivedDays };
    total = countProjection.add(total, observation.value);
  }
  return { counts: observations.length ? total : null, retainedTransactionsComplete, archivedDays };
}

/** Read count totals without granting historical account coverage from event counts alone. */
export async function fetchNetworkCounts(
  from: number,
  to: number,
  type: SnapshotTypes,
  signal?: AbortSignal
): Promise<NetworkCounts | null> {
  return (await readNetworkPeriodCounts(from, to, type, signal)).counts;
}
