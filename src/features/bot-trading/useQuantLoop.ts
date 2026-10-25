/**
 * Runs the Quant Loop for the bots command center.
 *
 * Order: fetch the bundled archive (page-relative, so IPFS prefixes work), observe the
 * current SORA network and pool fees from a finalized quote, search in a module worker
 * (or in this thread with paint yields), then evaluate each selected rule on the latest
 * completed closes exactly as a running bot would. Results are cached for the session
 * because they depend only on the archive and the observed fee rates.
 */
import { onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { PLAYGROUND_DEFAULT_SETTINGS, type PlaygroundSettings } from './playground';
import {
  QUANT_ARCHIVE_URL,
  QUANT_CAPITAL_XOR,
  QUANT_FEE_BUDGET_XOR,
  parseQuantArchive,
  runQuantLoop,
  type QuantArchive,
  type QuantCosts,
  type QuantLoopResult,
  type QuantProgress,
} from './quant-loop';
import { evaluateQuantSignal, quantArchiveCandles, quantSignalWindow, type QuantSignal } from './quant-deploy';
import { createResearchBot } from './research';
import type { QuantWorkerRequest, QuantWorkerResponse } from './quant-loop.worker';
import type { ResearchFeeSnapshot } from './research-fees';
import type { BotAsset, BotDefinition, BotHistory } from './types';

export type QuantLoopStatus = 'idle' | 'loading' | 'fees' | 'running' | 'done' | 'error';

export interface QuantLoopDependencies {
  loadFees: (bot: BotDefinition, settings: { slippagePercent: string }) => Promise<ResearchFeeSnapshot>;
  loadHistory: (bot: BotDefinition, settings: PlaygroundSettings) => Promise<BotHistory>;
  fetchArchive?: () => Promise<string>;
  /** `null` forces the in-thread evaluator; omitted uses a module worker when available. */
  workerFactory?: (() => Worker) | null;
  now?: () => number;
  wait?: (ms: number) => Promise<void>;
}

const MAX_ARCHIVE_BYTES = 24 * 1024 * 1024;
const HOUR = 3_600_000;
/** Indexer publication delay after an hourly close. */
const SIGNAL_DELAY_MS = 4 * 60_000;
/** About two minutes of patience while a public node reconnects. */
const FEE_ATTEMPTS = 30;
const FEE_RETRY_MS = 4_000;
const SLIPPAGE_PERCENT = '0.5';
const cache = new Map<string, QuantLoopResult>();

/** Read the static archive with the same limits as the history loader. */
export async function fetchQuantArchiveText(): Promise<string> {
  const response = await fetch(QUANT_ARCHIVE_URL, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok || Number(response.headers.get('content-length') || 0) > MAX_ARCHIVE_BYTES)
    throw new Error('bots.errors.history');
  const text = await response.text();
  if (text.length > MAX_ARCHIVE_BYTES) throw new Error('bots.errors.history');
  return text;
}

/** A plain XOR→token template; only its pair and order size are used for quotes and history. */
export function quantProbeBot(asset: BotAsset, assets: BotAsset[], now: number): BotDefinition {
  return createResearchBot(
    {
      ...PLAYGROUND_DEFAULT_SETTINGS,
      preset: 'dca',
      capital: QUANT_CAPITAL_XOR,
      tradePercent: 20,
      intervalHours: 1,
      intervalBlocks: 1,
      assetInAddress: XOR.address,
      assetOutAddress: asset.address,
      feeBudgetXor: QUANT_FEE_BUDGET_XOR,
      networkFeeXor: '',
      swapFeePercent: '',
      validation: 'walk-forward',
      trainPercent: 50,
      folds: 4,
      optimize: false,
      slippagePercent: SLIPPAGE_PERCENT,
    },
    assets,
    now
  );
}

const paint = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export function useQuantLoop(assets: Ref<BotAsset[]>, deps: QuantLoopDependencies) {
  const now = deps.now ?? Date.now;
  const wait = deps.wait ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const status = ref<QuantLoopStatus>('idle');
  const progress = shallowRef<QuantProgress | null>(null);
  const result = shallowRef<QuantLoopResult | null>(null);
  const fees = shallowRef<ResearchFeeSnapshot | null>(null);
  const signals = ref<Record<string, QuantSignal>>({});
  const error = ref('');
  let archive: QuantArchive | null = null;
  let generation = 0;
  let worker: Worker | null = null;
  // Live signals follow completed hours for as long as the page stays open.
  let signalTimer: ReturnType<typeof setTimeout> | undefined;
  let signalsAt = 0;
  let refreshing: Promise<void> | null = null;

  const stale = (version: number) => version !== generation;

  /** Wait until the eligible token list contains a market to quote. */
  async function waitForAsset(version: number, parsed: QuantArchive): Promise<BotAsset> {
    for (let attempt = 0; attempt < FEE_ATTEMPTS * 4; attempt++) {
      if (stale(version)) throw new Error('bots.errors.stale');
      const ranked = [...parsed.markets].sort((a, b) => b.medianXorDepth - a.medianXorDepth);
      const asset = ranked
        .map((market) => assets.value.find((item) => item.address === market.asset.address))
        .find(Boolean);
      if (asset && assets.value.some((item) => item.address === XOR.address)) return asset;
      await wait(1_000);
    }
    throw new Error('bots.errors.config');
  }

  /** Observe current fees from a finalized quote; the node may still be connecting. */
  async function observeFees(version: number, asset: BotAsset): Promise<ResearchFeeSnapshot> {
    let failure: unknown = new Error('bots.errors.quote');
    for (let attempt = 0; attempt < FEE_ATTEMPTS; attempt++) {
      if (stale(version)) throw new Error('bots.errors.stale');
      try {
        return await deps.loadFees(quantProbeBot(asset, assets.value, now()), { slippagePercent: SLIPPAGE_PERCENT });
      } catch (reason) {
        failure = reason;
        await wait(FEE_RETRY_MS);
      }
    }
    throw failure;
  }

  /** Run in a module worker when possible; any worker failure falls back to identical in-thread code. */
  async function compute(
    version: number,
    text: string,
    parsed: QuantArchive,
    costs: QuantCosts
  ): Promise<QuantLoopResult> {
    const fallback = () =>
      runQuantLoop(parsed, costs, {
        now: now(),
        onProgress: (value) => {
          if (!stale(version)) progress.value = value;
        },
        yieldControl: paint,
      });
    if (deps.workerFactory === null || (deps.workerFactory === undefined && typeof Worker === 'undefined'))
      return fallback();
    try {
      worker = deps.workerFactory
        ? deps.workerFactory()
        : new Worker(new URL('./quant-loop.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      return fallback();
    }
    const id = `quant-${version}`;
    const active = worker;
    try {
      return await new Promise<QuantLoopResult>((resolve, reject) => {
        active.onmessage = (event: MessageEvent<QuantWorkerResponse>) => {
          const message = event.data;
          if (!message || message.id !== id) return;
          if (message.type === 'progress') {
            if (!stale(version)) progress.value = message.progress;
          } else if (message.type === 'complete') resolve(message.result);
          else reject(new Error(message.error));
        };
        active.onerror = () => reject(new Error('worker'));
        active.postMessage({ id, archive: text, costs, now: now() } satisfies QuantWorkerRequest);
      });
    } catch (reason) {
      if (reason instanceof Error && reason.message === 'worker') return fallback();
      throw reason;
    } finally {
      active.terminate();
      if (worker === active) worker = null;
    }
  }

  /** Evaluate each selected rule on the latest closes; archived closes are a labelled fallback. */
  function refreshSignals(version = generation): Promise<void> {
    // Never overlap requests: a slow node must not stack refreshes during a long session.
    refreshing ??= evaluateSignals(version).finally(() => {
      refreshing = null;
      signalsAt = now();
    });
    return refreshing;
  }

  /** Re-evaluate shortly after each completed hour, once the indexer has published its close. */
  function scheduleSignals(): void {
    clearTimeout(signalTimer);
    const at = now();
    const next = Math.floor(at / HOUR) * HOUR + HOUR + SIGNAL_DELAY_MS;
    signalTimer = setTimeout(
      () => {
        void refreshSignals().finally(scheduleSignals);
      },
      Math.max(60_000, next - at)
    );
  }

  /** Throttled background tabs may miss an hour; catch up as soon as the page is visible again. */
  function onVisibility(): void {
    if (document.visibilityState === 'visible' && status.value === 'done' && now() - signalsAt >= HOUR)
      void refreshSignals();
  }

  async function evaluateSignals(version: number): Promise<void> {
    const current = result.value;
    if (!current || !archive) return;
    const next: Record<string, QuantSignal> = {};
    await Promise.all(
      current.markets.map(async (market) => {
        if (!market.final) return;
        const candidate = market.final.candidate;
        const asset = assets.value.find((item) => item.address === market.asset.address);
        if (asset) {
          try {
            const window = quantSignalWindow(candidate, now());
            const history = await deps.loadHistory(quantProbeBot(asset, assets.value, now()), {
              ...PLAYGROUND_DEFAULT_SETTINGS,
              assetInAddress: XOR.address,
              assetOutAddress: asset.address,
              historyStartAt: window.startAt,
              historyEndAt: window.endAt,
            });
            if (history.denominationVerified && history.candles.length) {
              next[market.asset.symbol] = evaluateQuantSignal(candidate, history.candles, 'live');
              return;
            }
          } catch {
            // Fall through to the dated archive evaluation below.
          }
        }
        const source = archive!.markets.find((item) => item.asset.address === market.asset.address);
        next[market.asset.symbol] = source
          ? evaluateQuantSignal(candidate, quantArchiveCandles(source.closeUnits, source.timestamps), 'archive')
          : { state: 'unavailable', observedAt: null, deviation: null, source: 'archive' };
      })
    );
    if (!stale(version)) signals.value = next;
  }

  /** Start (or reuse) a loop run. Safe to call repeatedly; a newer call supersedes older work. */
  async function start(): Promise<void> {
    const version = ++generation;
    error.value = '';
    try {
      status.value = 'loading';
      const text = await (deps.fetchArchive ?? fetchQuantArchiveText)();
      if (stale(version)) return;
      const parsed = parseQuantArchive(JSON.parse(text) as unknown);
      archive = parsed;
      status.value = 'fees';
      const asset = await waitForAsset(version, parsed);
      const observed = await observeFees(version, asset);
      if (stale(version)) return;
      fees.value = observed;
      const costs: QuantCosts = {
        networkFeeXor: observed.networkFeeXor,
        swapFeePercent: observed.swapFeePercent,
        slippagePercent: SLIPPAGE_PERCENT,
      };
      const key = JSON.stringify([parsed.generatedAt, parsed.genesisHash, costs]);
      let computed = cache.get(key);
      if (!computed) {
        status.value = 'running';
        computed = await compute(version, text, parsed, costs);
        if (stale(version)) return;
        cache.set(key, computed);
      }
      result.value = computed;
      status.value = 'done';
      await refreshSignals(version);
      if (!stale(version)) scheduleSignals();
    } catch (reason) {
      if (stale(version)) return;
      status.value = 'error';
      error.value =
        reason instanceof Error && /^bots\.errors\.[\w-]+$/.test(reason.message)
          ? reason.message
          : 'bots.errors.history';
    }
  }

  /** Cancel pending work without discarding a completed, cached result. */
  function dispose(): void {
    generation++;
    worker?.terminate();
    worker = null;
    clearTimeout(signalTimer);
    document.removeEventListener('visibilitychange', onVisibility);
  }
  document.addEventListener('visibilitychange', onVisibility);

  // Newly eligible assets can enable live signals for markets that fell back to the archive.
  watch(
    () => assets.value.length,
    (length, previous) => {
      if (status.value === 'done' && length > previous) void refreshSignals();
    }
  );
  onBeforeUnmount(dispose);

  return { status, progress, result, fees, signals, error, start, refreshSignals, dispose };
}

/** Clear cached results; tests use this to isolate runs. */
export function resetQuantLoopCache(): void {
  cache.clear();
}
