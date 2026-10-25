import { codec } from './amounts';
import { copyStrategyConfig } from './engine';
import {
  copyExperimentDefinition,
  MAX_EXPERIMENTS,
  type ExperimentDefinition,
  type ExperimentRun,
} from './experiments';
import { copyBotGoal, evaluateBotGoal, validateBotGoalState } from './goals';
import { createResearchBot } from './research';
import type { BotAsset } from './types';

const DATABASE = 'polkaswap-research-v1';
const MAX_RECORD_BYTES = 16_000_000;
const MAX_LIBRARY_BYTES = 48_000_000;
// The research schema is deliberately independent of the wallet's bot/order ledger.
const PUBLIC_FIELDS = new Set(
  `id name settings strategy status progress createdAt result fees error partial
goal goalEvaluation goalState title targetReturnPercent maxLossPercent valuationAsset lossMetric targetRequiresIdleOutperformance
fundingTimestamp endingTimestamp startedAt completedAt baselineValue lastValue peakValue idleHoldings idleLastValue outcome outputTradeLimitCodec
preset capital tradePercent intervalHours intervalBlocks days thresholdPercent fastWindow slowWindow assetInAddress assetOutAddress
feeBudgetXor networkFeeXor swapFeePercent sellNetworkFeeXor sellSwapFeePercent priceImpactPercent sellPriceImpactPercent historyStartAt historyEndAt validation
trainPercent folds optimize slippagePercent kind amount intervalMs threshold direction prompt signalTiming
rules entry exit operator conditions window percentile lastRuleObservationAt lastLiveObservationAt
bot source tradeMarkers candidates costs summary assumptions recommendedSettings history labelKey candles missing identity
denominationVerified provenance genesisHash denominator close feeClose timestamp requestedStartAt requestedEndAt
availableStartAt availableEndAt generatedAt archiveEndpoint version mode account network assetIn assetOut address symbol decimals
policy portfolio state provider model endpoint sessionExpiresAt activity equity apiUsage maxTradeCodec maxPriceImpactPercent
feeAsset feeBudgetCodec sessionDurationMs initial holdings feesPaidCodec trades lastEvaluatedAt lastTradeAt previousSignal
inputTokens outputTokens requests dataSource drawdownPercent returnPercent coverage value benchmark action price reason
inputAsset inputCodec outputAsset outputCodec feeCodec feeAmount execution attribution signalTimestamp selected pnl checks
endTimestamp endPrice key passed actual limit assetAddress networkFeeInCapital swapFeeInCapital selectedProfit excludedProfit
missedProfit avoidedLoss selectedCount excludedCount index trainStart trainEnd testStart testEnd train test searchCount
trainEvidence testEvidence selectionObjective purge candleCount candidateCount durationMs warmupCandles
returnPerDayPercent excessReturnPercent initialValue finalValue start end
purgeCandles tuned queriedAt finalizedAt expiresAt blockNumber blockHash amountIn amountOut sellAmountIn sellAmountOut dexId route routeFees
sellDexId sellRoute sellRouteFees networkFeeCodec sellNetworkFeeCodec amountCodec conversion method capitalAssetAddress
convertedAmount grossIntermediateXorCodec netIntermediateAfterFeesXorCodec firstLegFeeCodec secondLegFeeCodec`.split(
    /\s+/
  )
);
const DECIMAL_FIELDS = new Set(
  `capital feeBudgetXor networkFeeXor swapFeePercent sellNetworkFeeXor sellSwapFeePercent priceImpactPercent sellPriceImpactPercent
slippagePercent amount threshold close feeClose maxPriceImpactPercent value benchmark drawdownPercent returnPercent price pnl
networkFeeInCapital swapFeeInCapital selectedProfit excludedProfit missedProfit avoidedLoss feeAmount amountIn amountOut
returnPerDayPercent excessReturnPercent initialValue finalValue targetReturnPercent maxLossPercent baselineValue lastValue peakValue idleLastValue
sellAmountIn sellAmountOut convertedAmount`.split(/\s+/)
);
const CODEC_FIELDS = new Set(
  `feeBudgetCodec feesPaidCodec inputCodec outputCodec feeCodec networkFeeCodec sellNetworkFeeCodec
amountCodec grossIntermediateXorCodec netIntermediateAfterFeesXorCodec firstLegFeeCodec secondLegFeeCodec outputTradeLimitCodec`.split(
    /\s+/
  )
);

/** Permit only public research metadata and bounded scalar/array shapes; credentials cannot enter through extra properties. */
function assertPublicTree(value: unknown, assetAddresses: Set<string>, key = '', depth = 0): void {
  if (depth > 18) throw new Error('bots.errors.storage');
  if (value === undefined || value === null) return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('bots.errors.storage');
    return;
  }
  if (typeof value === 'boolean') return;
  if (typeof value === 'string') {
    if (value.length > 512) throw new Error('bots.errors.storage');
    if (DECIMAL_FIELDS.has(key) && value !== '' && !/^-?\d+(?:\.\d+)?$/.test(value))
      throw new Error('bots.errors.storage');
    if (CODEC_FIELDS.has(key)) codec(value);
    if (['prompt', 'model'].includes(key) && value !== '') throw new Error('bots.errors.storage');
    if (['account', 'network'].includes(key) && value !== 'paper') throw new Error('bots.errors.storage');
    if (['endpoint', 'archiveEndpoint'].includes(key) && value) {
      const url = new URL(value);
      if (!['https:', 'wss:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
        throw new Error('bots.errors.storage');
    }
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 10002) throw new Error('bots.errors.storage');
    value.forEach((item) => assertPublicTree(item, assetAddresses, key, depth + 1));
    return;
  }
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype)
    throw new Error('bots.errors.storage');
  for (const [childKey, child] of Object.entries(value)) {
    if (['holdings', 'initial', 'maxTradeCodec', 'idleHoldings'].includes(key)) {
      if (!assetAddresses.has(childKey) || typeof child !== 'string') throw new Error('bots.errors.storage');
      codec(child);
    } else {
      if (!PUBLIC_FIELDS.has(childKey)) throw new Error('bots.errors.storage');
      assertPublicTree(child, assetAddresses, childKey, depth + 1);
    }
  }
}

/** Goal evidence preserves its exact funded horizon and input provenance without activating a cached bot. */
function assertStoredGoal(definition: ExperimentDefinition, result: NonNullable<ExperimentRun['result']>): void {
  const goal = definition.goal;
  const evaluation = result.goalEvaluation;
  const bot = result.bot;
  if (!goal) {
    if (evaluation !== undefined || bot.goal !== undefined || bot.goalState !== undefined)
      throw new Error('bots.errors.storage');
    return;
  }
  const candles = result.source.history.candles;
  const funding = candles[0].timestamp;
  const ending = candles.at(-1)!.timestamp;
  if (
    !evaluation ||
    !evaluation.state ||
    !bot.goal ||
    bot.goalState !== undefined ||
    JSON.stringify(copyBotGoal(bot.goal)) !== JSON.stringify(goal) ||
    JSON.stringify(copyBotGoal(evaluation.goal)) !== JSON.stringify(goal) ||
    result.settings.validation !== 'none' ||
    result.settings.optimize ||
    result.validation.mode !== 'none' ||
    result.validation.tuned ||
    result.validation.folds.length !== 0 ||
    result.source.history.missing !== 0 ||
    goal.durationMs % 3_600_000 !== 0 ||
    candles.length !== goal.durationMs / 3_600_000 + 1 ||
    ending - funding !== goal.durationMs ||
    candles.some(
      (candle, index) =>
        !Number.isSafeInteger(candle.timestamp) ||
        candle.timestamp < 0 ||
        candle.timestamp % 3_600_000 !== 0 ||
        (index > 0 && candle.timestamp - candles[index - 1].timestamp !== 3_600_000)
    ) ||
    evaluation.fundingTimestamp !== funding ||
    evaluation.endingTimestamp !== ending ||
    evaluation.state.startedAt !== funding ||
    evaluation.state.outcome === 'active' ||
    !candles.some((candle) => candle.timestamp === evaluation.state.completedAt) ||
    JSON.stringify(evaluation.warmupCandles) !== JSON.stringify(definition.warmupCandles) ||
    evaluation.outputTradeLimitCodec !== definition.outputTradeLimitCodec ||
    (definition.outputTradeLimitCodec !== undefined &&
      bot.policy.maxTradeCodec[bot.assetOut.address] !== definition.outputTradeLimitCodec) ||
    (definition.warmupCandles?.length && definition.warmupCandles.at(-1)!.timestamp !== funding - 3_600_000)
  )
    throw new Error('bots.errors.storage');
  validateBotGoalState({ goal, goalState: evaluation.state });
  const opening = evaluateBotGoal(bot, funding, candles[0]);
  if (opening?.baselineValue !== evaluation.state.baselineValue) throw new Error('bots.errors.storage');
}

/** Validate and detach a completed study before crossing the separate research persistence boundary. */
export function copyStoredExperiment(run: ExperimentRun): ExperimentRun {
  const definition = copyExperimentDefinition(run);
  if (
    run.status !== 'complete' ||
    !run.result ||
    !run.fees ||
    !Number.isSafeInteger(run.createdAt) ||
    run.createdAt < 0
  )
    throw new Error('bots.errors.storage');
  const result = run.result;
  const bot = result.bot;
  const history = result.source?.history;
  const fees = run.fees;
  if (
    result.source?.kind !== 'historical' ||
    !history?.denominationVerified ||
    !history.identity ||
    !Array.isArray(history.candles) ||
    history.candles.length < 2 ||
    history.candles.length > 10000 ||
    bot?.mode !== 'paper' ||
    bot.account !== 'paper' ||
    bot.network !== 'paper' ||
    bot.status !== 'idle' ||
    bot.sessionExpiresAt !== 0 ||
    bot.activity?.length !== 0 ||
    bot.equity?.length !== 0 ||
    bot.apiUsage?.requests !== 0 ||
    bot.model !== '' ||
    bot.endpoint !== '' ||
    bot.portfolio?.trades !== 0 ||
    bot.portfolio.feesPaidCodec !== '0' ||
    JSON.stringify(bot.portfolio.initial) !== JSON.stringify(bot.portfolio.holdings) ||
    !Array.isArray(result.result?.equity) ||
    !Array.isArray(result.candidates) ||
    !Array.isArray(result.tradeMarkers) ||
    !Array.isArray(result.validation?.folds) ||
    result.validation.folds.length > 5 ||
    !Number.isSafeInteger(result.result.trades) ||
    result.result.trades < 0 ||
    result.result.coverage < 0 ||
    result.result.coverage > 1 ||
    fees.genesisHash !== history.identity.genesisHash ||
    fees.denominator !== history.identity.denominator ||
    fees.assetInAddress !== bot.assetIn.address ||
    fees.assetOutAddress !== bot.assetOut.address ||
    fees.amountIn !== bot.strategy.amount ||
    (fees.finalizedAt !== undefined &&
      (!Number.isSafeInteger(fees.finalizedAt) ||
        fees.finalizedAt <= 0 ||
        fees.finalizedAt > fees.queriedAt + 30_000)) ||
    JSON.stringify(definition.settings) !==
      JSON.stringify(copyExperimentDefinition({ ...definition, settings: result.settings }).settings)
  )
    throw new Error('bots.errors.storage');
  const assets: BotAsset[] = [bot.assetIn, bot.assetOut];
  createResearchBot({ ...result.settings, optimize: false }, assets, run.createdAt, bot.strategy);
  assertStoredGoal(definition, result);
  const value: ExperimentRun = {
    ...definition,
    status: 'complete',
    progress: 1,
    createdAt: run.createdAt,
    result: { ...result, bot: { ...bot, strategy: copyStrategyConfig(bot.strategy) } },
    fees,
  };
  assertPublicTree(value, new Set([bot.assetIn.address, bot.assetOut.address, bot.policy.feeAsset.address]));
  const json = JSON.stringify(value);
  if (json.length > MAX_RECORD_BYTES) throw new Error('bots.errors.storage');
  return JSON.parse(json) as ExperimentRun;
}

/** Keep recent complete studies within a count and byte budget, preserving callers' independent snapshots. */
export function retainExperiments(existing: ExperimentRun[], incoming?: ExperimentRun): ExperimentRun[] {
  const latest = incoming ? copyStoredExperiment(incoming) : undefined;
  const records: ExperimentRun[] = [];
  for (const record of existing) {
    if (record.id === latest?.id) continue;
    try {
      records.push(copyStoredExperiment(record));
    } catch {
      /* Ignore corrupt public cache entries. */
    }
  }
  if (latest) records.push(latest);
  records.sort((a, b) => b.createdAt - a.createdAt);
  let bytes = 0;
  return records.filter((record, index) => {
    bytes += JSON.stringify(record).length;
    return index < MAX_EXPERIMENTS && bytes <= MAX_LIBRARY_BYTES;
  });
}

interface ExperimentManifestEntry {
  id: string;
  createdAt: number;
  size: number;
}

/** An independent retention index lets each completed study write once without recopying every earlier result. */
function copyManifest(value: unknown): ExperimentManifestEntry[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .filter((entry): entry is ExperimentManifestEntry => {
      if (
        !entry ||
        typeof entry !== 'object' ||
        typeof entry.id !== 'string' ||
        !/^[\w-]{1,100}$/.test(entry.id) ||
        !Number.isSafeInteger(entry.createdAt) ||
        entry.createdAt < 0 ||
        !Number.isSafeInteger(entry.size) ||
        entry.size < 1 ||
        entry.size > MAX_RECORD_BYTES ||
        seen.has(entry.id)
      )
        return false;
      seen.add(entry.id);
      return true;
    })
    .slice(0, MAX_EXPERIMENTS)
    .map(({ id, createdAt, size }) => ({ id, createdAt, size }));
}

/** Isolated bounded IndexedDB research library. It never opens or mutates the real/paper execution ledger. */
export function createExperimentStorage(factory: IDBFactory | undefined = globalThis.indexedDB) {
  let database: Promise<IDBDatabase> | undefined;
  const open = (): Promise<IDBDatabase> => {
    if (!factory) return Promise.reject(new Error('bots.errors.storage'));
    return (database ??= new Promise((resolve, reject) => {
      const request = factory.open(DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('experiments');
      request.onerror = request.onblocked = () => {
        database = undefined;
        reject(new Error('bots.errors.storage'));
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => {
          request.result.close();
          database = undefined;
        };
        resolve(request.result);
      };
    }));
  };
  const transact = async <T>(
    write: boolean,
    action: (store: IDBObjectStore, finish: (value: T) => void) => void
  ): Promise<T> => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('experiments', write ? 'readwrite' : 'readonly');
      let result: T;
      tx.onabort = tx.onerror = () => reject(new Error('bots.errors.storage'));
      tx.oncomplete = () => resolve(result);
      try {
        action(tx.objectStore('experiments'), (value) => {
          result = value;
        });
      } catch {
        tx.abort();
      }
    });
  };
  /** Read the tiny index without deserializing public candle and candidate arrays. */
  const manifest = (store: IDBObjectStore, action: (entries: ExperimentManifestEntry[]) => void): void => {
    const request = store.get('manifest');
    request.onsuccess = () => action(copyManifest(request.result));
  };
  return {
    /** Load detached validated results in newest-first order. Missing/corrupt cache records are omitted. */
    list: (): Promise<ExperimentRun[]> =>
      transact(false, (store, finish) => {
        manifest(store, (entries) => {
          const records: ExperimentRun[] = [];
          let remaining = entries.length;
          if (!remaining) {
            finish(records);
            return;
          }
          for (const entry of entries) {
            const request = store.get(`run:${entry.id}`);
            request.onsuccess = () => {
              try {
                const run = copyStoredExperiment(request.result);
                if (run.id === entry.id) records.push(run);
              } catch {
                /* A damaged public cache entry grants no authority and may be recomputed. */
              }
              if (--remaining === 0) finish(records.sort((a, b) => b.createdAt - a.createdAt));
            };
          }
        });
      }),
    /** Write only the new completed study and evict old records in the same atomic transaction. */
    save: async (run: ExperimentRun): Promise<void> => {
      const copy = copyStoredExperiment(run);
      const incoming = { id: copy.id, createdAt: copy.createdAt, size: JSON.stringify(copy).length };
      return transact(true, (store, finish) =>
        manifest(store, (entries) => {
          const candidates = [...entries.filter((entry) => entry.id !== incoming.id), incoming].sort(
            (a, b) => b.createdAt - a.createdAt
          );
          let bytes = 0;
          const retained = candidates.filter((entry, index) => {
            bytes += entry.size;
            return index < MAX_EXPERIMENTS && bytes <= MAX_LIBRARY_BYTES;
          });
          const ids = new Set(retained.map((entry) => entry.id));
          for (const previous of entries) if (!ids.has(previous.id)) store.delete(`run:${previous.id}`);
          if (ids.has(copy.id)) store.put(copy, `run:${copy.id}`);
          store.put(retained, 'manifest');
          finish(undefined);
        })
      );
    },
    /** Remove one study without touching any bot or reserved order. */
    delete: (id: string): Promise<void> =>
      transact(true, (store, finish) =>
        manifest(store, (entries) => {
          store.delete(`run:${id}`);
          store.put(
            entries.filter((entry) => entry.id !== id),
            'manifest'
          );
          finish(undefined);
        })
      ),
    /** Clear research results only. */
    clear: (): Promise<void> =>
      transact(true, (store, finish) =>
        manifest(store, (entries) => {
          for (const entry of entries) store.delete(`run:${entry.id}`);
          store.delete('manifest');
          finish(undefined);
        })
      ),
    /** Close this library's handle; a future operation may reopen it. */
    close(): void {
      const pending = database;
      database = undefined;
      void pending?.then(
        (db) => db.close(),
        () => {}
      );
    },
  };
}
