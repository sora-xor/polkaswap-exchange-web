/** Ordered offline development replay. An injected evidence reader is never trading authority or a fill observer. */
import { createHash } from 'node:crypto';
import { parseBotPrice } from '../../src/features/bot-trading/engine';
import type { BotCandle, BotDefinition } from '../../src/features/bot-trading/types';
import { verifyHistoricalExecutionClock, type HistoricalClockBlock } from './historical-execution-clock';
import { planHistoricalGoalSchedule } from './historical-goal-schedule';
import { planHistoricalGoalTerminal, verifyHistoricalGoalTerminalClock } from './historical-goal-terminal';
import {
  createHistoricalGoalLedger,
  markHistoricalGoalLedger,
  applyHistoricalGoalFill,
  finalizeHistoricalGoalLedger,
  type HistoricalGoalMark,
  type HistoricalGoalFillScenario,
  type HistoricalGoalLedgerState,
  type HistoricalGoalTerminalAccounting,
  type HistoricalGoalRatio,
} from './historical-goal-ledger';
import {
  createHistoricalGoalSignalState,
  consumeHistoricalGoalSignal,
  type HistoricalGoalPendingOrder,
} from './historical-goal-signals';
import { prepareHistoricalGoalFill } from './historical-goal-quote';
import { HISTORICAL_GOAL_FEE_POLICY } from './historical-goal-fee-codec';
import {
  applyHistoricalGoalBoundFee,
  type HistoricalGoalBoundFeeSource,
  type HistoricalGoalBoundFeeReceipt,
} from './historical-goal-bound-fee';

type Schedule = ReturnType<typeof planHistoricalGoalSchedule>;
type TerminalPolicy = ReturnType<typeof planHistoricalGoalTerminal>;
const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const KUSD = '0x02000c0000000000000000000000000000000000000000000000000000000000';
const XOR = '0x0200000000000000000000000000000000000000000000000000000000000000';

/** All nonterminal schedule requests retain one row, including unavailable requests. */
export type HistoricalGoalValuationEvidence =
  | {
      status: 'available';
      targetAtMs: number;
      previous: HistoricalClockBlock;
      block: HistoricalClockBlock;
      mark: HistoricalGoalMark;
      poolEvidence: unknown;
    }
  | { status: 'unavailable'; targetAtMs: number; reason: 'unavailable' };
export type HistoricalGoalExecutionEvidence =
  | { status: 'available'; signalIndex: number; previous: HistoricalClockBlock; execution: HistoricalClockBlock }
  | { status: 'unavailable'; signalIndex: number; reason: 'unavailable' };
export type HistoricalGoalTerminalEvidence =
  | {
      status: 'available';
      observed: HistoricalClockBlock;
      successor: HistoricalClockBlock;
      mark: HistoricalGoalMark;
      poolEvidence: unknown;
    }
  | { status: 'unavailable'; reason: 'unavailable' };

/** Fixed inputs must be chosen before outcomes; canonical RPC provenance and dataset partitioning remain upstream. */
export interface HistoricalGoalReplayInput {
  bot: BotDefinition;
  schedule: Schedule;
  terminalPolicy: TerminalPolicy;
  expectedDenominator: string;
  warmup: readonly BotCandle[];
  candles: readonly BotCandle[];
  valuations: readonly HistoricalGoalValuationEvidence[];
  executions: readonly HistoricalGoalExecutionEvidence[];
  terminal: HistoricalGoalTerminalEvidence;
  scenario: HistoricalGoalFillScenario;
  /** Explicit alternate development fee semantics; omission preserves the original v3 estimates. */
  feePolicy?: typeof HISTORICAL_GOAL_FEE_POLICY;
}

/** Safe upstream failure reference. The immutable raw receipt is retained by the provider, not exposed here. */
export interface HistoricalGoalQuoteUnavailable {
  readonly status: 'unavailable';
  readonly stage:
    | 'input'
    | 'request'
    | 'finality'
    | 'schema'
    | 'runtime'
    | 'state'
    | 'block'
    | 'quote'
    | 'envelope'
    | 'fees'
    | 'pool'
    | 'transport';
  readonly reason:
    | 'unavailable'
    | 'rpc-failed'
    | 'timeout'
    | 'aborted'
    | 'response-limit'
    | 'invalid-evidence'
    | 'pool-unavailable';
  readonly evidenceSha256: string;
}

export type HistoricalGoalQuoteEvidenceProvider = (
  pending: HistoricalGoalPendingOrder,
  clock: { readonly previous: HistoricalClockBlock; readonly execution: HistoricalClockBlock }
) => Promise<
  | {
      quoteEvidence: unknown;
      poolEvidence: unknown;
      boundFee?: { source: HistoricalGoalBoundFeeSource; receipt: HistoricalGoalBoundFeeReceipt };
    }
  | HistoricalGoalQuoteUnavailable
>;

export interface HistoricalGoalReplayEvent {
  readonly atMs: number;
  readonly kind:
    | 'valuation'
    | 'signal'
    | 'execution-unused'
    | 'rejected'
    | 'cancelled'
    | 'scenario-fill'
    | 'scenario-failure'
    | 'terminal';
  readonly signalIndex?: number;
  readonly targetAtMs?: number;
  readonly reason?: string;
  readonly pending?: HistoricalGoalPendingOrder;
  readonly value?: HistoricalGoalRatio;
  readonly benchmarkValue?: HistoricalGoalRatio;
  readonly quoteEvidenceSha256?: string;
  readonly poolEvidenceSha256?: string;
  readonly feePolicySha256?: string;
  readonly feeSourceSha256?: string;
  readonly feeReceiptSha256?: string;
  readonly feeEvidenceDigest?: string;
  readonly providerFailure?: HistoricalGoalQuoteUnavailable;
}

export interface HistoricalGoalReplayResult {
  readonly protocol: 'goal-ordered-replay-v3-development' | 'goal-ordered-replay-v3-bound-fee-v1-development';
  readonly status: 'complete' | 'incomplete';
  readonly inputSha256: string;
  readonly scenario: HistoricalGoalFillScenario;
  readonly diagnostics: readonly {
    reason: string;
    targetAtMs?: number;
    signalIndex?: number;
    providerFailure?: HistoricalGoalQuoteUnavailable;
  }[];
  readonly coverage: {
    valuationRequests: number;
    valuationAvailable: number;
    signalsRequested: 24;
    signalsConsumed: number;
    executionClocksUnavailable: readonly number[];
    requiredExecutionClocksUnavailable: readonly number[];
    quoteRequests: number;
    terminalAvailable: boolean;
  };
  readonly events: readonly HistoricalGoalReplayEvent[];
  readonly terminal?: HistoricalGoalTerminalAccounting;
  readonly benchmarkTerminal?: HistoricalGoalTerminalAccounting;
  readonly observedFill: false;
  readonly transactionSubmitted: false;
  readonly assumptions: readonly string[];
  readonly feePolicy?: typeof HISTORICAL_GOAL_FEE_POLICY;
  readonly feePolicySha256?: string;
  readonly feePolicyHashEncoding?: 'sha256-json-utf8';
  readonly feeEvidenceDigests?: readonly string[];
  readonly feeAdequacyVerified?: false;
}

const fail = (): never => {
  throw new Error('Invalid historical goal replay evidence');
};
const check = (value: unknown): void => {
  if (!value) fail();
};

/** Bound plain immutable snapshots, including dense arrays, before the first awaited provider call. */
function snapshot<T>(input: T): T {
  let nodes = 0,
    textBytes = 0;
  const read = (value: unknown, depth: number): unknown => {
    if (++nodes > 5_000_000 || depth > 32) return fail();
    if (value === null || value === undefined || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : fail();
    if (typeof value === 'string') {
      textBytes += value.length * 2;
      return value.length <= 4_194_304 && textBytes <= 134_217_728 ? value : fail();
    }
    if (!value || typeof value !== 'object') return fail();
    const d = Object.getOwnPropertyDescriptors(value),
      keys = Reflect.ownKeys(d);
    if (keys.some((key) => typeof key !== 'string' || !('value' in d[key]))) return fail();
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype || value.length > 15_000 || keys.length !== value.length + 1)
        return fail();
      return Object.freeze(
        Array.from({ length: value.length }, (_, i) => {
          if (!d[i]?.enumerable) return fail();
          return read(d[i].value, depth + 1);
        })
      );
    }
    if (
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
      keys.some((key) => !d[key as string].enumerable)
    )
      return fail();
    return Object.freeze(Object.fromEntries(keys.map((key) => [key, read(d[key as string].value, depth + 1)])));
  };
  return read(input, 0) as T;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  return value as Record<string, unknown>;
}
function keys(value: unknown, names: string[]): void {
  const own = Object.keys(object(value));
  check(own.length === names.length && names.every((name) => own.includes(name)));
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'undefined';
}
const digest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
const same = (a: unknown, b: unknown) => canonical(a) === canonical(b);
function balance(value: unknown): string {
  check(typeof value === 'string' && /^[1-9]\d{0,38}$/.test(value));
  check(BigInt(value as string) <= (1n << 128n) - 1n);
  return value as string;
}

/** Bind a normalized pool observation to its metadata block; upstream readers attest canonicality/finality. */
function verifyMark(mark: HistoricalGoalMark, block: HistoricalClockBlock, proof: unknown, denominator: string): void {
  keys(mark, ['timestampMs', 'blockHash', 'kusdReserveCodec', 'xorReserveCodec']);
  check(mark.timestampMs === block.timestampMs && mark.blockHash === block.hash);
  balance(mark.kusdReserveCodec);
  balance(mark.xorReserveCodec);
  const pool = object(proof),
    binding = object(pool.binding),
    state = object(pool.state),
    pair = object(pool.pair),
    reserves = object(pool.reserves);
  check(
    pool.status === 'present' &&
      pool.basis === 'direct-pool-reserve-ratio' &&
      pool.observedFill === false &&
      pool.transactionSubmitted === false
  );
  check(
    binding.genesisHash === GENESIS &&
      binding.blockHash === block.hash &&
      state.timestampMs === block.timestampMs &&
      state.denominator === denominator
  );
  check(
    typeof binding.metadataSha256 === 'string' &&
      /^[0-9a-f]{64}$/.test(binding.metadataSha256) &&
      binding.metadataVersion === 14
  );
  const runtime = object(binding.runtimeVersion);
  check([130, 131].includes(runtime.specVersion as number) && runtime.transactionVersion === runtime.specVersion);
  check(
    pair.baseAssetId === XOR && pair.targetAssetId === KUSD && pair.baseDecimals === 18 && pair.targetDecimals === 18
  );
  check(reserves.kusdCodec === mark.kusdReserveCodec && reserves.xorCodec === mark.xorReserveCodec);
}

/**
 * Replay one fixed scenario in actual timestamp order. No retries, alternate states, resized orders or future
 * candle access are permitted. Missing mandatory marks stop preflight before any quote. A known quote rejection
 * is retained; missing execution/read evidence makes only the hypothetical run incomplete, never successful.
 */
export async function replayHistoricalGoal(
  input: HistoricalGoalReplayInput,
  quoteEvidence: HistoricalGoalQuoteEvidenceProvider
): Promise<HistoricalGoalReplayResult> {
  check(typeof quoteEvidence === 'function');
  const data = snapshot(input);
  keys(data, [
    'bot',
    'schedule',
    'terminalPolicy',
    'expectedDenominator',
    'warmup',
    'candles',
    'valuations',
    'executions',
    'terminal',
    'scenario',
    ...(Object.hasOwn(data, 'feePolicy') ? ['feePolicy'] : []),
  ]);
  const boundFeePolicy = Object.hasOwn(data, 'feePolicy');
  if (boundFeePolicy) check(same(data.feePolicy, HISTORICAL_GOAL_FEE_POLICY));
  const feePolicySha256 = createHash('sha256').update(JSON.stringify(HISTORICAL_GOAL_FEE_POLICY)).digest('hex');
  check(['minimum-output-success', 'fee-only-failure'].includes(data.scenario));
  const denominator = balance(data.expectedDenominator);
  check(Array.isArray(data.schedule.executions) && data.schedule.executions.length === 24);
  const schedule = planHistoricalGoalSchedule(
    data.schedule.executions.map((plan) => plan.signal),
    data.schedule.executions[0].policy,
    data.schedule.episode,
    data.schedule.valuationPolicy
  );
  check(same(schedule, data.schedule));
  const terminalPolicy = planHistoricalGoalTerminal(schedule.episode, data.terminalPolicy.maximumAgeMs);
  check(same(terminalPolicy, data.terminalPolicy));
  const requests = schedule.valuations.slice(0, -1);
  check(Array.isArray(data.valuations) && data.valuations.length === requests.length && requests.length <= 14_400);
  check(
    Array.isArray(data.executions) &&
      data.executions.length === 24 &&
      Array.isArray(data.candles) &&
      data.candles.length === 24
  );
  for (let i = 0; i < 24; i++) {
    const candle = data.candles[i];
    keys(candle, ['timestamp', 'close', ...(Object.hasOwn(candle, 'feeClose') ? ['feeClose'] : [])]);
    check(candle.timestamp === schedule.executions[i].signal.completedAtMs);
    parseBotPrice(candle.close);
    if (candle.feeClose !== undefined) parseBotPrice(candle.feeClose);
  }
  const blocks = new Map<number, HistoricalClockBlock>(),
    heights = new Map<string, number>(),
    marks = new Map<string, HistoricalGoalMark>();
  const registerBlock = (block: HistoricalClockBlock) => {
    keys(block, ['hash', 'parentHash', 'height', 'timestampMs']);
    check(
      Number.isSafeInteger(block.height) &&
        block.height > 0 &&
        Number.isSafeInteger(block.timestampMs) &&
        block.timestampMs >= 0
    );
    check(
      typeof block.hash === 'string' &&
        /^0x[0-9a-f]{64}$/.test(block.hash) &&
        typeof block.parentHash === 'string' &&
        /^0x[0-9a-f]{64}$/.test(block.parentHash) &&
        block.hash !== block.parentHash
    );
    check(!blocks.has(block.height) || same(blocks.get(block.height), block));
    check(!heights.has(block.hash) || heights.get(block.hash) === block.height);
    blocks.set(block.height, block);
    heights.set(block.hash, block.height);
  };
  const registerMark = (mark: HistoricalGoalMark) => {
    check(!marks.has(mark.blockHash) || same(marks.get(mark.blockHash), mark));
    marks.set(mark.blockHash, mark);
  };
  for (const plan of schedule.executions) {
    registerBlock(plan.signal.closing);
    registerBlock(plan.signal.successor);
  }
  const diagnostics: {
    reason: string;
    targetAtMs?: number;
    signalIndex?: number;
    providerFailure?: HistoricalGoalQuoteUnavailable;
  }[] = [];
  const missingClocks: number[] = [],
    requiredMissing: number[] = [];
  let valuationAvailable = 0;
  for (let i = 0; i < requests.length; i++) {
    const row = data.valuations[i],
      request = requests[i];
    check(row.targetAtMs === request.targetAtMs);
    if (row.status === 'unavailable') {
      keys(row, ['status', 'targetAtMs', 'reason']);
      check(row.reason === 'unavailable');
      diagnostics.push({ reason: 'valuation-unavailable', targetAtMs: row.targetAtMs });
      continue;
    }
    keys(row, ['status', 'targetAtMs', 'previous', 'block', 'mark', 'poolEvidence']);
    check(row.status === 'available');
    registerBlock(row.previous);
    registerBlock(row.block);
    check(
      row.previous.height + 1 === row.block.height &&
        row.block.parentHash === row.previous.hash &&
        row.previous.timestampMs < request.targetAtMs &&
        row.block.timestampMs >= request.targetAtMs &&
        row.block.timestampMs - request.targetAtMs <= request.maximumLagMs
    );
    verifyMark(row.mark, row.block, row.poolEvidence, denominator);
    registerMark(row.mark);
    valuationAvailable++;
  }
  for (let i = 0; i < 24; i++) {
    const row = data.executions[i];
    check(row.signalIndex === i);
    if (row.status === 'unavailable') {
      keys(row, ['status', 'signalIndex', 'reason']);
      check(row.reason === 'unavailable');
      missingClocks.push(i);
      continue;
    }
    keys(row, ['status', 'signalIndex', 'previous', 'execution']);
    check(row.status === 'available');
    verifyHistoricalExecutionClock(schedule.executions[i], row.previous, row.execution);
    registerBlock(row.previous);
    registerBlock(row.execution);
  }
  if (data.terminal.status === 'available') {
    keys(data.terminal, ['status', 'observed', 'successor', 'mark', 'poolEvidence']);
    verifyHistoricalGoalTerminalClock(terminalPolicy, data.terminal.observed, data.terminal.successor);
    registerBlock(data.terminal.observed);
    registerBlock(data.terminal.successor);
    verifyMark(data.terminal.mark, data.terminal.observed, data.terminal.poolEvidence, denominator);
    registerMark(data.terminal.mark);
  } else {
    keys(data.terminal, ['status', 'reason']);
    check(data.terminal.status === 'unavailable' && data.terminal.reason === 'unavailable');
    diagnostics.push({ reason: 'terminal-unavailable', targetAtMs: schedule.episode.endedAtMs });
  }
  const orderedBlocks = [...blocks.values()].sort((a, b) => a.height - b.height);
  for (let i = 1; i < orderedBlocks.length; i++) {
    const a = orderedBlocks[i - 1],
      b = orderedBlocks[i];
    check(b.timestampMs > a.timestampMs && (b.height !== a.height + 1 || b.parentHash === a.hash));
  }
  let quoteRequests = 0,
    signalsConsumed = 0;
  const events: HistoricalGoalReplayEvent[] = [];
  const feeEvidenceDigests = new Set<string>();
  const finish = (ending?: {
    terminal: HistoricalGoalTerminalAccounting;
    benchmarkTerminal: HistoricalGoalTerminalAccounting;
  }): HistoricalGoalReplayResult =>
    snapshot({
      protocol: boundFeePolicy
        ? 'goal-ordered-replay-v3-bound-fee-v1-development'
        : 'goal-ordered-replay-v3-development',
      status: diagnostics.length ? 'incomplete' : 'complete',
      inputSha256: digest(data),
      scenario: data.scenario,
      diagnostics,
      coverage: {
        valuationRequests: schedule.valuations.length,
        valuationAvailable: valuationAvailable + (data.terminal.status === 'available' ? 1 : 0),
        signalsRequested: 24,
        signalsConsumed,
        executionClocksUnavailable: missingClocks,
        requiredExecutionClocksUnavailable: requiredMissing,
        quoteRequests,
        terminalAvailable: data.terminal.status === 'available',
      },
      events,
      ...(boundFeePolicy
        ? {
            feePolicy: HISTORICAL_GOAL_FEE_POLICY,
            feePolicySha256,
            feePolicyHashEncoding: 'sha256-json-utf8' as const,
            feeEvidenceDigests: [...feeEvidenceDigests],
            feeAdequacyVerified: false as const,
          }
        : {}),
      ...ending,
      observedFill: false,
      transactionSubmitted: false,
      assumptions: [
        'Development scenarios only; quotes are not fills or trading authority.',
        'RPC canonicality, finalized ancestry, source partition and historical availability assumptions remain provider responsibilities.',
        'Signals receive completed candles only; quotes use one fixed later state and exact pending amount, without retries.',
        'Cached reserve marks are indicative portfolio values, not executable liquidation prices.',
        'Hypothetical fills do not alter later real pool states; market-impact feedback is not simulated.',
        'The terminal block timestamp remains observed time; accounting uses the original fixed deadline.',
        'The separately versioned goal-terminal-asof-v1-development policy remains bound by the input digest.',
        boundFeePolicy
          ? 'Native XOR fees use the explicitly bound mortal64/u32/multisignature-length policy at each archived state; length compatibility does not prove future fee adequacy or live account eligibility.'
          : 'Historical nonce-zero, tip-zero, immortal fee envelopes are estimates and are not yet live-compatible fee envelopes.',
      ],
    });
  if (diagnostics.length) return finish();
  const opening = data.valuations[0];
  check(opening.status === 'available');
  if (opening.status !== 'available' || data.terminal.status !== 'available') return fail();
  let ledger = createHistoricalGoalLedger(data.bot, schedule.episode, opening.mark);
  let benchmark = createHistoricalGoalLedger(data.bot, schedule.episode, opening.mark);
  let signalState = createHistoricalGoalSignalState(ledger, schedule, data.warmup);
  const pending = new Map<number, HistoricalGoalPendingOrder>();
  type Event = { at: number; priority: number; index: number; kind: 'valuation' | 'decision' | 'execution' };
  const queue: Event[] = [
    ...data.valuations.map((row, index) => ({
      at: row.status === 'available' ? row.block.timestampMs : row.targetAtMs,
      priority: 0,
      index,
      kind: 'valuation' as const,
    })),
    ...schedule.executions.map((plan, index) => ({
      at: plan.assumedDecisionAtMs,
      priority: 1,
      index,
      kind: 'decision' as const,
    })),
    ...data.executions.map((row, index) => ({
      at: row.status === 'available' ? row.execution.timestampMs : schedule.executions[index].targetExecutionAtMs,
      priority: 2,
      index,
      kind: 'execution' as const,
    })),
  ];
  queue.sort((a, b) => a.at - b.at || a.priority - b.priority || a.index - b.index);
  const cancelStopped = (at: number) => {
    if (ledger.outcome === 'active') return;
    for (const [index, order] of pending)
      events.push({ atMs: at, kind: 'cancelled', signalIndex: index, reason: 'goal-complete', pending: order });
    pending.clear();
  };
  const observe = (mark: HistoricalGoalMark) => {
    registerMark(mark);
    ledger = markHistoricalGoalLedger(ledger, mark);
    benchmark = markHistoricalGoalLedger(benchmark, mark);
    cancelStopped(mark.timestampMs);
  };
  for (const event of queue) {
    if (event.kind === 'valuation') {
      const row = data.valuations[event.index];
      if (row.status !== 'available') return fail();
      observe(row.mark);
      events.push({
        atMs: event.at,
        kind: 'valuation',
        targetAtMs: row.targetAtMs,
        value: ledger.latestValue,
        benchmarkValue: benchmark.latestValue,
      });
      continue;
    }
    if (event.kind === 'decision') {
      const decision = consumeHistoricalGoalSignal(signalState, ledger, data.candles[event.index]);
      signalState = decision.state;
      signalsConsumed++;
      if (decision.pending) pending.set(event.index, decision.pending);
      events.push({
        atMs: event.at,
        kind: 'signal',
        signalIndex: event.index,
        reason: decision.proposal.reason,
        ...(decision.pending ? { pending: decision.pending } : {}),
      });
      continue;
    }
    const order = pending.get(event.index);
    pending.delete(event.index);
    if (!order) {
      events.push({ atMs: event.at, kind: 'execution-unused', signalIndex: event.index });
      continue;
    }
    if (ledger.outcome !== 'active') {
      events.push({
        atMs: event.at,
        kind: 'cancelled',
        signalIndex: event.index,
        reason: 'goal-complete',
        pending: order,
      });
      continue;
    }
    const clock = data.executions[event.index];
    if (clock.status === 'unavailable') {
      requiredMissing.push(event.index);
      diagnostics.push({ reason: 'execution-clock-unavailable', signalIndex: event.index });
      events.push({
        atMs: event.at,
        kind: 'rejected',
        signalIndex: event.index,
        reason: 'execution-clock-unavailable',
        pending: order,
      });
      continue;
    }
    quoteRequests++;
    let response: Awaited<ReturnType<HistoricalGoalQuoteEvidenceProvider>>;
    try {
      response = snapshot(
        await quoteEvidence(order, Object.freeze({ previous: clock.previous, execution: clock.execution }))
      );
    } catch {
      diagnostics.push({ reason: 'quote-evidence-unavailable', signalIndex: event.index });
      events.push({
        atMs: event.at,
        kind: 'rejected',
        signalIndex: event.index,
        reason: 'quote-evidence-unavailable',
        pending: order,
      });
      continue;
    }
    if ('status' in response) {
      keys(response, ['status', 'stage', 'reason', 'evidenceSha256']);
      check(response.status === 'unavailable');
      check(
        [
          'input',
          'request',
          'finality',
          'schema',
          'runtime',
          'state',
          'block',
          'quote',
          'envelope',
          'fees',
          'pool',
          'transport',
        ].includes(response.stage)
      );
      check(
        [
          'unavailable',
          'rpc-failed',
          'timeout',
          'aborted',
          'response-limit',
          'invalid-evidence',
          'pool-unavailable',
        ].includes(response.reason)
      );
      check(typeof response.evidenceSha256 === 'string' && /^[0-9a-f]{64}$/.test(response.evidenceSha256));
      diagnostics.push({ reason: 'quote-evidence-unavailable', signalIndex: event.index, providerFailure: response });
      events.push({
        atMs: event.at,
        kind: 'rejected',
        signalIndex: event.index,
        reason: 'quote-evidence-unavailable',
        pending: order,
        providerFailure: response,
      });
      continue;
    }
    keys(response, [
      'quoteEvidence',
      'poolEvidence',
      ...(boundFeePolicy && Object.hasOwn(response, 'boundFee') ? ['boundFee'] : []),
    ]);
    const joined = prepareHistoricalGoalFill(
      {
        assetIn: order.assetIn,
        assetOut: order.assetOut,
        amountInCodec: order.amountInCodec,
        expectedDenominator: denominator,
      },
      order.plan,
      clock.previous,
      clock.execution,
      response.quoteEvidence,
      response.poolEvidence
    );
    const evidence = {
      quoteEvidenceSha256: digest(response.quoteEvidence),
      poolEvidenceSha256: digest(response.poolEvidence),
    };
    if (joined.kind !== 'ready') check(!Object.hasOwn(response, 'boundFee'));
    if (joined.kind === 'pool-unavailable') {
      diagnostics.push({ reason: 'execution-pool-unavailable', signalIndex: event.index });
      events.push({
        atMs: event.at,
        kind: 'rejected',
        signalIndex: event.index,
        reason: joined.kind,
        pending: order,
        ...evidence,
      });
      continue;
    }
    observe(joined.mark);
    if (ledger.outcome !== 'active') {
      events.push({
        atMs: event.at,
        kind: 'cancelled',
        signalIndex: event.index,
        reason: 'goal-complete',
        pending: order,
        ...evidence,
      });
      continue;
    }
    if (joined.kind !== 'ready') {
      events.push({
        atMs: event.at,
        kind: 'rejected',
        signalIndex: event.index,
        reason: joined.kind,
        pending: order,
        ...evidence,
      });
      continue;
    }
    let fill = joined.fill;
    let feeEvidence: Pick<
      HistoricalGoalReplayEvent,
      'feePolicySha256' | 'feeSourceSha256' | 'feeReceiptSha256' | 'feeEvidenceDigest'
    > = {};
    if (boundFeePolicy) {
      if (!Object.hasOwn(response, 'boundFee')) {
        diagnostics.push({ reason: 'bound-fee-evidence-unavailable', signalIndex: event.index });
        events.push({
          atMs: event.at,
          kind: 'rejected',
          signalIndex: event.index,
          reason: 'bound-fee-evidence-unavailable',
          pending: order,
          feePolicySha256,
          ...evidence,
        });
        continue;
      }
      const provided = response.boundFee;
      if (!provided) return fail();
      keys(provided, ['source', 'receipt']);
      check(same(provided.source.quoteEvidence, response.quoteEvidence));
      const adjusted = applyHistoricalGoalBoundFee(joined, provided.source, provided.receipt);
      if (adjusted.kind !== 'ready' || !('feeEvidenceDigest' in adjusted)) return fail();
      check(adjusted.feePolicySha256 === feePolicySha256 && same(adjusted.feePolicy, HISTORICAL_GOAL_FEE_POLICY));
      fill = adjusted.fill;
      feeEvidence = {
        feePolicySha256,
        feeSourceSha256: digest(provided.source),
        feeReceiptSha256: digest(provided.receipt),
        feeEvidenceDigest: adjusted.feeEvidenceDigest,
      };
      feeEvidenceDigests.add(adjusted.feeEvidenceDigest);
    }
    const applied = applyHistoricalGoalFill(ledger, fill, joined.mark, data.scenario);
    ledger = applied.state;
    events.push({
      atMs: event.at,
      kind: applied.rejection
        ? 'rejected'
        : data.scenario === 'minimum-output-success'
          ? 'scenario-fill'
          : 'scenario-failure',
      signalIndex: event.index,
      ...(applied.rejection ? { reason: applied.rejection } : {}),
      pending: order,
      value: ledger.latestValue,
      benchmarkValue: benchmark.latestValue,
      ...evidence,
      ...feeEvidence,
    });
    cancelStopped(event.at);
  }
  check(signalsConsumed === 24 && signalState.nextIndex === 24 && pending.size === 0);
  const terminal = finalizeHistoricalGoalLedger(ledger, data.terminal.mark, {
    accountingAtMs: schedule.episode.endedAtMs,
    maximumAgeMs: terminalPolicy.maximumAgeMs,
  });
  const benchmarkTerminal = finalizeHistoricalGoalLedger(benchmark, data.terminal.mark, {
    accountingAtMs: schedule.episode.endedAtMs,
    maximumAgeMs: terminalPolicy.maximumAgeMs,
  });
  events.push({
    atMs: schedule.episode.endedAtMs,
    kind: 'terminal',
    targetAtMs: schedule.episode.endedAtMs,
    value: terminal.latestValue,
    benchmarkValue: benchmarkTerminal.latestValue,
  });
  return finish({ terminal, benchmarkTerminal });
}
