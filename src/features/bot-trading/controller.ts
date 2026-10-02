import { computed, ref } from 'vue';
import { FPNumber } from '@/lib/substrate/math';
import { installPolkaswapAgentApi } from '@/features/agent-trading';
import type { PolkaswapAgentApi } from '@/features/agent-trading/types';
import { api as walletApi } from '@/lib/soraneo-wallet/src/api';
import { getAssetBalance } from '@/lib/substrate/sdk/assets';
import { KnownAssets, XOR } from '@/lib/substrate/sdk/assets/consts';
import { addCodec, codec, fromCodec, percent, toCodec } from './amounts';
import { sameBotAccount } from './account-identity';
import { createBotAiClient, type AiConnection, type BotAiClient } from './ai';
import {
  applyPaperFill,
  copyStrategyConfig,
  decimalRatio,
  evaluateStrategy,
  parseBotPrice,
  requiredStrategyCandles,
  ruleCloseConsumed,
  runBacktest,
  valuePortfolio,
} from './engine';
import { fetchBotHistory } from './history';
import { fetchLiquidBotAssets } from './eligible-assets';
import { fetchBotMarketSnapshot } from './market';
import { readHistoryIdentity } from './playground-history';
import { createBotLiveExecutor } from './live';
import {
  createDiscoveryCampaign,
  DISCOVERY_GRANT_MAX_MS,
  type DiscoveryCampaign,
  type DiscoveryCampaignMark,
} from './campaign';
import { readFinalizedDiscoveryCampaignMark } from './campaign-mark';
import { createIndexedDbDiscoveryStore } from './discovery-storage';
import type { DiscoveryApproval } from './discovery-approval';
import {
  completeDiscoveryHistory,
  fingerprintDiscoveryHistory,
  passesDiscoveryGate,
  type DiscoveryFinalist,
} from './discovery';
import { createPlaygroundHistoryLoader } from './playground-history';
import { compareResearchResult, createResearchBot, runResearch } from './research';
import {
  assertQuote,
  pendingOrder,
  proposalInput,
  validatePolicy,
  SESSION_MAX_MS,
  EXTENDED_SESSION_MAX_MS,
} from './policy';
import {
  createBotStorage,
  type BotStorage,
  type DiscoveryCampaignStorage,
  type GoalEnabledBotStorage,
} from './storage';
import { assertLegacyGoalRecords, hasGoalExecutionMarker, readGoalExecutionBot } from './goal-storage';
import type { createGoalRuntime } from './goal-runtime';
import {
  createGoalApplication,
  type GoalApplicationReview,
  type GoalApplicationExistingReview,
  type GoalApplicationQualification,
} from './goal-application';
import { GOAL_APPLICATION_RELEASES } from './goal-config';
import { GOAL_EXACT_KUSD, GOAL_EXACT_XOR } from './goal-exact-ledger';
import { copyBotGoal, evaluateBotGoal, validateBotGoalState } from './goals';
import { assessGoalTradeAdmission } from './goalAdmission';
import { assertGoalResearchBinding, validateGoalResearchSnapshot } from './goal-research';
import type {
  BacktestResult,
  BotAsset,
  BotCandle,
  BotDefinition,
  BotGoal,
  BotHistory,
  BotOrder,
  BotResearchSnapshot,
  StrategyConfig,
} from './types';

/** Equity points kept per bot. Their spacing grows with the session length so the chart spans the session. */
export const EQUITY_POINTS = 1000;
/** Between new hourly closes, a rules bot is quoted and revalued at most this often. */
export const REVALUE_INTERVAL_MS = 60_000;

/** One equity point per minute, or wider for long sessions so that `EQUITY_POINTS` cover the whole session. */
export function equitySpacingMs(sessionDurationMs: number): number {
  return Number.isSafeInteger(sessionDurationMs) && sessionDurationMs > 0
    ? Math.max(REVALUE_INTERVAL_MS, Math.ceil(sessionDurationMs / EQUITY_POINTS))
    : REVALUE_INTERVAL_MS;
}

export interface BotDraft {
  name: string;
  assetInAddress: string;
  assetOutAddress: string;
  allocation: string;
  feeBudget: string;
  strategyKind: Exclude<StrategyConfig['kind'], 'rules'>;
  /** Optional user-approved goal; new goal bots always start as paper Jev decision bots. */
  goal?: BotGoal;
}
export interface BacktestOptions {
  days: number;
  interval: 'hour' | 'day';
  slippagePercent: string;
  feeAmount: string;
  swapFeePercent?: string;
  sellFeeAmount?: string;
  sellSwapFeePercent?: string;
  priceImpactPercent?: string;
  sellPriceImpactPercent?: string;
  /** Already verified March-onward observations from the shared research history loader. */
  history?: BotHistory;
}
/** Research provenance selects whether an absolute historical trigger is retained when creating a bot. */
export interface PaperBotOptions {
  thresholdPercent?: number;
  research?: BotResearchSnapshot;
}
/** One transient review of fixed candidates and aggregate funding, with no wallet secret. */
export interface DiscoveryCampaignReview {
  id: string;
  campaign: DiscoveryCampaign;
  bots: BotDefinition[];
  mark: DiscoveryCampaignMark;
  funding: { sufficient: boolean; assets: Array<{ asset: BotAsset; availableCodec: string; requiredCodec: string }> };
  expiresAt: number;
}

/**
 * Keep SMA windows in hours while a fresh quote updates the single forming-hour slot.
 * Completed timestamps are candle ends. A missing hour resets the usable tail rather
 * than treating separated observations or repeated timer quotes as adjacent hours.
 */
export function livePriceSmaCandles(history: BotHistory, quote: BotCandle, now: number): BotCandle[] {
  const hour = 3_600_000;
  if (
    !Number.isSafeInteger(now) ||
    !Number.isSafeInteger(quote.timestamp) ||
    quote.timestamp < 0 ||
    quote.timestamp > now ||
    now - quote.timestamp >= 5_000
  )
    throw new Error('bots.errors.stale');
  parseBotPrice(quote.close);
  const boundary = Math.floor(quote.timestamp / hour) * hour;
  const completed: BotCandle[] = [];
  let previous = -1;
  for (const candle of history.candles) {
    if (!Number.isSafeInteger(candle.timestamp) || candle.timestamp <= previous || candle.timestamp % hour !== 0)
      throw new Error('bots.errors.history');
    previous = candle.timestamp;
    if (candle.timestamp > boundary || candle.timestamp >= quote.timestamp) continue;
    parseBotPrice(candle.close);
    if (completed.length && candle.timestamp - completed.at(-1)!.timestamp !== hour) completed.length = 0;
    completed.push(candle);
  }
  const requiredClose = quote.timestamp === boundary ? boundary - hour : boundary;
  if (completed.at(-1)?.timestamp !== requiredClose) throw new Error('bots.errors.stale');
  return [...completed, quote];
}

/** Require a current, contiguous completed-hour signal window for the qualified episode protocol. */
function goalEpisodeSignalCandles(history: BotHistory, strategy: StrategyConfig, now: number): BotCandle[] {
  const hour = 3_600_000;
  const boundary = Math.floor(now / hour) * hour;
  const completed: BotCandle[] = [];
  let previous = -1;
  for (const candle of history.candles) {
    if (
      !candle ||
      !Number.isSafeInteger(candle.timestamp) ||
      candle.timestamp < 0 ||
      candle.timestamp <= previous ||
      candle.timestamp % hour !== 0 ||
      candle.timestamp > boundary
    )
      throw new Error('bots.errors.history');
    parseBotPrice(candle.close);
    if (completed.length && candle.timestamp - previous !== hour) completed.length = 0;
    completed.push(candle);
    previous = candle.timestamp;
  }
  if (completed.at(-1)?.timestamp !== boundary) throw new Error('bots.errors.stale');
  if (completed.length < requiredStrategyCandles(strategy)) throw new Error('bots.errors.history');
  return completed;
}

interface ControllerDependencies {
  agent: PolkaswapAgentApi;
  storage: BotStorage;
  live: ReturnType<typeof createBotLiveExecutor>;
  history: typeof fetchBotHistory;
  market: typeof fetchBotMarketSnapshot;
  ai: typeof createBotAiClient;
  now: () => number;
  isExternal: () => boolean;
  /** One callback per finalized block; optional test/offline callers use bounded polling. */
  subscribeBlocks?: (onBlock: (height?: number) => void) => Promise<() => void>;
  eligibleAssets?: () => Promise<BotAsset[]>;
  /** Read a transferable balance from the connected chain, without opening a trading session. */
  readAssetBalance?: (assetAddress: string, accountAddress: string, decimals: number) => Promise<string>;
  identity?: typeof readHistoryIdentity;
  /** Explicit qualified goal corridor. Omission never enables or restores goal execution. */
  goalRuntime?: Pick<ReturnType<typeof createGoalRuntime>, 'start' | 'stop' | 'active' | 'dispose'>;
  /** Trusted compiled release composition; public inputs cannot supply a verification. */
  goalApplication?: ReturnType<typeof createGoalApplication>;
}
/** Detached display-only review. It has no exact execution marker, ledger or qualification capability. */
function goalReviewPresentation(
  summary: GoalApplicationQualification,
  review: GoalApplicationReview | GoalApplicationExistingReview,
  now: number
): BotDefinition {
  const existing = review.kind === 'goal-application-existing-review-v1' ? review.bot : undefined;
  const id =
    review.kind === 'goal-application-existing-review-v1'
      ? review.bot.id
      : review.funding.kind === 'preview'
        ? review.funding.botId
        : review.funding.bot.id;
  const holdings = { [GOAL_EXACT_KUSD]: summary.initialKusdCodec, [GOAL_EXACT_XOR]: summary.feeReserveCodec };
  return {
    version: 1,
    id,
    name: 'KUSD / XOR',
    mode: 'live',
    status: 'paused',
    account: review.account,
    network: summary.binding.genesisHash,
    assetIn: { address: GOAL_EXACT_KUSD, symbol: 'KUSD', decimals: 18 },
    assetOut: { address: GOAL_EXACT_XOR, symbol: 'XOR', decimals: 18 },
    strategy: copy(summary.binding.strategy),
    policy: {
      maxTradeCodec: { [GOAL_EXACT_KUSD]: summary.maxTradeKusdCodec, [GOAL_EXACT_XOR]: summary.maxTradeXorCodec },
      slippagePercent: summary.policy.slippagePercent,
      maxPriceImpactPercent: summary.policy.maxPriceImpactPercent,
      feeAsset: { address: GOAL_EXACT_XOR, symbol: 'XOR', decimals: 18 },
      feeBudgetCodec: summary.feeReserveCodec,
      sessionDurationMs: summary.policy.durationMs,
    },
    portfolio: existing
      ? copy(existing.portfolio)
      : { initial: { ...holdings }, holdings: { ...holdings }, feesPaidCodec: '0', trades: 0 },
    state: existing ? copy(existing.state) : { lastEvaluatedAt: 0, lastTradeAt: 0 },
    provider: 'custom',
    model: '',
    endpoint: '',
    createdAt: existing?.createdAt ?? now,
    sessionExpiresAt: 0,
    activity: [],
    equity: [],
    apiUsage: { inputTokens: 0, outputTokens: 0, requests: 0 },
    goal: {
      title: 'KUSD / XOR',
      targetReturnPercent: summary.policy.targetReturnPercent,
      maxLossPercent: summary.policy.maxLossPercent,
      durationMs: summary.policy.durationMs,
      valuationAsset: 'output',
      lossMetric: 'drawdown',
    },
  };
}
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const cleanAsset = (asset: BotAsset): BotAsset => ({
  address: asset.address,
  symbol: asset.symbol,
  decimals: asset.decimals,
});

/** Validate and copy a compact report, excluding arbitrary extra fields or simulation state. */
function copyResearchSnapshot(snapshot: BotResearchSnapshot, now: number): BotResearchSnapshot {
  const goalEpisodes = validateGoalResearchSnapshot(snapshot);
  if (
    snapshot.version !== 1 ||
    !['demo', 'historical', 'imported'].includes(snapshot.source) ||
    !['none', 'holdout', 'walk-forward'].includes(snapshot.validation) ||
    (snapshot.valuationAsset !== undefined && !['input', 'output'].includes(snapshot.valuationAsset)) ||
    ![snapshot.testedAt, snapshot.startAt, snapshot.endAt].every((time) => Number.isSafeInteger(time) && time >= 0) ||
    snapshot.startAt > snapshot.endAt ||
    snapshot.endAt > snapshot.testedAt ||
    snapshot.testedAt > now ||
    !Number.isFinite(snapshot.coverage) ||
    snapshot.coverage < 0 ||
    snapshot.coverage > 1 ||
    !Number.isSafeInteger(snapshot.trainPercent) ||
    snapshot.trainPercent < 50 ||
    snapshot.trainPercent > 90 ||
    !Number.isSafeInteger(snapshot.folds) ||
    snapshot.folds < 2 ||
    snapshot.folds > 10 ||
    typeof snapshot.optimized !== 'boolean' ||
    !Number.isSafeInteger(snapshot.trades) ||
    snapshot.trades < 0 ||
    snapshot.trades > 10000 ||
    ![snapshot.returnPercent, snapshot.drawdownPercent].every(
      (value) => typeof value === 'string' && value.length <= 100 && /^-?(0|[1-9]\d*)(\.\d+)?$/.test(value)
    ) ||
    new FPNumber(snapshot.drawdownPercent, 36).lt(new FPNumber('0')) ||
    new FPNumber(snapshot.drawdownPercent, 36).gt(new FPNumber('100'))
  )
    throw new Error('bots.errors.config');
  if (snapshot.networkFeeXor !== undefined) toCodec(snapshot.networkFeeXor, XOR.decimals);
  if (snapshot.swapFeePercent !== undefined) percent(snapshot.swapFeePercent, '10');
  if (snapshot.sellNetworkFeeXor !== undefined) toCodec(snapshot.sellNetworkFeeXor, XOR.decimals);
  if (snapshot.sellSwapFeePercent !== undefined) percent(snapshot.sellSwapFeePercent, '10');
  if (snapshot.priceImpactPercent !== undefined) percent(snapshot.priceImpactPercent);
  if (snapshot.sellPriceImpactPercent !== undefined) percent(snapshot.sellPriceImpactPercent);
  const qualification = snapshot.qualification;
  if (qualification !== undefined) {
    if (
      !qualification ||
      typeof qualification !== 'object' ||
      snapshot.source !== 'historical' ||
      snapshot.validation !== 'holdout' ||
      snapshot.coverage !== 1 ||
      !Number.isSafeInteger(qualification.candidates) ||
      qualification.candidates < 1 ||
      qualification.candidates > 12 ||
      ![qualification.startAt, qualification.endAt].every(Number.isSafeInteger) ||
      qualification.startAt <= snapshot.startAt ||
      qualification.startAt >= qualification.endAt ||
      qualification.endAt > snapshot.endAt ||
      qualification.coverage !== 1 ||
      !Number.isSafeInteger(qualification.trades) ||
      qualification.trades < (goalEpisodes ? 1 : 5) ||
      qualification.trades > 10000 ||
      ![qualification.returnPercent, qualification.drawdownPercent].every(
        (value) => typeof value === 'string' && value.length <= 100 && /^(0|[1-9]\d*)(\.\d{1,36})?$/.test(value)
      ) ||
      !new FPNumber(qualification.returnPercent, 36).gt(new FPNumber('0')) ||
      new FPNumber(qualification.drawdownPercent, 36).gt(new FPNumber('100'))
    )
      throw new Error('bots.errors.config');
  }
  const observation = snapshot.feeObservation;
  if (observation !== undefined) {
    if (!observation || typeof observation !== 'object') throw new Error('bots.errors.config');
    if (
      !Number.isSafeInteger(observation.blockNumber) ||
      observation.blockNumber < 0 ||
      !Number.isSafeInteger(observation.queriedAt) ||
      observation.queriedAt < 0 ||
      observation.queriedAt > snapshot.testedAt ||
      (observation.finalizedAt !== undefined &&
        (!Number.isSafeInteger(observation.finalizedAt) ||
          observation.finalizedAt <= 0 ||
          observation.finalizedAt > observation.queriedAt + 30_000)) ||
      !/^0x[0-9a-f]{64}$/i.test(observation.blockHash) ||
      !/^0x[0-9a-f]{64}$/i.test(observation.genesisHash)
    )
      throw new Error('bots.errors.config');
    try {
      const endpoint = new URL(observation.endpoint);
      if (
        !['https:', 'wss:'].includes(endpoint.protocol) ||
        endpoint.username ||
        endpoint.password ||
        endpoint.search ||
        endpoint.hash
      )
        throw new Error('bots.errors.config');
    } catch {
      throw new Error('bots.errors.config');
    }
    if (!codec(toCodec(observation.amountIn, 36)) || !codec(toCodec(observation.sellAmountIn, 36)))
      throw new Error('bots.errors.config');
  }
  return {
    version: 1,
    source: snapshot.source,
    testedAt: snapshot.testedAt,
    startAt: snapshot.startAt,
    endAt: snapshot.endAt,
    coverage: snapshot.coverage,
    validation: snapshot.validation,
    trainPercent: snapshot.trainPercent,
    folds: snapshot.folds,
    optimized: snapshot.optimized,
    returnPercent: snapshot.returnPercent,
    drawdownPercent: snapshot.drawdownPercent,
    trades: snapshot.trades,
    ...(goalEpisodes ? { goalEpisodes } : {}),
    ...(snapshot.valuationAsset !== undefined ? { valuationAsset: snapshot.valuationAsset } : {}),
    ...(qualification
      ? {
          qualification: {
            candidates: qualification.candidates,
            startAt: qualification.startAt,
            endAt: qualification.endAt,
            returnPercent: qualification.returnPercent,
            drawdownPercent: qualification.drawdownPercent,
            trades: qualification.trades,
            coverage: qualification.coverage,
          },
        }
      : {}),
    ...(snapshot.networkFeeXor !== undefined ? { networkFeeXor: snapshot.networkFeeXor } : {}),
    ...(snapshot.swapFeePercent !== undefined ? { swapFeePercent: snapshot.swapFeePercent } : {}),
    ...(snapshot.sellNetworkFeeXor !== undefined ? { sellNetworkFeeXor: snapshot.sellNetworkFeeXor } : {}),
    ...(snapshot.sellSwapFeePercent !== undefined ? { sellSwapFeePercent: snapshot.sellSwapFeePercent } : {}),
    ...(snapshot.priceImpactPercent !== undefined ? { priceImpactPercent: snapshot.priceImpactPercent } : {}),
    ...(snapshot.sellPriceImpactPercent !== undefined
      ? { sellPriceImpactPercent: snapshot.sellPriceImpactPercent }
      : {}),
    ...(observation
      ? {
          feeObservation: {
            blockNumber: observation.blockNumber,
            blockHash: observation.blockHash,
            genesisHash: observation.genesisHash,
            endpoint: observation.endpoint,
            queriedAt: observation.queriedAt,
            ...(observation.finalizedAt !== undefined ? { finalizedAt: observation.finalizedAt } : {}),
            amountIn: observation.amountIn,
            sellAmountIn: observation.sellAmountIn,
          },
        }
      : {}),
  };
}

/** Build a credential-free bot definition; every new bot starts with virtual paper capital. */
export function createBotDefinition(draft: BotDraft, assets: BotAsset[], now: number): BotDefinition {
  const assetIn = assets.find((asset) => asset.address === draft.assetInAddress);
  const assetOut = assets.find((asset) => asset.address === draft.assetOutAddress);
  if (
    !assetIn ||
    !assetOut ||
    assetIn.address === assetOut.address ||
    !draft.name.trim() ||
    draft.name.length > 80 ||
    !['dca', 'threshold', 'sma', 'ai'].includes(draft.strategyKind)
  )
    throw new Error('bots.errors.config');
  const allocation = toCodec(draft.allocation, assetIn.decimals);
  const fee = toCodec(draft.feeBudget, XOR.decimals);
  if (!codec(allocation) || !codec(fee)) throw new Error('bots.errors.amount');
  const initial = { [assetIn.address]: allocation, [assetOut.address]: '0' };
  initial[XOR.address] = addCodec(initial[XOR.address] ?? '0', fee);
  const amount = (codec(allocation) / 10n).toString();
  return {
    version: 1,
    id: crypto.randomUUID(),
    name: draft.name.trim(),
    mode: 'paper',
    status: 'idle',
    account: 'paper',
    network: 'paper',
    assetIn: cleanAsset(assetIn),
    assetOut: cleanAsset(assetOut),
    strategy: {
      kind: draft.goal ? 'ai' : draft.strategyKind,
      amount: fromCodec(codec(amount) ? amount : allocation, assetIn.decimals),
      intervalMs: 6_000,
      threshold: '1',
      direction: 'below',
      fastWindow: 5,
      slowWindow: 20,
      prompt: '',
    },
    policy: {
      maxTradeCodec: { [assetIn.address]: allocation, [assetOut.address]: toCodec('1', assetOut.decimals) },
      slippagePercent: '0.5',
      maxPriceImpactPercent: '3',
      feeAsset: cleanAsset(XOR),
      feeBudgetCodec: fee,
      sessionDurationMs: 3_600_000,
    },
    portfolio: { initial: copy(initial), holdings: copy(initial), feesPaidCodec: '0', trades: 0 },
    state: { lastEvaluatedAt: 0, lastTradeAt: 0 },
    provider: draft.goal ? 'jev' : 'openai',
    model: draft.goal ? 'jev-latest' : '',
    endpoint: '',
    createdAt: now,
    sessionExpiresAt: 0,
    activity: [],
    equity: [],
    apiUsage: { inputTokens: 0, outputTokens: 0, requests: 0 },
    ...(draft.goal ? { goal: copyBotGoal(draft.goal) } : {}),
  };
}

/** Reset execution state while retaining the tested deterministic strategy and input-token policy. */
export function createPaperBotFromTemplate(template: BotDefinition, assets: BotAsset[], now: number): BotDefinition {
  assertLegacyGoalRecords(template);
  if (template.mode !== 'paper') throw new Error('bots.errors.config');
  const assetIn = assets.find((asset) => asset.address === template.assetIn.address);
  const assetOut = assets.find((asset) => asset.address === template.assetOut.address);
  if (
    !assetIn ||
    !assetOut ||
    assetIn.decimals !== template.assetIn.decimals ||
    assetOut.decimals !== template.assetOut.decimals ||
    template.policy.feeAsset.address !== XOR.address ||
    template.policy.feeAsset.decimals !== XOR.decimals
  )
    throw new Error('bots.errors.config');
  const initial = codec(template.portfolio.initial[assetIn.address] ?? '0');
  const fee = codec(template.policy.feeBudgetCodec);
  const allocation = initial - (assetIn.address === XOR.address ? fee : 0n);
  if (allocation <= 0n) throw new Error('bots.errors.amount');
  const bot = createBotDefinition(
    {
      name: template.name,
      assetInAddress: assetIn.address,
      assetOutAddress: template.assetOut.address,
      allocation: fromCodec(allocation.toString(), assetIn.decimals),
      feeBudget: fromCodec(fee.toString(), XOR.decimals),
      strategyKind: template.strategy.kind === 'rules' ? 'dca' : template.strategy.kind,
    },
    assets,
    now
  );
  bot.strategy = copyStrategyConfig({ ...template.strategy, prompt: '' });
  bot.policy.maxTradeCodec[bot.assetIn.address] = template.policy.maxTradeCodec[bot.assetIn.address];
  bot.policy.maxTradeCodec[bot.assetOut.address] = template.policy.maxTradeCodec[bot.assetOut.address];
  bot.policy.slippagePercent = template.policy.slippagePercent;
  bot.policy.maxPriceImpactPercent = template.policy.maxPriceImpactPercent;
  if (template.goal) bot.goal = copyBotGoal(template.goal);
  validateBotDefinition(bot);
  return bot;
}

/** Live spend fields must match the completed study's exact token units and fee reserve. */
export function checkedStudiedDiscoveryLimits(
  bot: BotDefinition,
  values: { allocation: string; orderLimit: string; feeBudgetXor: string }
): { allocation: string; orderLimit: string; fee: string } {
  const allocation = toCodec(values.allocation, bot.assetIn.decimals);
  const orderLimit = toCodec(values.orderLimit, bot.assetIn.decimals);
  const fee = toCodec(values.feeBudgetXor, XOR.decimals);
  const studiedFee = codec(bot.policy.feeBudgetCodec);
  const studiedAllocation =
    codec(bot.portfolio.initial[bot.assetIn.address] ?? '0') - (bot.assetIn.address === XOR.address ? studiedFee : 0n);
  if (
    studiedAllocation <= 0n ||
    codec(allocation) !== studiedAllocation ||
    codec(orderLimit) !== codec(bot.policy.maxTradeCodec[bot.assetIn.address] ?? '0') ||
    codec(fee) !== studiedFee
  )
    throw new Error('bots.errors.research');
  return { allocation, orderLimit, fee };
}

/** Validate settings before storage or consent; models cannot alter this path. */
export function validateBotDefinition(bot: BotDefinition): void {
  assertLegacyGoalRecords(bot);
  validatePolicy(bot);
  validateBotGoalState(bot);
  if (bot.research) {
    copyResearchSnapshot(bot.research, bot.createdAt);
    const evidence = validateGoalResearchSnapshot(bot.research);
    if (evidence) assertGoalResearchBinding(bot, evidence);
  }
  const s = bot.strategy;
  if (
    !bot.name.trim() ||
    bot.name.length > 80 ||
    !['paper', 'live'].includes(bot.mode) ||
    !['openai', 'claude', 'custom', 'jev'].includes(bot.provider) ||
    !['dca', 'threshold', 'sma', 'ai', 'rules'].includes(s.kind) ||
    !['above', 'below'].includes(s.direction) ||
    !Number.isSafeInteger(s.intervalMs) ||
    s.intervalMs < 6_000 ||
    s.intervalMs > 2_592_000_000 ||
    !Number.isInteger(s.fastWindow) ||
    !Number.isInteger(s.slowWindow) ||
    s.fastWindow < 2 ||
    s.slowWindow <= s.fastWindow ||
    s.slowWindow > 200 ||
    s.prompt.length > 2000 ||
    bot.model.length > 120 ||
    bot.endpoint.length > 2048
  )
    throw new Error('bots.errors.config');
  copyStrategyConfig(s);
  if (!codec(toCodec(s.amount, bot.assetIn.decimals))) throw new Error('bots.errors.amount');
  // Composed rules have their own validated thresholds; the unused legacy carrier can be empty.
  const threshold = s.kind === 'rules' && s.threshold === '' ? '0' : toCodec(s.threshold, 36);
  if (s.kind === 'threshold' && threshold === '0') throw new Error('bots.errors.amount');
  percent(bot.policy.slippagePercent, '10');
  if (new FPNumber(bot.policy.slippagePercent).lt(new FPNumber('0.01'))) throw new Error('bots.errors.policy');
  for (const [address, value] of Object.entries(bot.portfolio.holdings)) {
    if (![bot.assetIn.address, bot.assetOut.address, bot.policy.feeAsset.address].includes(address))
      throw new Error('bots.errors.config');
    codec(value);
  }
}

/** Coordinate the feature. Only bot IDs explicitly started in this tab can ever execute. */
export function createBotTradingController(deps: ControllerDependencies) {
  const goalReviews = new Map<
    string,
    {
      review: GoalApplicationReview | GoalApplicationExistingReview;
      summary: GoalApplicationQualification;
      identity: string;
    }
  >();
  const bots = ref<BotDefinition[]>([]);
  const selectedId = ref('');
  const assets = ref<BotAsset[]>(deps.eligibleAssets ? [] : KnownAssets.map(cleanAsset));
  /** Public eligibility status only; failure retains the catalog and the existing 30s automatic retry. */
  const assetsLoading = ref(false);
  const assetsError = ref('');
  const assetsLoaded = ref(false);
  const loading = ref(false);
  const busy = ref(false);
  const error = ref('');
  const chartCandles = ref<BotCandle[]>([]);
  const backtestResult = ref<BacktestResult | null>(null);
  const providerConnectedIds = ref<string[]>([]);
  const discoveryCampaigns = ref<DiscoveryCampaign[]>([]);
  const discoveryCampaignReviews = new Map<string, DiscoveryCampaignReview & { identity: string }>();
  const discoveryReviewHistory = createPlaygroundHistoryLoader();
  const campaignStorage = (): DiscoveryCampaignStorage => {
    if (
      !deps.storage.createCampaign ||
      !deps.storage.listCampaigns ||
      !deps.storage.grantCampaign ||
      !deps.storage.pauseCampaign ||
      !deps.storage.closeCampaign ||
      !deps.storage.recordCampaignMark
    )
      throw new Error('bots.errors.storage');
    return deps.storage as DiscoveryCampaignStorage;
  };
  const campaignMark = async (members: BotDefinition[], includeCapital = true): Promise<DiscoveryCampaignMark> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        readFinalizedDiscoveryCampaignMark(members, deps.now(), includeCapital),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error('bots.errors.stale')), 25_000);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
  const status = ref(deps.agent.status());
  const sessions = new Set<string>();
  const goalIds = new Set<string>();
  const goalSessions = new Set<string>();
  const pendingStarts = new Set<string>();
  const sessionVersions = new Map<string, number>();
  const providers = new Map<string, BotAiClient>();
  const histories = new Map<string, { loadedAt: number; history: BotHistory }>();
  const observations = new Map<string, BotCandle[]>();
  // Session-local scheduling evidence never changes stored execution/receipt timestamps.
  const cadence = new Map<string, { evaluated?: number; filled?: number; checkedAt?: number }>();
  // When each running session last quoted and recorded its value.
  const valuedAt = new Map<string, number>();
  let latestFinalizedBlock: number | undefined;
  const nodeContext = () => {
    const node = deps.agent.status().node;
    return JSON.stringify([node.connected, node.genesisHash, node.endpoint, node.runtimeSpecVersion]);
  };
  let cachedContext = nodeContext();
  const syncContext = (startingId?: string) => {
    const next = nodeContext();
    if (next !== cachedContext) {
      cachedContext = next;
      histories.clear();
      observations.clear();
      cadence.clear();
      latestFinalizedBlock = undefined;
      chartCandles.value = [];
      backtestResult.value = null;
      // The explicit start may establish a previously disconnected node. Other sessions still revoke.
      const pending = startingId ? pendingStarts.delete(startingId) : false;
      pauseAll();
      if (pending && startingId) pendingStarts.add(startingId);
    }
    return next;
  };
  const assertContext = (context: string) => {
    if (nodeContext() !== context) throw new Error('bots.errors.network');
  };
  let initialized = false;
  let initializing: Promise<void> | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  let ticking = false;
  let blockQueued = false;
  let queuedBlock: number | undefined;
  let unsubscribeBlocks: (() => void) | undefined;
  let blockSubscriptionContext = '';
  let subscriptionVersion = 0;
  let subscribing = false;
  let assetsAt = 0;
  let lastTick = deps.now();
  let disposed = false;
  const selectedBot = computed(() => bots.value.find((bot) => bot.id === selectedId.value) ?? null);
  const walletConnected = computed(() => status.value.wallet.connected);
  const externalWallet = computed(() => {
    void status.value;
    return deps.isExternal();
  });
  const sessionActiveIds = ref<string[]>([]);
  const syncActiveIds = () => {
    for (const id of goalSessions) if (!deps.goalRuntime?.active(id)) goalSessions.delete(id);
    sessionActiveIds.value = [...sessions, ...goalSessions];
  };
  const rememberGoal = (bot: BotDefinition) => {
    if (hasGoalExecutionMarker(bot)) goalIds.add(bot.id);
    return bot;
  };
  const isGoalId = (id: string) =>
    goalIds.has(id) || bots.value.some((bot) => bot.id === id && hasGoalExecutionMarker(bot));
  /** Public account/network identity binds the review to the wallet that will sign. */
  const readConnectionIdentity = () => {
    const current = deps.agent.status();
    return JSON.stringify([
      current.wallet.connected,
      current.wallet.address,
      current.wallet.source,
      current.node.connected,
      current.node.genesisHash,
      current.node.endpoint,
      current.node.runtimeSpecVersion,
    ]);
  };
  const connectionIdentity = computed(() => {
    void status.value;
    return readConnectionIdentity();
  });
  interface LiveReview {
    bot: BotDefinition;
    identity: string;
    denomination: NonNullable<BotHistory['identity']>;
    expiresAt: number;
  }
  const liveReviews = new Map<string, LiveReview>();
  /** A live review is valid only while its original finalized denomination still applies. */
  const assertReviewDenomination = async (denomination: NonNullable<BotHistory['identity']>) => {
    if (!deps.identity || !denomination || !/^[1-9]\d{0,119}$/.test(denomination.denominator))
      throw new Error('bots.errors.denomination');
    const current = await deps.identity();
    current.assertCurrent();
    if (current.genesisHash !== denomination.genesisHash || current.currentDenominator !== denomination.denominator)
      throw new Error('bots.errors.denomination');
  };

  const setError = (failure: unknown) => {
    const message = failure instanceof Error ? failure.message : '';
    error.value = /^bots\.(errors|events)\.[a-zA-Z]+$/.test(message) ? message : 'bots.errors.operation';
  };
  const refresh = async () => {
    bots.value = (await deps.storage.listBots()).map(rememberGoal);
    discoveryCampaigns.value = deps.storage.listCampaigns ? await deps.storage.listCampaigns() : [];
    syncActiveIds();
  };
  const find = async (id: string) => {
    const bot = (await deps.storage.listBots()).find((item) => item.id === id);
    if (!bot) throw new Error('bots.errors.config');
    return rememberGoal(bot);
  };
  const event = (bot: BotDefinition, message: string, kind: 'status' | 'error' | 'hold' | 'trade' = 'status') => {
    const latest = bot.activity[0];
    // A repeated hold refreshes its entry, so days of quiet evaluations cannot push trades out of the bounded log.
    if (kind === 'hold' && latest?.kind === 'hold' && latest.message === message) {
      latest.timestamp = deps.now();
      return;
    }
    bot.activity.unshift({ id: crypto.randomUUID(), timestamp: deps.now(), kind, message });
    bot.activity = bot.activity.slice(0, 200);
  };
  const revoke = (id: string): Promise<void> => {
    sessions.delete(id);
    goalSessions.delete(id);
    cadence.delete(id);
    valuedAt.delete(id);
    sessionVersions.set(id, (sessionVersions.get(id) ?? 0) + 1);
    syncActiveIds();
    let stopped: Promise<void>;
    try {
      if (isGoalId(id)) {
        if (deps.goalRuntime) stopped = deps.goalRuntime.stop(id);
        else {
          const goals = (deps.storage as Partial<GoalEnabledBotStorage>).goals;
          if (!goals) throw new Error('bots.errors.storage');
          // Stopping needs no qualification producer; retain the funded ledger and unresolved facts.
          stopped = find(id).then(async (stored) => {
            const bot = readGoalExecutionBot(stored);
            await goals.pause({
              botId: id,
              expected: { goalId: bot.goalExecution.goalId, controlRevision: bot.goalControl.revision },
            });
          });
        }
      } else stopped = Promise.resolve(deps.live.stop(id));
    } catch (failure) {
      stopped = Promise.reject(failure);
    }
    // Event cleanup and legacy call sites may be fire-and-forget; user controls still await this promise.
    void stopped.catch(setError);
    return stopped;
  };
  let activeOperations = 0;
  const guard = async <T>(action: () => Promise<T>, interruption = false): Promise<T> => {
    if (busy.value && !interruption) throw new Error('bots.errors.busy');
    activeOperations++;
    busy.value = true;
    error.value = '';
    try {
      return await action();
    } catch (failure) {
      setError(failure);
      throw new Error(error.value);
    } finally {
      busy.value = --activeOperations > 0;
    }
  };
  const history = async (bot: BotDefinition, force = false): Promise<BotHistory> => {
    assertLegacyGoalRecords(bot);
    const context = syncContext();
    if (bot.network !== 'paper' && bot.network !== deps.agent.status().node.genesisHash)
      throw new Error('bots.errors.network');
    let cached = histories.get(bot.id);
    if (!cached || force || Math.floor(deps.now() / 3_600_000) !== Math.floor(cached.loadedAt / 3_600_000)) {
      const days = Math.max(14, Math.ceil(requiredStrategyCandles(bot.strategy) / 24));
      const goalEpisodes = bot.research && validateGoalResearchSnapshot(bot.research);
      cached = {
        loadedAt: deps.now(),
        history: await deps.history(bot, {
          days,
          interval: 'hour',
          ...(goalEpisodes ? { basis: 'xor-pool' as const } : {}),
        }),
      };
      assertContext(context);
      if (goalEpisodes) {
        // A close may not be indexed on the first request after an hour boundary.
        // Return its original evidence for normal rejection, but never retain it
        // across an explicit restart once the indexer has published the close.
        try {
          if (!cached.history.denominationVerified) throw new Error('bots.errors.denomination');
          goalEpisodeSignalCandles(cached.history, bot.strategy, deps.now());
          histories.set(bot.id, cached);
        } catch {
          histories.delete(bot.id);
        }
      } else histories.set(bot.id, cached);
    }
    if (selectedId.value === bot.id) chartCandles.value = cached.history.candles;
    return cached.history;
  };
  const market = async (bot: BotDefinition) => {
    assertLegacyGoalRecords(bot);
    const context = syncContext();
    if (bot.network !== 'paper' && bot.network !== deps.agent.status().node.genesisHash)
      throw new Error('bots.errors.network');
    const candle = await deps.market(deps.agent, bot, deps.now());
    assertContext(context);
    const candles = [
      ...(observations.get(bot.id) ?? []).filter((point) => point.timestamp < candle.timestamp),
      candle,
    ].slice(-120);
    observations.set(bot.id, candles);
    if (selectedId.value === bot.id)
      chartCandles.value = [
        ...(histories.get(bot.id)?.history.candles ?? []).filter((point) => point.timestamp < candles[0].timestamp),
        ...candles,
      ];
    return { candle, candles };
  };
  const addEquity = (bot: BotDefinition, candle: BotCandle) => {
    const point = {
      timestamp: deps.now(),
      value: valuePortfolio(bot, candle),
      benchmark: valuePortfolio(bot, candle, bot.portfolio.initial),
    };
    valuedAt.set(bot.id, point.timestamp);
    const spacing = equitySpacingMs(bot.policy.sessionDurationMs);
    const last = bot.equity.at(-1);
    // After the first point, each spacing window keeps only its latest valuation.
    if (bot.equity.length > 1 && last && Math.floor(last.timestamp / spacing) === Math.floor(point.timestamp / spacing))
      bot.equity[bot.equity.length - 1] = point;
    else bot.equity.push(point);
    // The first point anchors the displayed P&L, so it outlives the cap.
    if (bot.equity.length > EQUITY_POINTS) bot.equity = [bot.equity[0], ...bot.equity.slice(-(EQUITY_POINTS - 1))];
  };
  /** The hourly history cached for the current hour, or undefined when the next read would refresh it. */
  const currentHourHistory = (id: string, now: number): BotHistory | undefined => {
    const cached = histories.get(id);
    return cached && Math.floor(now / 3_600_000) === Math.floor(cached.loadedAt / 3_600_000)
      ? cached.history
      : undefined;
  };
  const campaignMarkAt = new Map<string, number>();
  /** A campaign clock advances only from newly observed canonical finalized state. */
  const recordActiveCampaignMarks = async (now: number): Promise<void> => {
    if (!deps.storage.listCampaigns || !deps.storage.recordCampaignMark) return;
    const ids = [
      ...new Set(
        [...sessions]
          .map((id) => bots.value.find((bot) => bot.id === id)?.discoveryCampaignId)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    for (const id of ids) {
      if (now - (campaignMarkAt.get(id) ?? 0) < 20_000) continue;
      try {
        const campaign = (await deps.storage.listCampaigns()).find((item) => item.id === id);
        if (!campaign || campaign.status !== 'running') throw new Error('bots.errors.session');
        const auth = deps.agent.status();
        if (
          !auth.wallet.connected ||
          !sameBotAccount(auth.wallet.address, campaign.account) ||
          !auth.node.connected ||
          auth.node.genesisHash !== campaign.network ||
          deps.isExternal()
        )
          throw new Error('bots.errors.session');
        if (!campaign.grant || deps.now() >= campaign.grant.expiresAt) {
          await deps.live.stopCampaign(id);
          for (const botId of campaign.botIds) await revoke(botId);
          await refresh();
          continue;
        }
        if (
          (await deps.storage.listOrders()).some(
            (order) =>
              sameBotAccount(order.account, campaign.account) &&
              order.network === campaign.network &&
              pendingOrder(order)
          )
        )
          continue;
        const stored = await deps.storage.listBots();
        const members = campaign.botIds.map((botId) => stored.find((item) => item.id === botId));
        if (members.some((item) => !item)) throw new Error('bots.errors.storage');
        const portfolios = Object.fromEntries((members as BotDefinition[]).map((bot) => [bot.id, copy(bot.portfolio)]));
        const mark = await campaignMark(members as BotDefinition[], false);
        if (mark.blockNumber <= campaign.openingBlockNumber) continue;
        const updated = await deps.storage.recordCampaignMark(id, mark, portfolios);
        campaignMarkAt.set(id, now);
        discoveryCampaigns.value = await deps.storage.listCampaigns();
        for (const botId of campaign.botIds) {
          if (updated.status !== 'running' || updated.progress[botId]?.outcome !== 'active') await revoke(botId);
        }
        if (updated.status !== 'running') await deps.live.stopCampaign(id);
        await refresh();
      } catch (failure) {
        for (const botId of bots.value.filter((bot) => bot.discoveryCampaignId === id).map((bot) => bot.id))
          await revoke(botId);
        await deps.live.stopCampaign(id).catch(setError);
        await refresh().catch(setError);
        setError(failure);
      }
    }
  };

  /** Persist goal progress before requesting a decision; completed goals revoke authority without liquidation. */
  const checkGoal = async (bot: BotDefinition, candle?: BotCandle, persistActive = true): Promise<boolean> => {
    assertLegacyGoalRecords(bot);
    if (!bot.goal) return false;
    const previous = JSON.stringify(bot.goalState);
    const state = evaluateBotGoal(bot, deps.now(), candle);
    if (!state) return false;
    bot.goalState = state;
    const completed = state.outcome !== 'active';
    if (completed) {
      revoke(bot.id);
      if (!['idle', 'stopped'].includes(bot.status)) bot.status = 'paused';
    }
    if (completed || (persistActive && previous !== JSON.stringify(state))) {
      if (!(await deps.storage.saveGoalProgress(bot.id, bot.goal, state))) throw new Error('bots.errors.stale');
    }
    return completed;
  };

  /** Single scheduler; missed intervals are never replayed after a sleeping browser wakes. */
  const tick = async (height?: number) => {
    if (disposed) return;
    const now = deps.now();
    const suspended = now - lastTick > 60_000;
    lastTick = now;
    if (suspended) pauseLegacySessions();
    if (ticking || busy.value) return;
    ticking = true;
    try {
      const context = syncContext();
      const block = Number.isSafeInteger(height) && height! > 0 ? height : undefined;
      if (block !== undefined) {
        if (latestFinalizedBlock !== undefined && block < latestFinalizedBlock) return;
        latestFinalizedBlock = block;
      }
      status.value = deps.agent.status();
      await recordActiveCampaignMarks(now);
      for (const id of [...sessions]) {
        const version = sessionVersions.get(id);
        const currentSession = () => sessions.has(id) && sessionVersions.get(id) === version;
        let bot = await find(id);
        if (hasGoalExecutionMarker(bot)) {
          void revoke(id);
          continue;
        }
        try {
          if (await checkGoal(bot)) continue;
          if (
            suspended ||
            bot.status !== 'running' ||
            now >= bot.sessionExpiresAt ||
            (bot.mode === 'live' &&
              (!sameBotAccount(bot.account, status.value.wallet.address) ||
                bot.network !== status.value.node.genesisHash ||
                !status.value.wallet.connected ||
                !status.value.node.connected))
          ) {
            revoke(id);
            bot.status = 'paused';
            event(bot, 'bots.events.sessionPaused');
            await deps.storage.saveBot(bot);
            continue;
          }
          const goalEpisodes = bot.research ? validateGoalResearchSnapshot(bot.research) : undefined;
          const lastBlock = cadence.get(id) ?? {};
          const evaluationInterval =
            bot.strategy.kind === 'ai' ? bot.strategy.intervalMs : Math.min(bot.strategy.intervalMs, 60_000);
          const blockEvaluation =
            !goalEpisodes &&
            block !== undefined &&
            evaluationInterval % 6000 === 0 &&
            lastBlock.evaluated !== undefined;
          if (
            blockEvaluation
              ? block! - lastBlock.evaluated! < evaluationInterval / 6000
              : now - (goalEpisodes ? (lastBlock.checkedAt ?? 0) : bot.state.lastEvaluatedAt) < evaluationInterval
          )
            continue;
          if (goalEpisodes) cadence.set(id, { ...lastBlock, checkedAt: now });
          const blockFill =
            !goalEpisodes &&
            block !== undefined &&
            bot.strategy.intervalMs % 6000 === 0 &&
            lastBlock.filled !== undefined;
          const fillDue = !blockFill || block! - lastBlock.filled! >= bot.strategy.intervalMs / 6000;
          if (!fillDue && bot.strategy.kind === 'ai') continue;
          // Hourly rules act only on a new completed close. Until this hour's history brings one, an evaluation
          // can only hold, so quote and revalue at most once a minute rather than on every block.
          const hourlyHistory =
            !goalEpisodes && bot.strategy.kind === 'rules' ? currentHourHistory(id, now) : undefined;
          const lastValued = valuedAt.get(id);
          if (
            hourlyHistory &&
            lastValued !== undefined &&
            now - lastValued < REVALUE_INTERVAL_MS &&
            ruleCloseConsumed(bot, hourlyHistory.candles, now)
          )
            continue;
          const livePriceSignal =
            !goalEpisodes && bot.strategy.kind === 'sma' && bot.strategy.signalTiming === 'live-price';
          // A cold history request may take longer than a quote's lifetime. Price the forming hour afterwards.
          const liveHistory = livePriceSignal || goalEpisodes ? await history(bot) : null;
          let observation = await market(bot);
          if (!currentSession() || (await find(id)).status !== 'running') continue;
          if (await checkGoal(bot, observation.candle)) continue;
          // Windowed signals retain hourly history; only an explicit SMA opt-in adds the current forming hour.
          const historical = liveHistory ?? (['sma', 'rules'].includes(bot.strategy.kind) ? await history(bot) : null);
          // Pause, Stop and expiry must also win before starting a paid provider request.
          if ((await find(id)).status !== 'running' || !currentSession()) continue;
          assertContext(context);
          if (deps.now() >= bot.sessionExpiresAt) throw new Error('bots.errors.session');
          if (historical && !historical.denominationVerified) throw new Error('bots.errors.denomination');
          const candles = goalEpisodes
            ? goalEpisodeSignalCandles(historical!, bot.strategy, deps.now())
            : historical && livePriceSignal
              ? livePriceSmaCandles(historical, observation.candle, deps.now())
              : (historical?.candles ?? observation.candles);
          if (!candles.length || deps.now() - candles[candles.length - 1].timestamp > 7_200_000)
            throw new Error('bots.errors.stale');
          const signalTimestamp = candles.at(-1)!.timestamp;
          if (goalEpisodes && signalTimestamp <= bot.state.lastEvaluatedAt) continue;
          if (!bot.equity.length) addEquity(bot, observation.candle);
          const evaluatedAt = deps.now();
          const decision = evaluateStrategy(
            blockFill
              ? {
                  ...bot,
                  state: { ...bot.state, lastTradeAt: fillDue ? 0 : evaluatedAt },
                }
              : bot,
            candles,
            evaluatedAt
          );
          // Admission uses finalized block evidence; actual execution timestamps remain authoritative in storage.
          decision.state.lastTradeAt = bot.state.lastTradeAt;
          // The consumed hour survives pause/reload; fresh valuation checks have a separate session clock.
          decision.state.lastEvaluatedAt = goalEpisodes ? signalTimestamp : now;
          bot.state = decision.state;
          if (block !== undefined) cadence.set(id, { ...cadence.get(id), evaluated: block });
          const tradesBefore = bot.portfolio.trades;
          let proposal = decision.proposal;
          if (goalEpisodes) {
            // Consume the causal signal before quoting, even if its eventual fill is rejected.
            // Execution uses today's fresh quote; replay's next-close price remains an hourly approximation.
            await deps.storage.saveBot(bot);
            if (!currentSession() || (await find(id)).status !== 'running') continue;
          }
          if (bot.strategy.kind === 'ai') {
            const client = providers.get(id);
            if (!client) throw new Error('bots.errors.provider');
            const ai = await client.propose(bot, candles);
            proposal = ai.proposal;
            bot.apiUsage.requests += ai.usage.requests;
            bot.apiUsage.inputTokens += ai.usage.inputTokens;
            bot.apiUsage.outputTokens += ai.usage.outputTokens;
          }
          // User controls win over a response which arrives after Pause/Stop.
          if (!currentSession() || (await find(id)).status !== 'running') continue;
          assertContext(context);
          if (await checkGoal(bot)) continue;
          if (deps.now() >= bot.sessionExpiresAt) throw new Error('bots.errors.session');
          if (bot.goal && bot.strategy.kind === 'ai' && proposal.action !== 'hold') {
            // A provider request can outlive its input prices. Revalue before obtaining an executable trade quote.
            observation = await market(bot);
            if (!currentSession() || (await find(id)).status !== 'running') continue;
            assertContext(context);
            if (await checkGoal(bot, observation.candle)) continue;
          }
          if (proposal.action === 'hold') {
            event(bot, proposal.reason, 'hold');
          } else if (bot.mode === 'paper') {
            const { input, output, inputCodec } = proposalInput(bot, proposal);
            const plan = await deps.agent.planSwap({
              assetIn: { address: input.address },
              assetOut: { address: output.address },
              amount: proposal.amount,
              side: 'input',
              slippageTolerance: bot.policy.slippagePercent,
            });
            assertQuote(bot, proposal, plan.quote);
            if (
              plan.expiresAt <= deps.now() ||
              plan.warnings.some((w) => w.severity === 'critical') ||
              plan.fees.some((f) => f.source === 'unavailable')
            )
              throw new Error('bots.errors.quote');
            const fee = plan.fees.find((f) => f.asset.address === bot.policy.feeAsset.address);
            if (!fee || !codec(fee.amountCodec)) throw new Error('bots.errors.quote');
            if (!currentSession() || (await find(id)).status !== 'running') continue;
            assertContext(context);
            if (await checkGoal(bot)) continue;
            if (deps.now() >= bot.sessionExpiresAt) throw new Error('bots.errors.session');
            const fill = {
              inputAsset: input.address,
              inputCodec,
              outputAsset: output.address,
              outputCodec: plan.quote.minMaxCodec,
              feeAsset: fee.asset.address,
              feeCodec: fee.amountCodec,
            };
            if (bot.goal?.lossMetric === 'drawdown') {
              observation = await market(bot);
              if (!currentSession() || (await find(id)).status !== 'running') continue;
              assertContext(context);
              if (await checkGoal(bot, observation.candle)) continue;
              if (plan.expiresAt <= deps.now()) throw new Error('bots.errors.quote');
              // The same conservative success and failed-fee projections guard paper and live fills.
              const authoritative = await find(id);
              if (!currentSession() || authoritative.status !== 'running') continue;
              if (
                JSON.stringify(authoritative.portfolio) !== JSON.stringify(bot.portfolio) ||
                JSON.stringify(authoritative.goal) !== JSON.stringify(bot.goal) ||
                authoritative.goalState?.startedAt !== bot.goalState?.startedAt ||
                authoritative.goalState?.baselineValue !== bot.goalState?.baselineValue
              )
                throw new Error('bots.errors.stale');
              const admission = assessGoalTradeAdmission(authoritative, fill, observation.candle, deps.now());
              if (admission.goalState) bot.goalState = admission.goalState;
              if (admission.rejection) {
                if (admission.goalState?.outcome !== 'active' && admission.goalState)
                  await deps.storage.saveGoalProgress(id, bot.goal, admission.goalState);
                throw new Error(admission.rejection);
              }
              assertContext(context);
              if (plan.expiresAt <= deps.now()) throw new Error('bots.errors.quote');
              if (deps.now() >= bot.sessionExpiresAt) throw new Error('bots.errors.session');
            }
            bot.portfolio = applyPaperFill(bot, fill);
            bot.state.lastTradeAt = deps.now();
            event(bot, proposal.reason, 'trade');
          } else {
            // Save signal state before handing off; reload the authoritative finalized ledger afterwards.
            event(bot, proposal.reason, 'hold');
            await deps.storage.saveBot(bot);
            await deps.live.execute(bot, proposal);
            bot = await find(id);
          }
          if (!currentSession()) continue;
          if (block !== undefined && bot.portfolio.trades > tradesBefore)
            cadence.set(id, { ...cadence.get(id), filled: latestFinalizedBlock ?? block });
          const revalueFill = bot.goal && proposal.action !== 'hold';
          if (revalueFill) {
            // Persist the fill before any fallible market read or terminal goal pause. Live holdings are already finalized.
            await deps.storage.saveBot(bot);
            observation = await market(bot);
            if (!currentSession() || (await find(id)).status !== 'running') continue;
            assertContext(context);
          }
          addEquity(bot, observation.candle);
          await deps.storage.saveBot(bot);
          // The goal reducer writes only progress/status, so both fill and refreshed chart must already be durable.
          if (revalueFill) await checkGoal(bot, observation.candle);
        } catch (failure) {
          if (!currentSession()) continue;
          revoke(id);
          bot = await find(id);
          if (failure instanceof Error && failure.message === 'bots.errors.goalComplete' && (await checkGoal(bot)))
            continue;
          bot.status = 'attention';
          setError(failure);
          event(bot, error.value, 'error');
          await deps.storage.saveBot(bot);
        }
      }
      await refresh();
    } catch (failure) {
      for (const id of [...sessions]) revoke(id);
      setError(failure);
    } finally {
      ticking = false;
      if (blockQueued && !disposed) {
        blockQueued = false;
        const nextBlock = queuedBlock;
        queuedBlock = undefined;
        queueMicrotask(() => void tick(nextBlock));
      }
    }
  };
  /** Revoke only the requested sessions immediately; late persistence cannot overwrite a newer Start. */
  const pauseSessions = (ids: Iterable<string>) => {
    const selected = new Set(ids);
    const campaignIds = new Set(
      [...selected]
        .map((id) => bots.value.find((bot) => bot.id === id)?.discoveryCampaignId)
        .filter((id): id is string => Boolean(id))
    );
    for (const id of selected) {
      const goal = isGoalId(id);
      const stopped = revoke(id);
      const version = sessionVersions.get(id);
      if (goal) {
        void stopped.then(refresh).catch(setError);
        continue;
      }
      void find(id)
        .then(async (bot) => {
          if (sessionVersions.get(id) !== version) return;
          if (hasGoalExecutionMarker(bot)) {
            await revoke(id);
            await refresh();
            return;
          }
          bot.status = 'paused';
          event(bot, 'bots.events.sessionPaused');
          return deps.storage.saveBot(bot);
        })
        .catch(setError);
    }
    for (const id of campaignIds) void deps.live.stopCampaign(id).catch(setError);
  };
  const pauseAll = () => pauseSessions([...sessions, ...goalSessions, ...pendingStarts]);
  const pauseLegacySessions = () => pauseSessions([...sessions, ...pendingStarts].filter((id) => !isGoalId(id)));
  /** Rebind subscriptions after a connection change; stale subscription callbacks cannot schedule work. */
  const bindBlocks = async () => {
    if (!deps.subscribeBlocks || disposed || subscribing) return;
    const context = nodeContext();
    if (unsubscribeBlocks && blockSubscriptionContext === context) return;
    unsubscribeBlocks?.();
    unsubscribeBlocks = undefined;
    blockSubscriptionContext = context;
    const version = ++subscriptionVersion;
    if (!deps.agent.status().node.connected) return;
    subscribing = true;
    try {
      const stop = await deps.subscribeBlocks((height) => {
        if (!disposed && version === subscriptionVersion && nodeContext() === context) {
          const block = Number.isSafeInteger(height) && height! > 0 ? height : undefined;
          if (block !== undefined) {
            if (latestFinalizedBlock !== undefined && block <= latestFinalizedBlock) return;
            latestFinalizedBlock = block;
          }
          if (ticking) {
            blockQueued = true;
            queuedBlock = block;
          } else void tick(block);
        }
      });
      if (disposed || version !== subscriptionVersion || nodeContext() !== context) stop();
      else unsubscribeBlocks = stop;
    } catch {
      /* Bounded polling remains available while subscription setup retries. */
    } finally {
      subscribing = false;
    }
  };
  /** Refresh public liquidity eligibility without consulting wallet balances or excluding lesser-known tokens. */
  const refreshAssets = async () => {
    if (assetsLoading.value || disposed) return;
    assetsLoading.value = true;
    const context = nodeContext();
    try {
      const found = deps.eligibleAssets ? await deps.eligibleAssets() : await deps.agent.assets();
      if (!disposed && (deps.eligibleAssets || nodeContext() === context) && (deps.eligibleAssets || found.length)) {
        assets.value = found.map(cleanAsset);
        assetsError.value = '';
        assetsLoaded.value = true;
      }
    } catch (failure) {
      // Expose only recognized public errors; retrying never clears failure before a successful read.
      if (!disposed) {
        const key = failure instanceof Error ? failure.message : '';
        assetsError.value = ['bots.errors.stale', 'bots.errors.config', 'bots.errors.denomination'].includes(key)
          ? key
          : 'bots.errors.stale';
      }
    } finally {
      assetsLoading.value = false;
      assetsAt = deps.now();
    }
  };
  const visibility = () => {
    // Campaign authority requires an active tab; other legacy sessions retain their original behavior.
    if (document.hidden)
      pauseSessions([
        ...pendingStarts,
        ...[...sessions].filter((id) => Boolean(bots.value.find((bot) => bot.id === id)?.discoveryCampaignId)),
      ]);
  };

  const discardGoalReview = (id: string) => {
    const entry = goalReviews.get(id);
    goalReviews.delete(id);
    if (entry) deps.goalApplication?.discardReview(entry.review);
  };
  const prepareGoalReview = async (options: { signal?: AbortSignal; draftId?: string; bundleId?: string } = {}) => {
    const app = deps.goalApplication;
    if (!app?.bundleIds.length) throw Error('bots.errors.research');
    const original = readConnectionIdentity();
    const current = () => {
      if (disposed || options.signal?.aborted || readConnectionIdentity() !== original)
        throw Error('bots.errors.session');
    };
    current();
    const ready = await deps.agent.ready({ requireNode: true, requireWallet: true });
    current();
    status.value = ready;
    const summary = await app.prepareQualification(options.bundleId ?? app.bundleIds[0]);
    current();
    const review = await app.preview({
      bundleId: summary.bundleId,
      draftId: options.draftId ?? crypto.randomUUID(),
      account: ready.wallet.address,
      source: ready.wallet.source,
    });
    try {
      current();
      const bot = goalReviewPresentation(summary, review, deps.now());
      discardGoalReview(bot.id);
      goalReviews.set(bot.id, { review, summary, identity: original });
      return {
        bot,
        funding:
          review.funding.kind === 'preview'
            ? { sufficient: review.funding.sufficient, assets: copy(review.funding.assets) }
            : { sufficient: true, assets: [] },
        draftId: review.draftId,
      };
    } catch (error) {
      app.discardReview(review);
      throw error;
    }
  };
  const prepareExistingGoalReview = async (id: string, options: { signal?: AbortSignal } = {}) => {
    const app = deps.goalApplication;
    if (!app?.bundleIds.length) throw Error('bots.errors.research');
    const original = readConnectionIdentity();
    const current = () => {
      if (disposed || options.signal?.aborted || readConnectionIdentity() !== original)
        throw Error('bots.errors.session');
    };
    current();
    const ready = await deps.agent.ready({ requireNode: true, requireWallet: true });
    current();
    const { qualification: summary, review } = await app.previewExisting({
      botId: id,
      account: ready.wallet.address,
      source: ready.wallet.source,
    });
    try {
      current();
      if (review.bot.id !== id) throw Error('bots.errors.research');
      const bot = goalReviewPresentation(summary, review, deps.now());
      discardGoalReview(id);
      goalReviews.set(id, { review, summary, identity: original });
      return { bot, funding: copy(review.funding) };
    } catch (error) {
      app.discardReview(review);
      throw error;
    }
  };

  /** Re-read verified history and replay the sealed holdout before any live campaign review. */
  const verifyDiscoveryFinalist = async (
    finalist: DiscoveryFinalist,
    session: NonNullable<Awaited<ReturnType<ReturnType<typeof createIndexedDbDiscoveryStore>['load']>>>,
    maxDrawdownPercent: string
  ) => {
    if (
      finalist.status !== 'qualified' ||
      finalist.holdoutState !== 'complete' ||
      finalist.template.mode !== 'paper' ||
      finalist.template.account !== 'paper' ||
      finalist.template.network !== 'paper' ||
      finalist.template.sessionExpiresAt !== 0 ||
      finalist.template.strategy.kind === 'ai' ||
      JSON.stringify(finalist.template.strategy) !== JSON.stringify(finalist.strategy) ||
      JSON.stringify(finalist.template.research) !== JSON.stringify(finalist.research) ||
      finalist.research.validation !== 'holdout' ||
      !finalist.research.qualification ||
      finalist.holdout.startAt !== session.window.holdoutStartAt ||
      finalist.holdout.endAt !== session.window.endAt ||
      !passesDiscoveryGate(finalist.holdout, maxDrawdownPercent, 5)
    )
      throw new Error('bots.errors.research');
    const qualification = finalist.research.qualification;
    if (
      qualification.startAt !== finalist.holdout.startAt ||
      qualification.endAt !== finalist.holdout.endAt ||
      qualification.returnPercent !== finalist.holdout.returnPercent ||
      qualification.drawdownPercent !== finalist.holdout.drawdownPercent ||
      qualification.trades !== finalist.holdout.trades ||
      qualification.coverage !== finalist.holdout.coverage
    )
      throw new Error('bots.errors.research');
    const settings = {
      ...finalist.settings,
      historyStartAt: session.window.startAt,
      historyEndAt: session.window.endAt,
    };
    const researchBot = createResearchBot(settings, session.assets, deps.now());
    const history = await discoveryReviewHistory.load(researchBot, settings);
    if (
      !completeDiscoveryHistory(history, session.window.startAt, session.window.endAt) ||
      JSON.stringify(history.identity) !== JSON.stringify(finalist.historyIdentity) ||
      (await fingerprintDiscoveryHistory(history)) !== finalist.historyFingerprint
    )
      throw new Error('bots.errors.history');
    const holdoutHistory = {
      ...history,
      candles: history.candles.filter(
        (candle) => candle.timestamp >= session.window.holdoutStartAt && candle.timestamp <= session.window.endAt
      ),
    };
    const warmup = history.candles.filter((candle) => candle.timestamp < session.window.holdoutStartAt).slice(-201);
    const replay = runResearch(
      { ...finalist.settings, historyStartAt: session.window.holdoutStartAt, historyEndAt: session.window.endAt },
      session.assets,
      { kind: 'historical', history: holdoutHistory },
      deps.now(),
      { strategy: finalist.strategy, warmupCandles: warmup }
    );
    const comparable = compareResearchResult(replay, warmup.length);
    if (
      replay.result.returnPercent !== finalist.holdout.returnPercent ||
      replay.result.drawdownPercent !== finalist.holdout.drawdownPercent ||
      replay.result.trades !== finalist.holdout.trades ||
      replay.result.coverage !== finalist.holdout.coverage ||
      comparable.excessReturnPercent !== finalist.holdout.excessReturnPercent ||
      comparable.benchmark?.returnPercent !== finalist.holdout.benchmarkReturnPercent
    )
      throw new Error('bots.errors.research');
    await assertReviewDenomination(finalist.historyIdentity);
  };

  /** Read combined transferable funding without giving any bot a signer. */
  const campaignFunding = async (campaignBots: BotDefinition[]) => {
    if (!deps.readAssetBalance) throw new Error('bots.errors.balance');
    const account = campaignBots[0].account;
    const network = campaignBots[0].network;
    const existing = (await deps.storage.listBots()).filter(
      (bot) =>
        sameBotAccount(bot.account, account) &&
        bot.network === network &&
        bot.mode === 'live' &&
        !['idle', 'stopped'].includes(bot.status) &&
        !campaignBots.some((member) => member.id === bot.id)
    );
    const all = [...existing, ...campaignBots];
    const assetByAddress = new Map<string, BotAsset>();
    for (const bot of all)
      for (const asset of [bot.assetIn, bot.assetOut, bot.policy.feeAsset]) assetByAddress.set(asset.address, asset);
    const balances = Object.fromEntries(
      await Promise.all(
        [...assetByAddress.values()].map(async (asset) => [
          asset.address,
          codec(await deps.readAssetBalance!(asset.address, account, asset.decimals)).toString(),
        ])
      )
    );
    const assetsWithFunds = [...assetByAddress.values()].map((asset) => {
      const balance = codec(balances[asset.address]);
      const committed = existing.reduce((sum, bot) => sum + codec(bot.portfolio.holdings[asset.address] ?? '0'), 0n);
      const required = campaignBots.reduce((sum, bot) => sum + codec(bot.portfolio.holdings[asset.address] ?? '0'), 0n);
      return {
        asset,
        availableCodec: (balance > committed ? balance - committed : 0n).toString(),
        requiredCodec: required.toString(),
      };
    });
    return {
      sufficient: assetsWithFunds.every((item) => codec(item.availableCodec) >= codec(item.requiredCodec)),
      assets: assetsWithFunds,
      balances,
    };
  };
  const api = {
    bots,
    selectedId,
    selectedBot,
    assets,
    assetsLoading,
    assetsError,
    assetsLoaded,
    loading,
    busy,
    error,
    chartCandles,
    backtestResult,
    walletConnected,
    externalWallet,
    providerConnectedIds,
    sessionActiveIds,
    connectionIdentity,
    discoveryCampaigns,
    /** Recheck a complete sealed checkpoint and form one unsigned, memory-only campaign review. */
    prepareDiscoveryCampaign: (approval: Omit<DiscoveryApproval, 'password'>): Promise<DiscoveryCampaignReview> =>
      guard(async () => {
        if (disposed || document.hidden || deps.isExternal()) throw new Error('bots.errors.wallet');
        const finalists = approval.finalists;
        if (
          !Array.isArray(finalists) ||
          finalists.length < 1 ||
          finalists.length > 3 ||
          new Set(finalists.map((item) => item.id)).size !== finalists.length
        )
          throw new Error('bots.errors.research');
        const checkpoint = await createIndexedDbDiscoveryStore().load();
        if (!checkpoint || checkpoint.status !== 'complete' || checkpoint.phase !== 'complete')
          throw new Error('bots.errors.research');
        const selected = finalists.map((supplied) => {
          const stored = checkpoint.finalists.find((item) => item.id === supplied.id);
          if (!stored || JSON.stringify(stored) !== JSON.stringify(supplied)) throw new Error('bots.errors.research');
          return stored;
        });
        const ready = await deps.agent.ready({ requireNode: true, requireWallet: true });
        status.value = ready;
        if (
          !ready.wallet.connected ||
          !ready.wallet.address ||
          !ready.node.connected ||
          !ready.node.genesisHash ||
          deps.isExternal()
        )
          throw new Error('bots.errors.wallet');
        const identity = readConnectionIdentity();
        const campaignId = crypto.randomUUID();
        const limits: Record<string, string> = {};
        const campaignBots: BotDefinition[] = [];
        for (const finalist of selected) {
          const entry = approval.values[finalist.id];
          if (
            !entry ||
            !checkpoint.pairs.some((pair) => pair.key === finalist.pairKey && pair.status === 'ready') ||
            finalist.historyIdentity.genesisHash !== ready.node.genesisHash ||
            !assets.value.some((asset) => asset.address === finalist.template.assetIn.address) ||
            !assets.value.some((asset) => asset.address === finalist.template.assetOut.address)
          )
            throw new Error('bots.errors.research');
          await verifyDiscoveryFinalist(finalist, checkpoint, entry.maxDrawdownPercent);
          if (identity !== readConnectionIdentity()) throw new Error('bots.errors.session');
          const bot = createPaperBotFromTemplate(finalist.template, checkpoint.assets, deps.now());
          const { allocation, orderLimit, fee } = checkedStudiedDiscoveryLimits(bot, entry);
          if (
            codec(allocation) <= 0n ||
            codec(orderLimit) <= 0n ||
            codec(fee) <= 0n ||
            codec(orderLimit) > codec(allocation) ||
            codec(toCodec(bot.strategy.amount, bot.assetIn.decimals)) > codec(orderLimit)
          )
            throw new Error('bots.errors.policy');
          const initial = { [bot.assetIn.address]: allocation, [bot.assetOut.address]: '0' };
          initial[XOR.address] = (codec(initial[XOR.address] ?? '0') + codec(fee)).toString();
          bot.mode = 'live';
          bot.status = 'paused';
          bot.account = ready.wallet.address;
          bot.network = ready.node.genesisHash;
          bot.discoveryCampaignId = campaignId;
          bot.sessionExpiresAt = 0;
          bot.portfolio = { initial: copy(initial), holdings: copy(initial), feesPaidCodec: '0', trades: 0 };
          bot.policy.feeBudgetCodec = fee;
          bot.policy.maxTradeCodec[bot.assetIn.address] = orderLimit;
          bot.policy.sessionDurationMs = DISCOVERY_GRANT_MAX_MS;
          bot.research = copyResearchSnapshot(finalist.research, deps.now());
          delete bot.goal;
          delete bot.goalState;
          validateBotDefinition(bot);
          limits[bot.id] = entry.maxDrawdownPercent;
          campaignBots.push(bot);
        }
        const mark = await campaignMark(campaignBots);
        if (
          identity !== readConnectionIdentity() ||
          selected.some((item) => item.historyIdentity.denominator !== mark.denominator)
        )
          throw new Error('bots.errors.denomination');
        const campaign = createDiscoveryCampaign(
          campaignId,
          campaignBots,
          mark,
          toCodec(approval.sharedCapXor, XOR.decimals),
          limits,
          deps.now()
        );
        const funding = await campaignFunding(campaignBots);
        if (identity !== readConnectionIdentity()) throw new Error('bots.errors.session');
        const review: DiscoveryCampaignReview = {
          id: campaignId,
          campaign: copy(campaign),
          bots: copy(campaignBots),
          mark: copy(mark),
          funding: { sufficient: funding.sufficient, assets: funding.assets },
          expiresAt: deps.now() + 60_000,
        };
        discoveryCampaignReviews.set(campaignId, { ...review, identity });
        return copy(review);
      }),
    /** One password unlocks only the unchanged reviewed set, after fresh funding and finalized cap checks. */
    startDiscoveryCampaign: (reviewId: string, password: string): Promise<void> =>
      guard(async () => {
        const review = discoveryCampaignReviews.get(reviewId);
        if (
          !review ||
          review.expiresAt <= deps.now() ||
          review.identity !== readConnectionIdentity() ||
          document.hidden ||
          !password
        )
          throw new Error('bots.errors.session');
        const managed = campaignStorage();
        const mark = await campaignMark(review.bots);
        if (mark.denominator !== review.mark.denominator || review.identity !== readConnectionIdentity())
          throw new Error('bots.errors.denomination');
        const committed = review.bots.reduce((sum, bot) => sum + codec(mark.values[bot.id]?.capitalXorCodec ?? ''), 0n);
        if (committed > codec(review.campaign.sharedCapXorCodec)) throw new Error('bots.errors.policy');
        const funding = await campaignFunding(review.bots);
        if (!funding.sufficient) throw new Error('bots.errors.balance');
        const existing = (await managed.listCampaigns()).find((item) => item.id === reviewId);
        if (existing) {
          if (
            JSON.stringify(existing.consent) !== JSON.stringify(review.campaign.consent) ||
            existing.status !== 'paused'
          )
            throw new Error('bots.errors.policy');
          const latestBots = await deps.storage.listBots();
          if (
            review.bots.some((bot) => {
              const latest = latestBots.find((item) => item.id === bot.id);
              return (
                !latest ||
                latest.status !== bot.status ||
                JSON.stringify(latest.portfolio) !== JSON.stringify(bot.portfolio)
              );
            })
          )
            throw new Error('bots.errors.stale');
          if (
            (await deps.storage.listOrders()).some(
              (order) =>
                sameBotAccount(order.account, existing.account) &&
                order.network === existing.network &&
                pendingOrder(order)
            )
          )
            throw new Error('bots.errors.pending');
        } else {
          const campaign = createDiscoveryCampaign(
            reviewId,
            copy(review.bots),
            mark,
            review.campaign.sharedCapXorCodec,
            Object.fromEntries(review.bots.map((bot) => [bot.id, review.campaign.progress[bot.id].maxDrawdownPercent])),
            deps.now()
          );
          await managed.createCampaign(campaign, copy(review.bots), funding.balances);
        }
        await deps.live.authorizeCampaign(reviewId, password);
        const active = (await managed.listCampaigns()).find((item) => item.id === reviewId);
        if (!active || active.status !== 'running') throw new Error('bots.errors.session');
        for (const id of active.botIds) if (active.progress[id].outcome === 'active') sessions.add(id);
        syncActiveIds();
        lastTick = deps.now();
        discoveryCampaignReviews.delete(reviewId);
        await refresh();
      }),
    /** Revoke the complete signing grant immediately and durably pause every member bot. */
    pauseDiscoveryCampaign: (id: string): Promise<void> => {
      const campaign = discoveryCampaigns.value.find((item) => item.id === id);
      if (campaign)
        for (const botId of campaign.botIds) {
          sessions.delete(botId);
          sessionVersions.set(botId, (sessionVersions.get(botId) ?? 0) + 1);
        }
      syncActiveIds();
      const stopped = deps.live.stopCampaign(id);
      return guard(async () => {
        await stopped;
        await refresh();
      }, true);
    },
    /** Close the entire fixed set and release its allocations after receipt reconciliation. */
    closeDiscoveryCampaign: (id: string): Promise<void> => {
      const visible = discoveryCampaigns.value.find((item) => item.id === id);
      if (visible)
        for (const botId of visible.botIds) {
          sessions.delete(botId);
          sessionVersions.set(botId, (sessionVersions.get(botId) ?? 0) + 1);
        }
      syncActiveIds();
      const stopped = deps.live.stopCampaign(id);
      return guard(async () => {
        await stopped;
        const managed = campaignStorage();
        const campaign = (await managed.listCampaigns()).find((item) => item.id === id);
        if (!campaign || campaign.status === 'running' || campaign.grant) throw new Error('bots.errors.session');
        const stored = await deps.storage.listBots();
        const members = campaign.botIds.map((botId) => stored.find((bot) => bot.id === botId));
        if (members.some((bot) => !bot)) throw new Error('bots.errors.storage');
        for (const bot of members as BotDefinition[])
          if ((await deps.storage.listOrders(bot.id)).some(pendingOrder)) await deps.live.reconcile(bot);
        await managed.closeCampaign(id);
        await refresh();
      }, true);
    },
    /** Explicit resume review; this does not restore the previous in-memory signer. */
    prepareDiscoveryCampaignResume: (id: string): Promise<DiscoveryCampaignReview> =>
      guard(async () => {
        const managed = campaignStorage();
        const campaign = (await managed.listCampaigns()).find((item) => item.id === id);
        if (!campaign || campaign.status !== 'paused' || document.hidden || deps.isExternal())
          throw new Error('bots.errors.policy');
        const stored = await deps.storage.listBots();
        const members = campaign.botIds.map((botId) => stored.find((bot) => bot.id === botId));
        if (members.some((bot) => !bot)) throw new Error('bots.errors.storage');
        for (const bot of members as BotDefinition[])
          if ((await deps.storage.listOrders(bot.id)).some(pendingOrder)) await deps.live.reconcile(bot);
        if (
          (await deps.storage.listOrders()).some(
            (order) =>
              sameBotAccount(order.account, campaign.account) &&
              order.network === campaign.network &&
              pendingOrder(order)
          )
        )
          throw new Error('bots.errors.pending');
        const refreshed = await deps.storage.listBots();
        const campaignBots = campaign.botIds.map((botId) =>
          refreshed.find((bot) => bot.id === botId)
        ) as BotDefinition[];
        const mark = await campaignMark(campaignBots);
        if (mark.denominator !== campaign.denominator) throw new Error('bots.errors.denomination');
        const funding = await campaignFunding(campaignBots);
        const review: DiscoveryCampaignReview = {
          id,
          campaign: copy(campaign),
          bots: copy(campaignBots),
          mark,
          funding: { sufficient: funding.sufficient, assets: funding.assets },
          expiresAt: deps.now() + 60_000,
        };
        discoveryCampaignReviews.set(id, { ...review, identity: readConnectionIdentity() });
        return copy(review);
      }),
    /** Public settlement evidence for an explicitly chosen feedback campaign; contains no signer. */
    readDiscoveryCampaignOrders: async (id: string): Promise<BotOrder[]> => {
      const campaign = (await campaignStorage().listCampaigns()).find((item) => item.id === id);
      if (!campaign) throw new Error('bots.errors.policy');
      const orders = await deps.storage.listOrders();
      return copy(orders.filter((order) => campaign.botIds.includes(order.botId)));
    },
    readConnectionIdentity,
    readNetworkIdentity: nodeContext,
    /** Read-only setup hint. Approval still rechecks every balance under the live account lease. */
    readWalletFunding: async (assetInAddress: string) => {
      const selected = assets.value.find((asset) => asset.address === assetInAddress);
      const current = deps.agent.status();
      const account = current.wallet.address;
      if (!selected || !account || !current.wallet.connected || !current.node.connected || !deps.readAssetBalance)
        throw new Error('bots.errors.wallet');
      const identity = readConnectionIdentity();
      const addresses = [...new Set([assetInAddress, XOR.address])];
      const amounts = await Promise.all(
        addresses.map((address) =>
          deps.readAssetBalance!(address, account, address === XOR.address ? XOR.decimals : selected.decimals)
        )
      );
      if (identity !== readConnectionIdentity() || disposed) throw new Error('bots.errors.session');
      const balances = Object.fromEntries(
        addresses.map((address, index) => [address, codec(amounts[index]).toString()])
      );
      return { assetInAddress, assetInCodec: balances[assetInAddress], xorCodec: balances[XOR.address] };
    },
    exactGoalAvailable: Boolean(deps.goalApplication?.bundleIds.length),
    /** Load one trusted release and preview its exact budget without persisting a bot. */
    prepareGoalReview: (options: { signal?: AbortSignal } = {}) => guard(() => prepareGoalReview(options)),
    /** Refresh the original draft, including after a failed Start, without replacing its epoch. */
    refreshGoalReview: (id: string, options: { signal?: AbortSignal } = {}) =>
      guard(async () => {
        const old = goalReviews.get(id);
        if (!old) throw Error('bots.errors.stale');
        deps.goalApplication!.discardReview(old.review);
        if (old.review.kind === 'goal-application-existing-review-v1') return prepareExistingGoalReview(id, options);
        return prepareGoalReview({ ...options, draftId: old.review.draftId, bundleId: old.review.bundleId });
      }),
    /** Explicit UI approval only; exact initialization never goes through legacy saveBot/authorize. */
    approveGoalReview: (id: string) =>
      guard(async () => {
        const entry = goalReviews.get(id),
          app = deps.goalApplication;
        if (!entry || !app || entry.identity !== readConnectionIdentity()) throw Error('bots.errors.session');
        const bot =
          entry.review.kind === 'goal-application-existing-review-v1'
            ? await app.approveExisting(entry.review)
            : await app.approveFunding(entry.review);
        await refresh();
        if (disposed || goalReviews.get(id) !== entry || entry.identity !== readConnectionIdentity())
          throw Error('bots.errors.session');
        selectedId.value = bot.id;
        return bot;
      }),
    discardGoalReview,
    /** Re-review the original stored allocation and pinned release without reconstructing a funding draft. */
    resumeGoalReview: (id: string, options: { signal?: AbortSignal } = {}) =>
      guard(() => prepareExistingGoalReview(id, options)),
    initialize(): Promise<void> {
      if (initializing) return initializing;
      if (initialized) return Promise.resolve();
      loading.value = true;
      initializing = (async () => {
        try {
          if (deps.storage.listCampaigns && deps.storage.pauseCampaign) {
            for (const campaign of await deps.storage.listCampaigns())
              if (campaign.status === 'running') await deps.storage.pauseCampaign(campaign.id);
          }
          await refresh();
          selectedId.value ||= bots.value[0]?.id ?? '';
          status.value = deps.agent.status();
          await refreshAssets();
          initialized = true;
          void bindBlocks();
          timer = setInterval(() => {
            status.value = copy(deps.agent.status());
            syncActiveIds();
            void bindBlocks();
            if (!unsubscribeBlocks) void tick();
            else if (deps.now() - lastTick > 60_000) pauseLegacySessions();
            if (deps.eligibleAssets && deps.now() - assetsAt >= 30_000) void refreshAssets();
          }, 1_000);
          window.addEventListener('pagehide', pauseAll);
          window.addEventListener('offline', pauseAll);
          document.addEventListener('visibilitychange', visibility);
          if (selectedId.value && status.value.node.connected) void api.selectBot(selectedId.value);
        } catch (failure) {
          setError(failure);
        } finally {
          loading.value = false;
          initializing = null;
        }
      })();
      return initializing;
    },
    /** Read persisted order evidence for an existing exact goal; no reconciliation or authority is granted. */
    async readGoalOrders(id: string) {
      const bot = await find(id);
      if (!hasGoalExecutionMarker(bot)) throw new Error('bots.errors.config');
      return deps.storage.listOrders(id);
    },
    async selectBot(id: string) {
      selectedId.value = id;
      backtestResult.value = null;
      chartCandles.value = histories.get(id)?.history.candles ?? [];
      const bot = bots.value.find((item) => item.id === id);
      if (bot && hasGoalExecutionMarker(bot)) return;
      if (bot) {
        try {
          const data = await history(bot);
          if (!data.candles.length || !data.denominationVerified) await market(bot);
        } catch {
          try {
            await market(bot);
          } catch (failure) {
            setError(failure);
          }
        }
      }
    },
    createBot: (draft: BotDraft) =>
      guard(async () => {
        const bot = createBotDefinition(draft, assets.value, deps.now());
        validateBotDefinition(bot);
        await deps.storage.saveBot(bot);
        await refresh();
        selectedId.value = bot.id;
        backtestResult.value = null;
        if (deps.agent.status().node.connected) void api.selectBot(bot.id);
      }),
    createPaperBot: (template: BotDefinition, settings?: PaperBotOptions) =>
      guard(async () => {
        const bot = createPaperBotFromTemplate(template, assets.value, deps.now());
        const research = settings?.research ? copyResearchSnapshot(settings.research, bot.createdAt) : undefined;
        const preserveTestedTrigger = research?.source === 'historical' || research?.source === 'imported';
        const dip = settings?.thresholdPercent;
        if (bot.strategy.kind === 'threshold' && !preserveTestedTrigger) {
          if (!Number.isSafeInteger(dip) || dip! < 0 || dip! > 50) throw new Error('bots.errors.config');
        }
        await deps.agent.ready({ requireNode: true, requireWallet: false });
        const context = syncContext();
        const candle = await deps.market(deps.agent, bot, deps.now());
        assertContext(context);
        const price = parseBotPrice(candle.close);
        const capital = new FPNumber(fromCodec(bot.portfolio.initial[bot.assetIn.address], bot.assetIn.decimals), 36);
        // The preview's output cap was calculated from its own starting price.
        // Replace it with the original paper capital valued at this real quote.
        bot.policy.maxTradeCodec[bot.assetOut.address] = toCodec(
          decimalRatio(capital, price).value.toFixed(bot.assetOut.decimals, 0),
          bot.assetOut.decimals
        );
        if (!preserveTestedTrigger) {
          bot.strategy.threshold = candle.close;
          if (bot.strategy.kind === 'threshold') {
            bot.strategy.threshold = fromCodec(
              ((codec(toCodec(candle.close, 36)) * BigInt(100 - dip!)) / 100n).toString(),
              36
            );
          }
        }
        if (research) bot.research = research;
        validateBotDefinition(bot);
        await deps.storage.saveBot(bot);
        await refresh();
        selectedId.value = bot.id;
        backtestResult.value = null;
        chartCandles.value = [];
      }),
    /** Prepare an unsigned, unsaved live review; historical results never grant session authority. */
    prepareLiveBot: (
      template: BotDefinition,
      research: BotResearchSnapshot,
      denomination: NonNullable<BotHistory['identity']>,
      options: { sessionDurationMs?: number } = {}
    ) =>
      guard(async () => {
        // Longer than a day is reserved for walk-forward rule studies, whose positions take days to unwind.
        const sessionDurationMs = options.sessionDurationMs ?? 24 * 60 * 60_000;
        const extended = sessionDurationMs > SESSION_MAX_MS;
        if (
          !Number.isSafeInteger(sessionDurationMs) ||
          sessionDurationMs < 60 * 60_000 ||
          sessionDurationMs > EXTENDED_SESSION_MAX_MS ||
          (extended && (template.strategy.kind !== 'rules' || research?.validation !== 'walk-forward'))
        )
          throw new Error('bots.errors.policy');
        if (!research || research.source === 'demo' || template.strategy.kind === 'ai')
          throw new Error('bots.errors.config');
        const bot = createPaperBotFromTemplate(template, assets.value, deps.now());
        bot.research = copyResearchSnapshot(research, bot.createdAt);
        // Copy only original capital, never simulated holdings or profits. XOR reserve is already included once.
        bot.portfolio.initial = Object.fromEntries(
          [bot.assetIn, bot.assetOut, bot.policy.feeAsset].map((asset) => [
            asset.address,
            codec(template.portfolio.initial[asset.address] ?? '0').toString(),
          ])
        );
        bot.portfolio.holdings = copy(bot.portfolio.initial);
        const goalEvidence = validateGoalResearchSnapshot(bot.research);
        if (goalEvidence) assertGoalResearchBinding(bot, goalEvidence);
        if (
          goalEvidence?.protocol === 'goal-episodes-v3' &&
          (denomination.genesisHash !== goalEvidence.history.identity.genesisHash ||
            denomination.denominator !== goalEvidence.history.identity.denominator)
        )
          throw new Error('bots.errors.denomination');
        if (codec(bot.portfolio.initial[XOR.address] ?? '0') < codec(bot.policy.feeBudgetCodec))
          throw new Error('bots.errors.feeBudget');
        const ready = await deps.agent.ready({ requireNode: true, requireWallet: true });
        status.value = ready;
        if (!ready.wallet.connected || !ready.wallet.address || !ready.node.connected || !ready.node.genesisHash)
          throw new Error('bots.errors.wallet');
        if (bot.research.feeObservation && bot.research.feeObservation.genesisHash !== ready.node.genesisHash)
          throw new Error('bots.errors.network');
        await assertReviewDenomination(denomination);
        if (denomination.genesisHash !== ready.node.genesisHash) throw new Error('bots.errors.network');
        const identity = readConnectionIdentity();
        const candle = await deps.market(deps.agent, bot, deps.now());
        if (identity !== readConnectionIdentity()) throw new Error('bots.errors.session');
        // Episode evidence binds both directions to one training-frozen policy.
        if (!goalEvidence) {
          const capital = new FPNumber(fromCodec(bot.portfolio.initial[bot.assetIn.address], bot.assetIn.decimals), 36);
          bot.policy.maxTradeCodec[bot.assetOut.address] = toCodec(
            decimalRatio(capital, parseBotPrice(candle.close)).value.toFixed(bot.assetOut.decimals, 0),
            bot.assetOut.decimals
          );
        }
        bot.policy.sessionDurationMs = sessionDurationMs;
        if (extended) bot.extendedSession = true;
        bot.mode = 'live';
        bot.account = ready.wallet.address;
        bot.network = ready.node.genesisHash;
        validateBotDefinition(bot);
        await assertReviewDenomination(denomination);
        if (identity !== readConnectionIdentity()) throw new Error('bots.errors.session');
        liveReviews.set(bot.id, {
          bot: copy(bot),
          identity,
          denomination: copy(denomination),
          expiresAt: deps.now() + 300_000,
        });
        return copy(bot);
      }),
    /** Refresh budget readiness for this unchanged review; checking balances grants no authority. */
    previewLiveFunding: (id: string) =>
      guard(async () => {
        const review = liveReviews.get(id);
        if (!review || review.expiresAt <= deps.now() || review.identity !== readConnectionIdentity())
          throw new Error('bots.errors.session');
        await assertReviewDenomination(review.denomination);
        const funding = await deps.live.previewAllocation(copy(review.bot));
        if (review.identity !== readConnectionIdentity()) throw new Error('bots.errors.session');
        return funding;
      }),
    /** Save exactly the reviewed draft, once. Only a later explicit start can authorize the live executor. */
    saveLiveBot: (draft: BotDefinition) =>
      guard(async () => {
        const review = liveReviews.get(draft.id);
        if (!review || review.expiresAt <= deps.now() || review.identity !== readConnectionIdentity())
          throw new Error('bots.errors.session');
        if (JSON.stringify(review.bot) !== JSON.stringify(draft)) throw new Error('bots.errors.config');
        validateBotDefinition(review.bot);
        await assertReviewDenomination(review.denomination);
        if (!(await deps.live.previewAllocation(copy(review.bot))).sufficient) throw new Error('bots.errors.balance');
        if (review.identity !== readConnectionIdentity()) throw new Error('bots.errors.session');
        const existing = (await deps.storage.listBots()).find((bot) => bot.id === draft.id);
        if (existing) {
          if (JSON.stringify(existing) !== JSON.stringify(review.bot)) throw new Error('bots.errors.config');
        } else await deps.storage.saveBot(copy(review.bot));
        await refresh();
        selectedId.value = draft.id;
        backtestResult.value = null;
        chartCandles.value = [];
        return draft.id;
      }),
    /** Discard an unsigned review on cancel, account change, completion, or page exit. */
    discardLiveReview(id: string): void {
      liveReviews.delete(id);
    },
    updateBot: (edited: BotDefinition) =>
      guard(async () => {
        const current = await find(edited.id);
        if (current.discoveryCampaignId) throw new Error('bots.errors.policy');
        if (
          current.status === 'running' ||
          (current.mode === 'live' && !['idle', 'stopped'].includes(current.status))
        ) {
          throw new Error('bots.errors.stopToEdit');
        }
        const next = copy(current);
        next.name = edited.name;
        next.strategy = copyStrategyConfig(edited.strategy);
        if (JSON.stringify(next.strategy) !== JSON.stringify(current.strategy)) {
          delete next.state.lastRuleObservationAt;
          delete next.state.lastLiveObservationAt;
          delete next.state.previousSignal;
          // The stored summary describes the old specification, not this edited rule.
          delete next.research;
        }
        next.policy = copy(edited.policy);
        if (JSON.stringify(next.policy) !== JSON.stringify(current.policy)) delete next.research;
        next.provider = edited.provider;
        next.model = edited.model;
        next.endpoint = edited.endpoint;
        const goal = edited.goal ? copyBotGoal(edited.goal) : undefined;
        if (JSON.stringify(goal) !== JSON.stringify(current.goal)) {
          next.goal = goal;
          delete next.goalState;
        }
        if (current.mode !== edited.mode) {
          next.mode = edited.mode;
          next.portfolio = {
            initial: copy(current.portfolio.initial),
            holdings: copy(current.portfolio.initial),
            feesPaidCodec: '0',
            trades: 0,
          };
          next.state = { lastEvaluatedAt: 0, lastTradeAt: 0 };
          next.equity = [];
          next.activity = [];
          next.status = 'idle';
          delete next.goalState;
        }
        validateBotDefinition(next);
        if (next.provider !== current.provider || next.model !== current.model || next.endpoint !== current.endpoint) {
          providers.get(next.id)?.disconnect();
          providers.delete(next.id);
          providerConnectedIds.value = [...providers.keys()];
        }
        await deps.storage.saveBot(next);
        histories.delete(next.id);
        cadence.delete(next.id);
        await refresh();
      }),
    /** Deliberately begin a new goal from current holdings on the next Start; never sell or reset the portfolio. */
    resetGoal: (id: string) =>
      guard(async () => {
        const bot = await find(id);
        if (!bot.goal) throw new Error('bots.errors.goal');
        if (bot.status === 'running' || (bot.mode === 'live' && !['idle', 'stopped'].includes(bot.status)))
          throw new Error('bots.errors.stopToEdit');
        revoke(id);
        delete bot.goalState;
        bot.status = 'idle';
        await deps.storage.saveBot(bot, { resetGoal: true });
        await refresh();
      }),
    startBot: (id: string, options: { password?: string; expectedConnection?: string } = {}) =>
      guard(async () => {
        pendingStarts.add(id);
        try {
          const version = sessionVersions.get(id);
          const assertStarting = () => {
            if (deps.now() - lastTick > 60_000) pauseAll();
            if (disposed || sessionVersions.get(id) !== version || document.hidden)
              throw new Error('bots.errors.session');
          };
          if (document.hidden) throw new Error('bots.errors.hidden');
          if (options.expectedConnection && options.expectedConnection !== readConnectionIdentity())
            throw new Error('bots.errors.session');
          const bot = await find(id);
          if (bot.discoveryCampaignId) throw new Error('bots.errors.policy');
          if (isGoalId(id) || hasGoalExecutionMarker(bot)) {
            assertStarting();
            if (!deps.goalRuntime) throw new Error('bots.errors.policy');
            const goal = readGoalExecutionBot(bot);
            const ready = await deps.agent.ready({ requireNode: true, requireWallet: true });
            assertStarting();
            const context = syncContext(id);
            assertStarting();
            if (options.expectedConnection && options.expectedConnection !== readConnectionIdentity())
              throw new Error('bots.errors.session');
            if (goal.network !== ready.node.genesisHash || goal.account !== ready.wallet.address)
              throw new Error('bots.errors.session');
            await deps.goalRuntime.start(goal, options.password);
            assertStarting();
            assertContext(context);
            if (!deps.goalRuntime.active(id)) throw new Error('bots.errors.session');
            sessionVersions.set(id, (sessionVersions.get(id) ?? 0) + 1);
            goalSessions.add(id);
            syncActiveIds();
            lastTick = deps.now();
            await refresh();
            return;
          }
          validateBotDefinition(bot);
          if (await checkGoal(bot)) throw new Error('bots.errors.goalComplete');
          if (bot.strategy.kind === 'ai' && !providers.has(id)) throw new Error('bots.errors.provider');
          const ready = await deps.agent.ready({ requireNode: true, requireWallet: bot.mode === 'live' });
          assertStarting();
          const context = syncContext(id);
          assertStarting();
          if (options.expectedConnection && options.expectedConnection !== readConnectionIdentity())
            throw new Error('bots.errors.session');
          if (bot.network !== 'paper' && bot.network !== ready.node.genesisHash) throw new Error('bots.errors.network');
          bot.network = ready.node.genesisHash;
          if (bot.mode === 'live') {
            // A paper record can become live without the simple-flow review.
            // Bind its retained study after resolving the real network, before any wallet authority.
            const goalEvidence = bot.research && validateGoalResearchSnapshot(bot.research);
            if (goalEvidence?.protocol === 'goal-episodes-v3') {
              assertGoalResearchBinding(bot, goalEvidence);
              await assertReviewDenomination(goalEvidence.history.identity);
              assertStarting();
              assertContext(context);
            }
            if (bot.account !== 'paper' && !sameBotAccount(bot.account, ready.wallet.address))
              throw new Error('bots.errors.wallet');
            bot.account = ready.wallet.address;
            await deps.live.reconcile(bot);
            if (bot.goal) bot.portfolio = (await find(id)).portfolio;
            assertStarting();
            assertContext(context);
            if (options.expectedConnection) {
              const review = liveReviews.get(id);
              if (!review || review.expiresAt <= deps.now() || review.identity !== options.expectedConnection)
                throw new Error('bots.errors.session');
              await assertReviewDenomination(review.denomination);
              if (options.expectedConnection !== readConnectionIdentity()) throw new Error('bots.errors.session');
              assertStarting();
            }
            if (bot.goal) {
              const observation = await market(bot);
              assertStarting();
              if (await checkGoal(bot, observation.candle, false)) throw new Error('bots.errors.goalComplete');
            }
            await deps.live.authorize(bot, options.password);
          } else {
            if (bot.goal) {
              const observation = await market(bot);
              assertStarting();
              if (await checkGoal(bot, observation.candle, false)) throw new Error('bots.errors.goalComplete');
            }
            bot.status = 'running';
            bot.sessionExpiresAt = deps.now() + bot.policy.sessionDurationMs;
            event(bot, 'bots.events.started');
            await deps.storage.saveBot(bot);
          }
          assertStarting();
          assertContext(context);
          sessionVersions.set(id, (sessionVersions.get(id) ?? 0) + 1);
          sessions.add(id);
          syncActiveIds();
          lastTick = deps.now();
          await refresh();
        } catch (failure) {
          await revoke(id).catch(() => undefined);
          throw failure;
        } finally {
          pendingStarts.delete(id);
        }
      }),
    pauseBot: (id: string) => {
      const goal = isGoalId(id);
      const stopped = revoke(id);
      const version = sessionVersions.get(id);
      return guard(async () => {
        await stopped;
        const bot = await find(id);
        if (sessionVersions.get(id) !== version) return;
        if (hasGoalExecutionMarker(bot) || goal) {
          if (!goal) await revoke(id);
          await refresh();
          return;
        }
        bot.status = 'paused';
        event(bot, 'bots.events.paused');
        await deps.storage.saveBot(bot);
        await refresh();
      }, true);
    },
    stopBot: (id: string) => {
      const goal = isGoalId(id);
      const stopped = revoke(id);
      const version = sessionVersions.get(id);
      providers.get(id)?.disconnect();
      providers.delete(id);
      providerConnectedIds.value = [...providers.keys()];
      return guard(async () => {
        await stopped;
        const bot = await find(id);
        if (bot.discoveryCampaignId) throw new Error('bots.errors.policy');
        if (hasGoalExecutionMarker(bot) || goal) {
          if (!goal) await revoke(id);
          await refresh();
          return;
        }
        if (bot.mode === 'live') await deps.live.reconcile(bot);
        if (sessionVersions.get(id) !== version) return;
        await deps.storage.stopBot(id);
        await refresh();
      }, true);
    },
    deleteBot: (id: string) =>
      guard(async () => {
        if ((await find(id)).discoveryCampaignId) throw new Error('bots.errors.policy');
        revoke(id);
        providers.get(id)?.disconnect();
        providers.delete(id);
        providerConnectedIds.value = [...providers.keys()];
        await deps.storage.deleteBot(id);
        await refresh();
        selectedId.value = bots.value[0]?.id ?? '';
      }),
    backtestBot: (id: string, options: BacktestOptions) =>
      guard(async () => {
        const context = syncContext();
        const bot = await find(id);
        const data = options.history ?? (await deps.history(bot, { days: options.days, interval: options.interval }));
        assertContext(context);
        backtestResult.value = runBacktest(bot, data, {
          slippagePercent: options.slippagePercent,
          feeCodec: toCodec(options.feeAmount, bot.policy.feeAsset.decimals),
          swapFeePercent: options.swapFeePercent,
          sellFeeCodec:
            options.sellFeeAmount === undefined
              ? undefined
              : toCodec(options.sellFeeAmount, bot.policy.feeAsset.decimals),
          sellSwapFeePercent: options.sellSwapFeePercent,
          priceImpactPercent: options.priceImpactPercent,
          sellPriceImpactPercent: options.sellPriceImpactPercent,
        });
        chartCandles.value = data.candles;
      }),
    connectProvider: (id: string, connection: AiConnection) =>
      guard(async () => {
        const bot = await find(id);
        if (bot.discoveryCampaignId) throw new Error('bots.errors.policy');
        if (bot.status === 'running') throw new Error('bots.errors.stopToEdit');
        providers.get(id)?.disconnect();
        providers.set(id, deps.ai(bot.provider, connection));
        providerConnectedIds.value = [...providers.keys()];
      }),
    /** Transfer an already connected, model-reviewed memory client without handling its raw credential again. */
    connectProviderClient: (
      id: string,
      client: BotAiClient,
      configuration: Pick<BotDefinition, 'provider' | 'model' | 'endpoint'>,
      signal?: AbortSignal
    ) =>
      guard(async () => {
        const bot = await find(id);
        if (bot.discoveryCampaignId) throw new Error('bots.errors.policy');
        if (disposed || signal?.aborted) throw new Error('bots.errors.stale');
        if (bot.status === 'running') throw new Error('bots.errors.stopToEdit');
        if (
          bot.provider !== configuration.provider ||
          bot.model !== configuration.model ||
          bot.endpoint !== configuration.endpoint
        )
          throw new Error('bots.errors.provider');
        const previous = providers.get(id);
        if (previous && previous !== client) previous.disconnect();
        providers.set(id, client);
        providerConnectedIds.value = [...providers.keys()];
      }),
    suggestStrategy: (id: string) =>
      guard(async () => {
        const bot = await find(id);
        if (bot.discoveryCampaignId) throw new Error('bots.errors.policy');
        const client = providers.get(id);
        if (!client) throw new Error('bots.errors.provider');
        const result = await client.suggest(bot, (await market(bot)).candles);
        bot.apiUsage.requests += result.usage.requests;
        bot.apiUsage.inputTokens += result.usage.inputTokens;
        bot.apiUsage.outputTokens += result.usage.outputTokens;
        await deps.storage.saveBot(bot);
        await refresh();
        return result.strategy;
      }),
    exportBot: (id: string) => {
      const bot = bots.value.find((item) => item.id === id);
      if (!bot) return;
      // Share strategy rules only: never include wallet identity, holdings, endpoint tokens, or credentials.
      const data = {
        version: 1,
        name: bot.name,
        assetIn: bot.assetIn,
        assetOut: bot.assetOut,
        strategy: bot.strategy,
        policy: bot.policy,
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'polkaswap-strategy.json';
      link.click();
      URL.revokeObjectURL(url);
    },
    tick,
    dispose() {
      disposed = true;
      for (const id of goalReviews.keys()) discardGoalReview(id);
      liveReviews.clear();
      pauseAll();
      deps.goalRuntime?.dispose();
      deps.goalApplication?.dispose();
      deps.live.dispose();
      providers.forEach((client) => client.disconnect());
      providers.clear();
      providerConnectedIds.value = [];
      if (timer) clearInterval(timer);
      subscriptionVersion++;
      unsubscribeBlocks?.();
      unsubscribeBlocks = undefined;
      window.removeEventListener('pagehide', pauseAll);
      window.removeEventListener('offline', pauseAll);
      document.removeEventListener('visibilitychange', visibility);
    },
  };
  return api;
}

/** Read a public balance for the current account without requiring an unlocked SDK account or signer. */
export async function readPublicWalletTransferableBalance(
  chain: Parameters<typeof getAssetBalance>[0],
  accountAddress: string,
  assetAddress: string,
  decimals: number
): Promise<string> {
  if (!chain?.isConnected) throw new Error('bots.errors.stale');
  const balance = await getAssetBalance(chain, accountAddress, assetAddress, decimals);
  return codec(String(balance.transferable)).toString();
}

let controller: ReturnType<typeof createBotTradingController> | undefined;
/** Keep a single in-tab scheduler when users navigate between Polkaswap pages. */
export function useBotTrading() {
  if (!controller) {
    const agent = installPolkaswapAgentApi();
    const storage = createBotStorage();
    const goalApplication = GOAL_APPLICATION_RELEASES.length
      ? createGoalApplication({ storage, agent, releases: GOAL_APPLICATION_RELEASES })
      : undefined;
    controller = createBotTradingController({
      agent,
      storage,
      live: createBotLiveExecutor(storage, agent),
      ...(goalApplication ? { goalApplication, goalRuntime: goalApplication.runtime } : {}),
      history: fetchBotHistory,
      identity: readHistoryIdentity,
      market: fetchBotMarketSnapshot,
      ai: createBotAiClient,
      now: Date.now,
      isExternal: () => Boolean(walletApi.signer),
      eligibleAssets: fetchLiquidBotAssets,
      readAssetBalance: (assetAddress, accountAddress, decimals) => {
        const chain = walletApi.connection?.api;
        if (!chain) throw new Error('bots.errors.stale');
        return readPublicWalletTransferableBalance(chain, accountAddress, assetAddress, decimals);
      },
      subscribeBlocks: async (onBlock) => {
        const chain = walletApi.connection?.api;
        if (!chain?.isConnected) throw new Error('bots.errors.stale');
        return chain.rpc.chain.subscribeFinalizedHeads((header) => onBlock(header.number.toNumber()));
      },
    });
  }
  return controller;
}
