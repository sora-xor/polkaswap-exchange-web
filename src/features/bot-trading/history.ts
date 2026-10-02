import { gql, type OperationResult, type OperationResultSource } from '@urql/core';
import { FPNumber } from '@/lib/substrate/math';
import { api } from '@/lib/soraneo-wallet/src/api';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import type { ConnectionQueryResponse } from '@/lib/soraneo-wallet/src/services/indexer/types';
import { decimalRatio, parseBotPrice } from './engine';
import type { BotDefinition, BotHistory } from './types';
import {
  parseIndexedPoolHistory,
  parseIndexedPoolHistoryWithEvidence,
  type IndexedPoolHistoryWithEvidence,
} from './pool-history';

interface RawSnapshot {
  timestamp: number | string;
  priceUSD?: { close: unknown };
  denominator?: string | null;
  closeEvidence?: unknown;
}
interface SnapshotPrice {
  price: FPNumber;
  denominator: string | null;
  timestamp: number;
}
type HistoryChain = NonNullable<NonNullable<typeof api.connection>['api']>;
interface HistoryContext {
  chain: HistoryChain;
  assertCurrent(): void;
}

export interface BotHistoryOptions {
  /** Use actual same-state XOR pool reserves for goal research and its live signals. */
  basis?: 'xor-pool';
  /** Legacy rolling window, used only when startAt is omitted. */
  days?: number;
  interval: 'hour' | 'day';
  /** Inclusive opening time in milliseconds; a partial opening bucket is excluded. */
  startAt?: number;
  /** Exclusive opening cutoff in milliseconds; never includes an unfinished bucket. */
  endAt?: number;
}

/** Always requests completed hourly XOR-pool evidence; there is no legacy-price or daily fallback. */
export type IndexedBotHistoryOptions = Pick<BotHistoryOptions, 'days' | 'startAt' | 'endAt'> & {
  /** Cancel this reader's waits and subsequent reads without closing the shared indexer/RPC client. */
  signal?: AbortSignal;
};

/** Ignore late shared-client replies after cancellation, and remove the per-read listener on every outcome. */
async function indexedHistoryRead<T>(work: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return work();
  if (signal.aborted) throw new Error('bots.errors.stale');
  let abort!: () => void;
  const cancelled = new Promise<never>((_, reject) => {
    abort = () => reject(new Error('bots.errors.stale'));
    signal.addEventListener('abort', abort, { once: true });
  });
  try {
    const task = Promise.resolve().then(() => {
      if (signal.aborted) throw new Error('bots.errors.stale');
      return work();
    });
    const result = await Promise.race([task, cancelled]);
    if (signal.aborted) throw new Error('bots.errors.stale');
    return result;
  } finally {
    signal.removeEventListener('abort', abort);
  }
}

/**
 * urql replaces fetchOptions.signal with its own transport signal. Unsubscribe
 * this reader on abort so urql can tear down its transport without closing the
 * shared client or interrupting other subscribers to the same query.
 */
async function indexedQueryRead<T extends OperationResult>(
  source: OperationResultSource<T>,
  signal?: AbortSignal
): Promise<T> {
  if (signal?.aborted) throw new Error('bots.errors.stale');
  let subscription: { unsubscribe(): void } | undefined;
  let abort: (() => void) | undefined;
  try {
    return await new Promise<T>((resolve, reject) => {
      abort = () => reject(new Error('bots.errors.stale'));
      signal?.addEventListener('abort', abort, { once: true });
      subscription = source.subscribe((result) => {
        // Preserve toPromise's settled-result semantics for incremental responses.
        if (!result.stale && !result.hasNext) resolve(result);
      });
    });
  } finally {
    subscription?.unsubscribe();
    if (abort) signal?.removeEventListener('abort', abort);
  }
}

/** Snapshot bounded plain RPC data without invoking getters or retaining cache-owned object references. */
function copyIndexedPoolRow(value: unknown): RawSnapshot {
  const copy = (input: unknown, depth = 0, budget = { nodes: 0 }): unknown => {
    if (++budget.nodes > 512 || depth > 8) throw new Error('Invalid indexed snapshot');
    if (input === undefined || input === null || typeof input === 'boolean') return input;
    if (typeof input === 'string' && input.length <= 4096) return input;
    if (typeof input === 'number' && Number.isFinite(input)) return input;
    if (!input || typeof input !== 'object') throw new Error('Invalid indexed snapshot');
    if (Array.isArray(input)) {
      if (Object.getPrototypeOf(input) !== Array.prototype || input.length > 512)
        throw new Error('Invalid indexed snapshot');
      const fields = Object.getOwnPropertyDescriptors(input);
      // Indexed JSON scalars may include unrelated pool lists. Retain ordinary
      // dense arrays without invoking accessors or accepting custom properties.
      if (Reflect.ownKeys(fields).length !== input.length + 1) throw new Error('Invalid indexed snapshot');
      return Object.freeze(
        Array.from({ length: input.length }, (_, index) => {
          const field = fields[index];
          if (!field || !('value' in field) || !field.enumerable) throw new Error('Invalid indexed snapshot');
          return copy(field.value, depth + 1, budget);
        })
      );
    }
    if (![Object.prototype, null].includes(Object.getPrototypeOf(input))) throw new Error('Invalid indexed snapshot');
    const fields = Object.getOwnPropertyDescriptors(input);
    if (Reflect.ownKeys(fields).some((key) => typeof key !== 'string')) throw new Error('Invalid indexed snapshot');
    const output: Record<string, unknown> = Object.create(null);
    for (const [key, field] of Object.entries(fields)) {
      if (!('value' in field) || !field.enumerable) throw new Error('Invalid indexed snapshot');
      output[key] = copy(field.value, depth + 1, budget);
    }
    return Object.freeze(output);
  };
  try {
    if (!value || typeof value !== 'object') throw new Error('Invalid indexed snapshot');
    return copy(value) as RawSnapshot;
  } catch {
    // Keep an otherwise readable timestamp so a rejected duplicate still invalidates
    // its hour. No getter or invalid proof is consulted to repair the observation.
    const descriptor =
      value && typeof value === 'object' ? Object.getOwnPropertyDescriptor(value, 'timestamp') : undefined;
    const timestamp = descriptor && 'value' in descriptor ? descriptor.value : NaN;
    return Object.freeze({ timestamp: ['string', 'number'].includes(typeof timestamp) ? timestamp : NaN });
  }
}

/** Bind indexed prices and denomination evidence to one uninterrupted connected chain identity. */
function captureHistoryContext(bot: BotDefinition): HistoryContext {
  const connection = api.connection;
  const chain = connection?.api;
  const genesisHash = chain?.genesisHash?.toString();
  const endpoint = connection?.endpoint;
  if (!connection || !chain || !chain.isConnected || !genesisHash || !endpoint) throw new Error('bots.errors.stale');
  if (bot.mode === 'live' && bot.network !== genesisHash) throw new Error('bots.errors.network');
  const assertCurrent = () => {
    if (
      api.connection !== connection ||
      connection.api !== chain ||
      connection.endpoint !== endpoint ||
      !chain.isConnected ||
      chain.genesisHash?.toString() !== genesisHash
    )
      throw new Error('bots.errors.stale');
  };
  return { chain, assertCurrent };
}
const PriceQuery = gql<ConnectionQueryResponse<RawSnapshot>>`
  query BotClosedPrices($first: Int!, $after: Cursor!, $filter: AssetSnapshotFilter!) {
    data: assetSnapshots(first: $first, after: $after, filter: $filter, orderBy: [TIMESTAMP_ASC]) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          timestamp
          priceUSD
          denominator
        }
      }
    }
  }
`;

const LegacyPriceQuery = gql<ConnectionQueryResponse<RawSnapshot>>`
  query BotLegacyClosedPrices($first: Int!, $after: Cursor!, $filter: AssetSnapshotFilter!) {
    data: assetSnapshots(first: $first, after: $after, filter: $filter, orderBy: [TIMESTAMP_ASC]) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          timestamp
          priceUSD
        }
      }
    }
  }
`;

const PoolPriceQuery = gql<ConnectionQueryResponse<RawSnapshot>>`
  query BotClosedPoolPrices($first: Int!, $after: Cursor!, $filter: AssetSnapshotFilter!) {
    data: assetSnapshots(first: $first, after: $after, filter: $filter, orderBy: [TIMESTAMP_ASC]) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          timestamp
          denominator
          closeEvidence
        }
      }
    }
  }
`;

/** Read bounded raw decimal CLOSE snapshots; the chart adapter coerces prices to floats. */
async function readSnapshots(
  asset: string,
  type: 'HOUR' | 'DAY',
  start: number,
  end: number,
  context: HistoryContext,
  basis?: 'xor-pool',
  capturedIndexer?: PolkaswapIndexer,
  signal?: AbortSignal
): Promise<RawSnapshot[]> {
  const indexer = capturedIndexer ?? (getCurrentIndexer() as PolkaswapIndexer | null);
  if (!indexer?.services?.explorer) throw new Error('bots.errors.history');
  const client = capturedIndexer?.services.explorer.client;
  if (capturedIndexer && !client) throw new Error('bots.errors.history');
  let after = '';
  const cursors = new Set<string>();
  const snapshots: RawSnapshot[] = [];
  let query = basis === 'xor-pool' ? PoolPriceQuery : PriceQuery;
  for (let page = 0; page < 100; page++) {
    const variables = {
      first: 100,
      after,
      filter: {
        assetId: { equalTo: asset },
        type: { equalTo: type },
        timestamp: { greaterThanOrEqualTo: start, lessThanOrEqualTo: end },
      },
    };
    let result = await indexedHistoryRead(async () => {
      if (!capturedIndexer) return indexer.services.explorer.fetchEntities(query, variables);
      context.assertCurrent();
      // Retained evidence must be newly observed at every read and every page.
      // Bypass both urql response caching and browser HTTP caching, and abort only
      // this reader's transport when its lifetime ends.
      const payload = await indexedQueryRead(
        client!.query(query, variables, {
          requestPolicy: 'network-only',
          fetchOptions: { signal, cache: 'no-store' },
        }),
        signal
      );
      context.assertCurrent();
      return payload.error ? null : (payload.data?.data ?? null);
    }, signal);
    context.assertCurrent();
    // Older maintained indexers do not expose the optional evidence field yet.
    if (!result && query === PriceQuery && page === 0) {
      query = LegacyPriceQuery;
      result = await indexedHistoryRead(() => indexer.services.explorer.fetchEntities(query, variables), signal);
      context.assertCurrent();
    }
    if (!result || !Array.isArray(result.edges)) throw new Error('bots.errors.history');
    if (
      capturedIndexer &&
      (!result.pageInfo ||
        typeof result.pageInfo.hasNextPage !== 'boolean' ||
        (result.pageInfo.hasNextPage &&
          (typeof result.pageInfo.endCursor !== 'string' || result.pageInfo.endCursor.length > 4096)))
    )
      throw new Error('bots.errors.history');
    snapshots.push(...result.edges.map(({ node }) => (capturedIndexer ? copyIndexedPoolRow(node) : node)));
    if (snapshots.length > 10000) throw new Error('bots.errors.history');
    if (!result.pageInfo.hasNextPage) return snapshots;
    after = result.pageInfo.endCursor;
    if (!after || cursors.has(after)) throw new Error('bots.errors.history');
    cursors.add(after);
  }
  throw new Error('bots.errors.history');
}

/**
 * Fetch one uncached row snapshot and return its aligned candles and immutable
 * indexed boundary identities. Second-resolution timestamps remain indexer
 * evidence; exact block time, ancestry and historical arrival require separate
 * verification. Gaps and rejected observations are never filled by another source.
 */
export async function fetchIndexedBotHistoryWithEvidence(
  bot: BotDefinition,
  options: IndexedBotHistoryOptions
): Promise<IndexedPoolHistoryWithEvidence> {
  if (
    (options.startAt === undefined &&
      (!Number.isSafeInteger(options.days) || options.days! < 1 || options.days! > 365)) ||
    (options.startAt !== undefined && (!Number.isSafeInteger(options.startAt) || options.startAt < 0)) ||
    (options.endAt !== undefined && (!Number.isSafeInteger(options.endAt) || options.endAt < 0)) ||
    Object.keys(options).some((key) => !['days', 'startAt', 'endAt', 'signal'].includes(key)) ||
    bot.assetIn.address === bot.assetOut.address
  )
    throw new Error('bots.errors.history');
  const parentSignal = options.signal;
  if (parentSignal?.aborted) throw new Error('bots.errors.stale');
  const lifetime = new AbortController();
  const abort = () => lifetime.abort();
  parentSignal?.addEventListener('abort', abort, { once: true });
  const signal = lifetime.signal;
  try {
    const requestedBot = {
      ...bot,
      assetIn: { ...bot.assetIn },
      assetOut: { ...bot.assetOut },
      policy: { ...bot.policy, feeAsset: { ...bot.policy.feeAsset } },
    };
    const originalContext = captureHistoryContext(requestedBot);
    const indexer = getCurrentIndexer() as PolkaswapIndexer | null;
    const explorer = indexer?.services?.explorer;
    if (!indexer || !explorer?.initClient()) throw new Error('bots.errors.history');
    const indexerType = indexer.type;
    const client = explorer.client;
    if (!client) throw new Error('bots.errors.history');
    const context: HistoryContext = {
      chain: originalContext.chain,
      assertCurrent() {
        if (signal?.aborted) throw new Error('bots.errors.stale');
        originalContext.assertCurrent();
        // The descriptor is recreated on every lookup; the service and initialized
        // network client carry the source identity across pages and retries.
        const current = getCurrentIndexer();
        if (current?.type !== indexerType || current.services?.explorer !== explorer || explorer.client !== client)
          throw new Error('bots.errors.stale');
      },
    };
    const now = Date.now();
    const completeBoundary = Math.floor(Math.min(options.endAt ?? now, now) / 3_600_000) * 3600;
    const start =
      options.startAt === undefined
        ? completeBoundary - options.days! * 86400
        : Math.ceil(options.startAt / 3_600_000) * 3600;
    const count = (completeBoundary - start) / 3600;
    if (!Number.isSafeInteger(count) || count < 1 || count > 10000 || start < 0) throw new Error('bots.errors.history');
    const assets = [
      ...new Set([requestedBot.assetIn.address, requestedBot.assetOut.address, requestedBot.policy.feeAsset.address]),
    ];
    const rows = await Promise.all(
      assets.map((asset) =>
        readSnapshots(asset, 'HOUR', start, completeBoundary - 1, context, 'xor-pool', indexer, signal)
      )
    );
    context.assertCurrent();
    const finalizedHash = await indexedHistoryRead(() => context.chain.rpc.chain.getFinalizedHead(), signal);
    context.assertCurrent();
    const state = await indexedHistoryRead(() => context.chain.at(finalizedHash), signal);
    context.assertCurrent();
    const denominator = (await indexedHistoryRead(() => state.query.denomination.denominator(), signal)).toString();
    context.assertCurrent();
    const result = parseIndexedPoolHistoryWithEvidence(
      new Map(assets.map((asset, index) => [asset, rows[index]])),
      requestedBot,
      {
        startAt: start * 1000,
        endAt: completeBoundary * 1000,
        genesisHash: context.chain.genesisHash.toString(),
        denominator,
      }
    );
    result.history.candles.forEach(Object.freeze);
    Object.freeze(result.history.candles);
    if (result.history.identity) Object.freeze(result.history.identity);
    Object.freeze(result.history);
    return result;
  } finally {
    // One failed asset must not leave another asset paginating after this call has ended.
    lifetime.abort();
    parentSignal?.removeEventListener('abort', abort);
  }
}

/** Invalid or duplicate buckets are missing data; never repair them by carrying prices forward. */
function validSnapshots(
  rows: RawSnapshot[],
  start: number,
  end: number,
  intervalSeconds: number
): Map<number, SnapshotPrice> {
  const prices = new Map<number, SnapshotPrice>();
  const invalid = new Set<number>();
  for (const row of rows) {
    const actualTimestamp = Number(row.timestamp);
    const timestamp = Math.floor(actualTimestamp / intervalSeconds) * intervalSeconds;
    if (!Number.isSafeInteger(actualTimestamp) || actualTimestamp < start || actualTimestamp > end) continue;
    if (prices.has(timestamp)) {
      prices.delete(timestamp);
      invalid.add(timestamp);
    }
    if (invalid.has(timestamp)) continue;
    try {
      prices.set(timestamp, {
        timestamp: actualTimestamp * 1000,
        price: parseBotPrice(row.priceUSD?.close as string),
        denominator:
          typeof row.denominator === 'string' && /^[1-9]\d{0,119}$/.test(row.denominator) ? row.denominator : null,
      });
    } catch {
      invalid.add(timestamp);
    }
  }
  return prices;
}

/**
 * Prefer the indexed CLOSE coefficients and exclude unsupported buckets. A
 * cumulative denominator of one proves no past transition. For legacy rows compare
 * archival chain state at the first candle with current finalized state. Pruned
 * state, absent pallet data, and incomplete timestamp lookups are unverified.
 */
async function verifyDenomination(
  firstTimestamp: number,
  context: HistoryContext,
  metadata?: { hasAny: boolean; coefficients: Array<string | null> }
): Promise<{ verified: boolean; accepted?: boolean[] }> {
  try {
    const { chain, assertCurrent } = context;
    if (!chain?.rpc?.chain || !chain.query?.denomination?.denominator) return { verified: false };
    const finalHash = await chain.rpc.chain.getFinalizedHead();
    assertCurrent();
    const finalState = await chain.at(finalHash);
    assertCurrent();
    const current = (await finalState.query.denomination.denominator()).toString();
    assertCurrent();
    if (!/^[1-9]\d*$/.test(current)) return { verified: false };
    if (metadata?.hasAny) {
      return { verified: true, accepted: metadata.coefficients.map((value) => value === current) };
    }
    if (current === '1') return { verified: true };
    const header = await chain.rpc.chain.getHeader(finalHash);
    assertCurrent();
    let low = 1;
    let high = header.number.toNumber();
    if (!Number.isSafeInteger(high) || high < low) return { verified: false };
    let precedingHash: Awaited<ReturnType<typeof chain.rpc.chain.getBlockHash>> | undefined;
    for (let attempt = 0; low <= high && attempt < 40; attempt++) {
      const height = low + Math.floor((high - low) / 2);
      const hash = await chain.rpc.chain.getBlockHash(height);
      assertCurrent();
      const block = await chain.rpc.chain.getBlock(hash);
      assertCurrent();
      const timestampCall = block.block.extrinsics.find(
        ({ method }) => method.section === 'timestamp' && method.method === 'set'
      );
      const timestamp = Number(timestampCall?.method.args[0]?.toString());
      if (!Number.isSafeInteger(timestamp) || timestamp <= 0) return { verified: false };
      if (timestamp <= firstTimestamp) {
        precedingHash = hash;
        low = height + 1;
      } else high = height - 1;
    }
    if (!precedingHash || low <= high) return { verified: false };
    const firstState = await chain.at(precedingHash);
    assertCurrent();
    const first = (await firstState.query.denomination.denominator()).toString();
    assertCurrent();
    return { verified: first === current };
  } catch {
    return { verified: false };
  }
}

/**
 * Fetch completed matching asset-price buckets, preserving decimal strings.
 * Returned timestamps denote candle completion, never the opening time of a
 * still-forming bucket. No historical swap liquidity is inferred from prices.
 */
export async function fetchBotHistory(bot: BotDefinition, options: BotHistoryOptions): Promise<BotHistory> {
  if (
    (options.startAt === undefined &&
      (!Number.isSafeInteger(options.days) || options.days! < 1 || options.days! > 365)) ||
    (options.startAt !== undefined && (!Number.isSafeInteger(options.startAt) || options.startAt < 0)) ||
    (options.endAt !== undefined && (!Number.isSafeInteger(options.endAt) || options.endAt < 0)) ||
    !['hour', 'day'].includes(options.interval) ||
    (options.basis !== undefined && (options.basis !== 'xor-pool' || options.interval !== 'hour')) ||
    bot.assetIn.address === bot.assetOut.address
  )
    throw new Error('bots.errors.history');
  const context = captureHistoryContext(bot);
  const intervalSeconds = options.interval === 'hour' ? 3600 : 86400;
  const intervalMs = intervalSeconds * 1000;
  const now = Date.now();
  const completeBoundary = Math.floor(Math.min(options.endAt ?? now, now) / intervalMs) * intervalSeconds;
  const start =
    options.startAt === undefined
      ? completeBoundary - options.days! * 86400
      : Math.ceil(options.startAt / intervalMs) * intervalSeconds;
  const count = (completeBoundary - start) / intervalSeconds;
  // Explicit dates may exceed the old 90-day UI window, but remain bounded by the
  // provider's 100-page / 10,000-observation contract and the backtest engine cap.
  if (!Number.isSafeInteger(count) || count < 1 || count > 10000) throw new Error('bots.errors.history');
  const end = completeBoundary - 1;
  const assetIds = [...new Set([bot.assetIn.address, bot.assetOut.address, bot.policy.feeAsset.address])];
  const rows = await Promise.all(
    assetIds.map((asset) =>
      readSnapshots(asset, options.interval === 'hour' ? 'HOUR' : 'DAY', start, end, context, options.basis)
    )
  );
  if (options.basis === 'xor-pool') {
    const hash = await context.chain.rpc.chain.getFinalizedHead();
    context.assertCurrent();
    const state = await context.chain.at(hash);
    context.assertCurrent();
    const denominator = (await state.query.denomination.denominator()).toString();
    context.assertCurrent();
    return parseIndexedPoolHistory(new Map(assetIds.map((asset, index) => [asset, rows[index]])), bot, {
      startAt: start * 1000,
      endAt: completeBoundary * 1000,
      genesisHash: context.chain.genesisHash.toString(),
      denominator,
    });
  }
  const prices = new Map(
    assetIds.map((asset, index) => [asset, validSnapshots(rows[index], start, end, intervalSeconds)])
  );
  const candles: BotHistory['candles'] = [];
  const coefficients: Array<string | null> = [];
  let hasAny = false;
  let earliestPriceTimestamp = Number.MAX_SAFE_INTEGER;
  for (let timestamp = start; timestamp <= end; timestamp += intervalSeconds) {
    const base = prices.get(bot.assetIn.address)?.get(timestamp);
    const quote = prices.get(bot.assetOut.address)?.get(timestamp);
    const fee = prices.get(bot.policy.feeAsset.address)?.get(timestamp);
    if (!base || !quote || !fee) continue;
    const close = decimalRatio(quote.price, base.price);
    const feeClose = decimalRatio(fee.price, base.price);
    if (close.isZero() || feeClose.isZero()) continue;
    earliestPriceTimestamp = Math.min(earliestPriceTimestamp, base.timestamp, quote.timestamp, fee.timestamp);
    const values = [base.denominator, quote.denominator, fee.denominator];
    hasAny ||= values.some((value) => value !== null);
    coefficients.push(values[0] !== null && values.every((value) => value === values[0]) ? values[0] : null);
    candles.push({
      timestamp: (timestamp + intervalSeconds) * 1000,
      close: close.toString(),
      feeClose: feeClose.toString(),
    });
  }
  const proof = candles.length
    ? await verifyDenomination(earliestPriceTimestamp, context, { hasAny, coefficients })
    : { verified: false };
  context.assertCurrent();
  const supported = proof.accepted ? candles.filter((_candle, index) => proof.accepted![index]) : candles;
  return {
    candles: supported,
    missing: count - supported.length,
    denominationVerified: supported.length > 0 && proof.verified,
  };
}
