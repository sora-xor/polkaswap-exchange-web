/** Bounded public-data research; this module never connects a wallet, moves funds, or starts a bot. */
import { FPNumber } from '@/lib/substrate/math';
import { parseDeterministicStrategy, parseDistinctStrategies, type BotAiClient } from './ai';
import type { BotAiCostSample } from './ai-research';
import { spendableHoldingCodec } from './allocation';
import { codec, fromCodec, percent, toCodec } from './amounts';
import {
  createAutopilotFeeBudgetError,
  createAutopilotImpactPreflightError,
  createAutopilotOpeningError,
  createAutopilotQualificationError,
  type AutopilotQualificationReason,
  type AutopilotScreeningEvidence,
  type AutopilotScreeningReason,
} from './autopilot-diagnostics';
import {
  describeNetworkFeeLossPressure,
  describeOpeningResearchFee,
  openingResearchDrawdown,
} from './autopilot-feasibility';
import { copyStrategyConfig, decimalRatio, parseBotPrice, portfolioPerformance } from './engine';
import {
  copyExperimentDefinition,
  makeExperimentSnapshot,
  type ExperimentDefinition,
  type ExperimentRun,
} from './experiments';
import { copyBotGoal } from './goals';
import { assertGoalHistoryMatches, copyGoalHistoryEvidence, type AutopilotHistory } from './goal-history';
import {
  createGoalResearchBinding,
  makeGoalEpisodeEvidence,
  summarizeGoalEpisodes,
  type GoalEpisodeEvidence,
  type GoalResearchSnapshot,
} from './goal-research';
import { createLabDefaultSettings } from './lab-config';
import {
  createResearchBot,
  MAX_EPISODE_WARMUP_CANDLES,
  researchExecutionRejection,
  type ResearchSettings,
} from './research';
import type { ResearchFeeSnapshot } from './research-fees';
import { assertExperimentEvidence, createExperimentRunner, type ExperimentRunnerOptions } from './research-runner';
import type { BacktestResult, BotAsset, BotCandle, BotDefinition, BotGoal, BotHistory, StrategyConfig } from './types';

/** User limits remain unchanged across every generated candidate and the fresh returned portfolio. */
export interface AutopilotInput {
  assets: BotAsset[];
  assetInAddress: string;
  assetOutAddress: string;
  capital: string;
  feeBudgetXor: string;
  maxLossPercent: string;
  targetReturnPercent: string;
  title: string;
  /** The simple accumulation flow measures results in the selected output token. */
  valuationAsset?: BotGoal['valuationAsset'];
}
/** Only completed work advances progress; generation and loading have no invented percentage. */
export interface AutopilotProgress {
  phase: 'history' | 'drafting' | 'testing' | 'ready';
  completed?: number;
  total?: number;
}
/** A selected deterministic template and provenance, with no execution authority or hypothetical gains. */
export interface AutopilotResult {
  bot: BotDefinition;
  settings: ResearchSettings;
  research: GoalResearchSnapshot;
  denomination: NonNullable<BotHistory['identity']>;
  candidates: number;
}
export interface AutopilotResearchOptions {
  loadHistory: (
    bot: BotDefinition,
    settings: ResearchSettings,
    signal?: AbortSignal,
    options?: { fresh?: boolean }
  ) => Promise<AutopilotHistory>;
  loadFees: ExperimentRunnerOptions['loadFees'];
  now?: () => number;
  onProgress?: (progress: AutopilotProgress) => void;
  /** Verified completed-hour boundary only; never exposes reserved observations. */
  onHistoryPrepared?: (window: { completedThrough: number; validationFrom: number }) => void;
  /** Await durable exposure before dispatching holdout work; canceled runs still consume that window. */
  onValidationStarted?: (window: { from: number; to: number }) => void | Promise<void>;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const TRAIN_PERCENT = 70;
const MIN_TRADES = 1;
const fp = (value: string) => new FPNumber(value, 36);
const stale = () => new Error('bots.errors.stale');

/** Reject late results even if a provider or public loader ignores cancellation. */
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(stale());
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

/** Require a complete, current hourly series; neither archive gaps nor a missing recent tail are backfilled. */
function verifiedHistory(
  bot: BotDefinition,
  history: AutopilotHistory,
  settings: ResearchSettings,
  now: number
): AutopilotHistory {
  const { candles, identity } = history;
  const start = settings.historyStartAt!;
  const end = settings.historyEndAt!;
  if (
    !history.denominationVerified ||
    !identity ||
    !/^0x[0-9a-f]{64}$/i.test(identity.genesisHash) ||
    !/^[1-9]\d*$/.test(identity.denominator) ||
    history.missing !== 0 ||
    candles.length < 168 ||
    candles.length > 2160 ||
    candles.length !== (end - start) / HOUR ||
    candles[0].timestamp < start ||
    candles[0].timestamp > start + HOUR ||
    candles.at(-1)!.timestamp < end - HOUR ||
    now - candles.at(-1)!.timestamp > 2 * HOUR
  )
    throw new Error('bots.errors.history');
  let previous: number | undefined;
  for (const candle of candles) {
    if (
      !Number.isSafeInteger(candle.timestamp) ||
      candle.timestamp > end ||
      candle.timestamp > now ||
      candle.timestamp % HOUR !== 0 ||
      (previous !== undefined && candle.timestamp - previous !== HOUR)
    )
      throw new Error('bots.errors.history');
    parseBotPrice(candle.close);
    parseBotPrice(candle.feeClose ?? '');
    previous = candle.timestamp;
  }
  const goalHistory = copyGoalHistoryEvidence(history.goalHistory);
  assertGoalHistoryMatches(bot, history, goalHistory);
  if (goalHistory.studyStartAt !== start || goalHistory.studyEndAt !== end) throw stale();
  return { ...structuredClone(history), goalHistory };
}

/** Live setup requires fresh finalized fee evidence, even though the underlying historical runner can accept older blocks. */
function verifiedFees(bot: BotDefinition, history: BotHistory, fees: ResearchFeeSnapshot, now: number): void {
  assertExperimentEvidence(bot, history, fees, now);
  if (
    !/^0x[0-9a-f]{64}$/i.test(fees.blockHash) ||
    !Number.isSafeInteger(fees.blockNumber) ||
    fees.blockNumber < 0 ||
    fees.finalizedAt === undefined ||
    now - fees.finalizedAt > 300_000 ||
    codec(fees.networkFeeCodec) <= 0n ||
    codec(fees.sellNetworkFeeCodec) <= 0n ||
    fees.networkFeeCodec !== toCodec(fees.networkFeeXor, bot.policy.feeAsset.decimals) ||
    fees.sellNetworkFeeCodec !== toCodec(fees.sellNetworkFeeXor, bot.policy.feeAsset.decimals)
  )
    throw stale();
  percent(fees.swapFeePercent, '10');
  percent(fees.sellSwapFeePercent, '10');
}

/** One exact-size fee scenario evaluated only on complete, funded training days. */
export interface OptimisticOneBuyTrainingPoint {
  amountInCodec: string;
  /** Episodes with positive excess over idle; this does not imply positive absolute growth. */
  positiveEpisodes: number;
  totalEpisodes: 4;
}

/**
 * Give a drafter a necessary-condition screen without inspecting validation or extrapolating quotes.
 * The caller supplies at most five fresh finalized, exact-size fee observations that already pass its
 * directional fee and impact limits. A buy may use the best close after funding in each training day;
 * pool cost, impact, slippage, signals and risk are ignored to favor the strategy. A positive count
 * therefore cannot qualify a strategy; zero rules out positive excess for one buy at that size on these closes.
 */
export function optimisticOneBuyTrainingScreen(
  bot: BotDefinition,
  training: readonly BotCandle[],
  samples: readonly { amountInCodec: string; networkFeeCodec: string }[]
): OptimisticOneBuyTrainingPoint[] {
  if (
    bot.goal?.durationMs !== DAY ||
    bot.goal.valuationAsset !== 'output' ||
    bot.assetIn.address === bot.assetOut.address ||
    bot.assetOut.address !== bot.policy.feeAsset.address ||
    bot.assetOut.decimals !== bot.policy.feeAsset.decimals ||
    codec(spendableHoldingCodec(bot, bot.assetOut.address)) !== 0n ||
    training.length !== 117 ||
    samples.length > 5
  )
    return [];
  const priceScale = 10n ** 36n;
  const inputUnit = 10n ** BigInt(bot.assetIn.decimals);
  const outputUnit = 10n ** BigInt(bot.assetOut.decimals);
  const spendable = codec(spendableHoldingCodec(bot, bot.assetIn.address));
  const prices = training.map((candle) => BigInt(parseBotPrice(candle.close).value.toFixed(36, 1).replace('.', '')));
  const episodes = Array.from({ length: 4 }, (_, index) => {
    const start = index * 24;
    const endpoint = prices[start + 24];
    const lowestBuy = prices.slice(start + 1, start + 25).reduce((lowest, price) => (price < lowest ? price : lowest));
    return { endpoint, lowestBuy };
  });
  return samples.map(({ amountInCodec, networkFeeCodec }) => {
    const amount = codec(amountInCodec);
    const fee = codec(networkFeeCodec);
    if (amount === 0n || amount >= spendable || fee === 0n) throw new Error('bots.errors.config');
    const positiveEpisodes = episodes.filter(({ endpoint, lowestBuy }) => {
      if (endpoint <= lowestBuy) return false;
      // a * (1 / buyPrice - 1 / endpointPrice) > fee, with no rounded division.
      return amount * (endpoint - lowestBuy) * priceScale * outputUnit > fee * lowestBuy * endpoint * inputUnit;
    }).length;
    return { amountInCodec, positiveEpisodes, totalEpisodes: 4 };
  });
}

/** Legacy single drafts keep their bounded size search; an explicit batch supplies complete strategies instead. */
function candidateStrategies(
  seed: StrategyConfig,
  spendableCodec: string,
  decimals: number,
  eligibleSampleCodecs: readonly string[]
): StrategyConfig[] {
  const amount = codec(toCodec(seed.amount, decimals));
  const ceiling = codec(spendableCodec);
  const sizes: bigint[] = [];
  const add = (size: bigint) => {
    if (size > 0n && size < ceiling && !sizes.includes(size) && sizes.length < 3) sizes.push(size);
  };
  add(amount);
  // Select only independently observed amounts. Distance to the submitted seed
  // gives a fixed order without treating nearby, unquoted sizes as feasible.
  const distance = (size: bigint) => (size > amount ? size - amount : amount - size);
  const samples = eligibleSampleCodecs
    .map(codec)
    .filter((size) => size > 0n && size < ceiling)
    .sort((left, right) => {
      const a = distance(left);
      const b = distance(right);
      return a < b ? -1 : a > b ? 1 : left > right ? -1 : left < right ? 1 : 0;
    });
  for (const size of samples) add(size);
  // When exact samples leave slots open, retain the old bounded hypotheses.
  // Each such amount receives its own exact quote before any replay.
  add(amount / 2n);
  add(amount * 2n);
  // Near the budget ceiling, larger orders are unavailable. Retain a bounded
  // search with smaller exact amounts instead of rounding up to the full budget.
  for (let size = amount; size > 0n && sizes.length < 3; size /= 2n) {
    add(size);
  }
  if (!sizes.length) throw new Error('bots.errors.amount');
  return sizes.map((size) => ({ ...copyStrategyConfig(seed), amount: fromCodec(size.toString(), decimals) }));
}

/**
 * A desktop single draft gets two additional, predeclared signal hypotheses.
 * The fixed library does not inspect prices, costs or validation; the ordinary
 * exact-quote and four-episode training gates decide whether any survives.
 */
function desktopSingleDraftStrategies(
  seed: StrategyConfig,
  bot: BotDefinition,
  eligibleSampleCodecs: readonly string[]
): StrategyConfig[] {
  const { signalTiming: _timing, ...shared } = copyStrategyConfig(seed);
  const seedAmount = codec(toCodec(seed.amount, bot.assetIn.decimals));
  const ceiling = codec(bot.policy.maxTradeCodec[bot.assetIn.address]);
  const samples = [...new Set(eligibleSampleCodecs.map(codec))]
    .filter((amount) => amount > 0n && amount < ceiling)
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
  const closest = [...samples].sort((left, right) => {
    const a = left > seedAmount ? left - seedAmount : seedAmount - left;
    const b = right > seedAmount ? right - seedAmount : seedAmount - right;
    return a < b ? -1 : a > b ? 1 : left < right ? -1 : left > right ? 1 : 0;
  })[0];
  const nextSmallest = samples.find((amount) => amount !== closest);
  // A matching exact sample retains the assistant's amount for all signals.
  // Otherwise, additional hypotheses use only independently observed sizes.
  const generatedAmounts =
    closest === undefined || samples.includes(seedAmount)
      ? [seed.amount, seed.amount]
      : [
          fromCodec(closest.toString(), bot.assetIn.decimals),
          fromCodec((nextSmallest ?? closest).toString(), bot.assetIn.decimals),
        ];
  const library: readonly Pick<StrategyConfig, 'intervalMs' | 'rules'>[] = [
    {
      intervalMs: 6 * HOUR,
      rules: {
        version: 1,
        entry: { operator: 'all', conditions: [{ kind: 'momentum', window: 6, direction: 'below', threshold: '-1' }] },
        exit: null,
      },
    },
    {
      intervalMs: 12 * HOUR,
      rules: {
        version: 1,
        entry: { operator: 'all', conditions: [{ kind: 'trend', window: 12, direction: 'above' }] },
        exit: null,
      },
    },
    {
      intervalMs: 6 * HOUR,
      rules: {
        version: 1,
        entry: {
          operator: 'all',
          conditions: [{ kind: 'return-quantile', window: 24, direction: 'below', percentile: 20 }],
        },
        exit: null,
      },
    },
    {
      intervalMs: 12 * HOUR,
      rules: {
        version: 1,
        entry: { operator: 'all', conditions: [{ kind: 'drawdown', window: 12, direction: 'below', threshold: '-2' }] },
        exit: null,
      },
    },
  ];
  const strategies = [copyStrategyConfig(seed)];
  for (const { intervalMs, rules } of library) {
    const candidate = parseDeterministicStrategy(
      { ...shared, kind: 'rules', amount: generatedAmounts[strategies.length - 1], intervalMs, rules, prompt: '' },
      bot
    );
    try {
      parseDistinctStrategies([...strategies, candidate], bot);
      strategies.push(candidate);
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'bots.errors.proposal') throw error;
      // A submitted rule may already be one of the fixed, semantically distinct templates.
    }
    if (strategies.length === 3) break;
  }
  if (strategies.length !== 3) throw new Error('bots.errors.proposal');
  return strategies;
}

/** Exact rules use matching replay controls; the engine's separate training optimizer stays disabled. */
function strategySettings(settings: ResearchSettings, strategy: StrategyConfig): ResearchSettings {
  return {
    ...settings,
    preset: strategy.kind === 'rules' ? 'sma' : (strategy.kind as ResearchSettings['preset']),
    intervalHours: strategy.intervalMs / HOUR,
    intervalBlocks: strategy.intervalMs / 6000,
    fastWindow: strategy.fastWindow,
    slowWindow: strategy.slowWindow,
    signalTiming: 'closed-hour',
    optimize: false,
  };
}

/** Keep bounded failure reasons without exposing prices, returns, or validation observations to the model. */
export function qualificationReasons(
  result: ReturnType<typeof summarizeGoalEpisodes>,
  maxLossPercent: string
): AutopilotQualificationReason[] {
  const reasons: AutopilotQualificationReason[] = [];
  if (result.coverage !== 1) reasons.push('coverage');
  if (result.trades < MIN_TRADES) reasons.push('insufficientTrades');
  // Unequal opening goal values can yield positive mean percentages while
  // losing actual token units. Require both growth and benefit over idle in each metric.
  if (
    !fp(result.returnPercent).gt(fp('0')) ||
    !fp(result.excessReturnPercent).gt(fp('0')) ||
    !fp(result.netChange).gt(fp('0')) ||
    !fp(result.excessChange).gt(fp('0'))
  )
    reasons.push('netLoss');
  if (!fp(result.drawdownPercent).lte(fp(maxLossPercent))) reasons.push('drawdown');
  return reasons;
}

/** The first possible action is a buy: its actual fee must fit the unchanged XOR reserve. */
function assertFeeSampleBudget(bot: BotDefinition, fees: ResearchFeeSnapshot): void {
  if (codec(fees.networkFeeCodec) > codec(bot.policy.feeBudgetCodec)) throw createAutopilotFeeBudgetError();
}

/**
 * Price each replay point in the selected goal token before calculating risk or return.
 * Replay opens one millisecond before its first candle without a fill; only that
 * opening point uses the next candle's price. Every other point requires an exact close.
 */
function goalResult(result: BacktestResult, history: BotHistory, goal: BotGoal): BacktestResult {
  if (goal.valuationAsset !== 'output') return result;
  const prices = new Map(history.candles.map((candle) => [candle.timestamp, candle.close]));
  const equity = result.equity.map((point, index) => {
    const close = prices.get(point.timestamp) ?? (index === 0 ? prices.get(point.timestamp + 1) : undefined);
    const price = parseBotPrice(close ?? '');
    return {
      timestamp: point.timestamp,
      value: decimalRatio(fp(point.value), price).toString(),
      benchmark: decimalRatio(fp(point.benchmark), price).toString(),
    };
  });
  return { ...result, equity, ...portfolioPerformance(equity) };
}

/** Reject any incomplete candidate batch rather than quietly selecting from whichever studies happened to finish. */
function completed(runs: ExperimentRun[]): ExperimentRun[] {
  const failed = runs.find((run) => run.status !== 'complete' || !run.result || !run.fees);
  if (failed) throw new Error(failed.error ?? 'bots.errors.stale');
  return runs;
}

/** Fixed consecutive episodes share a closing/funding mark; incomplete trailing hours are never selected. */
function episodePlan(start: number, count: number, hours: number) {
  const episodes = Math.floor((count - 1) / hours);
  if (episodes < 1) throw new Error('bots.errors.history');
  return {
    windows: Array.from({ length: episodes }, (_, index) => ({
      start: start + index * hours,
      end: start + (index + 1) * hours,
    })),
    tailCandles: count - episodes * hours - 1,
  };
}

/**
 * Draft from the first 70% only, select a small fixed search on that training
 * span, then test the frozen winner once on the untouched remainder. A failed
 * holdout ends the run; it never searches that holdout for a different winner.
 */
export function createAutopilotResearch(options: AutopilotResearchOptions) {
  const now = options.now ?? Date.now;
  let active: { controller: AbortController; runner?: ReturnType<typeof createExperimentRunner> } | undefined;
  let disposed = false;
  const cancel = (): void => {
    active?.controller.abort();
    active?.runner?.dispose();
    active = undefined;
  };
  return {
    /** Run entirely on public observations and virtual allocations; callers separately authorize any execution. */
    async run(input: AutopilotInput, client: BotAiClient, signal?: AbortSignal): Promise<AutopilotResult> {
      if (disposed) throw stale();
      cancel();
      const work = {
        controller: new AbortController(),
        runner: undefined as ReturnType<typeof createExperimentRunner> | undefined,
      };
      active = work;
      const abort = () => {
        work.controller.abort();
        work.runner?.cancel();
      };
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
      const check = () => {
        if (active !== work || work.controller.signal.aborted) throw stale();
      };
      const report = (progress: AutopilotProgress) => {
        check();
        options.onProgress?.(progress);
        check();
      };
      try {
        check();
        const goal = copyBotGoal({
          title: input.title,
          targetReturnPercent: input.targetReturnPercent,
          maxLossPercent: input.maxLossPercent,
          lossMetric: 'drawdown',
          targetRequiresIdleOutperformance: true,
          durationMs: DAY,
          ...(input.valuationAsset !== undefined ? { valuationAsset: input.valuationAsset } : {}),
        });
        const assets = input.assets.map(({ address, symbol, decimals }) => ({ address, symbol, decimals }));
        const historyEndAt = Math.floor(now() / HOUR) * HOUR;
        const settings: ResearchSettings = {
          ...createLabDefaultSettings(now()),
          // The simple flow has its own fixed window; the advanced lab's 90-day default is unrelated.
          days: 7,
          historyStartAt: historyEndAt - 7 * DAY,
          historyEndAt,
          capital: input.capital,
          feeBudgetXor: input.feeBudgetXor,
          assetInAddress: input.assetInAddress,
          assetOutAddress: input.assetOutAddress,
          signalTiming: 'closed-hour',
          intervalBlocks: 600,
          intervalHours: 1,
          validation: 'none',
          trainPercent: TRAIN_PERCENT,
          folds: 2,
          optimize: false,
        };
        const capitalAsset = assets.find((asset) => asset.address === input.assetInAddress);
        if (!capitalAsset) throw new Error('bots.errors.config');
        // The lab's 10% reference rounds to zero below ten base units. A half
        // sample keeps tiny valid allocations representable without selecting a trade.
        if (codec(toCodec(input.capital, capitalAsset.decimals)) < 10n) settings.tradePercent = 50;
        const draft = createResearchBot(settings, assets, now());
        // Capital is an opening allocation, not an order. Keep a partial fee
        // sample until training selects a separately quoted order size.
        const tradeCeiling = spendableHoldingCodec(draft, draft.assetIn.address);
        if (codec(tradeCeiling) < 2n) throw new Error('bots.errors.amount');
        draft.policy.maxTradeCodec[draft.assetIn.address] = tradeCeiling;
        if (codec(toCodec(draft.strategy.amount, draft.assetIn.decimals)) >= codec(tradeCeiling))
          draft.strategy.amount = fromCodec((codec(tradeCeiling) / 2n).toString(), draft.assetIn.decimals);
        draft.strategy.threshold = '0';
        report({ phase: 'history' });
        const history = verifiedHistory(
          draft,
          await abortable(options.loadHistory(draft, settings, work.controller.signal), work.controller.signal),
          settings,
          now()
        );
        check();
        const trainCount = Math.floor((history.candles.length * TRAIN_PERCENT) / 100);
        options.onHistoryPrepared?.({
          completedThrough: history.candles.at(-1)!.timestamp,
          validationFrom: history.candles[trainCount + 1].timestamp,
        });
        check();
        const training: BotHistory = {
          missing: 0,
          denominationVerified: true,
          identity: { ...history.identity! },
          candles: history.candles.slice(0, trainCount),
        };
        const openingFailure = openingResearchDrawdown(draft, [training.candles[0], training.candles[1]], goal);
        if (openingFailure) throw createAutopilotOpeningError(openingFailure);
        // Match the replay's policy ceiling using its first training close;
        // a limit is never inventory, and acquired output must remain above fees.
        draft.policy.maxTradeCodec[draft.assetOut.address] = toCodec(
          decimalRatio(fp(settings.capital), parseBotPrice(training.candles[0].close)).value.toFixed(
            draft.assetOut.decimals,
            1
          ),
          draft.assetOut.decimals
        );
        // Cadence belongs to the 24-hour goal, not an arbitrary number of fills.
        const validationCount = history.candles.length - trainCount - 1;
        const trainingPlan = episodePlan(0, trainCount, goal.durationMs / HOUR);
        const validationPlan = episodePlan(trainCount + 1, validationCount, goal.durationMs / HOUR);
        const maximumIntervalMs = DAY;
        let initialFees: ResearchFeeSnapshot | undefined;
        try {
          initialFees = await abortable(
            options.loadFees(structuredClone(draft), settings, { allowHistoricalFinalizedState: false }),
            work.controller.signal
          );
        } catch (error) {
          check();
          // Only an unavailable route permits independent exact-size probes.
          if (!(error instanceof Error) || error.message !== 'bots.errors.quote') throw error;
        }
        check();
        if (initialFees) verifiedFees(draft, history, initialFees, now());
        draft.goal = copyBotGoal(goal);
        // Give the one-request drafter observed size/cost points it can actually use.
        // The fixed fractions are cost probes, not strategy candidates or bounds
        // on unquoted amounts; each point retains its own finalized state.
        const initialAmountCodec = toCodec(draft.strategy.amount, draft.assetIn.decimals);
        const sampleAmounts = [
          ...new Set([
            initialAmountCodec,
            (codec(tradeCeiling) / 4n).toString(),
            (codec(tradeCeiling) / 2n).toString(),
          ]),
        ].filter((amount) => codec(amount) > 0n && codec(amount) < codec(tradeCeiling));
        const observedFees = new Map<string, ResearchFeeSnapshot>();
        const costSamples: BotAiCostSample[] = [];
        /** Add only an exact finalized quote; an unavailable point supplies no numerical cost evidence. */
        const quoteCostSample = async (amountInCodec: string): Promise<void> => {
          if (costSamples.some((sample) => sample.amountInCodec === amountInCodec)) return;
          if (costSamples.length >= 5) throw new Error('bots.errors.config');
          const sampleBot = structuredClone(draft);
          sampleBot.strategy.amount = fromCodec(amountInCodec, draft.assetIn.decimals);
          let fees: ResearchFeeSnapshot;
          try {
            if (amountInCodec === initialAmountCodec) {
              if (!initialFees) {
                costSamples.push({ amountInCodec, status: 'unavailable', reason: 'quoteUnavailable' });
                return;
              }
              fees = initialFees;
            } else {
              fees = await abortable(
                options.loadFees(sampleBot, settings, { allowHistoricalFinalizedState: false }),
                work.controller.signal
              );
            }
          } catch (error) {
            check();
            // This loader key means no usable quote, including its own timeout
            // or normalization rejection. It does not prove absent liquidity.
            // Never publish numeric costs for it. Returned evidence is checked
            // outside this catch; cancellation and other errors still fail.
            if (!(error instanceof Error) || error.message !== 'bots.errors.quote') throw error;
            costSamples.push({ amountInCodec, status: 'unavailable', reason: 'quoteUnavailable' });
            return;
          }
          check();
          verifiedFees(sampleBot, history, fees, now());
          observedFees.set(sampleBot.strategy.amount, structuredClone(fees));
          const openingFeeScenario = describeOpeningResearchFee(
            sampleBot,
            [training.candles[0], training.candles[1]],
            goal,
            fees.networkFeeCodec
          );
          costSamples.push({
            amountInCodec,
            status: 'available',
            finalizedAt: fees.finalizedAt!,
            blockHash: fees.blockHash,
            buy: {
              networkFeeXor: fees.networkFeeXor,
              swapFeePercent: fees.swapFeePercent,
              priceImpactPercent: fees.priceImpactPercent,
            },
            sell: {
              networkFeeXor: fees.sellNetworkFeeXor,
              swapFeePercent: fees.sellSwapFeePercent,
              priceImpactPercent: fees.sellPriceImpactPercent,
            },
            ...(openingFeeScenario ? { openingFeeScenario } : {}),
          });
        };
        for (const amountInCodec of sampleAmounts) await quoteCostSample(amountInCodec);
        // When two *observed* order sizes differ on the current first-order
        // limits, quote one exact size between them before the one-request draft.
        // The midpoint is a new observation, not a claim about any other size.
        /** Screen the first buy; replay checks reverse costs on proposed sell fills. */
        const quoteLimitReasons = (fees: ResearchFeeSnapshot): AutopilotScreeningReason[] => {
          const reasons: AutopilotScreeningReason[] = [];
          if (codec(fees.networkFeeCodec) > codec(draft.policy.feeBudgetCodec)) reasons.push('feeBudget');
          if (!percent(fees.priceImpactPercent).lte(percent(draft.policy.maxPriceImpactPercent)))
            reasons.push('priceImpact');
          return reasons;
        };
        const quoteWithinLimits = (fees: ResearchFeeSnapshot): boolean => quoteLimitReasons(fees).length === 0;
        const quoted = [...observedFees.entries()]
          .map(([amount, fees]) => ({ amount: codec(toCodec(amount, draft.assetIn.decimals)), fees }))
          .sort((left, right) => (left.amount < right.amount ? -1 : left.amount > right.amount ? 1 : 0));
        const contrast = quoted.findIndex(
          (point, index) =>
            index + 1 < quoted.length && quoteWithinLimits(point.fees) && !quoteWithinLimits(quoted[index + 1].fees)
        );
        if (contrast >= 0 && costSamples.length < 5) {
          const lower = quoted[contrast].amount;
          const upper = quoted[contrast + 1].amount;
          const middle = (lower + upper) / 2n;
          if (middle > lower && middle < upper && middle < codec(tradeCeiling)) {
            await quoteCostSample(middle.toString());
            const midpointFees = observedFees.get(fromCodec(middle.toString(), draft.assetIn.decimals));
            // A midpoint rejected only for impact leaves room for one smaller exact
            // quote. Its result is evidence for that size alone, never an inferred curve.
            const midpointReasons = midpointFees ? quoteLimitReasons(midpointFees) : [];
            if (midpointReasons.length === 1 && midpointReasons[0] === 'priceImpact') {
              const refined = (lower + middle) / 2n;
              const refinedCodec = refined.toString();
              if (
                refined > lower &&
                refined < middle &&
                refined < codec(tradeCeiling) &&
                costSamples.length < 5 &&
                !costSamples.some((sample) => sample.amountInCodec === refinedCodec)
              )
                await quoteCostSample(refinedCodec);
            }
          }
        }
        // No passing first buy among the observed sizes is not proof about
        // smaller orders. Use the remaining sample slots for exact smaller quotes.
        if (![...observedFees.values()].some(quoteWithinLimits)) {
          const smallest = sampleAmounts.map(codec).reduce((left, right) => (left < right ? left : right));
          for (const divisor of [2n, 4n]) {
            if (costSamples.length >= 5) break;
            const smaller = (smallest / divisor).toString();
            if (codec(smaller) === 0n || costSamples.some((sample) => sample.amountInCodec === smaller)) continue;
            await quoteCostSample(smaller);
            if ([...observedFees.values()].some(quoteWithinLimits)) break;
          }
        }
        // Sequential public probes can outlive an earlier observation. Nothing
        // reaches a drafter unless every available point is still valid now.
        for (const [amount, fees] of observedFees) {
          const sampleBot = structuredClone(draft);
          sampleBot.strategy.amount = amount;
          verifiedFees(sampleBot, history, fees, now());
        }
        // Each amount may select a different route. Reject the reserve only
        // when no fresh, exact-size buy observation can fund its own first fee.
        if (
          observedFees.size > 0 &&
          ![...observedFees.values()].some((fees) => codec(fees.networkFeeCodec) <= codec(draft.policy.feeBudgetCodec))
        )
          throw createAutopilotFeeBudgetError();
        // The AI's reference cost must be one verified within-limit exact
        // quote. A missing or over-limit default does not control other sizes.
        const defaultQuote = observedFees.get(draft.strategy.amount);
        const reference =
          (defaultQuote && quoteWithinLimits(defaultQuote)
            ? ([draft.strategy.amount, defaultQuote] as const)
            : undefined) ?? [...observedFees.entries()].find(([, fees]) => quoteWithinLimits(fees));
        // Available quotes that all breach the first-buy limits are a bounded
        // policy failure; only wholly unavailable quotes are a route failure.
        if (!reference) {
          // Only five actual fresh exact quotes failing impact alone supply this bounded cause.
          // Missing quotes, mixed policy failures and unquoted sizes establish no such evidence.
          if (
            observedFees.size === 5 &&
            costSamples.length === 5 &&
            costSamples.every((sample) => sample.status === 'available') &&
            [...observedFees.values()].every((fees) => {
              const reasons = quoteLimitReasons(fees);
              return reasons.length === 1 && reasons[0] === 'priceImpact';
            })
          )
            throw createAutopilotImpactPreflightError();
          throw new Error(observedFees.size ? 'bots.errors.policy' : 'bots.errors.quote');
        }
        draft.strategy.amount = reference[0];
        const preflightFees = reference[1];
        const oneBuyScreen = optimisticOneBuyTrainingScreen(
          draft,
          training.candles,
          [...observedFees.entries()]
            .filter(([, fees]) => quoteWithinLimits(fees))
            .map(([amount, fees]) => ({
              amountInCodec: toCodec(amount, draft.assetIn.decimals),
              networkFeeCodec: fees.networkFeeCodec,
            }))
        );
        // Desktop clients cap instructions at 2,000 characters, including a full goal title and sampled counts.
        draft.strategy.prompt = [
          `Goal: ${goal.title}. Draft 1-3 distinct training strategies.`,
          `Allocation: ${input.capital} ${draft.assetIn.symbol}; selecting ${draft.assetOut.symbol} does not exchange funds.`,
          `Use completed hourly closes and a 1 to ${maximumIntervalMs / HOUR} hour interval. Orders < ${fromCodec(tradeCeiling, draft.assetIn.decimals)} ${draft.assetIn.symbol}; the fee sample is not an order.`,
          'Goal fields set target, duration and valuation. Live target needs a completed fill and after-cost excess over idle. Drawdown is decline from peak portfolio value. Sell only acquired output above the fee reserve.',
          'Hourly pool marks are indicative, not fills. Prior 201 hours are signals only.',
          'openingFeeScenario: two training marks, not later feasibility or trading authority; fixed fees.',
          ...(oneBuyScreen.length
            ? [
                `Optimistic one-buy training (best close, observed network fee only): costSamples ${oneBuyScreen
                  .map((point) => {
                    const index = costSamples.findIndex((sample) => sample.amountInCodec === point.amountInCodec);
                    if (index < 0) throw stale();
                    return `#${index + 1} ${point.positiveEpisodes}/${point.totalEpisodes}`;
                  })
                  .join(', ')} 24h episodes beating idle. Multi-fill and unquoted sizes are not assessed.`,
              ]
            : []),
          `Score whole 24h allocations with idle days. Need one fill per training and validation phase, not in every 24-hour episode. Require positive mean growth and excess over idle in percentages and token units; every episode within loss limit. The reference-size first buy has an observed ${preflightFees.networkFeeXor} XOR network fee; other sizes have separate samples.`,
          'Try a selective long-only rules entry with exit:null and no-trade days. Do not manufacture a trade to satisfy a daily count. Past signals do not prove future gains.',
          'Costs are dated current scenarios, not historical execution observations. Unavailable quotes have no cost evidence; never infer unquoted feasibility. Exact amounts are re-quoted. Replay charges network, pool, impact and slippage. Reverse costs use forward output. No holdout data or return promises.',
        ].join(' ');
        report({ phase: 'drafting' });
        const suggested = await abortable(
          client.suggest(
            structuredClone(draft),
            structuredClone(training.candles.slice(-202)),
            work.controller.signal,
            {
              minimumIntervalMs: HOUR,
              maximumIntervalMs,
              minimumTrades: MIN_TRADES,
              trainingCandles: trainCount,
              validationCandles: validationCount,
              goalEpisodes: {
                protocol: 'goal-episodes-v3',
                durationMs: goal.durationMs,
                trainingEpisodes: trainingPlan.windows.length,
                validationEpisodes: validationPlan.windows.length,
                trainingTailCandles: trainingPlan.tailCandles,
                validationTailCandles: validationPlan.tailCandles,
                aggregation: 'mean-net-return',
                minimumTradesPerPartition: MIN_TRADES,
                signalWarmup: {
                  candles: 201,
                  firstCompletedAt: history.goalHistory.warmupCandles[0].timestamp,
                  lastCompletedAt: history.goalHistory.warmupCandles.at(-1)!.timestamp,
                  use: 'signals-only',
                  prices: 'not-supplied',
                },
              },
              sizing: {
                capitalCodec: draft.portfolio.initial[draft.assetIn.address],
                spendableInputCodec: tradeCeiling,
                feeSampleAmountCodec: toCodec(draft.strategy.amount, draft.assetIn.decimals),
              },
              costSamples,
              goal: {
                targetReturnPercent: goal.targetReturnPercent,
                maxLossPercent: goal.maxLossPercent,
                durationMs: goal.durationMs,
                valuationAsset: goal.valuationAsset ?? 'input',
                lossMetric: goal.lossMetric ?? 'baseline',
                ...(goal.targetRequiresIdleOutperformance ? { targetRequiresIdleOutperformance: true as const } : {}),
              },
              costs: {
                basis: 'current-finalized-scenario',
                finalizedAt: preflightFees.finalizedAt!,
                blockHash: preflightFees.blockHash,
                slippagePercent: settings.slippagePercent,
                feeReserveXor: input.feeBudgetXor,
                reserveFunding:
                  draft.assetIn.address === draft.policy.feeAsset.address ? 'included-in-input' : 'separate',
                reverseLotBasis: 'expected-forward-output',
                buy: {
                  networkFeeXor: preflightFees.networkFeeXor,
                  swapFeePercent: preflightFees.swapFeePercent,
                  priceImpactPercent: preflightFees.priceImpactPercent,
                },
                sell: {
                  networkFeeXor: preflightFees.sellNetworkFeeXor,
                  swapFeePercent: preflightFees.sellSwapFeePercent,
                  priceImpactPercent: preflightFees.sellPriceImpactPercent,
                },
              },
            }
          ),
          work.controller.signal
        );
        check();
        const submitted = suggested.strategies;
        const authored = submitted === undefined ? undefined : parseDistinctStrategies(submitted, draft);
        if (
          authored?.some(
            (strategy) =>
              strategy.intervalMs > maximumIntervalMs ||
              codec(toCodec(strategy.amount, draft.assetIn.decimals)) >= codec(tradeCeiling)
          )
        )
          throw new Error('bots.errors.proposal');
        const seed = authored ? undefined : parseDeterministicStrategy(suggested.strategy, draft);
        if (seed) {
          seed.prompt = '';
          seed.intervalMs = Math.max(HOUR, Math.ceil(seed.intervalMs / HOUR) * HOUR);
          if (seed.intervalMs > maximumIntervalMs) throw new Error('bots.errors.proposal');
          if (seed.kind === 'sma') seed.signalTiming = 'closed-hour';
        }
        // A sample is a sizing candidate only while its exact finalized quote
        // remains current and the first-buy limits pass. A later
        // candidate-specific observation still controls the actual replay.
        const selectionTime = now();
        const eligibleSampleCodecs = [...observedFees.entries()]
          .filter(
            ([, fees]) =>
              fees.queriedAt <= selectionTime &&
              fees.finalizedAt! <= selectionTime &&
              fees.expiresAt > selectionTime &&
              selectionTime - fees.finalizedAt! <= 300_000 &&
              quoteWithinLimits(fees)
          )
          .map(([amount]) => toCodec(amount, draft.assetIn.decimals));
        const singleDraft = authored?.[0] ?? seed;
        // A full-budget legacy draft cannot be a partial order; retain the established
        // bounded size fallback rather than admitting the submitted amount.
        const generated =
          client.draftTransport === 'desktop' &&
          singleDraft &&
          (!authored || authored.length === 1) &&
          codec(toCodec(singleDraft.amount, draft.assetIn.decimals)) < codec(tradeCeiling)
            ? desktopSingleDraftStrategies(singleDraft, draft, eligibleSampleCodecs)
            : undefined;
        const submittedStrategies =
          generated ??
          authored ??
          candidateStrategies(seed!, tradeCeiling, draft.assetIn.decimals, eligibleSampleCodecs);
        const screenedAsBatch = Boolean(generated || authored);
        const outputTradeLimitCodec = draft.policy.maxTradeCodec[draft.assetOut.address];
        const episodeHistories = new Map<string, BotHistory>();
        const episodeRequests = new Map<string, ExperimentDefinition>();
        const historyKey = (startAt: number, endAt: number) => `${startAt}:${endAt}`;
        const episodeDefinitions = (
          strategy: StrategyConfig,
          candidate: number,
          plan: ReturnType<typeof episodePlan>,
          phase: 'training' | 'validation'
        ): ExperimentDefinition[] =>
          plan.windows.map(({ start, end }, episode) => {
            const candles = history.candles.slice(start, end + 1);
            const historyStartAt = candles[0].timestamp;
            const historyEndAt = candles.at(-1)!.timestamp;
            episodeHistories.set(historyKey(historyStartAt, historyEndAt), {
              missing: 0,
              denominationVerified: true,
              identity: { ...history.identity! },
              candles,
            });
            const definition: ExperimentDefinition = {
              id: `autopilot-${phase}-${candidate}-${episode}`,
              name: goal.title.slice(0, 80),
              strategy: copyStrategyConfig(strategy),
              goal: copyBotGoal(goal),
              // Only prior observations cross an episode boundary, never funded state.
              warmupCandles: [...history.goalHistory.warmupCandles, ...history.candles.slice(0, start)].slice(
                -MAX_EPISODE_WARMUP_CANDLES
              ),
              outputTradeLimitCodec,
              settings: { ...strategySettings(settings, strategy), historyStartAt, historyEndAt },
            };
            episodeRequests.set(definition.id, copyExperimentDefinition(definition));
            return definition;
          });
        // Fee observations belong to the exact submitted candidate. Distinct
        // signals can share an amount and cadence yet receive different quotes.
        const candidateFees = new Map<string, ResearchFeeSnapshot>();
        const strategies: StrategyConfig[] = [];
        const submittedPositions: number[] = [];
        const screeningDrops: AutopilotScreeningEvidence['dropped'][number][] = [];
        // The canonical copy has stable field order across definitions and replay bots;
        // it also retains decimal spelling required by exact fee evidence checks.
        const feeKey = (strategy: StrategyConfig) => JSON.stringify(copyStrategyConfig(strategy));
        for (const [submittedIndex, submittedStrategy] of submittedStrategies.entries()) {
          let strategy = submittedStrategy;
          const screeningReasons = new Set<AutopilotScreeningReason>();
          const feeSettings = strategySettings(settings, strategy);
          let candidateBot = createResearchBot(feeSettings, assets, now(), strategy);
          const observed = observedFees.get(strategy.amount);
          const reuseObserved =
            observed !== undefined &&
            strategy.intervalMs === draft.strategy.intervalMs &&
            observed.expiresAt > now() &&
            now() - observed.finalizedAt! <= 300_000;
          let fees: ResearchFeeSnapshot | undefined;
          try {
            const quotedFees = reuseObserved
              ? observed!
              : await abortable(
                  options.loadFees(candidateBot, feeSettings, { allowHistoricalFinalizedState: false }),
                  work.controller.signal
                );
            check();
            verifiedFees(candidateBot, history, quotedFees, now());
            if (!screenedAsBatch || quoteWithinLimits(quotedFees)) fees = quotedFees;
            else for (const reason of quoteLimitReasons(quotedFees)) screeningReasons.add(reason);
          } catch (error) {
            check();
            if (!screenedAsBatch || !(error instanceof Error) || error.message !== 'bots.errors.quote') throw error;
            screeningReasons.add('quoteUnavailable');
          }
          if (!fees) {
            if (generated && submittedIndex === 0) {
              // Keep the assistant's exact seed intact; its sibling signals are
              // independently sized and quoted rather than mutating this draft.
              screeningDrops.push({ candidate: submittedIndex + 1, reasons: [...screeningReasons] });
              continue;
            }
            // An authored signal need not disappear with an unquotable or
            // over-limit size. Try its largest smaller independently observed,
            // within-limit size once, with a new exact candidate quote. Neither
            // costs nor feasibility are inferred between sizes; holdout stays sealed.
            const originalAmount = codec(toCodec(strategy.amount, draft.assetIn.decimals));
            const nearest = eligibleSampleCodecs
              .map(codec)
              .filter((size) => size > 0n && size < originalAmount && size < codec(tradeCeiling))
              .sort((left, right) => (left > right ? -1 : left < right ? 1 : 0))[0];
            if (nearest === undefined) {
              screeningReasons.add('noSmallerExactSample');
              screeningDrops.push({ candidate: submittedIndex + 1, reasons: [...screeningReasons] });
              continue;
            }
            strategy = {
              ...copyStrategyConfig(strategy),
              amount: fromCodec(nearest.toString(), draft.assetIn.decimals),
            };
            const fallbackSettings = strategySettings(settings, strategy);
            candidateBot = createResearchBot(fallbackSettings, assets, now(), strategy);
            try {
              fees = await abortable(
                options.loadFees(candidateBot, fallbackSettings, { allowHistoricalFinalizedState: false }),
                work.controller.signal
              );
            } catch (fallbackError) {
              check();
              if (fallbackError instanceof Error && fallbackError.message === 'bots.errors.quote') {
                screeningReasons.add('quoteUnavailable');
                screeningDrops.push({ candidate: submittedIndex + 1, reasons: [...screeningReasons] });
                continue;
              }
              throw fallbackError;
            }
            check();
            verifiedFees(candidateBot, history, fees, now());
            if (!quoteWithinLimits(fees)) {
              for (const reason of quoteLimitReasons(fees)) screeningReasons.add(reason);
              screeningDrops.push({ candidate: submittedIndex + 1, reasons: [...screeningReasons] });
              continue;
            }
          }
          assertFeeSampleBudget(candidateBot, fees);
          candidateFees.set(feeKey(strategy), structuredClone(fees));
          strategies.push(strategy);
          submittedPositions.push(submittedIndex + 1);
        }
        const screening: AutopilotScreeningEvidence | undefined = screenedAsBatch
          ? { submitted: submittedStrategies.length, dropped: screeningDrops }
          : undefined;
        if (!strategies.length)
          throw screening
            ? createAutopilotQualificationError('training', [], null, screening)
            : new Error('bots.errors.quote');
        const definitions = strategies.flatMap((strategy, index) =>
          episodeDefinitions(strategy, index, trainingPlan, 'training')
        );
        let finished = 0;
        const finishedIds = new Set<string>();
        const total = definitions.length + validationPlan.windows.length;
        report({ phase: 'testing', completed: 0, total });
        work.runner = createExperimentRunner({
          assets,
          now,
          loadHistory: async (_bot, episodeSettings) => {
            const episode = episodeHistories.get(
              historyKey(episodeSettings.historyStartAt!, episodeSettings.historyEndAt!)
            );
            if (!episode) throw stale();
            return structuredClone(episode);
          },
          loadFees: async (bot) => {
            const fees = candidateFees.get(feeKey(bot.strategy));
            if (!fees) throw stale();
            verifiedFees(bot, history, fees, now());
            return structuredClone(fees);
          },
          onUpdate: (run) => {
            if (active !== work || work.controller.signal.aborted) return;
            if (run.status === 'complete' && !finishedIds.has(run.id)) {
              finishedIds.add(run.id);
              report({ phase: 'testing', completed: ++finished, total });
            }
          },
        });
        const evidence = (run: ExperimentRun): GoalEpisodeEvidence => {
          const request = episodeRequests.get(run.id);
          const result = run.result!;
          const evaluation = result.goalEvaluation;
          if (!request || !evaluation) throw stale();
          const start = request.settings.historyStartAt!;
          const end = request.settings.historyEndAt!;
          // Canonical request fields are copied before dispatch. A stale worker may
          // finish successfully while having ignored new goal or policy options.
          const requestedOptions = (definition: ExperimentDefinition) => ({
            strategy: definition.strategy,
            goal: definition.goal,
            warmupCandles: definition.warmupCandles,
            outputTradeLimitCodec: definition.outputTradeLimitCodec,
          });
          const expectedBot = createResearchBot(request.settings, assets, run.createdAt, request.strategy);
          expectedBot.goal = copyBotGoal(request.goal!);
          expectedBot.policy.maxTradeCodec[expectedBot.assetOut.address] = request.outputTradeLimitCodec!;
          // Deliberately omit generated IDs, timestamps and display metadata;
          // funding, executable rules and all risk limits must match the request.
          const template = (candidate: BotDefinition) => ({
            assetIn: candidate.assetIn,
            assetOut: candidate.assetOut,
            strategy: candidate.strategy,
            goal: candidate.goal,
            policy: candidate.policy,
            portfolio: candidate.portfolio,
            goalState: candidate.goalState,
          });
          if (
            run.settings.historyStartAt !== start ||
            run.settings.historyEndAt !== end ||
            evaluation.fundingTimestamp !== start ||
            evaluation.endingTimestamp !== end ||
            evaluation.state.outcome === 'active' ||
            JSON.stringify(requestedOptions(run)) !== JSON.stringify(requestedOptions(request)) ||
            JSON.stringify(evaluation.goal) !== JSON.stringify(request.goal) ||
            JSON.stringify(evaluation.warmupCandles) !== JSON.stringify(request.warmupCandles) ||
            evaluation.outputTradeLimitCodec !== request.outputTradeLimitCodec ||
            JSON.stringify(template(result.bot)) !== JSON.stringify(template(expectedBot))
          )
            throw stale();
          return makeGoalEpisodeEvidence(
            goalResult(result.result, result.source.history, goal),
            start,
            end,
            evaluation.state.outcome
          );
        };
        const trainingRuns = completed(await work.runner.run(definitions));
        check();
        const measured = strategies.map((strategy, candidate) => {
          const rows = trainingRuns
            .slice(candidate * trainingPlan.windows.length, (candidate + 1) * trainingPlan.windows.length)
            .map(evidence);
          const summary = summarizeGoalEpisodes(rows);
          return { candidate, strategy, rows, summary, reasons: qualificationReasons(summary, goal.maxLossPercent) };
        });
        const qualifying = measured.filter((candidate) => candidate.reasons.length === 0);
        // Penalize observed training drawdown instead of maximizing gross or optimistic returns alone.
        qualifying.sort((a, b) => {
          const score = (candidate: (typeof measured)[number]) =>
            fp(candidate.summary.returnPercent).sub(fp(candidate.summary.drawdownPercent));
          return score(a).eq(score(b)) ? 0 : score(a).gt(score(b)) ? -1 : 1;
        });
        const winner = qualifying[0];
        if (!winner) {
          const firstFees = candidateFees.get(feeKey(strategies[0]));
          let feePressure: ReturnType<typeof describeNetworkFeeLossPressure> = null;
          if (firstFees && firstFees.expiresAt > now() && now() - firstFees.finalizedAt! <= 300_000) {
            const candidateBot = createResearchBot(
              strategySettings(settings, strategies[0]),
              assets,
              now(),
              strategies[0]
            );
            feePressure = describeNetworkFeeLossPressure(
              candidateBot,
              history.candles.at(-1)!,
              goal,
              firstFees.networkFeeCodec,
              { finalizedAt: firstFees.finalizedAt!, expiresAt: firstFees.expiresAt },
              now()
            );
          }
          throw createAutopilotQualificationError(
            'training',
            measured.map((candidate) => {
              // GO episodes always retain full replay checks, even without a progress consumer.
              // Explain only already-failed training candidates; these causes never affect selection.
              const causes = new Set(
                trainingRuns
                  .slice(
                    candidate.candidate * trainingPlan.windows.length,
                    (candidate.candidate + 1) * trainingPlan.windows.length
                  )
                  .flatMap((run) => run.result?.candidates ?? [])
                  .map(researchExecutionRejection)
              );
              return {
                candidate: submittedPositions[candidate.candidate],
                reasons: [
                  ...candidate.reasons,
                  ...(['priceImpact', 'goalTradeCost', 'feeBudget'] as const).filter((reason) => causes.has(reason)),
                ],
              };
            }),
            measured.some(
              (candidate) =>
                candidate.reasons.includes('drawdown') ||
                trainingRuns
                  .slice(
                    candidate.candidate * trainingPlan.windows.length,
                    (candidate.candidate + 1) * trainingPlan.windows.length
                  )
                  .flatMap((run) => run.result?.candidates ?? [])
                  .map(researchExecutionRejection)
                  .includes('goalTradeCost')
            )
              ? feePressure
              : null,
            screening
          );
        }
        const fees = candidateFees.get(feeKey(winner.strategy))!;
        const winningSettings = strategySettings(settings, winner.strategy);
        // Freeze the live template before reading holdout episodes. Replays never supply its funded state or limits.
        const bot = createResearchBot(winningSettings, assets, now(), winner.strategy);
        bot.name = goal.title.slice(0, 80);
        bot.goal = copyBotGoal(goal);
        bot.policy.sessionDurationMs = DAY;
        bot.policy.maxTradeCodec[bot.assetOut.address] = outputTradeLimitCodec;
        verifiedFees(bot, history, fees, now());
        await options.onValidationStarted?.({
          from: history.candles[trainCount + 1].timestamp,
          to: history.candles.at(-1)!.timestamp,
        });
        check();
        const heldOut = completed(
          await work.runner.run(episodeDefinitions(winner.strategy, winner.candidate, validationPlan, 'validation'))
        );
        check();
        const validationRows = heldOut.map(evidence);
        const qualification = summarizeGoalEpisodes(validationRows);
        const validationReasons = qualificationReasons(qualification, goal.maxLossPercent);
        if (validationReasons.length)
          throw createAutopilotQualificationError('validation', [
            { candidate: submittedPositions[winner.candidate], reasons: validationReasons },
          ]);
        // Requery the exact prefix and study before review. A changed source,
        // network or observation invalidates the run instead of retuning it.
        const currentHistory = verifiedHistory(
          bot,
          await abortable(
            options.loadHistory(bot, settings, work.controller.signal, { fresh: true }),
            work.controller.signal
          ),
          settings,
          now()
        );
        check();
        if (
          currentHistory.goalHistory.commitmentSha256 !== history.goalHistory.commitmentSha256 ||
          currentHistory.identity!.genesisHash !== history.identity!.genesisHash ||
          currentHistory.identity!.denominator !== history.identity!.denominator ||
          currentHistory.candles.some(
            (candle, index) =>
              candle.timestamp !== history.candles[index].timestamp ||
              candle.close !== history.candles[index].close ||
              candle.feeClose !== history.candles[index].feeClose
          )
        )
          throw stale();
        verifiedFees(bot, history, fees, now());
        const research: GoalResearchSnapshot = makeExperimentSnapshot(heldOut[0].result!, fees);
        const allEpisodes = summarizeGoalEpisodes([...winner.rows, ...validationRows]);
        research.testedAt = bot.createdAt;
        research.startAt = history.candles[0].timestamp;
        research.endAt = history.candles.at(-1)!.timestamp;
        research.validation = 'holdout';
        research.returnPercent = allEpisodes.returnPercent;
        research.drawdownPercent = allEpisodes.drawdownPercent;
        research.trades = allEpisodes.trades;
        research.coverage = allEpisodes.coverage;
        if (goal.valuationAsset !== undefined) research.valuationAsset = goal.valuationAsset;
        research.optimized = strategies.length > 1;
        research.qualification = {
          candidates: strategies.length,
          startAt: validationRows[0].startAt,
          endAt: validationRows.at(-1)!.endAt,
          returnPercent: qualification.returnPercent,
          drawdownPercent: qualification.drawdownPercent,
          trades: qualification.trades,
          coverage: qualification.coverage,
        };
        research.goalEpisodes = {
          protocol: 'goal-episodes-v3',
          history: copyGoalHistoryEvidence(history.goalHistory),
          aggregation: 'mean-net-return',
          goal: copyBotGoal(goal),
          binding: createGoalResearchBinding(bot, fees),
          training: {
            startAt: training.candles[0].timestamp,
            endAt: training.candles.at(-1)!.timestamp,
            tailCandles: trainingPlan.tailCandles,
            episodes: winner.rows,
          },
          validation: {
            startAt: history.candles[trainCount + 1].timestamp,
            endAt: history.candles.at(-1)!.timestamp,
            tailCandles: validationPlan.tailCandles,
            episodes: validationRows,
          },
        };
        bot.research = research;
        report({ phase: 'ready', completed: total, total });
        return {
          bot,
          settings: { ...winningSettings, validation: 'holdout' },
          research,
          denomination: { ...history.identity! },
          candidates: strategies.length,
        };
      } finally {
        signal?.removeEventListener('abort', abort);
        work.runner?.dispose();
        if (active === work) active = undefined;
      }
    },
    cancel,
    /** Release workers and prevent this instance from starting another research run. */
    dispose(): void {
      cancel();
      disposed = true;
    },
  };
}
