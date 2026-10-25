/** Offline development episodes with separate observation, decision and quote clocks; never trading authority. */
import { FPNumber } from '../../src/lib/substrate/math';
import {
  applyPaperFill,
  decimalRatio,
  portfolioPerformance,
  valuePortfolio,
} from '../../src/features/bot-trading/engine';
import { evaluateBotGoal } from '../../src/features/bot-trading/goals';
import { assessGoalTradeAdmission } from '../../src/features/bot-trading/goalAdmission';
import type { BotCandle, BotDefinition, BotEquityPoint, BotGoalState } from '../../src/features/bot-trading/types';
import {
  EXECUTION_EVIDENCE_KUSD as KUSD,
  EXECUTION_EVIDENCE_XOR as XOR,
  EXECUTION_EVIDENCE_INPUT_CODEC,
  canonicalEvidenceJson,
  hashEvidence,
  type ExecutionSnapshot,
} from './execution-evidence';
import { validateExecutionJournal, type ExecutionManifest, type ExecutionRecord } from './execution-store';

export const EXECUTION_EPISODE_DURATION_MS = 24 * 60 * 60 * 1000;
export type ExecutionEpisodePolicy = 'idle' | 'seed-once' | 'improved-net-acquisition-once';
export type ExecutionEpisodeScenario = 'quoted-minimum-success' | 'fee-only-failure';

export interface ExecutionEpisodeEvent {
  slot: number;
  availableAt: number;
  kind: 'funding' | 'mark' | 'gap' | 'decision' | 'rejected' | 'scenario-fill' | 'scenario-failure';
  reason?: string;
  sourceBlock?: number;
  sourceBlockHash?: string;
  decisionSlot?: number;
  valueXor?: string;
  peakXor?: string;
  returnPercent?: string;
  goalOutcome?: BotGoalState['outcome'];
  kusdCodec: string;
  xorCodec: string;
  feesPaidXorCodec: string;
}

export interface ExecutionEpisodeResult {
  schemaVersion: 1;
  purpose: 'development';
  policy: ExecutionEpisodePolicy;
  scenario: ExecutionEpisodeScenario;
  status: 'opening-unavailable' | 'prefix-only' | 'full-episode' | 'incomplete-episode';
  manifestHash: string;
  lastRecordHash: string | null;
  fundedAt?: number;
  expiresAt?: number;
  closingObservedAt?: number;
  closingLagMs?: number;
  maximumClosingLagMs: number;
  expectedSlots: number;
  retainedSlots: number;
  missingSlots: number[];
  untimedSlots: number[];
  coverage: string;
  fullEpisodeEvidence: boolean;
  qualifiedStrategy: false;
  actualTransactions: 0;
  scenarioBuys: number;
  scenarioFailures: number;
  decisions: number;
  /** An unobserved future due slot is pending, never a retrospectively erased rejection event. */
  pendingDecision?: { decisionSlot: number; dueSlot: number; decidedAt: number };
  finalHoldings: { kusdCodec: string; xorCodec: string; feesPaidXorCodec: string };
  performance?: { returnPercent: string; drawdownPercent: string; initialValue: string; finalValue: string };
  goalState?: BotGoalState;
  events: ExecutionEpisodeEvent[];
  assumptions: readonly string[];
}

const UNIT = 10n ** 18n;
const INITIAL_KUSD = (10n * UNIT).toString();
const INITIAL_XOR = UNIT.toString();
const LIMITATIONS = [
  'Development only. A quote is not a fill, and neither success nor fee-only failure is an observed transaction.',
  'Success assumes the sampled minimum at validated receipt; transaction inclusion/finalization delay is unmeasured.',
  'Entry needs a later request and advancing finalized block, with less than five seconds from buy request start to validated snapshot receipt.',
  'Observed marks use the live impact-free quote convention, with embedded route fees. They are not liquidation values.',
  'The hypothetical entry does not alter later real pool states; market-impact feedback is not simulated.',
  'Peaks, funding, fees, deadline and goal latches persist. Pausing leaves inventory exposed; later marks remain in episode performance.',
  'No intraperiod price, missing outcome or hourly-to-minute interpolation is invented. A full episode is not statistical acceptance.',
  'Policies make at most one entry decision and one sampled attempt; no exits or retry search are modeled.',
  'The research uses the live controller default 3% absolute price-impact limit; it does not read a wallet policy.',
] as const;

/** Construct only a detached paper allocation; importing this module exposes no network or wallet operation. */
function episodeBot(now: number): BotDefinition {
  const assetIn = { address: KUSD, symbol: 'KUSD', decimals: 18 };
  const assetOut = { address: XOR, symbol: 'XOR', decimals: 18 };
  return {
    version: 1,
    id: 'execution-development',
    name: 'Execution development',
    mode: 'paper',
    status: 'running',
    account: '',
    network: 'main',
    assetIn,
    assetOut,
    strategy: {
      kind: 'dca',
      amount: '5',
      intervalMs: 60000,
      threshold: '0',
      direction: 'below',
      fastWindow: 5,
      slowWindow: 20,
      prompt: '',
    },
    policy: {
      maxTradeCodec: { [KUSD]: EXECUTION_EVIDENCE_INPUT_CODEC, [XOR]: '0' },
      slippagePercent: '0.5',
      maxPriceImpactPercent: '3',
      feeAsset: assetOut,
      feeBudgetCodec: INITIAL_XOR,
      sessionDurationMs: EXECUTION_EPISODE_DURATION_MS,
    },
    portfolio: {
      initial: { [KUSD]: INITIAL_KUSD, [XOR]: INITIAL_XOR },
      holdings: { [KUSD]: INITIAL_KUSD, [XOR]: INITIAL_XOR },
      feesPaidCodec: '0',
      trades: 0,
    },
    state: { lastEvaluatedAt: 0, lastTradeAt: 0 },
    provider: 'custom',
    model: '',
    endpoint: '',
    createdAt: now,
    sessionExpiresAt: now + EXECUTION_EPISODE_DURATION_MS,
    activity: [],
    equity: [],
    apiUsage: { inputTokens: 0, outputTokens: 0, requests: 0 },
    goal: {
      title: 'Grow net value in XOR',
      targetReturnPercent: '5',
      maxLossPercent: '5',
      durationMs: EXECUTION_EPISODE_DURATION_MS,
      valuationAsset: 'output',
      lossMetric: 'drawdown',
    },
  };
}

/** Convert exact raw codecs to the same 36-place indicative mark as the live market adapter. */
function candleFor(snapshot: ExecutionSnapshot): BotCandle {
  const natural = (codec: string) => new FPNumber(FPNumber.fromCodecValue(codec, 18).toString(), 36);
  const close = decimalRatio(
    natural(snapshot.buy.amountInCodec),
    natural(snapshot.buy.amountWithoutImpactCodec)
  ).toString();
  // This is historical availability for marking only. Entry freshness is checked independently below.
  return { timestamp: snapshot.requestFinishedAt, close, feeClose: close };
}

/** Obtain the marked XOR value with exactly the runtime's valuation and rounding sequence. */
function xorValue(bot: BotDefinition, candle: BotCandle): string {
  return decimalRatio(new FPNumber(valuePortfolio(bot, candle), 36), new FPNumber(candle.close, 36)).toString();
}

/** Compare acquisition quotes, not portfolio profit: the hurdle includes each observation's own network fee. */
function netAcquisition(snapshot: ExecutionSnapshot): bigint {
  return BigInt(snapshot.buy.minimumCodec) - BigInt(snapshot.buy.fee.partialFeeCodec);
}

/**
 * Replay fixed one-entry controls over all available episode observations. Decisions consume only their
 * current snapshot; an attempt can use only the immediately following frozen slot, never its own signal quote.
 * Funding always uses slot zero. Missing or stale execution slots consume the opportunity without replacement.
 */
export function replayExecutionEpisode(
  inputManifest: ExecutionManifest,
  inputRecords: readonly ExecutionRecord[],
  policy: ExecutionEpisodePolicy,
  scenario: ExecutionEpisodeScenario = 'quoted-minimum-success'
): ExecutionEpisodeResult {
  if (
    !['idle', 'seed-once', 'improved-net-acquisition-once'].includes(policy) ||
    !['quoted-minimum-success', 'fee-only-failure'].includes(scenario)
  )
    throw new Error('Unknown episode policy or scenario');
  const { manifest, records } = JSON.parse(
    canonicalEvidenceJson({ manifest: inputManifest, records: inputRecords })
  ) as {
    manifest: ExecutionManifest;
    records: ExecutionRecord[];
  };
  validateExecutionJournal(manifest, records);
  const result: ExecutionEpisodeResult = {
    schemaVersion: 1,
    purpose: 'development',
    policy,
    scenario,
    status: 'opening-unavailable',
    manifestHash: hashEvidence(manifest),
    lastRecordHash: records.at(-1)?.recordHash ?? null,
    maximumClosingLagMs: manifest.cadenceMs + manifest.maxStartDelayMs + manifest.deadlineMs,
    expectedSlots: manifest.slots,
    retainedSlots: records.length,
    missingSlots: [],
    untimedSlots: [],
    coverage: '0',
    fullEpisodeEvidence: false,
    qualifiedStrategy: false,
    actualTransactions: 0,
    scenarioBuys: 0,
    scenarioFailures: 0,
    decisions: 0,
    finalHoldings: { kusdCodec: INITIAL_KUSD, xorCodec: INITIAL_XOR, feesPaidXorCodec: '0' },
    events: [],
    assumptions: LIMITATIONS,
  };
  if (records[0]?.status !== 'complete') {
    result.missingSlots = records.flatMap((record, index) => (record.status === 'complete' ? [] : [index]));
    return result;
  }
  const opening = records[0].snapshot;
  const fundedAt = opening.requestFinishedAt;
  if (!Number.isSafeInteger(fundedAt + EXECUTION_EPISODE_DURATION_MS)) throw new Error('Invalid episode clock');
  const expiresAt = fundedAt + EXECUTION_EPISODE_DURATION_MS;
  result.fundedAt = fundedAt;
  result.expiresAt = expiresAt;
  let bot = episodeBot(fundedAt);
  let pending: { slot: number; decidedAt: number; sourceBlock: number } | undefined;
  let previous = opening;
  let firstClosingSlot: number | undefined;
  let closingIndex: number | undefined;
  let completeSlots = 0;
  let previousRecordedAt = 0;
  const equity: BotEquityPoint[] = [];
  const fundingNetAcquisition = netAcquisition(opening);
  const holdings = () => ({
    kusdCodec: bot.portfolio.holdings[KUSD],
    xorCodec: bot.portfolio.holdings[XOR],
    feesPaidXorCodec: bot.portfolio.feesPaidCodec,
  });
  const event = (
    slot: number,
    at: number,
    kind: ExecutionEpisodeEvent['kind'],
    detail: Partial<ExecutionEpisodeEvent> = {}
  ) => {
    result.events.push({ slot, availableAt: at, kind, ...holdings(), ...detail });
  };
  const mark = (slot: number, snapshot: ExecutionSnapshot, candle: BotCandle, kind: 'funding' | 'mark') => {
    // A terminal bot remains stopped; its still-held inventory is separately valued through the episode boundary.
    bot.goalState = evaluateBotGoal(bot, snapshot.requestFinishedAt, candle);
    const value = xorValue(bot, candle);
    const benchmark = xorValue(
      { ...bot, portfolio: { ...bot.portfolio, holdings: { ...bot.portfolio.initial } } },
      candle
    );
    equity.push({ timestamp: snapshot.requestFinishedAt, value, benchmark });
    event(slot, snapshot.requestFinishedAt, kind, {
      sourceBlock: snapshot.context.blockNumber,
      sourceBlockHash: snapshot.context.blockHash,
      valueXor: value,
      peakXor: bot.goalState?.peakValue,
      returnPercent: bot.goalState?.returnPercent,
      goalOutcome: bot.goalState?.outcome,
    });
  };
  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    if (
      record.recordedAt < previousRecordedAt ||
      (record.status === 'complete' && record.snapshot.requestStartedAt < previousRecordedAt)
    )
      throw new Error('Episode record availability regressed');
    previousRecordedAt = record.recordedAt;
    if (record.slotAt >= expiresAt && firstClosingSlot === undefined) firstClosingSlot = index;
    if (record.status !== 'complete') {
      result.missingSlots.push(index);
      bot.goalState = evaluateBotGoal(bot, record.recordedAt);
      event(index, record.recordedAt, 'gap', { reason: record.status, goalOutcome: bot.goalState?.outcome });
      if (pending) {
        event(index, record.recordedAt, 'rejected', { reason: 'next-slot-unavailable', decisionSlot: pending.slot });
        pending = undefined;
      }
      if (firstClosingSlot !== undefined) {
        closingIndex = index;
        break;
      }
      continue;
    }
    const s = record.snapshot;
    if (
      s.context.denominator !== opening.context.denominator ||
      s.context.poolIdentity !== opening.context.poolIdentity ||
      s.context.blockNumber < previous.context.blockNumber ||
      s.context.finalizedAt < previous.context.finalizedAt ||
      (s.requestStartedAt < previous.requestFinishedAt && index > 0) ||
      (s.context.blockNumber === previous.context.blockNumber && s.context.blockHash !== previous.context.blockHash)
    )
      throw new Error('Episode state identity or chronology changed');
    previous = s;
    completeSlots++;
    if (!s.quoteTiming) result.untimedSlots.push(index);
    const candle = candleFor(s);
    mark(index, s, candle, index === 0 ? 'funding' : 'mark');
    if (s.requestFinishedAt >= expiresAt) {
      result.closingObservedAt = s.requestFinishedAt;
      result.closingLagMs = s.requestFinishedAt - expiresAt;
      closingIndex = index;
      if (pending) {
        event(index, s.requestFinishedAt, 'rejected', {
          reason: 'goal-deadline-before-entry',
          decisionSlot: pending.slot,
        });
        pending = undefined;
      }
      break;
    }
    if (pending) {
      const decision = pending;
      pending = undefined;
      let reason: string | undefined;
      const timing = s.quoteTiming?.buy;
      if (index !== decision.slot + 1) reason = 'not-next-frozen-slot';
      else if (bot.goalState?.outcome !== 'active') reason = 'goal-already-terminal';
      else if (!timing) reason = 'quote-timing-unavailable';
      else if (
        timing.startedAt <= decision.decidedAt ||
        s.requestStartedAt <= decision.decidedAt ||
        s.context.blockNumber <= decision.sourceBlock
      )
        reason = 'quote-not-after-decision';
      else if (s.requestFinishedAt - timing.startedAt >= 5000) reason = 'quote-too-old-at-availability';
      else if (
        (BigInt(s.buy.priceImpact.numerator) < 0n
          ? -BigInt(s.buy.priceImpact.numerator)
          : BigInt(s.buy.priceImpact.numerator)) >
        3n * BigInt(s.buy.priceImpact.denominator)
      )
        reason = 'price-impact-limit';
      else if (policy === 'improved-net-acquisition-once' && netAcquisition(s) <= fundingNetAcquisition)
        reason = 'net-acquisition-advantage-disappeared';
      const fill = {
        inputAsset: KUSD,
        inputCodec: EXECUTION_EVIDENCE_INPUT_CODEC,
        outputAsset: XOR,
        outputCodec: s.buy.minimumCodec,
        feeAsset: XOR,
        feeCodec: s.buy.fee.partialFeeCodec,
      };
      if (!reason) {
        try {
          const admission = assessGoalTradeAdmission(bot, fill, candle, s.requestFinishedAt);
          if (admission.goalState) bot.goalState = admission.goalState;
          reason = admission.rejection;
        } catch (error) {
          reason = error instanceof Error ? error.message : 'invalid-trade';
        }
      }
      if (reason) event(index, s.requestFinishedAt, 'rejected', { reason, decisionSlot: decision.slot });
      else {
        if (scenario === 'quoted-minimum-success') {
          bot = { ...bot, portfolio: applyPaperFill(bot, fill) };
          result.scenarioBuys++;
          event(index, s.requestFinishedAt, 'scenario-fill', { decisionSlot: decision.slot });
        } else {
          bot.portfolio.holdings[XOR] = (BigInt(bot.portfolio.holdings[XOR]) - BigInt(fill.feeCodec)).toString();
          bot.portfolio.feesPaidCodec = (BigInt(bot.portfolio.feesPaidCodec) + BigInt(fill.feeCodec)).toString();
          result.scenarioFailures++;
          event(index, s.requestFinishedAt, 'scenario-failure', { decisionSlot: decision.slot });
        }
        mark(index, s, candle, 'mark');
      }
    }
    if (
      result.decisions === 0 &&
      index + 1 < manifest.slots &&
      result.missingSlots.length === 0 &&
      bot.goalState?.outcome === 'active' &&
      policy !== 'idle' &&
      ((policy === 'seed-once' && index === 0) ||
        (policy === 'improved-net-acquisition-once' && index > 0 && netAcquisition(s) > fundingNetAcquisition))
    ) {
      pending = { slot: index, decidedAt: s.requestFinishedAt, sourceBlock: s.context.blockNumber };
      result.decisions++;
      event(index, s.requestFinishedAt, 'decision', { reason: policy });
    }
  }
  if (pending)
    result.pendingDecision = { decisionSlot: pending.slot, dueSlot: pending.slot + 1, decidedAt: pending.decidedAt };
  const evidenceSlots = closingIndex === undefined ? records.length : closingIndex + 1;
  const requiredSlots = closingIndex === undefined ? manifest.slots : evidenceSlots;
  result.coverage = requiredSlots
    ? decimalRatio(new FPNumber(String(completeSlots), 36), new FPNumber(String(requiredSlots), 36)).toString()
    : '0';
  result.fullEpisodeEvidence =
    result.closingObservedAt !== undefined &&
    result.closingLagMs! <= result.maximumClosingLagMs &&
    result.missingSlots.length === 0 &&
    result.untimedSlots.length === 0;
  result.status =
    result.closingObservedAt === undefined
      ? firstClosingSlot === undefined
        ? 'prefix-only'
        : 'incomplete-episode'
      : result.fullEpisodeEvidence
        ? 'full-episode'
        : 'incomplete-episode';
  result.performance = {
    ...portfolioPerformance(equity),
    initialValue: equity[0].value,
    finalValue: equity.at(-1)!.value,
  };
  result.goalState = bot.goalState;
  result.finalHoldings = holdings();
  // Keep the source's full retained count, but identify the evaluated prefix so future rows cannot improve a closed episode.
  result.retainedSlots = evidenceSlots;
  return result;
}
