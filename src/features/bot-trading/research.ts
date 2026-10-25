import { FPNumber } from '@/lib/substrate/math';
import { codec, fromCodec, percent, toCodec } from './amounts';
import { remainingFeeReserveCodec } from './allocation';
import { assessGoalTradeAdmission } from './goalAdmission';
import { copyBotGoal, evaluateBotGoal } from './goals';
import {
  applyPaperFill,
  copyStrategyConfig,
  decimalRatio,
  evaluateStrategy,
  parseBotPrice,
  portfolioPerformance,
  requiredStrategyCandles,
  valuePortfolio,
  validateStrategy,
  type PaperFill,
} from './engine';
import {
  createPlaygroundBot,
  PLAYGROUND_DEFAULT_SETTINGS,
  type PlaygroundSettings,
  type PlaygroundSource,
} from './playground';
import type {
  BacktestResult,
  BacktestTrade,
  BotAsset,
  BotCandle,
  BotDefinition,
  BotEquityPoint,
  BotGoal,
  BotGoalState,
  StrategyConfig,
} from './types';

/** A maximum-window rule needs 202 closes: 201 prior observations plus the funding close. */
export const MAX_EPISODE_WARMUP_CANDLES = 201;

/** Research controls are separate from the runtime strategy saved on a bot. */
export interface ResearchSettings extends PlaygroundSettings {
  validation: 'none' | 'holdout' | 'walk-forward';
  trainPercent: number;
  folds: number;
  optimize: boolean;
  slippagePercent: string;
  feeBudgetXor: string;
  networkFeeXor: string;
  swapFeePercent: string;
}

/** Research only accepts verified market history, never synthetic or uploaded prices. */
export type ResearchSource = PlaygroundSource;

/** Shared decision constraints, with goal and impact gates only for explicitly goal-aware episodes. */
export interface ResearchCheck {
  key: 'signal' | 'cooldown' | 'balance' | 'tradeLimit' | 'feeBudget' | 'goal' | 'priceImpact';
  passed: boolean;
  /** Runtime rejection, never inferred from a hypothetical successful fill. */
  reason?: 'bots.errors.goalComplete' | 'bots.errors.goalTradeCost';
  actual?: string;
  limit?: string;
  /** Denomination of codec evidence, including an insufficient external XOR fee reserve. */
  assetAddress?: string;
}

/**
 * One opportunity per completed decision bar, with execution at its next close.
 * Non-signal bars show a hypothetical buy; a sell signal shows its sell instead.
 * P&L marks the proposed fill to the common final close after entry slippage and
 * fees. Excluded opportunities overlap and are not a realizable portfolio.
 */
export interface ResearchCandidate {
  id: string;
  timestamp: number;
  signalTimestamp: number;
  action: 'buy' | 'sell';
  price: string;
  amount: string;
  selected: boolean;
  pnl: string;
  reason: string;
  checks: ResearchCheck[];
  endTimestamp: number;
  endPrice: string;
  costs: ResearchCosts;
}

/** Network and route costs valued at each execution close; route costs include pool fees and quote impact. */
export interface ResearchCosts {
  networkFeeXor: string;
  networkFeeInCapital: string;
  swapFeeInCapital: string;
}

export interface ResearchSummary {
  selectedProfit: string;
  excludedProfit: string;
  missedProfit: string;
  /** Positive magnitude of losses that the constraints excluded. */
  avoidedLoss: string;
  selectedCount: number;
  excludedCount: number;
}

/** Passive entry at the same next close, including observed entry costs and no invented exit trade. */
export interface ResearchBenchmark {
  returnPercent: string;
  drawdownPercent: string;
  trades: 1;
  initialValue: string;
  finalValue: string;
  costs: ResearchCosts;
}

/** Comparable period evidence; daily return is a linear rate, never an annualized forecast. */
export interface ResearchEvaluationEvidence {
  candleCount: number;
  candidateCount: number;
  durationMs: number;
  /** Earlier observations supplied only to initialize indicators, with no associated fills. */
  warmupCandles: number;
  returnPerDayPercent: string | null;
  /** Null when entry fees or available capital make the passive buy impossible. */
  benchmark: ResearchBenchmark | null;
  excessReturnPercent: string | null;
}

/** Chronological evaluation with fresh capital and the training-anchored rule. */
export interface ResearchFold {
  index: number;
  trainStart: number;
  trainEnd: number;
  testStart: number;
  testEnd: number;
  settings: ResearchSettings;
  train: BacktestResult;
  test: BacktestResult;
  searchCount: number;
  /** Optional so saved experiments created before comparable fold evidence remain readable. */
  trainEvidence?: ResearchEvaluationEvidence;
  testEvidence?: ResearchEvaluationEvidence;
  selectionObjective?: 'net-training-return';
  /** Excluded from training selection and test fills; available as past indicator context. */
  purge?: { candleCount: 1; start: number; end: number };
}

export interface ResearchResult {
  settings: ResearchSettings;
  bot: BotDefinition;
  source: ResearchSource;
  result: BacktestResult;
  tradeMarkers: BacktestTrade[];
  candidates: ResearchCandidate[];
  costs: ResearchCosts;
  summary: ResearchSummary;
  assumptions: {
    slippagePercent: string;
    feeAmount: string;
    feeCodec: string;
    networkFeeXor: string;
    swapFeePercent: string;
    sellNetworkFeeXor: string;
    sellSwapFeePercent: string;
    priceImpactPercent: string;
    sellPriceImpactPercent: string;
    execution: 'next-close';
    attribution: 'common-endpoint-mark-to-market';
  };
  validation: {
    mode: ResearchSettings['validation'];
    folds: ResearchFold[];
    purgeCandles: 1;
    tuned: boolean;
  };
  /** Latest training-only choice; applying it is an explicit UI action. */
  recommendedSettings: ResearchSettings;
  /** Full-horizon episode evidence; state latches while endpoint equity continues to be observed. */
  goalEvaluation?: {
    goal: BotGoal;
    fundingTimestamp: number;
    endingTimestamp: number;
    state: BotGoalState;
    /** Detached input provenance, present only when this episode supplied warmup. */
    warmupCandles?: BotCandle[];
    /** The supplied fixed output ceiling; omitted when derived from this episode. */
    outputTradeLimitCodec?: string;
  };
}

export const RESEARCH_DEFAULT_SETTINGS: Readonly<ResearchSettings> = Object.freeze({
  ...PLAYGROUND_DEFAULT_SETTINGS,
  // Three chronological held-out windows are the default evidence, with tuning still explicit.
  validation: 'walk-forward',
  trainPercent: 70,
  folds: 3,
  optimize: false,
  slippagePercent: '0.5',
  feeBudgetXor: '1',
  networkFeeXor: '',
  swapFeePercent: '',
});

/** A completed opportunity and its actual checks; validation does not invent endpoint attribution. */
export type ResearchDecision = Pick<
  ResearchCandidate,
  'id' | 'timestamp' | 'signalTimestamp' | 'action' | 'price' | 'amount' | 'selected' | 'reason' | 'checks'
> & { pnl?: string };

/** Causal execution refusals, distinct from absent signals and other failed prerequisites. */
export type ResearchExecutionRejection = 'priceImpact' | 'goalTradeCost' | 'feeBudget';

/** Read bounded replay checks without promoting hypothetical hold bars or invoking untrusted accessors. */
export function researchExecutionRejection(value: unknown): ResearchExecutionRejection | undefined {
  const fields = (input: unknown): Record<string, PropertyDescriptor> | undefined => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return;
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) return;
    const descriptors = Object.getOwnPropertyDescriptors(input);
    if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string' || !('value' in descriptors[key]))) return;
    return descriptors;
  };
  try {
    const candidate = fields(value);
    if (candidate?.selected?.value !== false) return;
    const raw = candidate.checks?.value as unknown;
    const keys: ResearchCheck['key'][] = [
      'signal',
      'cooldown',
      'balance',
      'tradeLimit',
      'feeBudget',
      'priceImpact',
      'goal',
    ];
    if (!Array.isArray(raw) || Object.getPrototypeOf(raw) !== Array.prototype) return;
    const descriptors = Object.getOwnPropertyDescriptors(raw as object);
    if (descriptors.length.value !== keys.length || Reflect.ownKeys(descriptors).length !== keys.length + 1) return;
    const checked = new Set<ResearchCheck['key']>();
    const rejected: Array<{ key: ResearchCheck['key']; reason: unknown }> = [];
    for (let index = 0; index < keys.length; index++) {
      const item = descriptors[String(index)];
      if (!item || !('value' in item)) return;
      const check = fields(item.value);
      const key = check?.key?.value as ResearchCheck['key'];
      const passed = check?.passed?.value as unknown;
      if (!keys.includes(key) || checked.has(key) || typeof passed !== 'boolean') return;
      const reason = check?.reason?.value as unknown;
      if (
        reason !== undefined &&
        (passed ||
          key !== 'goal' ||
          !['bots.errors.goalComplete', 'bots.errors.goalTradeCost'].includes(reason as string))
      )
        return;
      checked.add(key);
      if (!passed) rejected.push({ key, reason });
    }
    if (rejected.length !== 1) return;
    if (rejected[0].key === 'feeBudget') return 'feeBudget';
    if (rejected[0].key === 'priceImpact') return 'priceImpact';
    if (rejected[0].key === 'goal' && rejected[0].reason === 'bots.errors.goalTradeCost') return 'goalTradeCost';
  } catch {
    // Malformed worker-like data cannot manufacture a trusted explanation.
  }
}

export type ResearchGateTotals = Record<
  Exclude<ResearchCheck['key'], 'goal' | 'priceImpact'>,
  { passed: number; rejected: number }
> & {
  goal?: { passed: number; rejected: number };
  priceImpact?: { passed: number; rejected: number };
};

/** Actual bounded calculation checkpoints; consumers append deltas once, never replay them on a separate clock. */
export interface ResearchProgress {
  phase: 'replay' | 'validation';
  checkpoint: number;
  scope: 'study' | 'train' | 'test';
  fold?: number;
  variant?: number;
  scopeCompleted: number;
  scopeTotal: number;
  completed: number;
  total: number;
  /** At most 32 newly evaluated opportunities, including genuine validation checks. */
  decisions: ResearchDecision[];
  /** Main-thread retained current-scope evidence, available even after a visualization remounts. */
  scopeDecisions?: ResearchDecision[];
  /** Cumulative checks within this exact study, training choice, or held-out test. */
  gateTotals: ResearchGateTotals;
  /** Main-thread cumulative study outcomes retained across validation scopes; not a worker transport delta. */
  studyCandidates?: readonly ResearchCandidate[];
  /** Study-only deltas; validation never masquerades as the full study's trades. */
  candidates: ResearchCandidate[];
  tradeMarkers: BacktestTrade[];
  bot: BotDefinition;
  result: BacktestResult;
  costs: ResearchCosts;
  summary: ResearchSummary;
  equity: BotEquityPoint[];
  trades: number;
  timestamp: number;
}
/** An explicit deterministic strategy is evaluated unchanged, including in every validation fold. */
export interface ResearchOptions {
  strategy?: StrategyConfig;
  /** An independently funded, complete hourly episode using the runtime's goal and trade-cost gates. */
  goal?: BotGoal;
  /** Past hourly observations initialize indicators without funding or trading before a goal or holdout replay. */
  warmupCandles?: BotCandle[];
  /** A training-frozen output trade ceiling shared by every episode and the live policy. */
  outputTradeLimitCodec?: string;
  onProgress?: (progress: ResearchProgress) => void;
  /** A consumer acknowledges presentation before the evaluator advances to its next real slice. */
  awaitProgress?: (progress: ResearchProgress, signal?: AbortSignal) => Promise<void>;
  signal?: AbortSignal;
}
interface ResearchWork {
  completed: number;
  total: number;
  phase: ResearchProgress['phase'];
  checkpoint: number;
  scope: ResearchProgress['scope'];
  fold?: number;
  variant?: number;
  last?: ResearchProgress;
}
const PRECISION = 36;
const HOUR = 3_600_000;
const MAX_CANDLES = 10000;
const fp = (value: string) => new FPNumber(value, PRECISION);
const ZERO = fp('0');
const ONE = fp('1');
const HUNDRED = fp('100');

/** Validate research-only controls before allocating work or constructing policies. */
function validateResearchSettings(settings: ResearchSettings): void {
  if (
    !['none', 'holdout', 'walk-forward'].includes(settings.validation) ||
    !Number.isInteger(settings.trainPercent) ||
    settings.trainPercent < 50 ||
    settings.trainPercent > 80 ||
    !Number.isInteger(settings.folds) ||
    settings.folds < 2 ||
    settings.folds > 5 ||
    typeof settings.optimize !== 'boolean' ||
    percent(settings.slippagePercent, '10').lt(fp('0.01')) ||
    percent(settings.swapFeePercent, '10').lt(ZERO) ||
    percent(settings.sellSwapFeePercent ?? settings.swapFeePercent, '10').lt(ZERO) ||
    percent(settings.priceImpactPercent === undefined ? '0' : settings.priceImpactPercent).gte(HUNDRED) ||
    percent(settings.sellPriceImpactPercent === undefined ? '0' : settings.sellPriceImpactPercent).gte(HUNDRED)
  )
    throw new Error('bots.errors.config');
}

/** Check chronology and provenance once; retain exact prices without interpolation. */
function copySource(source: ResearchSource | undefined, settings: ResearchSettings, now: number): ResearchSource {
  if (!source || source.kind !== 'historical' || !source.history) throw new Error('bots.errors.history');
  const { history } = source;
  if (
    history.candles.length < 2 ||
    history.candles.length > MAX_CANDLES ||
    !Number.isSafeInteger(history.missing) ||
    history.missing < 0 ||
    !history.denominationVerified
  )
    throw new Error(!history.denominationVerified ? 'bots.errors.denomination' : 'bots.errors.history');
  // Partial verified history is usable as its actual observed range; missing coverage remains explicit.
  let previous = -1;
  for (const candle of history.candles) {
    if (
      !Number.isSafeInteger(candle.timestamp) ||
      candle.timestamp <= previous ||
      candle.timestamp > now ||
      candle.timestamp < (settings.historyStartAt ?? 0) ||
      (settings.historyEndAt !== undefined && candle.timestamp > settings.historyEndAt)
    )
      throw new Error('bots.errors.history');
    parseBotPrice(candle.close);
    if (candle.feeClose !== undefined) parseBotPrice(candle.feeClose);
    previous = candle.timestamp;
  }
  const copy = {
    ...history,
    candles: history.candles.map((candle) => ({ ...candle })),
    denominationVerified: true,
  };
  return { ...source, history: copy };
}

/** A goal cannot be shortened, optimized or silently evaluated across missing observations. */
function copyEpisodeGoal(goal: BotGoal, settings: ResearchSettings, source: ResearchSource): BotGoal {
  const copied = copyBotGoal(goal);
  if (settings.validation !== 'none' || settings.optimize || copied.durationMs % HOUR !== 0)
    throw new Error('bots.errors.config');
  const candles = source.history.candles;
  if (
    source.history.missing !== 0 ||
    candles.at(-1)!.timestamp - candles[0].timestamp !== copied.durationMs ||
    candles.length !== copied.durationMs / HOUR + 1 ||
    candles.some(
      (candle, index) =>
        candle.timestamp % HOUR !== 0 || (index > 0 && candle.timestamp - candles[index - 1].timestamp !== HOUR)
    )
  )
    throw new Error('bots.errors.history');
  return copied;
}

/** Validate a bounded, contiguous past-only indicator context without assigning it capital or goal progress. */
function copyEpisodeWarmup(candles: BotCandle[] | undefined, fundingTimestamp: number): BotCandle[] {
  if (candles === undefined) return [];
  if (!Array.isArray(candles) || candles.length > MAX_EPISODE_WARMUP_CANDLES) throw new Error('bots.errors.history');
  return candles.map((candle, index) => {
    if (!candle || candle.timestamp !== fundingTimestamp - (candles.length - index) * HOUR)
      throw new Error('bots.errors.history');
    if (!Number.isSafeInteger(candle.timestamp) || candle.timestamp < 0) throw new Error('bots.errors.history');
    parseBotPrice(candle.close);
    if (candle.feeClose !== undefined) parseBotPrice(candle.feeClose);
    return { ...candle };
  });
}

/** Anchor absolute rules only to the first training observation, never a later test price. */
function makeBot(
  settings: ResearchSettings,
  assets: BotAsset[],
  first: BotCandle,
  now: number,
  strategy?: StrategyConfig
): BotDefinition {
  const bot = createResearchBot(settings, assets, now, strategy);
  const reference = parseBotPrice(first.close);
  if (!strategy)
    bot.strategy.threshold = reference
      .mul(decimalRatio(fp(String(100 - settings.thresholdPercent)), HUNDRED))
      .toString();
  bot.policy.maxTradeCodec[bot.assetOut.address] = toCodec(
    decimalRatio(fp(settings.capital), reference).value.toFixed(bot.assetOut.decimals, 1),
    bot.assetOut.decimals
  );
  bot.policy.slippagePercent = settings.slippagePercent;
  return bot;
}

/** Build a wallet-independent template and preserve a reviewed strategy's exact monetary units. */
export function createResearchBot(
  settings: ResearchSettings,
  assets: BotAsset[],
  now = Date.now(),
  strategy?: StrategyConfig
): BotDefinition {
  const bot = createPlaygroundBot(settings, assets, now);
  if (strategy) {
    if (
      !['dca', 'threshold', 'sma', 'rules'].includes(strategy.kind) ||
      (strategy.kind !== 'rules' && strategy.kind !== settings.preset) ||
      settings.optimize ||
      !['above', 'below'].includes(strategy.direction) ||
      !Number.isSafeInteger(strategy.intervalMs) ||
      strategy.intervalMs < 6_000 ||
      strategy.intervalMs > 2_592_000_000 ||
      !Number.isInteger(strategy.fastWindow) ||
      !Number.isInteger(strategy.slowWindow) ||
      strategy.fastWindow < 2 ||
      strategy.slowWindow <= strategy.fastWindow ||
      strategy.slowWindow > 200 ||
      strategy.prompt !== ''
    )
      throw new Error('bots.errors.config');
    const amount = codec(toCodec(strategy.amount, bot.assetIn.decimals));
    if (amount <= 0n || amount > codec(bot.portfolio.initial[bot.assetIn.address]))
      throw new Error('bots.errors.amount');
    bot.strategy = copyStrategyConfig(strategy);
    bot.policy.maxTradeCodec[bot.assetIn.address] = amount.toString();
    validateStrategy(bot);
  }
  bot.policy.slippagePercent = settings.slippagePercent;
  return bot;
}

/** Sample chart geometry while retaining exact decimal values and the latest processed observation. */
function progressEquity(equity: BotEquityPoint[]): BotEquityPoint[] {
  const stride = Math.max(1, Math.ceil(equity.length / 126));
  return equity
    .filter((_point, index) => index % stride === 0 || index === equity.length - 1)
    .map((point) => ({ ...point }));
}

/** Round simulated outputs down to the asset's real base unit. */
function rounded(value: FPNumber, asset: BotAsset): string {
  return fromCodec(toCodec(value.value.toFixed(asset.decimals, 1), asset.decimals), asset.decimals);
}

/** Apply the dated directional pool-fee and impact scenarios plus slippage to the next completed close. */
function proposedFill(
  bot: BotDefinition,
  action: 'buy' | 'sell',
  amount: string,
  candle: BotCandle,
  feeCodec: string,
  swapFeePercent: string,
  priceImpactPercent = '0'
): PaperFill {
  const buying = action === 'buy';
  const input = buying ? bot.assetIn : bot.assetOut;
  const output = buying ? bot.assetOut : bot.assetIn;
  const price = parseBotPrice(candle.close);
  const proceeds = (buying ? decimalRatio(fp(amount), price) : fp(amount).mul(price))
    .mul(ONE.sub(decimalRatio(fp(bot.policy.slippagePercent), HUNDRED)))
    .mul(ONE.sub(decimalRatio(fp(swapFeePercent), HUNDRED)))
    .mul(ONE.sub(decimalRatio(fp(priceImpactPercent), HUNDRED)));
  return {
    inputAsset: input.address,
    inputCodec: toCodec(amount, input.decimals),
    outputAsset: output.address,
    outputCodec: toCodec(rounded(proceeds, output), output.decimals),
    feeAsset: bot.policy.feeAsset.address,
    feeCodec,
  };
}

/** Read every gate before mutating inventory; outputs cannot fund their own fee debit. */
function checksFor(bot: BotDefinition, fill: PaperFill, signal: boolean, execution: BotCandle): ResearchCheck[] {
  const fee = codec(fill.feeCodec);
  const reserve = codec(remainingFeeReserveCodec(bot));
  const input = codec(fill.inputCodec);
  const balance = codec(bot.portfolio.holdings[fill.inputAsset] ?? '0');
  const required = input + (fill.inputAsset === fill.feeAsset ? reserve : 0n);
  const availableFee = codec(bot.portfolio.holdings[fill.feeAsset] ?? '0');
  const externalFeeShortfall = fill.inputAsset !== fill.feeAsset && availableFee < reserve;
  const spent = codec(bot.portfolio.feesPaidCodec) + fee;
  return [
    { key: 'signal', passed: signal && input > 0n && codec(fill.outputCodec) > 0n },
    {
      key: 'cooldown',
      passed: bot.state.lastTradeAt === 0 || execution.timestamp - bot.state.lastTradeAt >= bot.strategy.intervalMs,
      actual: bot.state.lastTradeAt ? String(execution.timestamp - bot.state.lastTradeAt) : undefined,
      limit: String(bot.strategy.intervalMs),
    },
    {
      key: 'balance',
      passed: balance >= required && availableFee >= reserve,
      actual: (externalFeeShortfall ? availableFee : balance).toString(),
      limit: (externalFeeShortfall ? reserve : required).toString(),
      assetAddress: externalFeeShortfall ? fill.feeAsset : fill.inputAsset,
    },
    {
      key: 'tradeLimit',
      passed: input <= codec(bot.policy.maxTradeCodec[fill.inputAsset] ?? '0'),
      actual: fill.inputCodec,
      limit: bot.policy.maxTradeCodec[fill.inputAsset] ?? '0',
      assetAddress: fill.inputAsset,
    },
    {
      key: 'feeBudget',
      passed: spent <= codec(bot.policy.feeBudgetCodec),
      actual: spent.toString(),
      limit: bot.policy.feeBudgetCodec,
      assetAddress: fill.feeAsset,
    },
  ];
}

/** Mark a fill against holding its input until the endpoint; do not fabricate a closing trade. */
function attribution(bot: BotDefinition, fill: PaperFill, endpoint: BotCandle): string {
  const buying = fill.inputAsset === bot.assetIn.address;
  const input = fromCodec(fill.inputCodec, buying ? bot.assetIn.decimals : bot.assetOut.decimals);
  const output = fromCodec(fill.outputCodec, buying ? bot.assetOut.decimals : bot.assetIn.decimals);
  const end = parseBotPrice(endpoint.close);
  const feePrice =
    fill.feeAsset === bot.assetIn.address
      ? ONE
      : fill.feeAsset === bot.assetOut.address
        ? end
        : parseBotPrice(endpoint.feeClose ?? '');
  const fee = fp(fromCodec(fill.feeCodec, bot.policy.feeAsset.decimals)).mul(feePrice);
  return (buying ? fp(output).mul(end).sub(fp(input)) : fp(output).sub(fp(input).mul(end))).sub(fee).toString();
}

/** Value pool fees plus impact as route costs; slippage remains a distinct assumption. */
function fillCosts(bot: BotDefinition, fill: PaperFill, candle: BotCandle): ResearchCosts {
  const buying = fill.inputAsset === bot.assetIn.address;
  const amount = fromCodec(fill.inputCodec, buying ? bot.assetIn.decimals : bot.assetOut.decimals);
  const beforeSwapFee = proposedFill(bot, buying ? 'buy' : 'sell', amount, candle, fill.feeCodec, '0');
  const swapOutput = fromCodec(
    (codec(beforeSwapFee.outputCodec) - codec(fill.outputCodec)).toString(),
    buying ? bot.assetOut.decimals : bot.assetIn.decimals
  );
  const price = parseBotPrice(candle.close);
  const feePrice =
    fill.feeAsset === bot.assetIn.address
      ? ONE
      : fill.feeAsset === bot.assetOut.address
        ? price
        : parseBotPrice(candle.feeClose ?? '');
  const networkFeeXor = fromCodec(fill.feeCodec, bot.policy.feeAsset.decimals);
  return {
    networkFeeXor,
    networkFeeInCapital: fp(networkFeeXor).mul(feePrice).toString(),
    swapFeeInCapital: fp(swapOutput)
      .mul(buying ? price : ONE)
      .toString(),
  };
}

/** Each action uses the observed route and network costs for that swap direction. */
interface ReplayFees {
  buy: { feeCodec: string; swapFeePercent: string; priceImpactPercent: string };
  sell: { feeCodec: string; swapFeePercent: string; priceImpactPercent: string };
}

/**
 * Replay the runtime's exact signal, next-close fill, and inventory rules. Keep
 * only the longest SMA window in signal evaluation, avoiding quadratic history
 * validation while still exposing every candidate in the requested full replay.
 */
function* replay(
  bot: BotDefinition,
  source: ResearchSource,
  fees: ReplayFees,
  trace: boolean,
  work: ResearchWork,
  warmup?: { candles: readonly BotCandle[]; previousSignal?: BotDefinition['state']['previousSignal'] }
): Generator<
  ResearchProgress,
  {
    result: BacktestResult;
    tradeMarkers: BacktestTrade[];
    candidates: ResearchCandidate[];
    costs: ResearchCosts;
    previousSignal?: BotDefinition['state']['previousSignal'];
    goalState?: BotGoalState;
  },
  void
> {
  const candles = source.history.candles;
  const context = warmup?.candles ?? [];
  const observed = context.length ? [...context, ...candles] : candles;
  let current: BotDefinition = {
    ...bot,
    portfolio: {
      initial: { ...bot.portfolio.initial },
      holdings: { ...bot.portfolio.initial },
      feesPaidCodec: '0',
      trades: 0,
    },
    state: { lastEvaluatedAt: 0, lastTradeAt: 0 },
  };
  if (current.goal) {
    current.goalState = undefined;
    current.goalState = evaluateBotGoal(current, candles[0].timestamp, candles[0]);
  }
  if (!current.goal && bot.strategy.kind === 'sma' && context.length) {
    // Legacy folds retain their preceding signal. Newly funded goals, like live
    // start, use prior observations without inventing a pre-session crossover.
    current.state.previousSignal = warmup?.previousSignal;
    current.state = evaluateStrategy(current, [...context], context.at(-1)!.timestamp).state;
  }
  const initial = valuePortfolio(current, candles[0]);
  const equity = [{ timestamp: candles[0].timestamp - 1, value: initial, benchmark: initial }];
  const candidates: ResearchCandidate[] = [];
  const tradeMarkers: BacktestTrade[] = [];
  const costs: ResearchCosts = { networkFeeXor: '0', networkFeeInCapital: '0', swapFeeInCapital: '0' };
  const gateTotals: ResearchGateTotals = {
    signal: { passed: 0, rejected: 0 },
    cooldown: { passed: 0, rejected: 0 },
    balance: { passed: 0, rejected: 0 },
    tradeLimit: { passed: 0, rejected: 0 },
    feeBudget: { passed: 0, rejected: 0 },
    ...(current.goal ? { goal: { passed: 0, rejected: 0 }, priceImpact: { passed: 0, rejected: 0 } } : {}),
  };
  let decisions: ResearchDecision[] = [];
  let emittedCandidates = 0;
  let emittedTrades = 0;
  let peak = fp(initial);
  let drawdown = ZERO;
  let selectedProfit = ZERO;
  let excludedProfit = ZERO;
  let missedProfit = ZERO;
  let avoidedLoss = ZERO;
  let selectedCount = 0;
  const endpoint = candles[candles.length - 1];
  const window = requiredStrategyCandles(bot.strategy);
  equity.push({ timestamp: candles[0].timestamp, value: initial, benchmark: initial });
  for (let index = 0; index < candles.length - 1; index++) {
    const decisionCandle = candles[index];
    const execution = candles[index + 1];
    if (current.goal) current.goalState = evaluateBotGoal(current, decisionCandle.timestamp, decisionCandle);
    const decision = evaluateStrategy(
      { ...current, state: { ...current.state, lastTradeAt: 0 } },
      observed.slice(Math.max(0, context.length + index - window + 1), context.length + index + 1),
      decisionCandle.timestamp
    );
    const proposal = decision.proposal;
    current.state = { ...decision.state, lastTradeAt: current.state.lastTradeAt };
    // Allocation-blocked signals retain their direction and fail the balance gate.
    // Other hold bars show a hypothetical buy, explicitly gated by no signal.
    const noAllocation = proposal.reason === 'bots.events.noAllocation';
    const action = decision.blockedAction ?? (proposal.action === 'sell' ? 'sell' : 'buy');
    const amount =
      proposal.action !== 'hold'
        ? proposal.amount
        : noAllocation && action === 'sell'
          ? rounded(decimalRatio(fp(bot.strategy.amount), parseBotPrice(decisionCandle.close)), bot.assetOut)
          : bot.strategy.amount;
    const directionFees = fees[action];
    const fill = proposedFill(
      current,
      action,
      amount,
      execution,
      directionFees.feeCodec,
      directionFees.swapFeePercent,
      directionFees.priceImpactPercent
    );
    const checks = checksFor(current, fill, proposal.action !== 'hold' || noAllocation, execution);
    if (current.goal) {
      checks.push({
        key: 'priceImpact',
        passed: fp(directionFees.priceImpactPercent).lte(fp(current.policy.maxPriceImpactPercent)),
        actual: directionFees.priceImpactPercent,
        limit: current.policy.maxPriceImpactPercent,
      });
      current.goalState = evaluateBotGoal(current, execution.timestamp, execution);
      let rejection: ResearchCheck['reason'] =
        current.goalState?.outcome !== 'active' ? 'bots.errors.goalComplete' : undefined;
      // Admission applies a hypothetical fill, so existing monetary gates must pass first.
      // Persist only its observed state; rejected success/failure scenarios never become progress.
      if (!rejection && checks.every((check) => check.passed)) {
        const admission = assessGoalTradeAdmission(current, fill, execution, execution.timestamp);
        if (admission.goalState) current.goalState = admission.goalState;
        rejection = admission.rejection;
      }
      checks.push({ key: 'goal', passed: rejection === undefined, ...(rejection ? { reason: rejection } : {}) });
    }
    const selected = checks.every((check) => check.passed);
    for (const check of checks) gateTotals[check.key]![check.passed ? 'passed' : 'rejected']++;
    const evidence: ResearchDecision = {
      id: `trade-${index}-${execution.timestamp}`,
      timestamp: execution.timestamp,
      signalTimestamp: decisionCandle.timestamp,
      action,
      price: execution.close,
      amount,
      selected,
      reason: proposal.reason,
      checks,
    };
    if (selected) {
      current.portfolio = applyPaperFill(current, fill);
      current.state.lastTradeAt = execution.timestamp;
      if (current.goal) current.goalState = evaluateBotGoal(current, execution.timestamp, execution);
      if (trace)
        tradeMarkers.push({
          ...fill,
          timestamp: execution.timestamp,
          action,
          price: execution.close,
          amount,
          reason: proposal.reason,
        });
    }
    const candidateCosts = trace ? fillCosts(bot, fill, execution) : undefined;
    if (candidateCosts && selected) {
      costs.networkFeeXor = fp(costs.networkFeeXor).add(fp(candidateCosts.networkFeeXor)).toString();
      costs.networkFeeInCapital = fp(costs.networkFeeInCapital).add(fp(candidateCosts.networkFeeInCapital)).toString();
      costs.swapFeeInCapital = fp(costs.swapFeeInCapital).add(fp(candidateCosts.swapFeeInCapital)).toString();
    }
    if (candidateCosts) {
      evidence.pnl = attribution(bot, fill, endpoint);
      candidates.push({
        ...evidence,
        pnl: evidence.pnl,
        endTimestamp: endpoint.timestamp,
        endPrice: endpoint.close,
        costs: candidateCosts,
      });
      const pnl = fp(evidence.pnl);
      if (selected) {
        selectedCount++;
        selectedProfit = selectedProfit.add(pnl);
      } else {
        excludedProfit = excludedProfit.add(pnl);
        if (pnl.gt(ZERO)) missedProfit = missedProfit.add(pnl);
        if (pnl.lt(ZERO)) avoidedLoss = avoidedLoss.sub(pnl);
      }
    }
    decisions.push(evidence);
    const value = valuePortfolio(current, execution);
    equity.push({
      timestamp: execution.timestamp,
      value,
      benchmark: valuePortfolio(current, execution, current.portfolio.initial),
    });
    if (trace) {
      const currentValue = fp(value);
      peak = peak.max(currentValue);
      if (peak.gt(ZERO)) drawdown = drawdown.max(decimalRatio(peak.sub(currentValue), peak).mul(HUNDRED));
    }
    work.completed++;
    if ((index + 1) % 32 === 0 || index === candles.length - 2) {
      // Fold progress keeps the full replay's comparable graph; training samples are not presented as its results.
      const checkpoint = {
        phase: work.phase,
        checkpoint: ++work.checkpoint,
        scope: work.scope,
        fold: work.fold,
        variant: work.variant,
        scopeCompleted: index + 1,
        scopeTotal: candles.length - 1,
        completed: work.completed,
        total: work.total,
        timestamp: execution.timestamp,
        decisions,
        gateTotals,
        candidates: candidates.slice(emittedCandidates),
        tradeMarkers: tradeMarkers.slice(emittedTrades),
      };
      if (trace) {
        const points = progressEquity(equity);
        work.last = {
          ...checkpoint,
          bot,
          result: {
            dataSource: source.kind,
            portfolio: current.portfolio,
            equity: points,
            trades: current.portfolio.trades,
            drawdownPercent: drawdown.toString(),
            returnPercent: fp(initial).gt(ZERO)
              ? decimalRatio(fp(value).sub(fp(initial)), fp(initial))
                  .mul(HUNDRED)
                  .toString()
              : '0',
            coverage: candles.length / (candles.length + source.history.missing),
          },
          costs: { ...costs },
          summary: {
            selectedProfit: selectedProfit.toString(),
            excludedProfit: excludedProfit.toString(),
            missedProfit: missedProfit.toString(),
            avoidedLoss: avoidedLoss.toString(),
            selectedCount,
            excludedCount: candidates.length - selectedCount,
          },
          equity: points,
          trades: current.portfolio.trades,
        };
      }
      // Detached bounded deltas prevent a renderer from altering the evaluator or its final evidence.
      yield structuredClone({ ...work.last!, ...checkpoint });
      emittedCandidates = candidates.length;
      emittedTrades = tradeMarkers.length;
      decisions = [];
    }
  }
  // The final close cannot execute another fill, but its indicator side is past evidence
  // for a later fold. Preserve it even when the following purge candle lies on zero.
  const previousSignal =
    bot.strategy.kind === 'sma'
      ? evaluateStrategy(
          { ...current, state: { ...current.state, lastTradeAt: 0 } },
          observed.slice(-window),
          endpoint.timestamp
        ).state.previousSignal
      : current.state.previousSignal;
  return {
    candidates,
    costs,
    tradeMarkers,
    previousSignal,
    ...(current.goalState ? { goalState: { ...current.goalState } } : {}),
    result: {
      dataSource: source.kind,
      portfolio: current.portfolio,
      equity,
      trades: current.portfolio.trades,
      ...portfolioPerformance(equity),
      coverage: candles.length / (candles.length + source.history.missing),
    },
  };
}

/** Aggregate exact attribution without implying overlapping excluded trades were investable. */
function summarize(candidates: ResearchCandidate[]): ResearchSummary {
  let selectedProfit = ZERO;
  let excludedProfit = ZERO;
  let missedProfit = ZERO;
  let avoidedLoss = ZERO;
  let selectedCount = 0;
  for (const trade of candidates) {
    const pnl = fp(trade.pnl);
    if (trade.selected) {
      selectedCount++;
      selectedProfit = selectedProfit.add(pnl);
    } else {
      excludedProfit = excludedProfit.add(pnl);
      if (pnl.gt(ZERO)) missedProfit = missedProfit.add(pnl);
      if (pnl.lt(ZERO)) avoidedLoss = avoidedLoss.sub(pnl);
    }
  }
  return {
    selectedProfit: selectedProfit.toString(),
    excludedProfit: excludedProfit.toString(),
    missedProfit: missedProfit.toString(),
    avoidedLoss: avoidedLoss.toString(),
    selectedCount,
    excludedCount: candidates.length - selectedCount,
  };
}

/** Search no more than three nearby variants of the chosen method; ties retain current settings. */
function variants(settings: ResearchSettings): ResearchSettings[] {
  if (!settings.optimize) return [{ ...settings }];
  const patches: Partial<ResearchSettings>[] =
    settings.preset === 'dca'
      ? settings.intervalBlocks !== undefined
        ? [
            { intervalBlocks: Math.max(1, Math.floor(settings.intervalBlocks / 2)) },
            { intervalBlocks: Math.min(432_000, settings.intervalBlocks * 2) },
          ]
        : [
            { intervalHours: Math.max(1, Math.floor(settings.intervalHours / 2)) },
            { intervalHours: Math.min(168, settings.intervalHours * 2) },
          ]
      : settings.preset === 'threshold'
        ? [
            { thresholdPercent: Math.max(0, settings.thresholdPercent - 5) },
            { thresholdPercent: Math.min(50, settings.thresholdPercent + 5) },
          ]
        : [
            {
              fastWindow: Math.max(2, Math.floor(settings.fastWindow / 2)),
              slowWindow: Math.max(3, Math.floor(settings.slowWindow / 2)),
            },
            { fastWindow: Math.min(199, settings.fastWindow * 2), slowWindow: Math.min(200, settings.slowWindow * 2) },
          ];
  const seen = new Set<string>();
  return [{ ...settings }, ...patches.map((patch) => ({ ...settings, ...patch }))].filter((variant) => {
    const key = JSON.stringify(variant);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Slice observations without claiming unknown missing-candle positions are known. */
function sliceSource(source: ResearchSource, start: number, end: number): ResearchSource {
  return {
    ...source,
    history: { ...source.history, candles: source.history.candles.slice(start, end) },
  };
}

/** Invest trade capital once while preserving the same fee reserve, first eligible fill, and exact fees. */
function buyAndHoldBenchmark(bot: BotDefinition, source: ResearchSource, fees: ReplayFees): ResearchBenchmark | null {
  const candles = source.history.candles;
  const fee = codec(fees.buy.feeCodec);
  const reserve = codec(bot.policy.feeBudgetCodec);
  const capital = codec(bot.portfolio.initial[bot.assetIn.address] ?? '0');
  const available = capital - (bot.policy.feeAsset.address === bot.assetIn.address ? reserve : 0n);
  if (
    candles.length < 2 ||
    available <= 0n ||
    codec(bot.portfolio.initial[bot.policy.feeAsset.address] ?? '0') < reserve ||
    reserve < fee
  )
    return null;
  const initial = valuePortfolio(bot, candles[0], bot.portfolio.initial);
  const passive: BotDefinition = {
    ...bot,
    policy: {
      ...bot.policy,
      maxTradeCodec: { ...bot.policy.maxTradeCodec, [bot.assetIn.address]: available.toString() },
    },
    portfolio: {
      initial: { ...bot.portfolio.initial },
      holdings: { ...bot.portfolio.initial },
      feesPaidCodec: '0',
      trades: 0,
    },
  };
  const fill = proposedFill(
    passive,
    'buy',
    fromCodec(available.toString(), bot.assetIn.decimals),
    candles[1],
    fees.buy.feeCodec,
    fees.buy.swapFeePercent,
    fees.buy.priceImpactPercent
  );
  if (codec(fill.outputCodec) <= 0n) return null;
  passive.portfolio = applyPaperFill(passive, fill);
  const equity: BotEquityPoint[] = [
    { timestamp: candles[0].timestamp - 1, value: initial, benchmark: initial },
    { timestamp: candles[0].timestamp, value: initial, benchmark: initial },
    ...candles.slice(1).map((candle) => ({
      timestamp: candle.timestamp,
      value: valuePortfolio(passive, candle),
      benchmark: valuePortfolio(passive, candle, passive.portfolio.initial),
    })),
  ];
  return {
    ...portfolioPerformance(equity),
    trades: 1,
    initialValue: initial,
    finalValue: equity.at(-1)!.value,
    costs: fillCosts(passive, fill, candles[1]),
  };
}

/** Attach exact like-period comparisons without treating unequal train/test durations as equal evidence. */
function evaluationEvidence(
  bot: BotDefinition,
  source: ResearchSource,
  result: BacktestResult,
  fees: ReplayFees,
  warmupCandles = 0
): ResearchEvaluationEvidence {
  const candles = source.history.candles;
  const durationMs = candles.at(-1)!.timestamp - candles[0].timestamp;
  const benchmark = buyAndHoldBenchmark(bot, source, fees);
  return {
    candleCount: candles.length,
    candidateCount: candles.length - 1,
    durationMs,
    warmupCandles,
    returnPerDayPercent:
      durationMs > 0
        ? decimalRatio(fp(result.returnPercent).mul(fp(String(24 * HOUR))), fp(String(durationMs))).toString()
        : null,
    benchmark,
    excessReturnPercent: benchmark ? fp(result.returnPercent).sub(fp(benchmark.returnPercent)).toString() : null,
  };
}

/**
 * Train only on earlier closes, discard one boundary candle, and evaluate fixed
 * choices on the next untouched span. Walk-forward tests are disjoint; later
 * folds may learn from prior tests only once those observations are in the past.
 */
function* crossValidate(
  settings: ResearchSettings,
  assets: BotAsset[],
  source: ResearchSource,
  fees: ReplayFees,
  now: number,
  work: ResearchWork,
  strategy?: StrategyConfig
): Generator<ResearchProgress, ResearchFold[], void> {
  if (settings.validation === 'none') return [];
  work.phase = 'validation';
  const count = source.history.candles.length;
  const initialTrain = Math.floor((count * settings.trainPercent) / 100);
  const folds = settings.validation === 'holdout' ? 1 : settings.folds;
  const remaining = count - initialTrain - 1;
  if (initialTrain < 3 || remaining < folds * 2) throw new Error('bots.errors.history');
  const reports: ResearchFold[] = [];
  for (let fold = 0; fold < folds; fold++) {
    work.fold = fold + 1;
    work.scope = 'train';
    work.variant = 1;
    const testStart = initialTrain + 1 + Math.floor((remaining * fold) / folds);
    const testEnd = initialTrain + 1 + Math.floor((remaining * (fold + 1)) / folds);
    const trainSource = sliceSource(source, 0, testStart - 1);
    const testSource = sliceSource(source, testStart, testEnd);
    const choices = variants(settings);
    let bestSettings = choices[0];
    let bestBot = makeBot(bestSettings, assets, trainSource.history.candles[0], now, strategy);
    let bestReplay = yield* replay(bestBot, trainSource, fees, false, work);
    let bestTrain = bestReplay.result;
    for (const choice of choices.slice(1)) {
      work.variant++;
      const bot = makeBot(choice, assets, trainSource.history.candles[0], now, strategy);
      const replayed = yield* replay(bot, trainSource, fees, false, work);
      const train = replayed.result;
      if (fp(train.returnPercent).gt(fp(bestTrain.returnPercent))) {
        bestSettings = choice;
        bestBot = bot;
        bestTrain = train;
        bestReplay = replayed;
      }
    }
    work.scope = 'test';
    work.variant = undefined;
    const warmup = ['sma', 'rules'].includes(bestBot.strategy.kind)
      ? source.history.candles.slice(Math.max(0, testStart - requiredStrategyCandles(bestBot.strategy)), testStart)
      : [];
    // Rule leaves are stateless: only their preceding closes cross the fold boundary.
    const test = (yield* replay(
      bestBot,
      testSource,
      fees,
      false,
      work,
      warmup.length
        ? { candles: warmup, ...(bestBot.strategy.kind === 'sma' ? { previousSignal: bestReplay.previousSignal } : {}) }
        : undefined
    )).result;
    reports.push({
      index: fold + 1,
      trainStart: trainSource.history.candles[0].timestamp,
      trainEnd: trainSource.history.candles.at(-1)!.timestamp,
      testStart: testSource.history.candles[0].timestamp,
      testEnd: testSource.history.candles.at(-1)!.timestamp,
      settings: { ...bestSettings },
      train: bestTrain,
      test,
      searchCount: choices.length,
      selectionObjective: 'net-training-return',
      trainEvidence: evaluationEvidence(bestBot, trainSource, bestTrain, fees),
      testEvidence: evaluationEvidence(bestBot, testSource, test, fees, warmup.length),
      purge: {
        candleCount: 1,
        start: source.history.candles[testStart - 1].timestamp,
        end: source.history.candles[testStart - 1].timestamp,
      },
    });
  }
  return reports;
}

/**
 * Run the chosen method and every candidate, then validate it on chronological
 * splits. Results never sign, query a wallet, persist capital, or execute trades.
 */
function* researchSteps(
  settings: ResearchSettings,
  assets: BotAsset[],
  source: ResearchSource | undefined,
  now: number,
  options: ResearchOptions
): Generator<ResearchProgress, ResearchResult, void> {
  validateResearchSettings(settings);
  const selected = copySource(source, settings, now);
  const strategy = options.strategy ? copyStrategyConfig(options.strategy) : undefined;
  const bot = makeBot(settings, assets, selected.history.candles[0], now, strategy);
  if (options.goal !== undefined) bot.goal = copyEpisodeGoal(options.goal, settings, selected);
  if (!bot.goal && options.outputTradeLimitCodec !== undefined)
    throw new Error('bots.errors.config');
  const hasWarmupCandles = options.warmupCandles !== undefined;
  const warmup = copyEpisodeWarmup(options.warmupCandles, selected.history.candles[0].timestamp);
  const outputTradeLimitCodec = options.outputTradeLimitCodec;
  if (outputTradeLimitCodec !== undefined) {
    if (codec(outputTradeLimitCodec) <= 0n) throw new Error('bots.errors.amount');
    bot.policy.maxTradeCodec[bot.assetOut.address] = outputTradeLimitCodec;
  }
  // Network fees are explicit XOR base units; reject fractional base units rather
  // than silently dropping them from a user's financial assumptions.
  const feeAmount = fromCodec(
    toCodec(settings.networkFeeXor, bot.policy.feeAsset.decimals),
    bot.policy.feeAsset.decimals
  );
  const feeCodec = toCodec(feeAmount, bot.policy.feeAsset.decimals);
  const sellFeeCodec = toCodec(settings.sellNetworkFeeXor ?? settings.networkFeeXor, bot.policy.feeAsset.decimals);
  const sellNetworkFeeXor = fromCodec(sellFeeCodec, bot.policy.feeAsset.decimals);
  const sellSwapFeePercent = settings.sellSwapFeePercent ?? settings.swapFeePercent;
  const priceImpactPercent = settings.priceImpactPercent === undefined ? '0' : settings.priceImpactPercent;
  const sellPriceImpactPercent = settings.sellPriceImpactPercent === undefined ? '0' : settings.sellPriceImpactPercent;
  const fees: ReplayFees = {
    buy: { feeCodec, swapFeePercent: settings.swapFeePercent, priceImpactPercent },
    sell: { feeCodec: sellFeeCodec, swapFeePercent: sellSwapFeePercent, priceImpactPercent: sellPriceImpactPercent },
  };
  const count = selected.history.candles.length;
  let total = count - 1;
  if (settings.validation !== 'none') {
    const train = Math.floor((count * settings.trainPercent) / 100);
    const foldCount = settings.validation === 'holdout' ? 1 : settings.folds;
    const remaining = count - train - 1;
    if (train < 3 || remaining < foldCount * 2) throw new Error('bots.errors.history');
    for (let fold = 0; fold < foldCount; fold++) {
      const start = train + 1 + Math.floor((remaining * fold) / foldCount);
      const end = train + 1 + Math.floor((remaining * (fold + 1)) / foldCount);
      total += (start - 2) * variants(settings).length + end - start - 1;
    }
  }
  const work: ResearchWork = { completed: 0, total, phase: 'replay', checkpoint: 0, scope: 'study' };
  const output = yield* replay(bot, selected, fees, true, work, warmup.length ? { candles: warmup } : undefined);
  const folds = yield* crossValidate(settings, assets, selected, fees, now, work, strategy);
  return {
    result: output.result,
    candidates: output.candidates,
    tradeMarkers: output.tradeMarkers,
    costs: output.costs,
    bot,
    source: selected,
    settings: { ...settings },
    summary: summarize(output.candidates),
    assumptions: {
      slippagePercent: settings.slippagePercent,
      feeAmount,
      feeCodec,
      networkFeeXor: feeAmount,
      swapFeePercent: settings.swapFeePercent,
      sellNetworkFeeXor,
      sellSwapFeePercent,
      priceImpactPercent,
      sellPriceImpactPercent,
      execution: 'next-close',
      attribution: 'common-endpoint-mark-to-market',
    },
    validation: {
      mode: settings.validation,
      folds,
      purgeCandles: 1,
      tuned: settings.optimize && settings.validation !== 'none',
    },
    recommendedSettings: { ...(folds.at(-1)?.settings ?? settings) },
    ...(bot.goal && output.goalState
      ? {
          goalEvaluation: {
            goal: copyBotGoal(bot.goal),
            fundingTimestamp: selected.history.candles[0].timestamp,
            endingTimestamp: selected.history.candles.at(-1)!.timestamp,
            state: { ...output.goalState },
            ...(hasWarmupCandles ? { warmupCandles: warmup.map((candle) => ({ ...candle })) } : {}),
            ...(outputTradeLimitCodec !== undefined ? { outputTradeLimitCodec } : {}),
          },
        }
      : {}),
  };
}

/** Limit chart/worker deliveries to 20 Hz while immediately exposing phase changes and completed work. */
export function createResearchProgressEmitter(
  emit: (progress: ResearchProgress) => void,
  clock: () => number = () => performance.now()
): (progress: ResearchProgress) => void {
  let sentAt = -Infinity;
  let phase: ResearchProgress['phase'] | undefined;
  return (progress) => {
    const instant = clock();
    if (instant - sentAt < 50 && phase === progress.phase && progress.completed !== progress.total) return;
    sentAt = instant;
    phase = progress.phase;
    emit(progress);
  };
}

/** Let a visible browser present the current checkpoint before computing more; hidden/headless callers only yield. */
export function awaitResearchPaint(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let frame: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      if (timer !== undefined) clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    };
    const done = () => {
      cleanup();
      resolve();
    };
    const abort = () => {
      cleanup();
      reject(new Error('bots.errors.stale'));
    };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) return abort();
    if (
      typeof requestAnimationFrame === 'function' &&
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible'
    ) {
      // The second frame follows a paint of the first; this is presentation backpressure, not a replay duration.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(done);
      });
      // A browser may stop frames while visibility changes; do not strand the evaluator at that transition.
      timer = setTimeout(done, 250);
    } else timer = setTimeout(done, 0);
  });
}

/** Run exact historical computations synchronously; workers stream genuine completed-bar progress. */
export function runResearch(
  settings: ResearchSettings,
  assets: BotAsset[],
  source?: ResearchSource,
  now = Date.now(),
  options: ResearchOptions = {}
): ResearchResult {
  const steps = researchSteps(settings, assets, source, now, options);
  for (;;) {
    if (options.signal?.aborted) throw new Error('bots.errors.stale');
    const step = steps.next();
    if (step.done) return step.value;
    options.onProgress?.(step.value);
  }
}

/** Compare one funded period with a same-period passive entry using its frozen fee scenario. */
export function compareResearchResult(result: ResearchResult, warmupCandles = 0): ResearchEvaluationEvidence {
  const assumptions = result.assumptions;
  const fees: ReplayFees = {
    buy: {
      feeCodec: assumptions.feeCodec,
      swapFeePercent: assumptions.swapFeePercent,
      priceImpactPercent: assumptions.priceImpactPercent,
    },
    sell: {
      feeCodec: toCodec(assumptions.sellNetworkFeeXor, result.bot.policy.feeAsset.decimals),
      swapFeePercent: assumptions.sellSwapFeePercent,
      priceImpactPercent: assumptions.sellPriceImpactPercent,
    },
  };
  return evaluationEvidence(result.bot, result.source, result.result, fees, warmupCandles);
}

/** Advance only after the last real checkpoint is presented, with no completed-results playback queue. */
export async function runResearchAsync(
  settings: ResearchSettings,
  assets: BotAsset[],
  source?: ResearchSource,
  now = Date.now(),
  options: ResearchOptions = {}
): Promise<ResearchResult> {
  const steps = researchSteps(settings, assets, source, now, options);
  for (;;) {
    if (options.signal?.aborted) throw new Error('bots.errors.stale');
    const step = steps.next();
    if (step.done) return step.value;
    options.onProgress?.(step.value);
    await (options.awaitProgress?.(step.value, options.signal) ?? awaitResearchPaint(options.signal));
  }
}
