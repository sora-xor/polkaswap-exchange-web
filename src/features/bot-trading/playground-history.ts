import { api } from '@/lib/soraneo-wallet/src/api';
import { fetchBotHistory } from './history';
import { fetchArchivedBotHistory } from './archive-history';
import { fetchMissingArchivedBotHistory } from './archive-rpc';
import { parseBotPrice } from './engine';
import type { BotDefinition, BotHistory } from './types';
import type { PlaygroundSettings } from './playground';

interface HistoryIdentity {
  key: string;
  genesisHash?: string;
  currentDenominator?: string;
  /** Chain timestamp in milliseconds from the same finalized state as the denomination; not a freshness verdict. */
  finalizedAt?: number;
  assertCurrent(): void;
}

interface ReadyHistoryConnection {
  connection: NonNullable<typeof api.connection>;
  chain: NonNullable<NonNullable<typeof api.connection>['api']>;
  endpoint: string;
  genesis: string;
}

/** Wait for API metadata, not just its WebSocket, before accessing guarded chain getters. */
export async function waitForHistoryConnection(timeoutMs = 15000): Promise<ReadyHistoryConnection> {
  const started = performance.now();
  for (;;) {
    if (performance.now() - started >= timeoutMs) throw new Error('bots.errors.stale');
    const connection = api.connection;
    const chain = connection?.api;
    const endpoint = connection?.endpoint;
    if (!connection || !chain?.isConnected || !endpoint) {
      await new Promise<void>((resolveWait) => setTimeout(resolveWait, 100));
      continue;
    }
    const isCurrent = () =>
      api.connection === connection &&
      connection.api === chain &&
      connection.endpoint === endpoint &&
      chain.isConnected;
    await new Promise<void>((resolveReady, rejectReady) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        if (timer !== undefined) clearTimeout(timer);
        if (error) rejectReady(error);
        else resolveReady();
      };
      const check = () => {
        const remaining = timeoutMs - (performance.now() - started);
        if (!isCurrent() || remaining <= 0) finish(new Error('bots.errors.stale'));
        else timer = setTimeout(check, Math.min(100, remaining));
      };
      check();
      Promise.resolve()
        .then(() => chain.isReady)
        .then(
          () =>
            finish(isCurrent() && performance.now() - started < timeoutMs ? undefined : new Error('bots.errors.stale')),
          () => finish(new Error('bots.errors.stale'))
        );
    });
    if (!isCurrent()) throw new Error('bots.errors.stale');
    const genesis = chain.genesisHash?.toString();
    if (!genesis) throw new Error('bots.errors.stale');
    return { connection, chain, endpoint, genesis };
  }
}

/** Bind cached candles to the connected chain, finalized denomination and same-state chain timestamp. */
export async function readHistoryIdentity(): Promise<HistoryIdentity> {
  const { connection, chain, endpoint, genesis } = await waitForHistoryConnection();
  const assertCurrent = () => {
    if (
      api.connection !== connection ||
      connection.api !== chain ||
      connection.endpoint !== endpoint ||
      !chain.isConnected ||
      chain.genesisHash?.toString() !== genesis
    )
      throw new Error('bots.errors.stale');
  };
  assertCurrent();
  const hash = await chain.rpc.chain.getFinalizedHead();
  assertCurrent();
  const state = await chain.at(hash);
  assertCurrent();
  const denominator = (await state.query.denomination.denominator()).toString();
  assertCurrent();
  if (!/^[1-9]\d{0,119}$/.test(denominator)) throw new Error('bots.errors.denomination');
  let finalizedAt: number;
  try {
    assertCurrent();
    const timestamp = (await state.query.timestamp.now()).toString();
    assertCurrent();
    if (typeof timestamp !== 'string' || !/^[1-9]\d{0,15}$/.test(timestamp)) throw new Error();
    finalizedAt = Number(timestamp);
    if (!Number.isSafeInteger(finalizedAt)) throw new Error();
  } catch {
    // Public callers receive one stable key, never raw RPC/codec failure text.
    throw new Error('bots.errors.stale');
  }
  return {
    key: JSON.stringify([endpoint, genesis, denominator]),
    genesisHash: genesis,
    currentDenominator: denominator,
    finalizedAt,
    assertCurrent,
  };
}

interface PlaygroundHistoryDependencies {
  identity: () => Promise<HistoryIdentity>;
  fetch: typeof fetchBotHistory;
  archive?: typeof fetchArchivedBotHistory;
  repair?: typeof fetchMissingArchivedBotHistory;
  now: () => number;
}

/** An explicit study cannot silently begin later than the requested historical period. */
export class BotHistoryRangeError extends Error {
  readonly requestedStartAt: number;
  readonly requestedEndAt: number;
  readonly availableStartAt: number | null;
  readonly availableEndAt: number | null;
  readonly missing: number;

  constructor(history: BotHistory, startAt: number, endAt: number) {
    super('bots.errors.history');
    this.name = 'BotHistoryRangeError';
    this.requestedStartAt = startAt;
    this.requestedEndAt = endAt;
    this.availableStartAt = history.candles[0]?.timestamp ?? null;
    this.availableEndAt = history.candles.at(-1)?.timestamp ?? null;
    this.missing = history.missing;
  }
}

/**
 * Read the whole selected range from indexed direct XOR pools first. Proven
 * archive observations fill only missing hours on that same valuation basis.
 * Only complete results are cached; incomplete windows retry the indexer.
 */
export function createPlaygroundHistoryLoader(
  deps: PlaygroundHistoryDependencies = {
    identity: readHistoryIdentity,
    fetch: fetchBotHistory,
    archive: fetchArchivedBotHistory,
    repair: fetchMissingArchivedBotHistory,
    now: Date.now,
  }
) {
  const cache = new Map<string, { at: number; history: BotHistory }>();
  const pending = new Map<string, Promise<BotHistory>>();
  let generation = 0;
  const copy = (value: BotHistory): BotHistory => JSON.parse(JSON.stringify(value)) as BotHistory;
  return {
    /** Recheck finalized denomination even on a cache hit; never replace a failed historical request with sample data. */
    async load(bot: BotDefinition, settings: PlaygroundSettings): Promise<BotHistory> {
      const version = generation;
      // Capture currency metadata before awaiting sources or allowing caller edits.
      bot = {
        ...bot,
        assetIn: { ...bot.assetIn },
        assetOut: { ...bot.assetOut },
        policy: { ...bot.policy, feeAsset: { ...bot.policy.feeAsset } },
      };
      const identity = await deps.identity();
      const check = () => {
        identity.assertCurrent();
        if (version !== generation) throw new Error('bots.errors.stale');
      };
      check();
      const now = deps.now();
      if (
        (settings.historyStartAt !== undefined &&
          (!Number.isSafeInteger(settings.historyStartAt) || settings.historyStartAt < 0)) ||
        (settings.historyEndAt !== undefined &&
          (!Number.isSafeInteger(settings.historyEndAt) || settings.historyEndAt < 0))
      )
        throw new Error('bots.errors.history');
      const endAt = Math.floor(Math.min(settings.historyEndAt ?? now, now) / 3_600_000) * 3_600_000;
      const startAt =
        settings.historyStartAt === undefined
          ? endAt - settings.days * 86_400_000
          : Math.ceil(settings.historyStartAt / 3_600_000) * 3_600_000;
      const expected = (endAt - startAt) / 3_600_000;
      if (!Number.isSafeInteger(expected) || startAt < 0 || expected < 1 || expected > 10000)
        throw new Error('bots.errors.history');
      const key = JSON.stringify([identity.key, bot.assetIn, bot.assetOut, bot.policy.feeAsset, startAt, endAt]);
      const cached = cache.get(key);
      if (cached && deps.now() >= cached.at && deps.now() - cached.at < 60_000) {
        return copy(cached.history);
      }
      let request = pending.get(key);
      if (!request) {
        request = (async () => {
          const candles = new Map<number, BotHistory['candles'][number]>();
          let provenance: BotHistory['provenance'];
          let indexedCount = 0;
          let failure: unknown = new Error('bots.errors.history');
          /** A source with explicit identity must agree even if its observations are unusable. */
          const checkSource = (source: BotHistory) => {
            check();
            if (
              source.identity &&
              (source.identity.genesisHash !== identity.genesisHash ||
                source.identity.denominator !== identity.currentDenominator)
            )
              throw new Error('bots.errors.stale');
          };
          /** Validate an entire source before adding exact gaps; an overlap never replaces indexed data. */
          const merge = (source: BotHistory): number => {
            if (!source.denominationVerified) throw new Error('bots.errors.denomination');
            if (!Array.isArray(source.candles) || source.candles.length > expected)
              throw new Error('bots.errors.history');
            let previous = startAt;
            for (const candle of source.candles) {
              if (
                !Number.isSafeInteger(candle.timestamp) ||
                candle.timestamp % 3_600_000 ||
                candle.timestamp <= previous ||
                candle.timestamp > endAt
              )
                throw new Error('bots.errors.history');
              parseBotPrice(candle.close);
              parseBotPrice(candle.feeClose ?? '');
              previous = candle.timestamp;
            }
            const before = candles.size;
            for (const candle of source.candles) {
              if (!candles.has(candle.timestamp)) candles.set(candle.timestamp, { ...candle });
            }
            return candles.size - before;
          };
          let indexed: BotHistory | undefined;
          try {
            indexed = await deps.fetch(bot, { interval: 'hour', startAt, endAt, basis: 'xor-pool' });
          } catch (error) {
            check();
            failure = error;
          }
          if (indexed) {
            checkSource(indexed);
            // The decoder represents absent or incompatible evidence as missing,
            // allowing a separately proved pool observation to fill that hour.
            if (indexed.denominationVerified) indexedCount = merge(indexed);
            else failure = new Error('bots.errors.denomination');
          }
          const archiveOptions =
            identity.genesisHash && identity.currentDenominator
              ? {
                  startAt,
                  endAt,
                  genesisHash: identity.genesisHash,
                  currentDenominator: identity.currentDenominator,
                }
              : undefined;
          /** Optional source failures leave gaps; identity changes always revoke the whole request. */
          const fill = async (load: () => Promise<BotHistory>) => {
            let source: BotHistory;
            try {
              source = await load();
            } catch {
              check();
              return;
            }
            checkSource(source);
            try {
              if (merge(source) && source.provenance) {
                provenance = {
                  ...(provenance ?? source.provenance),
                  kind: indexedCount ? 'mixed-pool-spot-and-indexed' : 'archive-pool-spot',
                };
              }
            } catch {
              // Reject this whole malformed/unverified source, keeping prior genuine observations.
              check();
            }
          };
          if (candles.size < expected && deps.archive && archiveOptions)
            await fill(() => deps.archive!(bot, archiveOptions));
          if (candles.size < expected && expected - candles.size <= 24 && deps.repair && archiveOptions) {
            const timestamps: number[] = [];
            for (let timestamp = startAt + 3_600_000; timestamp <= endAt; timestamp += 3_600_000)
              if (!candles.has(timestamp)) timestamps.push(timestamp);
            await fill(() => deps.repair!(bot, { ...archiveOptions, timestamps }));
          }
          check();
          const after = await deps.identity();
          check();
          after.assertCurrent();
          if (after.key !== identity.key) throw new Error('bots.errors.stale');
          if (!candles.size) throw failure;
          const ordered = [...candles.values()].sort((a, b) => a.timestamp - b.timestamp);
          const history: BotHistory = {
            candles: ordered,
            missing: expected - ordered.length,
            denominationVerified: true,
            ...(after.genesisHash && after.currentDenominator
              ? { identity: { genesisHash: after.genesisHash, denominator: after.currentDenominator } }
              : {}),
            ...(provenance
              ? {
                  provenance: {
                    ...provenance,
                    requestedStartAt: startAt,
                    requestedEndAt: endAt,
                    availableStartAt: ordered[0].timestamp,
                    availableEndAt: ordered.at(-1)!.timestamp,
                  },
                }
              : {}),
          };
          if (history.missing === 0) {
            if (cache.size >= 3) cache.delete(cache.keys().next().value!);
            cache.set(key, { at: deps.now(), history: copy(history) });
          }
          return history;
        })();
        pending.set(key, request);
      }
      try {
        const history = await request;
        identity.assertCurrent();
        if (version !== generation) throw new Error('bots.errors.stale');
        return copy(history);
      } finally {
        if (pending.get(key) === request) pending.delete(key);
      }
    },
    /** Discard page-local history and invalidate outstanding responses on disposal. */
    clear(): void {
      generation++;
      cache.clear();
      pending.clear();
    },
  };
}
