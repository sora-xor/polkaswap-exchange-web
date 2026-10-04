/**
 * Runs the Strategy Studio.
 *
 * Order: fetch the bundled archive (page-relative, so IPFS prefixes work), load it into a
 * module worker (or this thread when workers are unavailable), observe the current network
 * and pool fees from a finalized quote, then keep four views in step with the user's choice:
 * - `landscape`: a Tier 1 slice over the recipe's two axes, for the 3D landscape;
 * - `grid`: Tier 1 rows of the recipe's parameter grid, for the parallel view;
 * - `series`: chart lines plus a Tier 1 preview of the fills;
 * - `replay`: the exact replay behind every printed number.
 *
 * Each view keeps at most one job in flight and always answers the latest choice, so dragging
 * a threshold never queues stale work. Nothing here signs, saves or starts a bot.
 */
import { computed, onBeforeUnmount, reactive, ref, shallowRef, type Ref } from 'vue';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { parseQuantArchive, type QuantCosts } from './quant-loop';
import {
  createStudioEngine,
  decodeStudioLink,
  defaultStudioState,
  normalizeStudioState,
  studioGridValues,
  studioRecipe,
  type StudioArchiveInfo,
  type StudioEngine,
  type StudioGrid,
  type StudioJob,
  type StudioJobResult,
  type StudioJobType,
  type StudioLandscape,
  type StudioRecipeId,
  type StudioReplay,
  type StudioSeries,
  type StudioState,
} from './quant-studio';
import { fetchQuantArchiveText, quantProbeBot } from './useQuantLoop';
import type { StudioWorkerRequest, StudioWorkerResponse } from './quant-studio.worker';
import type { ResearchFeeSnapshot } from './research-fees';
import type { BotAsset, BotDefinition } from './types';

export type QuantStudioStatus = 'idle' | 'loading' | 'fees' | 'ready' | 'error';

export interface QuantStudioDependencies {
  loadFees: (bot: BotDefinition, settings: { slippagePercent: string }) => Promise<ResearchFeeSnapshot>;
  fetchArchive?: () => Promise<string>;
  /** `null` forces the in-thread engine; omitted uses a module worker when available. */
  workerFactory?: (() => Worker) | null;
  now?: () => number;
  wait?: (ms: number) => Promise<void>;
}

const SLIPPAGE_PERCENT = '0.5';
/** About two minutes of patience while a public node reconnects. */
const FEE_ATTEMPTS = 30;
const FEE_RETRY_MS = 4_000;
/** Exact numbers first, then the chart, then the slower Tier 1 views. Probes run separately. */
const JOB_ORDER: readonly Exclude<StudioJobType, 'probe'>[] = ['replay', 'series', 'landscape', 'grid'];
const PREFERRED_MARKET = 'PSWAP';
/** Rows per in-thread grid step before yielding a paint. */
const FALLBACK_GRID_CHUNK = 120;

const paint = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const errorCode = (reason: unknown) =>
  reason instanceof Error && /^bots\.errors\.[\w-]+$/.test(reason.message) ? reason.message : 'bots.errors.history';

export function useQuantStudio(assets: Ref<BotAsset[]>, deps: QuantStudioDependencies) {
  const now = deps.now ?? Date.now;
  const wait = deps.wait ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const status = ref<QuantStudioStatus>('idle');
  const error = ref('');
  /** Last failed job, if any; earlier views stay visible. */
  const jobError = ref('');
  const info = shallowRef<StudioArchiveInfo | null>(null);
  const fees = shallowRef<ResearchFeeSnapshot | null>(null);
  const market = ref('');
  const state = shallowRef<StudioState>(defaultStudioState());
  const landscape = shallowRef<StudioLandscape | null>(null);
  const grid = shallowRef<StudioGrid | null>(null);
  const series = shallowRef<StudioSeries | null>(null);
  const replay = shallowRef<StudioReplay | null>(null);
  const pending = reactive<Record<StudioJobType, boolean>>({
    landscape: false,
    grid: false,
    series: false,
    replay: false,
    probe: false,
  });
  /** Exact replay of a hovered choice, keyed by `probeKey`. */
  const probeResult = shallowRef<{ key: string; replay: StudioReplay } | null>(null);
  const costs = computed<QuantCosts | null>(() =>
    fees.value
      ? {
          networkFeeXor: fees.value.networkFeeXor,
          swapFeePercent: fees.value.swapFeePercent,
          slippagePercent: SLIPPAGE_PERCENT,
        }
      : null
  );

  let generation = 0;
  let worker: Worker | null = null;
  let engine: StudioEngine | null = null;
  /** In-thread engine after a worker failure; the archive is refetched from the HTTP cache. */
  let fallback: Promise<StudioEngine> | null = null;
  /** The archive text while the worker loads it, so a failure during loading needs no refetch. */
  let loadingText: string | null = null;
  let nextId = 0;
  const waiting = new Map<number, { resolve: (value: StudioWorkerResponse) => void; reject: (error: Error) => void }>();
  /** Key of the job currently in flight per view. */
  const inflight = new Map<StudioJobType, string>();
  /** Key of the result currently shown per view. */
  const applied = new Map<StudioJobType, string>();

  const stale = (version: number) => version !== generation;

  /** The job each view needs for the current choice, with a key that ignores irrelevant changes. */
  function desired(type: StudioJobType): { key: string; job: StudioJob } | null {
    if (status.value !== 'ready' || !costs.value || !market.value) return null;
    const current = state.value;
    const job: StudioJob = { type, market: market.value, state: current, costs: costs.value };
    let identity: unknown = current;
    if (type === 'landscape') {
      const [x, y] = studioRecipe(current.recipe).axes;
      identity = [current.recipe, { ...current.values, [x]: 0, [y]: 0 }];
    } else if (type === 'grid') identity = [current.recipe, studioGridValues(current)];
    return { key: JSON.stringify([type, market.value, identity, costs.value]), job };
  }

  function apply(result: StudioJobResult): void {
    if (result.type === 'landscape') landscape.value = result.landscape;
    else if (result.type === 'grid') grid.value = result.grid;
    else if (result.type === 'series') series.value = result.series;
    else if (result.type === 'replay') replay.value = result.replay;
  }

  /** Send any view whose shown or in-flight result is not for the current choice. */
  function refresh(): void {
    for (const type of JOB_ORDER) {
      const next = desired(type);
      if (!next || inflight.has(type) || applied.get(type) === next.key) continue;
      inflight.set(type, next.key);
      pending[type] = true;
      const version = generation;
      void execute(next.job).then(
        (result) => {
          if (stale(version)) return;
          inflight.delete(type);
          pending[type] = false;
          // Apply only answers that still match the choice; newer work is sent below.
          if (desired(type)?.key === next.key) {
            apply(result);
            applied.set(type, next.key);
            jobError.value = '';
          }
          refresh();
        },
        (reason) => {
          if (stale(version)) return;
          inflight.delete(type);
          pending[type] = false;
          applied.set(type, next.key);
          jobError.value = errorCode(reason);
          refresh();
        }
      );
    }
  }

  /** Run one job in the worker, or in this thread after a worker failure. */
  async function execute(job: StudioJob): Promise<StudioJobResult> {
    if (worker) {
      try {
        const response = await post({ id: ++nextId, type: 'job', job });
        if (response.type === 'result') return response.result;
        throw new Error(response.type === 'error' ? response.error : 'bots.errors.history');
      } catch (reason) {
        if (!(reason instanceof Error) || reason.message !== 'worker') throw reason;
        await useFallback();
      }
    }
    const active = engine ?? (fallback ? await fallback : null);
    if (!active) throw new Error('bots.errors.history');
    if (job.type !== 'grid') return active.run(job);
    const builder = active.grid(job);
    let result = builder.step(FALLBACK_GRID_CHUNK);
    while (!result) {
      await paint();
      result = builder.step(FALLBACK_GRID_CHUNK);
    }
    return { type: 'grid', grid: result };
  }

  function post(message: StudioWorkerRequest): Promise<StudioWorkerResponse> {
    const active = worker;
    if (!active) return Promise.reject(new Error('worker'));
    return new Promise((resolve, reject) => {
      waiting.set(message.id, { resolve, reject });
      try {
        active.postMessage(message);
      } catch {
        waiting.delete(message.id);
        reject(new Error('worker'));
      }
    });
  }

  /** Any worker failure moves every view to the identical in-thread engine. */
  function useFallback(text?: string): Promise<StudioEngine> {
    worker?.terminate();
    worker = null;
    for (const entry of waiting.values()) entry.reject(new Error('worker'));
    waiting.clear();
    fallback ??= engine
      ? Promise.resolve(engine)
      : Promise.resolve(text ?? loadingText ?? (deps.fetchArchive ?? fetchQuantArchiveText)()).then(
          (archive) => (engine = createStudioEngine(parseQuantArchive(JSON.parse(archive) as unknown)))
        );
    return fallback;
  }

  async function load(text: string): Promise<StudioArchiveInfo> {
    const inThread = () => {
      engine = createStudioEngine(parseQuantArchive(JSON.parse(text) as unknown));
      return engine.info;
    };
    if (deps.workerFactory === null || (deps.workerFactory === undefined && typeof Worker === 'undefined'))
      return inThread();
    try {
      worker = deps.workerFactory
        ? deps.workerFactory()
        : new Worker(new URL('./quant-studio.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      worker = null;
      return inThread();
    }
    worker.onmessage = (event: MessageEvent<StudioWorkerResponse>) => {
      const message = event.data;
      const entry = message && waiting.get(message.id);
      if (!entry) return;
      waiting.delete(message.id);
      entry.resolve(message);
    };
    worker.onerror = () => void useFallback().catch(() => undefined);
    loadingText = text;
    try {
      const response = await post({ id: ++nextId, type: 'load', archive: text });
      if (response.type === 'loaded') return response.info;
      throw new Error(response.type === 'error' ? response.error : 'bots.errors.history');
    } catch (reason) {
      if (reason instanceof Error && reason.message !== 'worker') throw reason;
      return (await useFallback(text)).info;
    } finally {
      loadingText = null;
    }
  }

  /** Wait until the eligible token list contains a studied market to quote. */
  async function waitForAsset(version: number, archive: StudioArchiveInfo): Promise<BotAsset> {
    for (let attempt = 0; attempt < FEE_ATTEMPTS * 4; attempt++) {
      if (stale(version)) throw new Error('bots.errors.stale');
      const ranked = archive.markets
        .filter((item) => item.tradable)
        .sort((a, b) => b.medianXorDepth - a.medianXorDepth);
      const asset = ranked.map((item) => assets.value.find((entry) => entry.address === item.address)).find(Boolean);
      if (asset && assets.value.some((entry) => entry.address === XOR.address)) return asset;
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

  /** Load the archive and fees once; safe to call repeatedly. */
  async function start(): Promise<void> {
    if (status.value === 'loading' || status.value === 'fees' || status.value === 'ready') return;
    const version = ++generation;
    error.value = '';
    try {
      status.value = 'loading';
      const text = await (deps.fetchArchive ?? fetchQuantArchiveText)();
      if (stale(version)) return;
      // The text is not kept: the worker or the engine holds the parsed archive.
      const loaded = await load(text);
      if (stale(version)) return;
      info.value = loaded;
      const tradable = loaded.markets.filter((item) => item.tradable);
      if (!tradable.length) throw new Error('bots.errors.history');
      if (!tradable.some((item) => item.symbol === market.value))
        market.value = (tradable.find((item) => item.symbol === PREFERRED_MARKET) ?? tradable[0]).symbol;
      status.value = 'fees';
      const observed = await observeFees(version, await waitForAsset(version, loaded));
      if (stale(version)) return;
      fees.value = observed;
      status.value = 'ready';
      refresh();
    } catch (reason) {
      if (stale(version)) return;
      status.value = 'error';
      error.value = errorCode(reason);
    }
  }

  /** Retry after an error, keeping the archive if it already loaded. */
  function retry(): void {
    if (status.value !== 'error') return;
    status.value = 'idle';
    void start();
  }

  function setMarket(symbol: string): void {
    if (!info.value?.markets.some((item) => item.symbol === symbol && item.tradable) || market.value === symbol) return;
    market.value = symbol;
    refresh();
  }

  /** Switch recipe at its defaults, keeping the chosen order size. */
  function setRecipe(id: StudioRecipeId): void {
    if (state.value.recipe === id) return;
    const next = defaultStudioState(id);
    state.value = normalizeStudioState({ recipe: id, values: { ...next.values, amount: state.value.values.amount } });
    refresh();
  }

  /** Change parameters; values snap to their grid and the views follow. */
  function setValues(values: Record<string, number>): void {
    const next = normalizeStudioState({ recipe: state.value.recipe, values: { ...state.value.values, ...values } });
    if (JSON.stringify(next) === JSON.stringify(state.value)) return;
    state.value = next;
    refresh();
  }

  /** Apply a deep link (for example from the strategy map); invalid links are ignored. */
  function applyLink(value: unknown): boolean {
    const decoded = decodeStudioLink(value);
    if (!decoded) return false;
    state.value = decoded.state;
    if (!info.value || info.value.markets.some((item) => item.symbol === decoded.market && item.tradable))
      market.value = decoded.market;
    refresh();
    return true;
  }

  let probeInflight = false;
  let probeWanted: { key: string; job: StudioJob } | null = null;

  /** Key identifying a hovered choice's exact replay. */
  function probeKey(target: StudioState): string {
    return JSON.stringify([market.value, normalizeStudioState(target), costs.value]);
  }

  /** Replay any choice exactly for a tooltip; only the latest request is answered. */
  function probe(target: StudioState | null): void {
    if (!target || status.value !== 'ready' || !costs.value || !market.value) {
      probeWanted = null;
      return;
    }
    const state = normalizeStudioState(target);
    const key = probeKey(state);
    if (probeResult.value?.key === key) return;
    probeWanted = { key, job: { type: 'probe', market: market.value, state, costs: costs.value } };
    void pumpProbe();
  }

  async function pumpProbe(): Promise<void> {
    if (probeInflight) return;
    while (probeWanted) {
      const next = probeWanted;
      probeWanted = null;
      probeInflight = true;
      pending.probe = true;
      const version = generation;
      let result: StudioJobResult | null = null;
      try {
        result = await execute(next.job);
      } catch {
        result = null;
      }
      if (stale(version)) return;
      probeInflight = false;
      pending.probe = false;
      if (result?.type === 'probe') probeResult.value = { key: next.key, replay: result.replay };
    }
  }

  /** Cancel pending work and release the worker; views stay as they are. */
  function dispose(): void {
    generation++;
    worker?.terminate();
    worker = null;
    for (const entry of waiting.values()) entry.reject(new Error('bots.errors.stale'));
    waiting.clear();
    inflight.clear();
    probeInflight = false;
    probeWanted = null;
    (Object.keys(pending) as StudioJobType[]).forEach((type) => (pending[type] = false));
    engine = null;
    fallback = null;
    if (status.value !== 'ready') status.value = 'idle';
  }
  onBeforeUnmount(dispose);

  return {
    status,
    error,
    jobError,
    info,
    fees,
    costs,
    market,
    state,
    landscape,
    grid,
    series,
    replay,
    pending,
    probeResult,
    probeKey,
    probe,
    start,
    retry,
    setMarket,
    setRecipe,
    setValues,
    applyLink,
    dispose,
  };
}
