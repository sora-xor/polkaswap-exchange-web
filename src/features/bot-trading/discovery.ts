import { FPNumber } from '@/lib/substrate/math';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { toCodec } from './amounts';
import { parseDeterministicStrategy } from './ai';
import { isAiProviderFailure, providerErrorMessage, type AiProviderFailure } from './ai-provider-http';
import { copyStrategyConfig } from './engine';
import { makeExperimentSnapshot } from './experiments';
import {
  compareResearchResult,
  createResearchBot,
  RESEARCH_DEFAULT_SETTINGS,
  runResearchAsync,
  type ResearchResult,
  type ResearchSettings,
} from './research';
import { assertExperimentEvidence } from './research-runner';
import type { ResearchFeeSnapshot } from './research-fees';
import { copyDiscoveryCheckpoint, createIndexedDbDiscoveryStore, type DiscoveryStore } from './discovery-storage';
import type { DiscoveryProviderKind } from './discovery-provider';
import type { BotAsset, BotCandle, BotDefinition, BotHistory, BotResearchSnapshot, StrategyConfig } from './types';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const TRAINING_DAYS = 76;
const HOLDOUT_DAYS = 14;
const MAX_CALLS = 36;
const DEFAULT_CALLS = 12;
const MAX_FINALISTS = 3;
const MAX_CONTEXT_CANDLES = 202;
const MIN_TRAINING_TRADES = 10;
const MIN_HOLDOUT_TRADES = 5;

/** One frozen, directed market. Missing evidence remains visible with its cause. */
export interface DiscoveryPair {
  key: string;
  assetInAddress: string;
  assetOutAddress: string;
  status: 'pending' | 'ready' | 'skipped';
  reason?: 'incompleteHistory' | 'denomination' | 'routeUnavailable' | 'amount' | 'historyChanged';
  coverage?: number;
  historyFingerprint?: string;
  historyIdentity?: NonNullable<BotHistory['identity']>;
}

/** Period metrics use exact replay values and a same-period after-cost passive entry. */
export interface DiscoveryMetrics {
  returnPercent: string;
  excessReturnPercent: string | null;
  benchmarkReturnPercent: string | null;
  drawdownPercent: string;
  trades: number;
  coverage: number;
  startAt: number;
  endAt: number;
}

/** A frozen rule proposal; only qualified candidates include reviewable live inputs. */
export interface DiscoveryCandidate {
  id: string;
  pairKey: string;
  callNumber: number;
  status: 'training' | 'qualified' | 'rejected' | 'exploratory';
  strategy: StrategyConfig;
  settings: ResearchSettings;
  fees: ResearchFeeSnapshot;
  historyFingerprint: string;
  training: DiscoveryMetrics;
  holdout?: DiscoveryMetrics;
  holdoutState?: 'sealed' | 'exposed' | 'complete';
  reason?:
    | 'trainingGate'
    | 'holdoutGate'
    | 'duplicate'
    | 'interrupted'
    | 'historyChanged'
    | 'feedbackInformed'
    | 'holdoutReused';
  template?: BotDefinition;
  research?: BotResearchSnapshot;
  historyIdentity?: NonNullable<BotHistory['identity']>;
}

export type DiscoveryFinalist = DiscoveryCandidate & {
  status: 'qualified';
  holdout: DiscoveryMetrics;
  template: BotDefinition;
  research: BotResearchSnapshot;
  historyIdentity: NonNullable<BotHistory['identity']>;
};

/** Display-only provenance for a research run; never a connection or credential. */
export interface DiscoveryProviderProvenance {
  kind: DiscoveryProviderKind;
  model?: string;
  /** Canonical HTTPS host, with an optional port, for a custom adapter. No path, query, or credentials. */
  endpointHost?: string;
}

/** The currently active pair and evidence step. This contains no provider input or output. */
export interface DiscoveryResearchProgress {
  pairKey: string;
  stage: 'evidence' | 'cooldown' | 'request' | 'training' | 'holdout';
}

/** Durable public research checkpoint. Provider credentials and signing authority are never fields here. */
export interface DiscoverySession {
  version: 1;
  /** Monotonic checkpoint revision used for atomic cross-tab dispatch fencing. */
  revision: number;
  id: string;
  createdAt: number;
  updatedAt: number;
  status: 'created' | 'scanning' | 'researching' | 'finalizing' | 'paused' | 'complete' | 'error';
  phase: 'scanning' | 'researching' | 'finalizing' | 'complete';
  /** Optional for checkpoints created before provider provenance was introduced. */
  provider?: DiscoveryProviderProvenance;
  researchProgress?: DiscoveryResearchProgress;
  idea: string;
  callCap: number;
  callsUsed: number;
  /** Persisted dispatch time enforces the shared provider cooldown across reloads. */
  lastDispatchAt?: number;
  roundCursor: number;
  capital: string;
  feeBudgetXor: string;
  maxDrawdownPercent: string;
  window: { startAt: number; trainingEndAt: number; holdoutStartAt: number; endAt: number };
  assets: BotAsset[];
  pairs: DiscoveryPair[];
  candidates: DiscoveryCandidate[];
  finalists: DiscoveryFinalist[];
  selectedIds: string[];
  holdoutFrozenAt?: number;
  failedCalls: number;
  /** Feedback-informed runs are exploratory and cannot certify a reused holdout. */
  feedbackExploratory: boolean;
  /** A prior session already exposed an overlapping holdout interval. */
  holdoutReuse: boolean;
  liveFeedback?: DiscoveryLiveFeedback;
  /** A stopped run keeps a specific AI connection failure (for example a rejected key) when one is known. */
  error?:
    | 'bots.errors.stale'
    | 'bots.errors.provider'
    | 'bots.errors.history'
    | 'bots.errors.storage'
    | AiProviderFailure;
}

/** Training-only request. The provider never receives holdout candles, wallet data, or live transactions. */
export interface DiscoveryDraftContext {
  requestId: string;
  idea: string;
  pair: { assetIn: BotAsset; assetOut: BotAsset };
  training: { from: number; to: number; candles: BotCandle[] };
  constraints: {
    capital: string;
    maxTradeCodec: string;
    /** Current fee scenario is observed at this modest input-token notional, then re-quoted for each draft. */
    feeSampleAmount: string;
    minimumIntervalMs: number;
    maximumIntervalMs: number;
    slippagePercent: string;
    feeBudgetXor: string;
    networkFeeXor: string;
    swapFeePercent: string;
    sellNetworkFeeXor: string;
    sellSwapFeePercent: string;
    priceImpactPercent: string;
    sellPriceImpactPercent: string;
  };
  priorResults?: Array<{
    returnPercent: string;
    excessReturnPercent: string | null;
    drawdownPercent: string;
    trades: number;
  }>;
  liveFeedback?: Omit<DiscoveryLiveFeedback, 'pairKey'> & { windowState: 'exploratory' };
}

/** Consent-scoped aggregate from a previous campaign; no account or transaction identifiers. */
export interface DiscoveryLiveFeedback {
  pairKey: string;
  activeHours: number;
  successfulSwaps: number;
  netReturnPercent: string;
  excessReturnPercent: string;
  drawdownPercent: string;
  feesPaidXor: string;
}

/** Any adapter, including local CLIs, is restricted to proposing one structured strategy per request. */
export interface DiscoveryProvider {
  suggest(context: DiscoveryDraftContext, signal: AbortSignal): Promise<{ requestId: string; strategy: unknown }>;
  pair?(code: string, signal: AbortSignal): Promise<void>;
  disconnect(): void;
}

export interface DiscoveryOptions {
  provider?: DiscoveryProviderProvenance;
  idea?: string;
  callCap?: number;
  capital?: string;
  feeBudgetXor?: string;
  maxDrawdownPercent?: string;
  shareLiveFeedback?: boolean;
  liveFeedback?: DiscoveryLiveFeedback;
}

/** Earliest possible next AI dispatch; local evaluation can take longer than this cooldown. */
export function discoveryNextRequestAt(session: DiscoverySession, at = Date.now(), cooldownMs = 60_000): number | null {
  if (
    session.phase !== 'researching' ||
    session.callsUsed >= session.callCap ||
    !session.pairs.some((pair) => pair.status === 'ready') ||
    session.lastDispatchAt === undefined ||
    cooldownMs === 0
  )
    return null;
  const nextAt = session.lastDispatchAt + cooldownMs;
  return nextAt > at ? nextAt : null;
}

export interface DiscoveryDependencies {
  assets: BotAsset[];
  loadHistory: (bot: BotDefinition, settings: ResearchSettings) => Promise<BotHistory>;
  loadFees: (bot: BotDefinition, settings: ResearchSettings) => Promise<ResearchFeeSnapshot>;
  provider: DiscoveryProvider;
  store?: DiscoveryStore;
  now?: () => number;
  onUpdate?: (session: DiscoverySession) => void;
  /** Replace only in focused tests; production always uses the deterministic replay. */
  evaluate?: typeof runResearchAsync;
  /** Tests may shorten the provider cooldown without changing production behavior. */
  cooldownMs?: number;
}

const copy = <T>(value: T): T => structuredClone(value);
const finitePercent = (value: string) => new FPNumber(value, 36);
const interrupted = () => new Error('bots.errors.stale');

/** Stop waiting on an external request immediately; late responses cannot publish into a paused run. */
function abortable<T>(request: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (value: T | unknown, failed: boolean) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', abort);
      if (failed) reject(value);
      else resolve(value as T);
    };
    const abort = () => finish(interrupted(), true);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    request.then(
      (value) => finish(value, false),
      (error) => finish(error, true)
    );
  });
}

class IncompleteDiscoveryHistory extends Error {
  constructor(
    readonly coverage: number,
    message = 'bots.errors.history'
  ) {
    super(message);
  }
}

/** Freeze every directed pair in stable order without ever deriving markets from a provider response. */
export function createDiscoveryUniverse(assets: BotAsset[]): DiscoveryPair[] {
  if (!Array.isArray(assets) || assets.length < 2 || assets.length > 10_000) throw new Error('bots.errors.config');
  const seen = new Set<string>();
  for (const asset of assets) {
    if (
      !asset ||
      typeof asset.address !== 'string' ||
      !/^[a-zA-Z0-9:_-]{1,100}$/.test(asset.address) ||
      seen.has(asset.address) ||
      !asset.symbol ||
      asset.symbol.length > 20 ||
      !Number.isSafeInteger(asset.decimals) ||
      asset.decimals < 0 ||
      asset.decimals > 36
    )
      throw new Error('bots.errors.config');
    seen.add(asset.address);
  }
  const pairs: DiscoveryPair[] = [];
  for (const input of assets)
    for (const output of assets) {
      if (input.address === output.address) continue;
      pairs.push({
        key: `${input.address}>${output.address}`,
        assetInAddress: input.address,
        assetOutAddress: output.address,
        status: 'pending',
      });
    }
  return pairs;
}

/** Use one common 90-day observation window and reserve its last 14 days before any AI request. */
export function createDiscoveryWindow(now: number): DiscoverySession['window'] {
  if (!Number.isSafeInteger(now) || now < 90 * DAY) throw new Error('bots.errors.config');
  const endAt = Math.floor(now / HOUR) * HOUR;
  return {
    startAt: endAt - (TRAINING_DAYS + HOLDOUT_DAYS) * DAY,
    trainingEndAt: endAt - HOLDOUT_DAYS * DAY,
    holdoutStartAt: endAt - HOLDOUT_DAYS * DAY + HOUR,
    endAt,
  };
}

/** An incomplete or shifted history is a skip, never a silently shortened backtest. */
export function completeDiscoveryHistory(history: BotHistory, startAt: number, endAt: number): boolean {
  const count = (endAt - startAt) / HOUR;
  return Boolean(
    history.denominationVerified &&
    history.identity &&
    history.missing === 0 &&
    Number.isSafeInteger(count) &&
    count > 0 &&
    history.candles.length === count &&
    history.candles.every((candle, index) => candle.timestamp === startAt + (index + 1) * HOUR)
  );
}

/** Count only distinct completed hours aligned to the frozen window. */
export function discoveryHistoryCoverage(history: BotHistory, startAt: number, endAt: number): number {
  const expected = (endAt - startAt) / HOUR;
  if (!Number.isSafeInteger(expected) || expected <= 0 || !Array.isArray(history.candles)) return 0;
  const covered = new Set<number>();
  for (const candle of history.candles) {
    if (
      Number.isSafeInteger(candle.timestamp) &&
      candle.timestamp > startAt &&
      candle.timestamp <= endAt &&
      (candle.timestamp - startAt) % HOUR === 0
    )
      covered.add(candle.timestamp);
  }
  return covered.size / expected;
}

/** A content digest binds resumed work to the original verified prices and chain denomination. */
export async function fingerprintDiscoveryHistory(history: BotHistory): Promise<string> {
  const payload = JSON.stringify([history.identity, history.candles]);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Rank with exact decimal comparisons across excess return, return, activity and drawdown. */
export function rankDiscoveryCandidates(candidates: DiscoveryCandidate[]): DiscoveryCandidate[] {
  return [...candidates].sort((left, right) => {
    const a = finitePercent(left.training.excessReturnPercent ?? '-1000000000');
    const b = finitePercent(right.training.excessReturnPercent ?? '-1000000000');
    if (!a.eq(b)) return b.gt(a) ? 1 : -1;
    const ar = finitePercent(left.training.returnPercent);
    const br = finitePercent(right.training.returnPercent);
    if (!ar.eq(br)) return br.gt(ar) ? 1 : -1;
    if (left.training.trades !== right.training.trades) return right.training.trades - left.training.trades;
    const ad = finitePercent(left.training.drawdownPercent);
    const bd = finitePercent(right.training.drawdownPercent);
    if (!ad.eq(bd)) return ad.lt(bd) ? -1 : 1;
    return left.id.localeCompare(right.id);
  });
}

/** A trial must be profitable after modeled costs, beat holding, and actually trade. */
export function passesDiscoveryGate(
  metrics: DiscoveryMetrics,
  maxDrawdownPercent: string,
  minimumTrades: number
): boolean {
  return (
    metrics.coverage === 1 &&
    metrics.trades >= minimumTrades &&
    finitePercent(metrics.returnPercent).gt(finitePercent('0')) &&
    metrics.excessReturnPercent !== null &&
    finitePercent(metrics.excessReturnPercent).gt(finitePercent('0')) &&
    finitePercent(metrics.drawdownPercent).lte(finitePercent(maxDrawdownPercent))
  );
}

function settingsFor(
  session: DiscoverySession,
  pair: DiscoveryPair,
  startAt = session.window.startAt,
  endAt = session.window.endAt,
  strategy?: StrategyConfig
): ResearchSettings {
  return {
    ...RESEARCH_DEFAULT_SETTINGS,
    preset: strategy?.kind === 'rules' ? 'dca' : ((strategy?.kind ?? 'dca') as ResearchSettings['preset']),
    capital: session.capital,
    tradePercent: 50,
    feeBudgetXor: session.feeBudgetXor,
    days: 90,
    historyStartAt: startAt,
    historyEndAt: endAt,
    assetInAddress: pair.assetInAddress,
    assetOutAddress: pair.assetOutAddress,
    validation: 'none',
    optimize: false,
  };
}

function withFees(settings: ResearchSettings, fees: ResearchFeeSnapshot): ResearchSettings {
  return {
    ...settings,
    networkFeeXor: fees.networkFeeXor,
    swapFeePercent: fees.swapFeePercent,
    sellNetworkFeeXor: fees.sellNetworkFeeXor,
    sellSwapFeePercent: fees.sellSwapFeePercent,
    priceImpactPercent: fees.priceImpactPercent,
    sellPriceImpactPercent: fees.sellPriceImpactPercent,
  };
}

function metrics(result: ResearchResult, warmupCandles = 0): DiscoveryMetrics {
  const comparable = compareResearchResult(result, warmupCandles);
  const candles = result.source.history.candles;
  return {
    returnPercent: result.result.returnPercent,
    excessReturnPercent: comparable.excessReturnPercent,
    benchmarkReturnPercent: comparable.benchmark?.returnPercent ?? null,
    drawdownPercent: result.result.drawdownPercent,
    trades: result.result.trades,
    coverage: result.result.coverage,
    startAt: candles[0].timestamp,
    endAt: candles.at(-1)!.timestamp,
  };
}

function historySlice(history: BotHistory, from: number, to: number): BotHistory {
  return {
    ...history,
    candles: history.candles.filter((candle) => candle.timestamp >= from && candle.timestamp <= to),
  };
}

function skipReason(error: unknown): DiscoveryPair['reason'] {
  const message = error instanceof Error ? error.message : '';
  if (message === 'bots.errors.denomination') return 'denomination';
  if (message === 'bots.errors.amount' || message === 'bots.errors.config') return 'amount';
  if (message === 'bots.errors.quote' || message === 'bots.errors.fee') return 'routeUnavailable';
  return 'incompleteHistory';
}

function isEvidenceSkip(error: unknown): boolean {
  if (error instanceof IncompleteDiscoveryHistory) return true;
  if (!(error instanceof Error)) return false;
  return [
    'historyChanged',
    'bots.errors.denomination',
    'bots.errors.amount',
    'bots.errors.config',
    'bots.errors.quote',
    'bots.errors.fee',
  ].includes(error.message);
}

/** A browser-local engine never grants wallet authority; its checkpoints contain public research only. */
export function createDiscoveryEngine(deps: DiscoveryDependencies) {
  const now = deps.now ?? Date.now;
  const evaluate = deps.evaluate ?? runResearchAsync;
  const store = deps.store ?? createIndexedDbDiscoveryStore();
  const cooldownMs = deps.cooldownMs ?? 60_000;
  if (!Number.isSafeInteger(cooldownMs) || cooldownMs < 0) throw new Error('bots.errors.config');
  const assets = deps.assets.map((asset) => ({ ...asset }));
  let session: DiscoverySession | null = null;
  let running: Promise<DiscoverySession> | null = null;
  let controller: AbortController | null = null;
  let generation = 0;
  let disposed = false;
  let saveQueue: Promise<void> = Promise.resolve();
  let persistedRevision = 0;
  let checkpointFenced = false;
  const historyCache = new Map<string, BotHistory>();
  const snapshot = () => {
    if (!session) throw new Error('bots.errors.config');
    return copy(session);
  };
  const publish = () => deps.onUpdate?.(snapshot());
  const persist = async (): Promise<void> => {
    saveQueue = saveQueue
      .catch(() => undefined)
      .then(async () => {
        if (!session || checkpointFenced) throw new Error('bots.errors.storage');
        session.revision = persistedRevision + 1;
        try {
          await store.save(snapshot());
          persistedRevision = session.revision;
        } catch {
          checkpointFenced = true;
          throw new Error('bots.errors.storage');
        }
      });
    await saveQueue;
  };
  const update = async (): Promise<void> => {
    if (!session) return;
    session.updatedAt = now();
    await persist();
    publish();
  };
  const assertActive = (signal: AbortSignal, version: number) => {
    if (signal.aborted || disposed || version !== generation) throw interrupted();
  };
  const waitForCallSlot = async (signal: AbortSignal, version: number): Promise<void> => {
    if (!session?.lastDispatchAt || cooldownMs === 0) return;
    const remaining = session.lastDispatchAt + cooldownMs - now();
    if (remaining <= 0) return;
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(interrupted());
      };
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', abort);
        resolve();
      }, remaining);
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort();
    });
    assertActive(signal, version);
  };
  const lookup = (pair: DiscoveryPair) => {
    const assetIn = assets.find((asset) => asset.address === pair.assetInAddress);
    const assetOut = assets.find((asset) => asset.address === pair.assetOutAddress);
    if (!assetIn || !assetOut) throw new Error('bots.errors.config');
    return { assetIn, assetOut };
  };
  const loadPair = async (pair: DiscoveryPair, signal: AbortSignal, version: number): Promise<BotHistory> => {
    assertActive(signal, version);
    const cached = historyCache.get(pair.key);
    if (cached) return copy(cached);
    const current = session;
    if (!current) throw new Error('bots.errors.config');
    const settings = settingsFor(current, pair);
    const bot = createResearchBot(settings, assets, now());
    const history = await abortable(deps.loadHistory(bot, settings), signal);
    assertActive(signal, version);
    if (!completeDiscoveryHistory(history, current.window.startAt, current.window.endAt))
      throw new IncompleteDiscoveryHistory(
        discoveryHistoryCoverage(history, current.window.startAt, current.window.endAt),
        !history.denominationVerified ? 'bots.errors.denomination' : 'bots.errors.history'
      );
    const fingerprint = await fingerprintDiscoveryHistory(history);
    assertActive(signal, version);
    if (pair.historyFingerprint && pair.historyFingerprint !== fingerprint) throw new Error('historyChanged');
    if (pair.historyIdentity && JSON.stringify(pair.historyIdentity) !== JSON.stringify(history.identity))
      throw new Error('historyChanged');
    if (historyCache.size >= 3) historyCache.delete(historyCache.keys().next().value!);
    historyCache.set(pair.key, copy(history));
    return history;
  };
  const scan = async (signal: AbortSignal, version: number): Promise<void> => {
    if (!session) throw new Error('bots.errors.config');
    session.status = 'scanning';
    delete session.researchProgress;
    publish();
    let next = 0;
    let completed = 0;
    const lane = async () => {
      while (session && next < session.pairs.length) {
        assertActive(signal, version);
        const pair = session.pairs[next++];
        if (pair.status !== 'pending') continue;
        try {
          const settings = { ...settingsFor(session, pair), tradePercent: 1 };
          const bot = createResearchBot(settings, assets, now());
          const history = await loadPair(pair, signal, version);
          const fees = await abortable(deps.loadFees(bot, settings), signal);
          assertActive(signal, version);
          assertExperimentEvidence(bot, history, fees, now());
          pair.status = 'ready';
          pair.coverage = 1;
          pair.historyIdentity = copy(history.identity!);
          pair.historyFingerprint = await fingerprintDiscoveryHistory(history);
        } catch (error) {
          assertActive(signal, version);
          if (!isEvidenceSkip(error)) throw error;
          pair.status = 'skipped';
          pair.reason =
            error instanceof Error && error.message === 'historyChanged' ? 'historyChanged' : skipReason(error);
          pair.coverage = error instanceof IncompleteDiscoveryHistory ? error.coverage : 0;
        }
        completed++;
        if (completed % 8 === 0) await update();
      }
    };
    await Promise.all([lane(), lane()]);
    assertActive(signal, version);
    session.phase = 'researching';
    session.status = 'researching';
    await update();
  };
  const nextPair = (): DiscoveryPair | undefined => {
    if (!session) return;
    for (let offset = 0; offset < session.pairs.length; offset++) {
      const index = (session.roundCursor + offset) % session.pairs.length;
      if (session.pairs[index].status !== 'ready') continue;
      session.roundCursor = (index + 1) % session.pairs.length;
      return session.pairs[index];
    }
  };
  const draft = async (signal: AbortSignal, version: number): Promise<void> => {
    if (!session || session.callsUsed >= session.callCap) return;
    const pair = nextPair();
    if (!pair) return;
    session.researchProgress = { pairKey: pair.key, stage: 'evidence' };
    await update();
    const { assetIn, assetOut } = lookup(pair);
    let history: BotHistory;
    try {
      history = await loadPair(pair, signal, version);
    } catch (error) {
      assertActive(signal, version);
      if (!isEvidenceSkip(error)) throw error;
      pair.status = 'skipped';
      pair.reason = error instanceof Error && error.message === 'historyChanged' ? 'historyChanged' : skipReason(error);
      for (const candidate of session.candidates)
        if (candidate.pairKey === pair.key) {
          candidate.status = 'exploratory';
          candidate.reason = 'historyChanged';
        }
      delete session.researchProgress;
      await update();
      return;
    }
    const settings = settingsFor(session, pair);
    const bot = createResearchBot(settings, assets, now());
    const sampleSettings = { ...settings, tradePercent: 1 };
    const sampleBot = createResearchBot(sampleSettings, assets, now());
    const sampleFees = await abortable(deps.loadFees(sampleBot, sampleSettings), signal);
    assertActive(signal, version);
    assertExperimentEvidence(sampleBot, history, sampleFees, now());
    const trainingCandles = history.candles.filter((candle) => candle.timestamp <= session!.window.trainingEndAt);
    if (trainingCandles.length !== TRAINING_DAYS * 24) throw new Error('bots.errors.history');
    const visible = trainingCandles.slice(-MAX_CONTEXT_CANDLES).map((candle) => ({ ...candle }));
    const priorResults = session.candidates
      .filter((candidate) => candidate.pairKey === pair.key)
      .slice(-8)
      .map((candidate) => ({
        returnPercent: candidate.training.returnPercent,
        excessReturnPercent: candidate.training.excessReturnPercent,
        drawdownPercent: candidate.training.drawdownPercent,
        trades: candidate.training.trades,
      }));
    const requestId = crypto.randomUUID();
    const context: DiscoveryDraftContext = {
      requestId,
      idea: session.idea,
      pair: { assetIn: { ...assetIn }, assetOut: { ...assetOut } },
      training: { from: visible[0].timestamp, to: visible.at(-1)!.timestamp, candles: visible },
      constraints: {
        capital: session.capital,
        maxTradeCodec: bot.policy.maxTradeCodec[bot.assetIn.address],
        feeSampleAmount: sampleBot.strategy.amount,
        minimumIntervalMs: HOUR,
        maximumIntervalMs: 2_592_000_000,
        slippagePercent: settings.slippagePercent,
        feeBudgetXor: session.feeBudgetXor,
        networkFeeXor: sampleFees.networkFeeXor,
        swapFeePercent: sampleFees.swapFeePercent,
        sellNetworkFeeXor: sampleFees.sellNetworkFeeXor,
        sellSwapFeePercent: sampleFees.sellSwapFeePercent,
        priceImpactPercent: sampleFees.priceImpactPercent,
        sellPriceImpactPercent: sampleFees.sellPriceImpactPercent,
      },
      ...(priorResults.length ? { priorResults } : {}),
      ...(session.feedbackExploratory && session.liveFeedback?.pairKey === pair.key
        ? {
            liveFeedback: {
              windowState: 'exploratory' as const,
              activeHours: session.liveFeedback.activeHours,
              successfulSwaps: session.liveFeedback.successfulSwaps,
              netReturnPercent: session.liveFeedback.netReturnPercent,
              excessReturnPercent: session.liveFeedback.excessReturnPercent,
              drawdownPercent: session.liveFeedback.drawdownPercent,
              feesPaidXor: session.liveFeedback.feesPaidXor,
            },
          }
        : {}),
    };
    if (discoveryNextRequestAt(session, now(), cooldownMs) !== null) {
      session.researchProgress.stage = 'cooldown';
      await update();
    }
    await waitForCallSlot(signal, version);
    assertActive(signal, version);
    // Persist the dispatch before invoking a paid or subscription-backed provider. Retries also consume the cap.
    session.researchProgress.stage = 'request';
    session.callsUsed++;
    session.lastDispatchAt = now();
    await update();
    let providerPending = true;
    try {
      const proposed = await abortable(deps.provider.suggest(context, signal), signal);
      providerPending = false;
      assertActive(signal, version);
      if (proposed.requestId !== requestId) throw new Error('bots.errors.provider');
      const strategy = parseDeterministicStrategy(proposed.strategy, bot);
      if (strategy.intervalMs < HOUR || strategy.signalTiming === 'live-price' || strategy.prompt !== '')
        throw new Error('bots.errors.proposal');
      const key = JSON.stringify([pair.key, strategy]);
      if (session.candidates.some((candidate) => JSON.stringify([candidate.pairKey, candidate.strategy]) === key))
        throw new Error('duplicate');
      session.researchProgress.stage = 'training';
      await update();
      const candidateSettings = settingsFor(
        session,
        pair,
        session.window.startAt,
        session.window.trainingEndAt,
        strategy
      );
      const candidateBot = createResearchBot(candidateSettings, assets, now(), strategy);
      const fees = await abortable(deps.loadFees(candidateBot, candidateSettings), signal);
      assertActive(signal, version);
      assertExperimentEvidence(candidateBot, history, fees, now());
      const pricedSettings = withFees(candidateSettings, fees);
      const training = await abortable(
        evaluate(
          pricedSettings,
          assets,
          {
            kind: 'historical',
            history: historySlice(history, session.window.startAt + HOUR, session.window.trainingEndAt),
          },
          now(),
          { strategy, signal }
        ),
        signal
      );
      assertActive(signal, version);
      const trainingMetrics = metrics(training);
      const passed = passesDiscoveryGate(trainingMetrics, session.maxDrawdownPercent, MIN_TRAINING_TRADES);
      session.candidates.push({
        id: `${session.id}-c${session.callsUsed}`,
        pairKey: pair.key,
        callNumber: session.callsUsed,
        status: passed ? 'training' : 'rejected',
        strategy: copyStrategyConfig(strategy),
        settings: pricedSettings,
        fees: copy(fees),
        historyFingerprint: pair.historyFingerprint!,
        training: trainingMetrics,
        ...(!passed ? { reason: 'trainingGate' as const } : {}),
      });
    } catch (error) {
      assertActive(signal, version);
      session.failedCalls++;
      if (providerPending) {
        delete session.researchProgress;
        await update();
        throw new Error(providerErrorMessage(error));
      }
      if (error instanceof Error && error.message === 'duplicate') {
        // A duplicate has consumed a real provider call but adds no misleading study.
      } else if (error instanceof Error && error.message === 'bots.errors.stale') {
        throw error;
      }
    }
    delete session.researchProgress;
    await update();
  };
  const finalize = async (signal: AbortSignal, version: number): Promise<void> => {
    if (!session) throw new Error('bots.errors.config');
    delete session.researchProgress;
    session.phase = 'finalizing';
    session.status = 'finalizing';
    if (session.feedbackExploratory) {
      // A feedback-informed search cannot claim its historical holdout was untouched.
      session.selectedIds = rankDiscoveryCandidates(
        session.candidates.filter((candidate) => candidate.status === 'training')
      )
        .slice(0, MAX_FINALISTS)
        .map((candidate) => candidate.id);
      for (const candidate of session.candidates)
        if (session.selectedIds.includes(candidate.id)) {
          candidate.status = 'exploratory';
          candidate.reason = 'feedbackInformed';
        }
      session.finalists = [];
      session.phase = 'complete';
      session.status = 'complete';
      await update();
      return;
    }
    if (session.holdoutFrozenAt === undefined) {
      session.selectedIds = rankDiscoveryCandidates(
        session.candidates.filter((candidate) => candidate.status === 'training')
      )
        .slice(0, MAX_FINALISTS)
        .map((candidate) => candidate.id);
      for (const candidate of session.candidates)
        if (session.selectedIds.includes(candidate.id)) candidate.holdoutState = 'sealed';
      session.holdoutFrozenAt = now();
      await update();
    }
    for (const id of session.selectedIds) {
      assertActive(signal, version);
      const candidate = session.candidates.find((item) => item.id === id);
      if (!candidate || candidate.holdoutState === 'complete' || candidate.status === 'exploratory') continue;
      session.researchProgress = { pairKey: candidate.pairKey, stage: 'holdout' };
      await update();
      if (candidate.holdoutState === 'exposed') {
        candidate.status = 'exploratory';
        candidate.reason = 'interrupted';
        await update();
        continue;
      }
      const pair = session.pairs.find((item) => item.key === candidate.pairKey);
      if (!pair || pair.status !== 'ready') {
        candidate.status = 'exploratory';
        candidate.reason = 'historyChanged';
        await update();
        continue;
      }
      let history: BotHistory;
      try {
        history = await loadPair(pair, signal, version);
      } catch (error) {
        assertActive(signal, version);
        if (!isEvidenceSkip(error)) throw error;
        candidate.status = 'exploratory';
        candidate.reason = 'historyChanged';
        await update();
        continue;
      }
      if ((await fingerprintDiscoveryHistory(history)) !== candidate.historyFingerprint) {
        candidate.status = 'exploratory';
        candidate.reason = 'historyChanged';
        await update();
        continue;
      }
      const reservation = await store.reserveHoldout({
        sessionId: session.id,
        candidateId: candidate.id,
        startAt: session.window.holdoutStartAt,
        endAt: session.window.endAt,
        reservedAt: now(),
        checkpointRevision: session.revision,
      });
      assertActive(signal, version);
      if (reservation === 'overlap') {
        session.holdoutReuse = true;
        for (const selected of session.candidates)
          if (session.selectedIds.includes(selected.id)) {
            selected.status = 'exploratory';
            selected.reason = 'holdoutReused';
          }
        session.finalists = [];
        session.phase = 'complete';
        session.status = 'complete';
        delete session.researchProgress;
        await update();
        return;
      }
      if (reservation === 'alreadyReserved') {
        candidate.status = 'exploratory';
        candidate.reason = 'interrupted';
        candidate.holdoutState = 'exposed';
        await update();
        continue;
      }
      candidate.holdoutState = 'exposed';
      await update();
      try {
        const holdoutHistory = historySlice(history, session.window.holdoutStartAt, session.window.endAt);
        const warmup = history.candles
          .filter((candle) => candle.timestamp < session!.window.holdoutStartAt)
          .slice(-201);
        const holdoutSettings = {
          ...candidate.settings,
          historyStartAt: session.window.holdoutStartAt,
          historyEndAt: session.window.endAt,
        };
        const holdout = await abortable(
          evaluate(holdoutSettings, assets, { kind: 'historical', history: holdoutHistory }, now(), {
            strategy: candidate.strategy,
            warmupCandles: warmup,
            signal,
          }),
          signal
        );
        assertActive(signal, version);
        candidate.holdout = metrics(holdout, warmup.length);
        if (!passesDiscoveryGate(candidate.holdout, session.maxDrawdownPercent, MIN_HOLDOUT_TRADES)) {
          candidate.status = 'rejected';
          candidate.reason = 'holdoutGate';
        } else {
          // A fixed full-window replay supplies the existing compact live-review provenance format.
          const full = await abortable(
            evaluate(candidate.settings, assets, { kind: 'historical', history }, now(), {
              strategy: candidate.strategy,
              signal,
            }),
            signal
          );
          assertActive(signal, version);
          const research = makeExperimentSnapshot(full, candidate.fees);
          research.validation = 'holdout';
          research.trainPercent = Math.floor((TRAINING_DAYS * 100) / (TRAINING_DAYS + HOLDOUT_DAYS));
          research.qualification = {
            candidates: session.selectedIds.length,
            startAt: candidate.holdout.startAt,
            endAt: candidate.holdout.endAt,
            returnPercent: candidate.holdout.returnPercent,
            drawdownPercent: candidate.holdout.drawdownPercent,
            trades: candidate.holdout.trades,
            coverage: candidate.holdout.coverage,
          };
          candidate.status = 'qualified';
          candidate.template = { ...full.bot, research: copy(research) };
          candidate.research = research;
          candidate.historyIdentity = copy(history.identity!);
        }
        candidate.holdoutState = 'complete';
      } catch (error) {
        assertActive(signal, version);
        candidate.status = 'exploratory';
        candidate.reason = 'interrupted';
      }
      await update();
    }
    session.finalists = session.candidates
      .filter(
        (candidate): candidate is DiscoveryFinalist =>
          candidate.status === 'qualified' &&
          !!candidate.template &&
          !!candidate.research &&
          !!candidate.historyIdentity &&
          !!candidate.holdout
      )
      .map(copy);
    session.phase = 'complete';
    session.status = 'complete';
    delete session.researchProgress;
    await update();
  };
  return {
    /** Begin a new frozen session. A later run never shifts its market window. */
    async start(options: DiscoveryOptions = {}): Promise<DiscoverySession> {
      if (disposed || running) throw new Error('bots.errors.config');
      const timestamp = now();
      const callCap = options.callCap ?? DEFAULT_CALLS;
      const idea = options.idea?.trim() ?? '';
      const capital = options.capital ?? '100';
      const feeBudgetXor = options.feeBudgetXor ?? '1';
      const maxDrawdownPercent = options.maxDrawdownPercent ?? '5';
      const feedback = options.liveFeedback;
      const previousDispatchAt = session?.lastDispatchAt;
      if (
        !Number.isSafeInteger(callCap) ||
        callCap < 1 ||
        callCap > MAX_CALLS ||
        idea.length > 500 ||
        finitePercent(maxDrawdownPercent).lt(finitePercent('0')) ||
        finitePercent(maxDrawdownPercent).gt(finitePercent('100')) ||
        (feedback !== undefined && options.shareLiveFeedback !== true)
      )
        throw new Error('bots.errors.config');
      if (feedback !== undefined) {
        if (
          !createDiscoveryUniverse(assets).some((pair) => pair.key === feedback.pairKey) ||
          !Number.isSafeInteger(feedback.activeHours) ||
          feedback.activeHours < 0 ||
          feedback.activeHours > 100_000 ||
          !Number.isSafeInteger(feedback.successfulSwaps) ||
          feedback.successfulSwaps < 0 ||
          feedback.successfulSwaps > 1_000_000 ||
          finitePercent(feedback.drawdownPercent).lt(finitePercent('0')) ||
          finitePercent(feedback.drawdownPercent).gt(finitePercent('100')) ||
          finitePercent(feedback.feesPaidXor).lt(finitePercent('0'))
        )
          throw new Error('bots.errors.config');
        finitePercent(feedback.netReturnPercent);
        finitePercent(feedback.excessReturnPercent);
      }
      toCodec(capital, 18);
      toCodec(feeBudgetXor, XOR.decimals);
      session = {
        version: 1,
        revision: 0,
        id: crypto.randomUUID(),
        createdAt: timestamp,
        updatedAt: timestamp,
        status: 'created',
        phase: 'scanning',
        ...(options.provider ? { provider: copy(options.provider) } : {}),
        idea,
        callCap,
        callsUsed: 0,
        roundCursor: 0,
        ...(previousDispatchAt !== undefined ? { lastDispatchAt: previousDispatchAt } : {}),
        capital,
        feeBudgetXor,
        maxDrawdownPercent,
        window: createDiscoveryWindow(timestamp),
        assets: copy(assets),
        pairs: createDiscoveryUniverse(assets),
        candidates: [],
        finalists: [],
        selectedIds: [],
        failedCalls: 0,
        feedbackExploratory: feedback !== undefined,
        holdoutReuse: false,
        ...(feedback ? { liveFeedback: copy(feedback) } : {}),
      };
      persistedRevision = 0;
      checkpointFenced = false;
      historyCache.clear();
      await update();
      return snapshot();
    },
    /** Resume only a public checkpoint; spent calls and exposed holdouts stay spent. */
    async resume(checkpoint: DiscoverySession, provider?: DiscoveryProviderProvenance): Promise<DiscoverySession> {
      if (
        disposed ||
        running ||
        checkpoint.version !== 1 ||
        JSON.stringify(checkpoint.assets) !== JSON.stringify(assets)
      )
        throw new Error('bots.errors.config');
      session = copyDiscoveryCheckpoint(checkpoint);
      if (provider) session.provider = copy(provider);
      delete session.researchProgress;
      if (session.phase !== 'complete') session.status = 'paused';
      persistedRevision = session.revision;
      checkpointFenced = false;
      for (const candidate of session.candidates)
        if (candidate.holdoutState === 'exposed' && !candidate.holdout) {
          candidate.status = 'exploratory';
          candidate.reason = 'interrupted';
        }
      historyCache.clear();
      await update();
      return snapshot();
    },
    /** Scan with two public-data lanes, then dispatch bounded AI rounds and expose frozen finalists once. */
    run(): Promise<DiscoverySession> {
      if (!session || disposed || checkpointFenced) return Promise.reject(new Error('bots.errors.storage'));
      if (running) return running;
      if (session.phase === 'complete') return Promise.resolve(snapshot());
      const version = ++generation;
      const active = new AbortController();
      controller = active;
      running = (async () => {
        try {
          if (session) delete session.error;
          if (session?.phase === 'scanning') await scan(active.signal, version);
          if (session?.phase === 'researching') {
            session.status = 'researching';
            await update();
            while (
              !active.signal.aborted &&
              session.callsUsed < session.callCap &&
              session.pairs.some((pair) => pair.status === 'ready')
            )
              await draft(active.signal, version);
          }
          assertActive(active.signal, version);
          await finalize(active.signal, version);
        } catch (error) {
          if (active.signal.aborted || version !== generation) return snapshot();
          active.abort();
          if (session) {
            session.status = 'error';
            delete session.researchProgress;
            session.error =
              checkpointFenced || (error instanceof Error && error.message === 'bots.errors.storage')
                ? 'bots.errors.storage'
                : error instanceof Error && error.message === 'bots.errors.stale'
                  ? 'bots.errors.stale'
                  : error instanceof Error &&
                      (error.message === 'bots.errors.provider' || isAiProviderFailure(error.message))
                    ? (error.message as DiscoverySession['error'])
                    : 'bots.errors.history';
            if (!checkpointFenced) await update();
            else publish();
          }
        } finally {
          if (controller === active) controller = null;
          running = null;
        }
        return snapshot();
      })();
      return running;
    },
    /** Finish early using the same sealed training results, without further provider calls. */
    async finalize(): Promise<DiscoverySession> {
      if (!session || running || session.phase === 'scanning') throw new Error('bots.errors.config');
      session.phase = 'finalizing';
      await update();
      return this.run();
    },
    /** Abort outstanding work and save the exact public state; an interrupted holdout cannot be retried as untouched. */
    async pause(): Promise<DiscoverySession> {
      if (!session) throw new Error('bots.errors.config');
      generation++;
      controller?.abort();
      session.status = 'paused';
      delete session.researchProgress;
      await update();
      return snapshot();
    },
    /** Withdrawal stops future sharing; prior model exposure keeps this run exploratory. */
    async revokeLiveFeedback(): Promise<DiscoverySession> {
      if (!session) throw new Error('bots.errors.config');
      generation++;
      if (controller) {
        controller.abort();
        session.status = 'paused';
        delete session.researchProgress;
      }
      delete session.liveFeedback;
      await update();
      return snapshot();
    },
    getSession(): DiscoverySession | null {
      return session ? snapshot() : null;
    },
    async dispose(): Promise<void> {
      disposed = true;
      generation++;
      controller?.abort();
      historyCache.clear();
      deps.provider.disconnect();
      await saveQueue.catch(() => undefined);
    },
  };
}
