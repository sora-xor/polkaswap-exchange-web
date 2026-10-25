import { FPNumber } from '@/lib/substrate/math';
import { codec, percent, toCodec } from './amounts';
import { copyStrategyConfig, decimalRatio } from './engine';
import { copyBotGoal } from './goals';
import { assertGoalPublicData as publicData, copyGoalHistoryEvidence, type GoalHistoryEvidence } from './goal-history';
import type { ResearchFeeSnapshot } from './research-fees';
import type {
  BacktestResult,
  BotAsset,
  BotDefinition,
  BotGoal,
  BotGoalState,
  BotResearchSnapshot,
  StrategyConfig,
} from './types';

/** One independently funded episode; stopped trading never freezes its terminal valuation. */
export interface GoalEpisodeEvidence {
  startAt: number;
  endAt: number;
  initialValue: string;
  finalValue: string;
  heldFinalValue: string;
  returnPercent: string;
  drawdownPercent: string;
  trades: number;
  coverage: number;
  outcome: Exclude<BotGoalState['outcome'], 'active'>;
}
/** Trailing observations remain explicit; episode starts never depend on observed returns. */
export interface GoalEpisodePartition {
  startAt: number;
  endAt: number;
  tailCandles: number;
  episodes: GoalEpisodeEvidence[];
}
/** Public settings bind historical evidence to the exact proposed live allocation and policy. */
export interface GoalResearchBinding {
  assetIn: BotAsset;
  assetOut: BotAsset;
  feeAsset: BotAsset;
  capitalCodec: string;
  feeBudgetCodec: string;
  inputTradeLimitCodec: string;
  outputTradeLimitCodec: string;
  slippagePercent: string;
  maxPriceImpactPercent: string;
  strategy: StrategyConfig;
  networkFeeXor: string;
  sellNetworkFeeXor: string;
  swapFeePercent: string;
  sellSwapFeePercent: string;
  priceImpactPercent: string;
  sellPriceImpactPercent: string;
}
/** Descriptive historical scenarios, not a confidence level or promise of future profitability. */
interface GoalResearchEvidenceBase {
  aggregation: 'mean-net-return';
  goal: BotGoal;
  binding: GoalResearchBinding;
  training: GoalEpisodePartition;
  validation: GoalEpisodePartition;
}
/** Legacy studies retain their original no-prefix protocol; they are never silently upgraded. */
export type GoalResearchEvidence = GoalResearchEvidenceBase &
  ({ protocol: 'goal-episodes-v2' } | { protocol: 'goal-episodes-v3'; history: GoalHistoryEvidence });
export type GoalResearchSnapshot = BotResearchSnapshot & { goalEpisodes?: GoalResearchEvidence };

const HOUR = 3_600_000;
const fp = (value: string) => new FPNumber(value, 36);
const invalid = (): never => {
  throw new Error('bots.errors.config');
};
const change = (initial: string, final: string): string =>
  decimalRatio(fp(final).sub(fp(initial)), fp(initial))
    .mul(fp('100'))
    .toString();

/** Reject non-public structures/accessors before reading an evidence object. */
function record(value: unknown): Record<string, unknown> {
  publicData(value);
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype)
    invalid();
  if (Object.values(Object.getOwnPropertyDescriptors(value)).some((field) => !('value' in field))) invalid();
  return value as Record<string, unknown>;
}
/** Monetary values are bounded decimal strings, never JS floating-point numbers. */
function amount(value: unknown, positive = false): string {
  if (typeof value !== 'string' || value.length > 120 || !/^(0|[1-9]\d*)(\.\d{1,36})?$/.test(value)) invalid();
  const parsed = fp(value as string);
  if (!parsed.isFinity() || (positive && !parsed.gt(fp('0')))) invalid();
  return parsed.toString();
}
/** Copy a row and recompute its return rather than trusting a supplied aggregate. */
function copyEpisode(value: GoalEpisodeEvidence): GoalEpisodeEvidence {
  const row = record(value);
  if (
    ![row.startAt, row.endAt, row.trades].every(Number.isSafeInteger) ||
    (row.startAt as number) < 0 ||
    (row.endAt as number) <= (row.startAt as number) ||
    (row.trades as number) < 0 ||
    (row.trades as number) > 10000 ||
    typeof row.coverage !== 'number' ||
    !Number.isFinite(row.coverage) ||
    row.coverage < 0 ||
    row.coverage > 1 ||
    !['target', 'loss', 'expired'].includes(row.outcome as string)
  )
    invalid();
  const initialValue = amount(row.initialValue, true);
  const finalValue = amount(row.finalValue);
  const heldFinalValue = amount(row.heldFinalValue);
  const returnPercent = change(initialValue, finalValue);
  if (typeof row.returnPercent !== 'string' || row.returnPercent !== returnPercent) invalid();
  const drawdownPercent = amount(row.drawdownPercent);
  if (
    fp(drawdownPercent).gt(fp('100')) ||
    fp(drawdownPercent).lt(fp('0').sub(fp(returnPercent))) ||
    (value.trades === 0 && finalValue !== heldFinalValue)
  )
    invalid();
  return {
    startAt: value.startAt,
    endAt: value.endAt,
    initialValue,
    finalValue,
    heldFinalValue,
    returnPercent,
    drawdownPercent,
    trades: value.trades,
    coverage: value.coverage,
    outcome: value.outcome,
  };
}
/** Capture a completed replay after the caller converts both portfolio and idle values into the goal asset. */
export function makeGoalEpisodeEvidence(
  result: BacktestResult,
  startAt: number,
  endAt: number,
  outcome: GoalEpisodeEvidence['outcome']
): GoalEpisodeEvidence {
  const first = result.equity[0];
  const last = result.equity.at(-1);
  if (!first || !last || ![startAt, startAt - 1].includes(first.timestamp) || last.timestamp !== endAt) invalid();
  return copyEpisode({
    startAt,
    endAt,
    initialValue: first.value,
    finalValue: last!.value,
    heldFinalValue: last!.benchmark,
    returnPercent: change(first.value, last!.value),
    drawdownPercent: result.drawdownPercent,
    trades: result.trades,
    coverage: result.coverage,
    outcome,
  });
}
/** Equal-weight episode statistics; reset equity curves are never concatenated or compounded. */
export function summarizeGoalEpisodes(episodes: readonly GoalEpisodeEvidence[]) {
  publicData(episodes);
  if (!episodes.length || episodes.length > 90) invalid();
  const rows = episodes.map(copyEpisode);
  const average = (values: string[]) =>
    decimalRatio(
      values.reduce((sum, value) => sum.add(fp(value)), fp('0')),
      fp(String(rows.length))
    ).toString();
  return {
    returnPercent: average(rows.map((row) => row.returnPercent)),
    drawdownPercent: rows.reduce((worst, row) => worst.max(fp(row.drawdownPercent)), fp('0')).toString(),
    trades: rows.reduce((sum, row) => sum + row.trades, 0),
    coverage: Math.min(...rows.map((row) => row.coverage)),
    netChange: average(rows.map((row) => fp(row.finalValue).sub(fp(row.initialValue)).toString())),
    excessChange: average(rows.map((row) => fp(row.finalValue).sub(fp(row.heldFinalValue)).toString())),
    excessReturnPercent: average(
      rows.map((row) =>
        decimalRatio(fp(row.finalValue).sub(fp(row.heldFinalValue)), fp(row.initialValue))
          .mul(fp('100'))
          .toString()
      )
    ),
  };
}
/** Keep asset identity and precision; symbols are display-only public metadata. */
function copyAsset(value: BotAsset): BotAsset {
  const asset = record(value);
  if (
    typeof asset.address !== 'string' ||
    !/^0x[0-9a-f]{64}$/i.test(asset.address) ||
    typeof asset.symbol !== 'string' ||
    !asset.symbol ||
    asset.symbol.length > 40 ||
    !Number.isSafeInteger(asset.decimals) ||
    (asset.decimals as number) < 0 ||
    (asset.decimals as number) > 36
  )
    invalid();
  return { address: value.address, symbol: value.symbol, decimals: value.decimals };
}
/** Project the precise allocation, limits, deterministic rule and dated cost assumptions. */
export function createGoalResearchBinding(
  bot: BotDefinition,
  fees: Pick<
    ResearchFeeSnapshot,
    | 'networkFeeXor'
    | 'sellNetworkFeeXor'
    | 'swapFeePercent'
    | 'sellSwapFeePercent'
    | 'priceImpactPercent'
    | 'sellPriceImpactPercent'
  >
): GoalResearchBinding {
  return copyBinding({
    assetIn: bot.assetIn,
    assetOut: bot.assetOut,
    feeAsset: bot.policy.feeAsset,
    capitalCodec: bot.portfolio.initial[bot.assetIn.address],
    feeBudgetCodec: bot.policy.feeBudgetCodec,
    inputTradeLimitCodec: bot.policy.maxTradeCodec[bot.assetIn.address],
    outputTradeLimitCodec: bot.policy.maxTradeCodec[bot.assetOut.address],
    slippagePercent: bot.policy.slippagePercent,
    maxPriceImpactPercent: bot.policy.maxPriceImpactPercent,
    strategy: bot.strategy,
    networkFeeXor: fees.networkFeeXor,
    sellNetworkFeeXor: fees.sellNetworkFeeXor,
    swapFeePercent: fees.swapFeePercent,
    sellSwapFeePercent: fees.sellSwapFeePercent,
    priceImpactPercent: fees.priceImpactPercent,
    sellPriceImpactPercent: fees.sellPriceImpactPercent,
  });
}
/** Validate before accepting persisted descriptive evidence as live-review provenance. */
function copyBinding(value: GoalResearchBinding): GoalResearchBinding {
  record(value);
  const assetIn = copyAsset(value.assetIn),
    assetOut = copyAsset(value.assetOut),
    feeAsset = copyAsset(value.feeAsset);
  if (assetIn.address === assetOut.address) invalid();
  for (const key of ['capitalCodec', 'feeBudgetCodec', 'inputTradeLimitCodec', 'outputTradeLimitCodec'] as const)
    if (typeof value[key] !== 'string' || codec(value[key]) <= 0n || codec(value[key]).toString() !== value[key])
      invalid();
  const spendable =
    codec(value.capitalCodec) - (assetIn.address === feeAsset.address ? codec(value.feeBudgetCodec) : 0n);
  if (codec(value.inputTradeLimitCodec) >= spendable) invalid();
  const slippagePercent = amount(value.slippagePercent);
  const maxPriceImpactPercent = amount(value.maxPriceImpactPercent);
  if (percent(slippagePercent).gte(fp('100'))) invalid();
  if (percent(maxPriceImpactPercent).gte(fp('100'))) invalid();
  const strategy = copyStrategyConfig(value.strategy);
  if (
    strategy.kind === 'ai' ||
    strategy.prompt !== '' ||
    toCodec(strategy.amount, assetIn.decimals) !== value.inputTradeLimitCodec ||
    !Number.isSafeInteger(strategy.intervalMs) ||
    strategy.intervalMs < HOUR ||
    strategy.intervalMs > 24 * HOUR ||
    strategy.intervalMs % HOUR !== 0
  )
    invalid();
  const networkFeeXor = amount(value.networkFeeXor, true),
    sellNetworkFeeXor = amount(value.sellNetworkFeeXor, true);
  toCodec(networkFeeXor, feeAsset.decimals);
  toCodec(sellNetworkFeeXor, feeAsset.decimals);
  const swapFeePercent = amount(value.swapFeePercent),
    sellSwapFeePercent = amount(value.sellSwapFeePercent);
  percent(swapFeePercent, '10');
  percent(sellSwapFeePercent, '10');
  const priceImpactPercent = amount(value.priceImpactPercent),
    sellPriceImpactPercent = amount(value.sellPriceImpactPercent);
  if (percent(priceImpactPercent).gte(fp('100')) || percent(sellPriceImpactPercent).gte(fp('100'))) invalid();
  return {
    assetIn,
    assetOut,
    feeAsset,
    capitalCodec: value.capitalCodec,
    feeBudgetCodec: value.feeBudgetCodec,
    inputTradeLimitCodec: value.inputTradeLimitCodec,
    outputTradeLimitCodec: value.outputTradeLimitCodec,
    slippagePercent,
    maxPriceImpactPercent,
    strategy,
    networkFeeXor,
    sellNetworkFeeXor,
    swapFeePercent,
    sellSwapFeePercent,
    priceImpactPercent,
    sellPriceImpactPercent,
  };
}
/** Require every predetermined full episode, including losing and idle periods, and account for the unused tail. */
function copyPartition(value: GoalEpisodePartition, goal: BotGoal): GoalEpisodePartition {
  record(value);
  if (
    ![value.startAt, value.endAt, value.tailCandles].every(Number.isSafeInteger) ||
    value.startAt < 0 ||
    value.startAt % HOUR !== 0 ||
    value.endAt % HOUR !== 0 ||
    value.endAt <= value.startAt ||
    !Array.isArray(value.episodes) ||
    !value.episodes.length ||
    value.episodes.length > 90
  )
    invalid();
  const count = Math.floor((value.endAt - value.startAt) / goal.durationMs);
  const tail = (value.endAt - value.startAt - count * goal.durationMs) / HOUR;
  if (value.episodes.length !== count || value.tailCandles !== tail) invalid();
  const episodes = value.episodes.map(copyEpisode);
  episodes.forEach((row, index) => {
    if (
      row.startAt !== value.startAt + index * goal.durationMs ||
      row.endAt !== row.startAt + goal.durationMs ||
      row.coverage !== 1
    )
      invalid();
  });
  return { startAt: value.startAt, endAt: value.endAt, tailCandles: tail, episodes };
}
/** Keep each pool-history protocol explicit; USD-derived v1 studies require a fresh study. */
export function copyGoalResearchEvidence(value: GoalResearchEvidence): GoalResearchEvidence {
  record(value);
  if (!['goal-episodes-v2', 'goal-episodes-v3'].includes(value.protocol) || value.aggregation !== 'mean-net-return')
    invalid();
  const goal = copyBotGoal(value.goal);
  if (goal.durationMs !== 24 * HOUR || goal.lossMetric !== 'drawdown') invalid();
  const binding = copyBinding(value.binding);
  const training = copyPartition(value.training, goal),
    validation = copyPartition(value.validation, goal);
  if (
    validation.startAt !== training.endAt + 2 * HOUR ||
    training.episodes.length !== 4 ||
    validation.episodes.length !== 2 ||
    training.tailCandles !== 20 ||
    validation.tailCandles !== 1
  )
    invalid();
  if (value.protocol === 'goal-episodes-v2')
    return { protocol: 'goal-episodes-v2', aggregation: 'mean-net-return', goal, binding, training, validation };
  const history = copyGoalHistoryEvidence(value.history);
  if (
    JSON.stringify(history.assetIn) !== JSON.stringify(binding.assetIn) ||
    JSON.stringify(history.assetOut) !== JSON.stringify(binding.assetOut) ||
    JSON.stringify(history.feeAsset) !== JSON.stringify(binding.feeAsset) ||
    training.startAt !== history.studyStartAt + HOUR ||
    validation.endAt !== history.studyEndAt
  )
    invalid();
  return { protocol: 'goal-episodes-v3', aggregation: 'mean-net-return', goal, binding, training, validation, history };
}
/** Recompute all displayed/admission summaries and preserve the same observed loss limit. */
export function validateGoalResearchSnapshot(snapshot: GoalResearchSnapshot): GoalResearchEvidence | undefined {
  record(snapshot);
  if (snapshot.goalEpisodes === undefined) return;
  const evidence = copyGoalResearchEvidence(snapshot.goalEpisodes);
  const all = summarizeGoalEpisodes([...evidence.training.episodes, ...evidence.validation.episodes]);
  const train = summarizeGoalEpisodes(evidence.training.episodes),
    test = summarizeGoalEpisodes(evidence.validation.episodes);
  const q = snapshot.qualification;
  if (
    !snapshot.feeObservation ||
    toCodec(snapshot.feeObservation.amountIn, evidence.binding.assetIn.decimals) !==
      evidence.binding.inputTradeLimitCodec ||
    snapshot.optimized !== Boolean(q && q.candidates > 1)
  )
    invalid();
  if (
    evidence.protocol === 'goal-episodes-v3' &&
    snapshot.feeObservation.genesisHash !== evidence.history.identity.genesisHash
  )
    invalid();
  if (
    !q ||
    !snapshot.feeObservation ||
    snapshot.trainPercent !== 70 ||
    snapshot.folds !== 2 ||
    q.candidates < 1 ||
    q.candidates > 3 ||
    snapshot.source !== 'historical' ||
    snapshot.validation !== 'holdout' ||
    snapshot.coverage !== 1 ||
    snapshot.startAt !== evidence.training.startAt ||
    snapshot.endAt !== evidence.validation.endAt ||
    (snapshot.valuationAsset ?? 'input') !== (evidence.goal.valuationAsset ?? 'input') ||
    snapshot.returnPercent !== all.returnPercent ||
    snapshot.drawdownPercent !== all.drawdownPercent ||
    snapshot.trades !== all.trades ||
    q.startAt !== evidence.validation.episodes[0].startAt ||
    q.endAt !== evidence.validation.episodes.at(-1)!.endAt ||
    q.returnPercent !== test.returnPercent ||
    q.drawdownPercent !== test.drawdownPercent ||
    q.trades !== test.trades ||
    q.coverage !== 1
  )
    invalid();
  for (const result of [train, test])
    if (
      result.trades < 1 ||
      !fp(result.returnPercent).gt(fp('0')) ||
      !fp(result.netChange).gt(fp('0')) ||
      !fp(result.excessChange).gt(fp('0')) ||
      !fp(result.excessReturnPercent).gt(fp('0')) ||
      fp(result.drawdownPercent).gt(fp(evidence.goal.maxLossPercent))
    )
      invalid();
  for (const key of [
    'networkFeeXor',
    'sellNetworkFeeXor',
    'swapFeePercent',
    'sellSwapFeePercent',
    'priceImpactPercent',
    'sellPriceImpactPercent',
  ] as const)
    if (snapshot[key] === undefined || amount(snapshot[key]) !== evidence.binding[key]) invalid();
  return evidence;
}
/** A saved study cannot authorize a changed goal, strategy, allocation or trading policy. */
export function assertGoalResearchBinding(bot: BotDefinition, evidence: GoalResearchEvidence): void {
  if (!bot.goal || JSON.stringify(copyBotGoal(bot.goal)) !== JSON.stringify(evidence.goal)) invalid();
  const actual = createGoalResearchBinding(bot, evidence.binding);
  if (JSON.stringify(actual) !== JSON.stringify(evidence.binding)) invalid();
  if (
    evidence.protocol === 'goal-episodes-v3' &&
    bot.network !== 'paper' &&
    bot.network !== evidence.history.identity.genesisHash
  )
    invalid();
  const initialOutput = codec(bot.portfolio.initial[bot.assetOut.address] ?? '0');
  const fee = codec(bot.portfolio.initial[bot.policy.feeAsset.address] ?? '0');
  if (
    initialOutput !== (bot.assetOut.address === bot.policy.feeAsset.address ? codec(bot.policy.feeBudgetCodec) : 0n) ||
    (bot.assetIn.address !== bot.policy.feeAsset.address && fee !== codec(bot.policy.feeBudgetCodec))
  )
    invalid();
}
