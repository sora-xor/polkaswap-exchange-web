import {
  copyExperimentDefinition,
  MAX_EXPERIMENTS,
  type ExperimentDefinition,
  type ExperimentRun,
} from './experiments';
import {
  createResearchBot,
  awaitResearchPaint,
  runResearchAsync,
  type ResearchCandidate,
  type ResearchDecision,
  type ResearchProgress,
  type ResearchResult,
  type ResearchSettings,
} from './research';
import type { ResearchFeeOptions, ResearchFeeSnapshot } from './research-fees';
import { percent } from './amounts';
import { FPNumber } from '@/lib/substrate/math';
import type { BotAsset, BotCandle, BotDefinition, BotGoal, BotHistory, StrategyConfig } from './types';

/** Serializable worker payload contains public market evidence and deterministic rules, never credentials. */
export interface ResearchWorkerRequest {
  id: string;
  settings: ResearchSettings;
  assets: BotAsset[];
  history: BotHistory;
  now: number;
  strategy?: StrategyConfig;
  /** Public goal constraints follow the same evaluator in workers and the yielding fallback. */
  goal?: BotGoal;
  warmupCandles?: BotCandle[];
  outputTradeLimitCodec?: string;
}
export type ResearchWorkerResponse =
  | { id: string; type: 'progress'; partial: ResearchProgress }
  | { id: string; type: 'complete'; result: ResearchResult }
  | { id: string; type: 'error'; error: string };
/** A worker advances only after the main thread presents this exact engine-owned checkpoint. */
export interface ResearchWorkerAcknowledgement {
  id: string;
  type: 'acknowledge';
  checkpoint: number;
}
export type ResearchWorkerMessage = ResearchWorkerRequest | ResearchWorkerAcknowledgement;

export interface ExperimentRunnerOptions {
  assets: BotAsset[];
  loadHistory: (bot: BotDefinition, settings: ResearchSettings) => Promise<BotHistory>;
  loadFees: (
    bot: BotDefinition,
    settings: ResearchSettings,
    options?: ResearchFeeOptions
  ) => Promise<ResearchFeeSnapshot>;
  onUpdate: (run: ExperimentRun) => void;
  concurrency?: number;
  /** Null explicitly selects the yielding fallback; an override permits deterministic worker tests. */
  workerFactory?: (() => Worker) | null;
  now?: () => number;
  /** Presentation hook for deterministic tests or another renderer; no time-based progress is synthesized. */
  awaitProgress?: (progress: ResearchProgress, signal: AbortSignal, runId: string) => Promise<void>;
}
const clone = <T>(value: T): T => structuredClone(value);
const stale = () => new Error('bots.errors.stale');

/** Await public loading without allowing late results from an aborted batch to mutate the current workspace. */
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(stale());
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

/** Match every study to its exact pair, buy notional and denomination-verified chain, refusing expired fee evidence. */
export function assertExperimentEvidence(
  bot: BotDefinition,
  history: BotHistory,
  fees: ResearchFeeSnapshot,
  now: number
): void {
  if (
    !history.denominationVerified ||
    !history.identity ||
    history.identity.genesisHash !== fees.genesisHash ||
    history.identity.denominator !== fees.denominator ||
    fees.assetInAddress !== bot.assetIn.address ||
    fees.assetOutAddress !== bot.assetOut.address ||
    fees.amountIn !== bot.strategy.amount ||
    !Number.isSafeInteger(fees.queriedAt) ||
    !Number.isSafeInteger(fees.expiresAt) ||
    fees.queriedAt > now ||
    (fees.finalizedAt !== undefined &&
      (!Number.isSafeInteger(fees.finalizedAt) ||
        fees.finalizedAt <= 0 ||
        fees.finalizedAt > fees.queriedAt + 30_000)) ||
    fees.expiresAt <= now
  )
    throw stale();
  // Fresh loader evidence must never silently turn missing price impact into a zero-cost assumption.
  if (
    typeof fees.priceImpactPercent !== 'string' ||
    typeof fees.sellPriceImpactPercent !== 'string' ||
    percent(fees.priceImpactPercent).gte(new FPNumber('100')) ||
    percent(fees.sellPriceImpactPercent).gte(new FPNumber('100'))
  )
    throw stale();
}

/** Run up to three independent CPU studies and two public data-loading lanes, with cancellation and real progress. */
export function createExperimentRunner(options: ExperimentRunnerOptions) {
  const now = options.now ?? Date.now;
  const concurrency = Math.max(1, Math.min(3, Math.trunc(options.concurrency ?? 3) || 1));
  const assets = options.assets.map(({ address, symbol, decimals }) => ({ address, symbol, decimals }));
  let generation = 0;
  let disposed = false;
  let active: { controller: AbortController; records: ExperimentRun[] } | undefined;

  /** Only a current batch may publish snapshots; callers may safely mutate their own copy. */
  const publish = (record: ExperimentRun) => options.onUpdate(clone(record));
  const cancel = (): void => {
    generation++;
    const previous = active;
    active = undefined;
    if (!previous) return;
    previous.controller.abort();
    for (const record of previous.records) {
      if (['queued', 'loading', 'running'].includes(record.status)) {
        record.status = 'cancelled';
        publish(record);
      }
    }
  };

  /** A worker exception or unavailable worker falls back to the same sliced evaluator, preserving exact results. */
  const compute = async (
    request: ResearchWorkerRequest,
    signal: AbortSignal,
    progress: (partial: ResearchProgress) => void
  ) => {
    const present = (partial: ResearchProgress) =>
      options.awaitProgress?.(partial, signal, request.id) ?? awaitResearchPaint(signal);
    const fallback = () =>
      runResearchAsync(
        request.settings,
        request.assets,
        { kind: 'historical', history: request.history },
        request.now,
        {
          strategy: request.strategy,
          ...(request.goal !== undefined ? { goal: request.goal } : {}),
          ...(request.warmupCandles !== undefined ? { warmupCandles: request.warmupCandles } : {}),
          ...(request.outputTradeLimitCodec !== undefined
            ? { outputTradeLimitCodec: request.outputTradeLimitCodec }
            : {}),
          onProgress: progress,
          awaitProgress: present,
          signal,
        }
      );
    if (options.workerFactory === null || (options.workerFactory === undefined && typeof Worker === 'undefined'))
      return fallback();
    let worker: Worker;
    try {
      worker = options.workerFactory
        ? options.workerFactory()
        : new Worker(new URL('./research.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      return fallback();
    }
    try {
      return await new Promise<ResearchResult>((resolve, reject) => {
        const abort = () => {
          worker.terminate();
          reject(stale());
        };
        signal.addEventListener('abort', abort, { once: true });
        const cleanup = () => signal.removeEventListener('abort', abort);
        let checkpoint = 0;
        worker.onmessage = (event: MessageEvent<ResearchWorkerResponse>) => {
          if (event.data.id !== request.id || signal.aborted) return;
          if (event.data.type === 'progress') {
            const partial = event.data.partial;
            if (!Number.isSafeInteger(partial.checkpoint) || partial.checkpoint <= checkpoint) return;
            checkpoint = partial.checkpoint;
            progress(partial);
            void present(partial).then(
              () => {
                if (!signal.aborted)
                  worker.postMessage({
                    id: request.id,
                    type: 'acknowledge',
                    checkpoint: partial.checkpoint,
                  } satisfies ResearchWorkerAcknowledgement);
              },
              (error) => {
                cleanup();
                reject(error);
              }
            );
          } else {
            cleanup();
            if (event.data.type === 'complete') resolve(event.data.result);
            else reject(new Error(event.data.error));
          }
        };
        worker.onerror = () => {
          cleanup();
          reject(new Error('worker-unavailable'));
        };
        if (signal.aborted) {
          cleanup();
          abort();
        } else worker.postMessage(request);
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'worker-unavailable' && !signal.aborted) return fallback();
      throw error;
    } finally {
      worker.terminate();
    }
  };

  return {
    /** Start a bounded immutable batch; a new run supersedes and cancels the previous batch. */
    async run(definitions: ExperimentDefinition[]): Promise<ExperimentRun[]> {
      if (
        disposed ||
        !definitions.length ||
        definitions.length > MAX_EXPERIMENTS ||
        new Set(definitions.map((item) => item.id)).size !== definitions.length
      )
        throw new Error('bots.errors.config');
      const createdAt = now();
      const records: ExperimentRun[] = definitions.map((item) => ({
        ...copyExperimentDefinition(item),
        createdAt,
        status: 'queued',
        progress: 0,
      }));
      for (const record of records) {
        record.settings.historyEndAt ??= Math.floor(createdAt / 3_600_000) * 3_600_000;
        createResearchBot(record.settings, assets, createdAt, record.strategy);
      }
      cancel();
      const version = generation;
      const controller = new AbortController();
      active = { controller, records };
      const signal = controller.signal;
      const current = () => !disposed && !signal.aborted && generation === version;
      records.forEach(publish);
      let next = 0;
      let loading = 0;
      const waiting: Array<() => void> = [];
      const acquire = async (): Promise<void> => {
        if (loading < 2) {
          loading++;
          return;
        }
        await abortable(new Promise<void>((resolve) => waiting.push(resolve)), signal);
      };
      const release = () => {
        const waitingTask = waiting.shift();
        if (waitingTask) waitingTask();
        else loading--;
      };
      const lane = async (): Promise<void> => {
        while (current() && next < records.length) {
          const record = records[next++];
          try {
            await acquire();
            let history: BotHistory;
            let fees: ResearchFeeSnapshot;
            try {
              if (!current()) return;
              record.status = 'loading';
              publish(record);
              const bot = createResearchBot(record.settings, assets, createdAt, record.strategy);
              // The history loader itself caches by current chain identity; fees are deliberately observed for each notional.
              const loaded = await abortable(
                Promise.allSettled([
                  options.loadHistory(bot, { ...record.settings }),
                  options.loadFees(bot, { ...record.settings }, { allowHistoricalFinalizedState: true }),
                ]),
                signal
              );
              if (loaded[0].status === 'rejected') throw loaded[0].reason;
              if (loaded[1].status === 'rejected') throw loaded[1].reason;
              history = loaded[0].value;
              fees = loaded[1].value;
              if (!current()) return;
              assertExperimentEvidence(bot, history, fees, now());
            } finally {
              release();
            }
            if (!current()) return;
            record.fees = clone(fees);
            record.settings = {
              ...record.settings,
              networkFeeXor: fees.networkFeeXor,
              swapFeePercent: fees.swapFeePercent,
              sellNetworkFeeXor: fees.sellNetworkFeeXor,
              sellSwapFeePercent: fees.sellSwapFeePercent,
              priceImpactPercent: fees.priceImpactPercent,
              sellPriceImpactPercent: fees.sellPriceImpactPercent,
            };
            record.status = 'running';
            publish(record);
            let scope = '';
            let scopeDecisions: ResearchDecision[] = [];
            let studyCandidates: readonly ResearchCandidate[] = [];
            let checkpoint = 0;
            const result = await compute(
              {
                id: record.id,
                settings: record.settings,
                assets,
                history,
                now: now(),
                strategy: record.strategy,
                ...(record.goal !== undefined ? { goal: record.goal } : {}),
                ...(record.warmupCandles !== undefined ? { warmupCandles: record.warmupCandles } : {}),
                ...(record.outputTradeLimitCodec !== undefined
                  ? { outputTradeLimitCodec: record.outputTradeLimitCodec }
                  : {}),
              },
              signal,
              (partial) => {
                if (!current()) return;
                // A crashed worker restarts exact evaluation in the fallback; do not append its old partial work twice.
                if (partial.checkpoint <= checkpoint) {
                  scope = '';
                  studyCandidates = [];
                }
                checkpoint = partial.checkpoint;
                const nextScope = `${partial.scope}:${partial.fold ?? 0}:${partial.variant ?? 0}`;
                if (scope !== nextScope) {
                  scope = nextScope;
                  scopeDecisions = [];
                }
                scopeDecisions.push(...partial.decisions);
                if (partial.scope === 'study' && partial.candidates.length) {
                  studyCandidates = [...studyCandidates, ...partial.candidates];
                }
                if (scopeDecisions.length > 10_000 || studyCandidates.length > 10_000)
                  throw new Error('bots.errors.history');
                record.partial = { ...partial, scopeDecisions, studyCandidates };
                record.progress = partial.completed / partial.total;
                publish(record);
              }
            );
            if (!current()) return;
            record.result = result;
            // Completed results already contain all study candidates; do not retain a second live copy.
            delete record.partial;
            record.progress = 1;
            record.status = 'complete';
            publish(record);
          } catch (error) {
            if (!current()) return;
            record.status = 'error';
            record.error =
              error instanceof Error && /^bots\.errors\.[\w-]+$/.test(error.message)
                ? error.message
                : 'bots.errors.history';
            publish(record);
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(concurrency, records.length) }, lane));
      if (current()) active = undefined;
      return clone(records);
    },
    cancel,
    /** Release workers and make any queued late messages inert when leaving the application. */
    dispose(): void {
      cancel();
      disposed = true;
    },
  };
}
