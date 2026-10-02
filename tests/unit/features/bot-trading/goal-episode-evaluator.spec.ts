// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
vi.unmock('@polkadot/util-crypto');
import {
  createGoalEpisodeEvaluator,
  createGoalEpisodeEvaluatorV2,
  createGoalEpisodeEvaluatorV3,
  type GoalEpisodeEvidenceSource,
  type GoalEpisodeEvidenceSourceV1,
  type GoalEpisodeMarkEvidence,
  type GoalEpisodeQuoteEvidence,
} from '@/features/bot-trading/goal-episode-evaluator';
import {
  GOAL_QUALIFICATION_POLICY,
  GOAL_QUALIFICATION_PROTOCOL_V2,
  GOAL_QUALIFICATION_POLICY_V2,
  GOAL_QUALIFICATION_PROTOCOL_V3,
  GOAL_QUALIFICATION_POLICY_V3,
  GOAL_QUALIFICATION_POLICY_CATALOG_V3,
  createGoalQualificationBoundary,
  goalQualificationDigest,
  type GoalQualificationEvaluationRequest,
  type GoalQualificationPlan,
} from '@/features/bot-trading/goal-qualification';
import { GOAL_LIVE_CLOCK_PROTOCOL } from '@/features/bot-trading/goal-live-clock';
import {
  GOAL_EXACT_KUSD as KUSD,
  GOAL_EXACT_XOR as XOR,
  createGoalExactLedger,
  markGoalExactLedger,
  assessGoalExactFill,
} from '@/features/bot-trading/goal-exact-ledger';
import {
  GOAL_QUALIFICATION_CLOCK_V2,
  GoalEpisodeDeadlineCancellation,
  type GoalQualificationClockEventV2,
} from '@/features/bot-trading/goal-qualification-clock-v2';
import type { GoalQualificationClockEvent } from '@/features/bot-trading/goal-qualification-clock';
import type { IndexedPoolHistoryWithEvidence } from '@/features/bot-trading/pool-history';
import { syntheticQualificationPlan, syntheticQualificationEvaluator } from './goal-qualification-fixtures';
import { goalTestHash as hash, goalTestSha as sha } from './goal-storage-fixtures';
import {
  GOAL_TARGET_MODEL_PROTOCOL,
  GOAL_CATALOG_TARGET_MODEL_PROTOCOL,
  GOAL_CATALOG_TARGET_SOURCE_PROFILES,
  GOAL_TARGET_RUNTIME_CATALOG_SHA256,
  goalTargetSourceRuntimeProfiles,
  GOAL_TARGET_COST_PROTOCOL,
  GOAL_TARGET_MODEL_PROFILES,
  GOAL_TARGET_COMPRESSED_SHA256,
  readGoalTargetExecutionModel,
} from '@/features/bot-trading/goal-target-model';
const HOUR = 3600000,
  UNIT = 10n ** 18n,
  base = 100000;
const codec = (n: number) => String(BigInt(n) * UNIT);
function fixture(
  options: {
    delay?: number;
    strategy?: 'dca' | 'threshold' | 'sma';
    episodeIndex?: number;
    threshold?: string;
    direction?: 'above' | 'below';
    risingAtCheck?: number;
    fallingAtCheck?: number;
  } = {}
) {
  const plan: GoalQualificationPlan = structuredClone(syntheticQualificationPlan());
  plan.training = { ...plan.training, startAtMs: 200 * HOUR, endAtMs: 316 * HOUR };
  plan.validation = { ...plan.validation, startAtMs: 318 * HOUR, endAtMs: 367 * HOUR };
  plan.candidates[0].strategy = {
    ...plan.candidates[0].strategy,
    kind: options.strategy ?? 'dca',
    amount: '2',
    intervalMs: HOUR,
    threshold: options.threshold ?? '1',
    direction: options.direction ?? 'below',
  };
  if (options.strategy !== 'sma') delete plan.candidates[0].strategy.signalTiming;
  plan.candidates[0].maxTradeXorCodec = codec(1);
  const request: GoalQualificationEvaluationRequest = {
    planSha256: goalQualificationDigest(plan),
    candidate: plan.candidates[0],
    candidateSha256: goalQualificationDigest(plan.candidates[0]),
    phase: 'training',
    partitionIdentitySha256: plan.training.identitySha256,
    startAtMs: plan.training.startAtMs + (options.episodeIndex ?? 0) * 24 * HOUR,
    endAtMs: plan.training.startAtMs + ((options.episodeIndex ?? 0) + 1) * 24 * HOUR,
    episodeIndex: options.episodeIndex ?? 0,
  };
  const delay = options.delay ?? 0;
  const block = (index: number) => ({
    height: base + index,
    hash: hash(base + index),
    parentHash: hash(base + index - 1),
    timestampMs: request.startAtMs + index * 60000 + delay,
  });
  const clockEvents: GoalQualificationClockEvent[] = [];
  for (let i = 0; i < 1440; i++) {
    const b = block(i);
    clockEvents.push({ kind: 'callback', arrivedAtMs: b.timestampMs, processedAtMs: b.timestampMs, block: b });
    clockEvents.push({ kind: 'complete', checkId: i + 1, atMs: b.timestampMs + 3000 });
  }
  clockEvents.push({ kind: 'deadline', atMs: request.endAtMs });
  const quoteCalls: Array<{ input: Parameters<GoalEpisodeEvidenceSource['quote']>[1]; frozen: boolean }> = [];
  const order: string[] = [];
  const context = (index: number, receivedAtMs: number): GoalEpisodeMarkEvidence => {
    let b = block(index);
    if (index === -1) b = { ...b, timestampMs: request.startAtMs - 60000 };
    if (index === 1440) b = { ...b, timestampMs: request.endAtMs };
    const xor =
      options.risingAtCheck !== undefined && index + 1 >= options.risingAtCheck
        ? 110000
        : options.fallingAtCheck !== undefined && index + 1 >= options.fallingAtCheck
          ? 90000
          : 100000;
    return {
      sourceManifestSha256: plan.source.manifestSha256,
      genesisHash: request.candidate.genesisHash,
      block: b,
      mark: {
        blockHash: b.hash,
        blockNumber: b.height,
        timestampMs: b.timestampMs,
        denominator: '1',
        kusdReserveCodec: codec(100000),
        xorReserveCodec: codec(xor),
      },
      runtimeProfile: plan.runtimeProfiles[0],
      captureStartedAtMs: receivedAtMs - 100,
      receivedAtMs,
      evidenceSha256: sha(10000 + index),
    };
  };
  const makeHistory = (completedAtMs: number): IndexedPoolHistoryWithEvidence => {
    const closes = [completedAtMs - 2 * HOUR, completedAtMs - HOUR, completedAtMs];
    return {
      history: {
        candles: closes.map((timestamp) => ({ timestamp, close: '1', feeClose: '1' })),
        missing: 0,
        denominationVerified: true,
        identity: { genesisHash: request.candidate.genesisHash, denominator: '1' },
      },
      boundaries: closes.map((timestamp) => {
        const i = (timestamp - request.startAtMs) / 60000;
        return {
          kind: 'indexed-finalized-hour-boundary',
          completedAtMs: timestamp,
          genesisHash: request.candidate.genesisHash,
          denominator: '1',
          closing: {
            height: base + i - 1,
            hash: hash(base + i - 1),
            timestampSeconds: Math.floor((timestamp - 60000 + (i > 0 ? delay : 0)) / 1000),
          },
          successor: {
            height: base + i,
            hash: hash(base + i),
            timestampSeconds: Math.floor((timestamp + delay) / 1000),
          },
          arrivalTimeKnown: false,
        };
      }),
    };
  };
  const source: GoalEpisodeEvidenceSourceV1 = {
    open: vi.fn(async () => ({
      dataSha256: sha(777),
      clock: { protocol: GOAL_LIVE_CLOCK_PROTOCOL, events: clockEvents },
      opening: context(-1, request.startAtMs),
    })),
    history: vi.fn(async (_request, input) => {
      order.push('history');
      return {
        history: makeHistory(input.completedAtMs),
        availableAtMs: input.check.checkedAtMs + 100,
        evidenceSha256: sha(20000 + input.check.id),
      };
    }),
    valuation: vi.fn(async (_request, input) => {
      order.push('valuation');
      return context(input.check.id - 1, input.notBeforeMs + 100);
    }),
    quote: vi.fn(async (_request, input) => {
      order.push('quote');
      quoteCalls.push({
        input,
        frozen: Object.isFrozen(input) && Object.isFrozen(input.pending) && Object.isFrozen(input.valuation.mark),
      });
      const output = input.pending.amountInCodec;
      const quote: GoalEpisodeQuoteEvidence = {
        context: input.valuation,
        receivedAtMs: input.decisionAtMs + 500,
        pending: input.pending,
        quotedOutputCodec: output,
        withoutImpactCodec: output,
        minimumOutputCodec: String((BigInt(output) * 9950n) / 10000n),
        feeCodec: '1000000000000000',
        queryInfoFeeCodec: '1000000000000000',
        queryDetailsFeeCodec: '1000000000000000',
        feeAsset: XOR,
        feePolicyId: GOAL_QUALIFICATION_POLICY.feePolicyId,
        feePolicySha256: GOAL_QUALIFICATION_POLICY.feePolicySha256,
        quoteEvidenceSha256: sha(30000 + input.signalIndex),
        feeEvidenceSha256: sha(40000 + input.signalIndex),
        dexId: 0,
        liquiditySource: 'XYKPool',
        filter: 'AllowSelected',
        slippageBasisPoints: 50,
        observedFill: false,
        transactionSubmitted: false,
        feeAdequacyVerified: false,
      };
      return quote;
    }),
    terminal: vi.fn(async () => ({
      context: context(1440, request.endAtMs + 100),
      successor: { ...block(1441), timestampMs: request.endAtMs + 60000 },
    })),
  };
  return {
    plan,
    request,
    source,
    quoteCalls,
    order,
    context,
    makeHistory,
    clockEvents,
    run: () => createGoalEpisodeEvaluator({ plan, source }).evaluate(request),
  };
}

describe('concrete causal exact-goal episode evaluator', () => {
  it('uses real completed-hour signals, caps fixed lots, charges the bound fee once and marks every check through deadline', async () => {
    const f = fixture(),
      result = await f.run();
    expect(result.protocol).toBe('finalized-xyk-execution-validation-v1');
    expect(result.requestSha256).toBe(goalQualificationDigest(f.request));
    expect(result.signals).toHaveLength(24);
    const fills = result.events.filter((event) => event.kind === 'minimum-output-fill');
    expect(fills).toHaveLength(5);
    expect(
      fills.every(
        (fill) =>
          fill.inputCodec === codec(2) &&
          fill.minimumOutputCodec === '1990000000000000000' &&
          fill.feeCodec === '1000000000000000'
      )
    ).toBe(true);
    expect(result.events.filter((event) => event.kind === 'valuation')).toHaveLength(1440);
    expect(f.quoteCalls.every((call) => call.frozen)).toBe(true);
    expect(f.order.slice(0, 3)).toEqual(['history', 'valuation', 'quote']);
    expect(result.terminal.accountingAtMs).toBe(f.request.endAtMs);
    expect(
      Object.isFrozen(result) && Object.isFrozen(result.clock.events) && Object.isFrozen(result.events[0].mark)
    ).toBe(true);
  });
  it('follows18-second callback drift rather than inventing a12-second grid', async () => {
    const f = fixture({ delay: 18000 }),
      result = await f.run();
    expect(result.signals[0].decisionAtMs).toBe(f.request.startAtMs + 18200);
    expect(result.signals[1].decisionAtMs).toBe(f.request.startAtMs + HOUR + 18200);
    expect(result.events.filter((event) => event.kind === 'valuation')).toHaveLength(1440);
  });
  it.each([{ risingAtCheck: 2 }, { fallingAtCheck: 2 }])(
    'stops new decisions at target/loss but retains every later valuation: %j',
    async (option) => {
      const f = fixture(option),
        result = await f.run();
      expect(f.source.history).toHaveBeenCalledTimes(1);
      expect(f.source.quote).toHaveBeenCalledTimes(1);
      expect(result.signals.slice(1).every((signal) => signal.action === 'stopped')).toBe(true);
      expect(result.events.filter((event) => event.kind === 'valuation')).toHaveLength(1440);
      expect(f.source.terminal).toHaveBeenCalledTimes(1);
    }
  );
  it('consumes a rejected signal once and does not retry its quote on later minute checks', async () => {
    const f = fixture();
    const original = f.source.quote;
    f.source.quote = vi.fn(async (...args: Parameters<GoalEpisodeEvidenceSource['quote']>) => {
      const quote = await original(...args);
      return { ...quote, withoutImpactCodec: String(BigInt(quote.quotedOutputCodec) * 2n) };
    });
    const result = await f.run();
    expect(result.signals.every((signal) => signal.action === 'rejected')).toBe(true);
    expect(f.source.quote).toHaveBeenCalledTimes(24);
    expect(result.events.every((event) => event.kind === 'valuation')).toBe(true);
  });
  it('preserves a genuine fee-only admission rejection without spending funds', async () => {
    const f = fixture();
    const original = f.source.quote;
    f.source.quote = async (...args) => ({
      ...(await original(...args)),
      feeCodec: '600000000000000000',
      queryInfoFeeCodec: '600000000000000000',
      queryDetailsFeeCodec: '600000000000000000',
    });
    const result = await f.run();
    expect(result.signals.every((signal) => signal.action === 'rejected')).toBe(true);
    expect(result.events.filter((event) => event.kind === 'minimum-output-fill')).toHaveLength(0);
    const first = result.events[0];
    const opened = createGoalExactLedger(
      {
        goalId: 'qualification-episode',
        startedAtMs: f.request.startAtMs,
        initialKusdCodec: codec(10),
        maxTradeKusdCodec: codec(2),
        maxTradeXorCodec: codec(1),
      },
      result.opening.mark
    );
    const marked = markGoalExactLedger(opened, {
      expectedRevision: opened.revision,
      accountingAtMs: first.receivedAtMs,
      mark: first.mark,
    });
    const assessment = assessGoalExactFill(marked, {
      expectedRevision: marked.revision,
      accountingAtMs: first.receivedAtMs + 500,
      mark: first.mark,
      fill: {
        inputAsset: KUSD,
        inputCodec: codec(2),
        outputAsset: XOR,
        minimumOutputCodec: '1990000000000000000',
        feeCeilingCodec: '600000000000000000',
      },
    });
    expect(assessment.rejection).toBe('goal-trade-cost');
    expect(assessment.state.accountingAtMs).toBeGreaterThan(marked.accountingAtMs);
    // Same state, before deadline: only the accounting clock/revision advances, so omission cannot conceal a stop or peak.
    for (const key of [
      'outcome',
      'stoppedAtMs',
      'holdings',
      'goalPeakValue',
      'performancePeakValue',
      'maximumDrawdownRatio',
    ] as const)
      expect(assessment.state[key]).toEqual(marked[key]);
  });
  it.each(['minimum', 'fee', 'route', 'pending', 'later-state', 'late'])(
    'rejects %s quote evidence instead of replacing or resizing it',
    async (kind) => {
      const f = fixture();
      const original = f.source.quote;
      f.source.quote = async (...args) => {
        const q = structuredClone(await original(...args));
        if (kind === 'minimum') q.minimumOutputCodec = q.quotedOutputCodec;
        if (kind === 'fee') q.queryInfoFeeCodec = '2';
        if (kind === 'route') q.dexId = 1 as 0;
        if (kind === 'pending') q.pending.amountInCodec = codec(1);
        if (kind === 'later-state') q.context = f.context(1, q.receivedAtMs + 60000);
        if (kind === 'late') q.receivedAtMs = q.context.receivedAtMs + 5000;
        return q;
      };
      await expect(f.run()).rejects.toThrow('bots.errors.research');
      expect(f.quoteCalls).toHaveLength(1);
    }
  );
  it('rejects missing or future completed-hour evidence before requesting a quote', async () => {
    const f = fixture();
    const original = f.source.history;
    f.source.history = async (...args) => {
      const h = await original(...args);
      h.history.history.candles[2].timestamp += HOUR;
      return h;
    };
    await expect(f.run()).rejects.toThrow();
    expect(f.source.quote).not.toHaveBeenCalled();
  });
  it('makes missing due-check evidence incomplete and never substitutes another state', async () => {
    const f = fixture();
    const original = f.source.valuation;
    f.source.valuation = vi.fn(async (...args: Parameters<GoalEpisodeEvidenceSource['valuation']>) => {
      if (args[1].check.id === 2) throw Error('unavailable');
      return original(...args);
    });
    await expect(f.run()).rejects.toThrow('unavailable');
    expect(f.source.valuation).toHaveBeenCalledTimes(2);
    expect(f.source.terminal).not.toHaveBeenCalled();
  });
  it('rejects invalid callback gaps before any history, valuation or quote read', async () => {
    const f = fixture();
    f.clockEvents.splice(2, 2);
    await expect(f.run()).rejects.toThrow();
    expect(f.source.valuation).not.toHaveBeenCalled();
    expect(f.source.quote).not.toHaveBeenCalled();
  });

  it('uses causal SMA direction with the independent XOR lot instead of inverse-price sell sizing', async () => {
    const f = fixture({ strategy: 'sma' });
    const original = f.source.history;
    f.source.history = async (...args) => {
      const result = await original(...args);
      result.history.history.candles = result.history.history.candles.map((candle) => {
        const hour = (candle.timestamp - f.request.startAtMs) / HOUR;
        const price =
          hour < -1
            ? '300'
            : hour === -1
              ? '200'
              : hour === 0
                ? '100'
                : hour === 1
                  ? '400'
                  : hour === 2
                    ? '500'
                    : '100';
        return { ...candle, close: price };
      });
      return result;
    };
    const result = await f.run();
    const fills = result.events.filter((event) => event.kind === 'minimum-output-fill');
    expect(fills[0]).toMatchObject({ signalIndex: 1, inputAsset: KUSD, inputCodec: codec(2) });
    expect(fills[1]).toMatchObject({ signalIndex: 3, inputAsset: XOR, inputCodec: codec(1) });
    expect(fills[1].inputCodec).not.toBe('20000000000000000');
  });
  it('feeds the existing qualification evaluator contract and preserves its economic rejection', async () => {
    const f = fixture();
    const { evaluator } = syntheticQualificationEvaluator(f.plan);
    evaluator.evaluate = vi.fn(async (request) => {
      const next = fixture({ episodeIndex: request.episodeIndex });
      return createGoalEpisodeEvaluator({ plan: next.plan, source: next.source }).evaluate(request);
    });
    evaluator.sealSelection = vi.fn(evaluator.sealSelection);
    await expect(createGoalQualificationBoundary(evaluator).qualify(f.plan)).rejects.toThrow('bots.errors.research');
    // All four exact traces passed the existing accounting/clock verifier; losses are not relabeled as eligibility.
    expect(evaluator.evaluate).toHaveBeenCalledTimes(4);
    expect(evaluator.sealSelection).not.toHaveBeenCalled();
  }, 20000);

  it('commits a same-check target before any quote can be rejected, and keeps the target latched', async () => {
    const f = fixture({ risingAtCheck: 1 }),
      result = await f.run();
    expect(result.signals.every((signal) => signal.action === 'stopped')).toBe(true);
    expect(f.source.quote).not.toHaveBeenCalled();
    expect(result.events).toHaveLength(1440);
  });
  it('refuses constructor accessors without invoking them', () => {
    const f = fixture(),
      getter = vi.fn();
    const options = Object.defineProperty({ source: f.source }, 'plan', { enumerable: true, get: getter });
    expect(() => createGoalEpisodeEvaluator(options as never)).toThrow('bots.errors.research');
    expect(getter).not.toHaveBeenCalled();
  });

  it('pins allowed runtime profiles from the detached plan despite later external edits', async () => {
    const f = fixture();
    const originalProfile = { ...f.plan.runtimeProfiles[0] };
    const open = f.source.open;
    f.source.open = vi.fn(async (...args) => {
      const opened = await open(...args);
      return { ...opened, opening: { ...opened.opening, runtimeProfile: originalProfile } };
    });
    f.source.history = vi.fn(async () => {
      throw new Error('source-reached');
    });
    const evaluator = createGoalEpisodeEvaluator({ plan: f.plan, source: f.source });
    f.plan.runtimeProfiles = [{ ...originalProfile, metadataSha256: 'f'.repeat(64) }];
    await expect(evaluator.evaluate(f.request)).rejects.toThrow('source-reached');
    expect(f.source.history).toHaveBeenCalledTimes(1);
  });

  it.each(['metadata', 'extra-field', 'getter'] as const)(
    'rejects unadmitted source runtime profile %s before history',
    async (variant) => {
      const f = fixture();
      const open = f.source.open;
      const getter = vi.fn(() => f.plan.runtimeProfiles[0].metadataSha256);
      f.source.open = vi.fn(async (...args) => {
        const opened = await open(...args);
        const profile = { ...opened.opening.runtimeProfile };
        if (variant === 'metadata') profile.metadataSha256 = 'f'.repeat(64);
        if (variant === 'extra-field') Object.assign(profile, { unexpected: 'x' });
        if (variant === 'getter') Object.defineProperty(profile, 'metadataSha256', { enumerable: true, get: getter });
        return { ...opened, opening: { ...opened.opening, runtimeProfile: profile } };
      });
      await expect(f.run()).rejects.toThrow('bots.errors.research');
      expect(f.source.history).not.toHaveBeenCalled();
      expect(getter).not.toHaveBeenCalled();
    }
  );

  it('rehashes each source observation when a reused external profile changes after opening', async () => {
    const f = fixture();
    const sharedProfile = { ...f.plan.runtimeProfiles[0] };
    const open = f.source.open;
    f.source.open = vi.fn(async (...args) => {
      const opened = await open(...args);
      return { ...opened, opening: { ...opened.opening, runtimeProfile: sharedProfile } };
    });
    const history = f.source.history;
    f.source.history = vi.fn(async (...args) => {
      const result = await history(...args);
      sharedProfile.metadataSha256 = 'f'.repeat(64);
      return result;
    });
    const valuation = f.source.valuation;
    f.source.valuation = vi.fn(async (...args) => ({
      ...(await valuation(...args)),
      runtimeProfile: sharedProfile,
    }));
    await expect(f.run()).rejects.toThrow('bots.errors.research');
    expect(f.source.history).toHaveBeenCalledTimes(1);
    expect(f.source.quote).not.toHaveBeenCalled();
  });

  it('does not invoke accessors in request or response data', async () => {
    const f = fixture(),
      getter = vi.fn();
    Object.defineProperty(f.request, 'candidate', { enumerable: true, get: getter });
    await expect(f.run()).rejects.toThrow();
    expect(getter).not.toHaveBeenCalled();
    const g = fixture();
    g.source.history = async () => Object.defineProperty({}, 'history', { enumerable: true, get: getter }) as never;
    await expect(g.run()).rejects.toThrow();
    expect(getter).not.toHaveBeenCalled();
  });
  it('freezes request before the first await and refuses concurrent reuse of one evaluator', async () => {
    const f = fixture(),
      original = f.source.open;
    let resume!: () => void;
    f.source.open = async (...args) => {
      await new Promise<void>((resolve) => {
        resume = resolve;
      });
      return original(...args);
    };
    const evaluator = createGoalEpisodeEvaluator({ plan: f.plan, source: f.source }),
      pending = evaluator.evaluate(f.request);
    await expect(evaluator.evaluate(f.request)).rejects.toThrow();
    f.request.candidate.maxTradeKusdCodec = codec(9);
    resume();
    const result = await pending;
    expect(
      result.events
        .filter((event) => event.kind === 'minimum-output-fill')
        .every((event) => event.inputCodec === codec(2))
    ).toBe(true);
  });
});

/** Invented source observations with a separately modeled execution runtime; no actual chain evidence. */
function v3fixture(catalog = false) {
  const f = v2fixture();
  f.plan.protocol = GOAL_QUALIFICATION_PROTOCOL_V3;
  f.plan.policy = catalog ? GOAL_QUALIFICATION_POLICY_CATALOG_V3 : GOAL_QUALIFICATION_POLICY_V3;
  const model = readGoalTargetExecutionModel({
    ...(catalog
      ? {
          protocol: GOAL_CATALOG_TARGET_MODEL_PROTOCOL,
          sourceRuntimeProfiles: GOAL_CATALOG_TARGET_SOURCE_PROFILES,
          catalogSha256: GOAL_TARGET_RUNTIME_CATALOG_SHA256,
        }
      : { protocol: GOAL_TARGET_MODEL_PROTOCOL, sourceRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.source }),
    targetRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.target,
    targetCompressedSha256: GOAL_TARGET_COMPRESSED_SHA256,
    implementation: {
      hostSha256: 'a'.repeat(64),
      stateCodecSha256: 'b'.repeat(64),
      quoteCodecSha256: 'c'.repeat(64),
      ...(catalog ? { catalogCodecSha256: 'd'.repeat(64) } : {}),
    },
    stateModel: catalog ? 'catalog-source-exact-storage-complete-xst-v1' : 'source130-exact-storage-complete-xst-v1',
    fillModel: 'minimum-output-hypothetical-no-market-feedback',
    costPolicy: { protocol: GOAL_TARGET_COST_PROTOCOL, maximumLiveFeeCodec: '2000000000000000' },
  });
  f.plan.executionModel = model;
  f.plan.runtimeProfiles = goalTargetSourceRuntimeProfiles(model);
  f.request.planSha256 = goalQualificationDigest(f.plan);
  if (catalog) {
    const valuation = f.source.valuation;
    f.source.valuation = async (...args) => ({
      ...(await valuation(...args)),
      runtimeProfile: f.plan.runtimeProfiles[Math.floor((args[1].check.id - 1) / 60) % 3],
    });
  }
  const quote = f.source.quote;
  f.source.quote = async (...args) => ({
    ...(await quote(...args)),
    executionRuntimeProfile: model.targetRuntimeProfile,
    executionModelSha256: goalQualificationDigest(model),
  });
  return {
    ...f,
    model,
    run: () => createGoalEpisodeEvaluatorV3({ plan: f.plan, source: f.source }).evaluate(f.request),
  };
}
describe('causal target-runtime evaluator v3', () => {
  it('keeps genuine source marks while charging the cap and retaining unmodified raw fee estimates', async () => {
    const f = v3fixture();
    const result = await f.run();
    expect(result.protocol).toBe('finalized-xyk-execution-validation-v3');
    const fills = result.events.filter((e) => e.kind === 'minimum-output-fill');
    expect(fills.length).toBeGreaterThan(0);
    for (const fill of fills) {
      expect(fill).toMatchObject({
        feeCodec: '2000000000000000',
        queryInfoFeeCodec: '1000000000000000',
        queryDetailsFeeCodec: '1000000000000000',
        sourceRuntimeProfileSha256: goalQualificationDigest(goalTargetSourceRuntimeProfiles(f.model)[0]),
        runtimeProfileSha256: goalQualificationDigest(f.model.targetRuntimeProfile),
        executionModelSha256: goalQualificationDigest(f.model),
      });
    }
    expect(f.quoteCalls.every((x) => x.input.valuation.runtimeProfile.specVersion === 130)).toBe(true);
    expect(result.events.filter((e) => e.kind === 'valuation')).toHaveLength(1440);
  });
  it('rejects over-cap quotes without consuming the fee reserve or manufacturing fills', async () => {
    const f = v3fixture();
    const quote = f.source.quote;
    f.source.quote = async (...args) => ({
      ...(await quote(...args)),
      feeCodec: '2000000000000001',
      queryInfoFeeCodec: '2000000000000001',
      queryDetailsFeeCodec: '2000000000000001',
    });
    const result = await f.run();
    expect(result.events.filter((e) => e.kind === 'minimum-output-fill')).toHaveLength(0);
    expect(result.signals.every((s) => s.action === 'rejected')).toBe(true);
    expect(result.events.filter((e) => e.kind === 'valuation')).toHaveLength(1440);
  });
  it.each(['source-relabel', 'wrong-execution', 'wrong-model', 'raw-fee-disagreement'])(
    'rejects inconsistent evidence: %s',
    async (kind) => {
      const f = v3fixture();
      const quote = f.source.quote;
      f.source.quote = async (...args) => {
        const result = await quote(...args);
        if (kind === 'source-relabel')
          result.context = { ...result.context, runtimeProfile: f.model.targetRuntimeProfile };
        if (kind === 'wrong-execution') result.executionRuntimeProfile = goalTargetSourceRuntimeProfiles(f.model)[0];
        if (kind === 'wrong-model') result.executionModelSha256 = 'f'.repeat(64);
        if (kind === 'raw-fee-disagreement' && !('kind' in result)) result.queryDetailsFeeCodec = '1000000000000001';
        return result;
      };
      await expect(f.run()).rejects.toThrow();
    }
  );
  it('retains genuine unavailable quotes as rejected signals with no fill or fee', async () => {
    const f = v3fixture();
    const original = f.source.quote;
    f.source.quote = async (...args) => {
      const quote = await original(...args);
      return {
        kind: 'target-runtime-route-unavailable',
        context: quote.context,
        receivedAtMs: quote.receivedAtMs,
        pending: quote.pending,
        quoteEvidenceSha256: quote.quoteEvidenceSha256,
        executionRuntimeProfile: f.model.targetRuntimeProfile,
        executionModelSha256: goalQualificationDigest(f.model),
        dexId: 0,
        liquiditySource: 'XYKPool',
        filter: 'AllowSelected',
        slippageBasisPoints: 50,
        observedFill: false,
        transactionSubmitted: false,
        feeAdequacyVerified: false,
      };
    };
    const result = await f.run();
    expect(result.events.filter((e) => e.kind === 'minimum-output-fill')).toHaveLength(0);
    expect(result.signals.every((s) => s.action === 'rejected')).toBe(true);
    expect(result.events.filter((e) => e.kind === 'valuation')).toHaveLength(1440);
    const valid = f.source.quote;
    f.source.quote = async (...args) => ({ ...(await valid(...args)), feeCodec: '1' });
    await expect(f.run()).rejects.toThrow();
  });
  it('does not permit an unavailable-route variant in v2', async () => {
    const f = v2fixture();
    const original = f.source.quote;
    f.source.quote = async (...args) => ({ ...(await original(...args)), kind: 'target-runtime-route-unavailable' });
    await expect(f.run()).rejects.toThrow();
  });
  it('does not broaden the existing v1/v2 constructors', () => {
    const f = v3fixture();
    expect(() => createGoalEpisodeEvaluator({ plan: f.plan, source: f.source })).toThrow();
    expect(() => createGoalEpisodeEvaluatorV2({ plan: f.plan, source: f.source })).toThrow();
  });
});

/** Existing synthetic economics with an explicitly cancelled final scheduler check. */
function v2fixture(delay = 37000, options: Parameters<typeof fixture>[0] = {}) {
  const f = fixture({ ...options, delay });
  f.plan.protocol = GOAL_QUALIFICATION_PROTOCOL_V2;
  f.plan.policy = GOAL_QUALIFICATION_POLICY_V2;
  if (f.plan.arrivalModel.kind !== 'modeled-finalized-callbacks') throw Error('fixture model');
  f.plan.arrivalModel.checkDurationMs = 30000;
  f.request.planSha256 = goalQualificationDigest(f.plan);
  const source: GoalEpisodeEvidenceSource = f.source;
  const original = source.open;
  source.open = vi.fn(async (...args: Parameters<GoalEpisodeEvidenceSource['open']>) => {
    const opened = await original(...args);
    const events: GoalQualificationClockEventV2[] = opened.clock.events
      .filter((e) => e.kind !== 'deadline')
      .flatMap<GoalQualificationClockEventV2>((e) =>
        e.kind === 'complete' ? [{ ...e, atMs: e.atMs - 3000 + 30000 }] : [e]
      );
    events.pop();
    events.push(
      { kind: 'deadline-cancel', checkId: 1440, atMs: f.request.endAtMs },
      { kind: 'deadline', atMs: f.request.endAtMs }
    );
    return { ...opened, clock: { protocol: GOAL_QUALIFICATION_CLOCK_V2, events } };
  });
  return { ...f, source, run: () => createGoalEpisodeEvaluatorV2({ plan: f.plan, source }).evaluate(f.request) };
}
describe('causal evaluator v2 deadline prefix', () => {
  it('keeps the completed final valuation while the scheduler itself is cancelled', async () => {
    const f = v2fixture(),
      r = await f.run();
    expect(r.protocol).toBe('finalized-xyk-execution-validation-v2');
    expect(r.deadlineCancellation).toBeNull();
    expect(r.signals).toHaveLength(24);
    expect(r.events.filter((e) => e.kind === 'valuation')).toHaveLength(1440);
    expect(r.events.at(-1)?.receivedAtMs).toBe(f.request.endAtMs - 22900);
    expect(r.clock.events.at(-2)).toEqual({ kind: 'deadline-cancel', checkId: 1440, atMs: f.request.endAtMs });
    expect(() => createGoalEpisodeEvaluator({ plan: f.plan, source: f.source })).toThrow();
  });
  it('retains an incomplete final valuation as cancelled, not completed or fabricated', async () => {
    const f = v2fixture(59000);
    const original = f.source.valuation;
    f.source.valuation = async (request, input) => {
      if (input.check.id !== 1440) return original(request, input);
      throw new GoalEpisodeDeadlineCancellation({
        checkId: 1440,
        stage: 'valuation',
        startedAtMs: input.notBeforeMs,
        plannedReceivedAtMs: f.request.endAtMs,
        cancelledAtMs: f.request.endAtMs,
        evidenceSha256: sha(99),
      });
    };
    const r = await f.run();
    expect(r.events.filter((e) => e.kind === 'valuation')).toHaveLength(1439);
    expect(r.deadlineCancellation).toMatchObject({ checkId: 1440, stage: 'valuation' });
    expect(r.terminal.accountingAtMs).toBe(f.request.endAtMs);
  });
  it('records every waiting valuation and consumes the current hour only on the next ready check', async () => {
    const f = v2fixture();
    const original = f.source.history;
    f.source.history = async (request, input) =>
      input.check.id === 1
        ? {
            kind: 'awaiting-history',
            completedAtMs: input.completedAtMs,
            checkedAtMs: input.check.checkedAtMs,
            notBeforeMs: input.check.checkedAtMs + 1000,
            evidenceSha256: sha(98),
          }
        : original(request, input);
    const r = await f.run();
    expect(r.signals).toHaveLength(24);
    expect(r.signals[0].checkId).toBe(2);
    expect(r.events.filter((e) => e.kind === 'valuation')).toHaveLength(1440);
    expect(f.quoteCalls[0].input.check.id).toBe(2);
  });
  it('does not let an entire missing signal hour pass by calling it pending', async () => {
    const f = v2fixture();
    const original = f.source.history;
    f.source.history = async (request, input) =>
      input.completedAtMs === f.request.startAtMs
        ? {
            kind: 'awaiting-history',
            completedAtMs: input.completedAtMs,
            checkedAtMs: input.check.checkedAtMs,
            notBeforeMs: input.check.checkedAtMs + 1000,
            evidenceSha256: sha(98),
          }
        : original(request, input);
    await expect(f.run()).rejects.toThrow();
  });
  it('cannot use deadline cancellation to hide an ordinary missing check', async () => {
    const f = v2fixture();
    f.source.valuation = async (_request, input) => {
      throw new GoalEpisodeDeadlineCancellation({
        checkId: input.check.id,
        stage: 'valuation',
        startedAtMs: input.notBeforeMs,
        plannedReceivedAtMs: f.request.endAtMs,
        cancelledAtMs: f.request.endAtMs,
        evidenceSha256: sha(99),
      });
    };
    await expect(f.run()).rejects.toThrow();
  });
});

describe('v2 valuation independent of hourly publication', () => {
  it('keeps ordinary valuations that finish across an hour and cancels only the final late stage', async () => {
    const f = v2fixture(59950);
    const original = f.source.valuation;
    f.source.valuation = async (request, input) => {
      if (input.check.id !== 1440) return original(request, input);
      throw new GoalEpisodeDeadlineCancellation({
        checkId: 1440,
        stage: 'valuation',
        startedAtMs: input.notBeforeMs,
        plannedReceivedAtMs: input.notBeforeMs + 100,
        cancelledAtMs: f.request.endAtMs,
        evidenceSha256: sha(99),
      });
    };
    const result = await f.run();
    expect(result.signals).toHaveLength(24);
    expect(result.events.find((event) => event.kind === 'valuation' && event.checkId === 60)?.receivedAtMs).toBe(
      f.request.startAtMs + HOUR + 50
    );
    expect(result.deadlineCancellation?.checkId).toBe(1440);
  });
});

describe('v2 final signal execution prefix', () => {
  it.each(['before', 'after'] as const)(
    'records quote completion %s the deadline without losing a completed fill',
    async (timing) => {
      const f = v2fixture(59000, { strategy: 'threshold', threshold: '0.5', direction: 'below' });
      const history = f.source.history,
        quote = f.source.quote;
      f.source.history = async (request, input) => {
        if (input.completedAtMs !== f.request.endAtMs - HOUR) return history(request, input);
        if (input.check.id !== 1440)
          return {
            kind: 'awaiting-history',
            completedAtMs: input.completedAtMs,
            checkedAtMs: input.check.checkedAtMs,
            notBeforeMs: input.check.checkedAtMs + 1000,
            evidenceSha256: sha(91),
          };
        const result = await history(request, input);
        if ('kind' in result) throw Error('fixture');
        result.history.history.candles = result.history.history.candles.map((c) => ({ ...c, close: '0.4' }));
        return result;
      };
      f.source.quote = async (request, input) => {
        if (timing === 'before') return quote(request, input);
        throw new GoalEpisodeDeadlineCancellation({
          checkId: input.check.id,
          stage: 'quote',
          startedAtMs: input.decisionAtMs,
          plannedReceivedAtMs: input.decisionAtMs + 1000,
          cancelledAtMs: f.request.endAtMs,
          evidenceSha256: sha(92),
        });
      };
      const result = await f.run();
      expect(result.signals).toHaveLength(24);
      expect(result.signals.at(-1)).toMatchObject({
        checkId: 1440,
        action: timing === 'before' ? 'filled' : 'deadline-cancelled',
      });
      expect(result.events.filter((e) => e.kind === 'minimum-output-fill')).toHaveLength(timing === 'before' ? 1 : 0);
      expect(result.events.filter((e) => e.kind === 'valuation')).toHaveLength(1440);
      expect(result.deadlineCancellation?.stage ?? null).toBe(timing === 'before' ? null : 'quote');
    }
  );
});

describe('causal evaluator finite catalog runtime transitions', () => {
  it('emits source128/129/130 identities on actual marks and joins each real signal/fill to target131', async () => {
    const f = v3fixture(true),
      result = await f.run();
    const marks = result.events.filter((e) => e.kind === 'valuation');
    const fills = result.events.filter((e) => e.kind === 'minimum-output-fill');
    expect(new Set(marks.map((e) => e.runtimeProfileSha256))).toEqual(
      new Set(GOAL_CATALOG_TARGET_SOURCE_PROFILES.map(goalQualificationDigest))
    );
    expect(new Set(fills.map((e) => e.sourceRuntimeProfileSha256))).toEqual(
      new Set(GOAL_CATALOG_TARGET_SOURCE_PROFILES.map(goalQualificationDigest))
    );
    for (const fill of fills) {
      const checkId = result.signals[fill.signalIndex].checkId;
      expect(fill.sourceRuntimeProfileSha256).toBe(marks.find((m) => m.checkId === checkId)!.runtimeProfileSha256);
      expect(fill.runtimeProfileSha256).toBe(goalQualificationDigest(GOAL_TARGET_MODEL_PROFILES.target));
      expect(fill.feeCodec).toBe('2000000000000000');
      expect(fill.queryInfoFeeCodec).toBe('1000000000000000');
    }
    expect(marks).toHaveLength(1440);
    expect(
      f.quoteCalls.every((x) => BigInt(x.input.pending.amountInCodec) < BigInt(f.request.candidate.initialKusdCodec))
    ).toBe(true);
  });
  it.each(['other-supported-source', 'changed-source-metadata', 'target-as-source'])(
    'rejects quote source relabeling: %s',
    async (kind) => {
      const f = v3fixture(true),
        original = f.source.quote;
      f.source.quote = async (...args) => {
        const quote = await original(...args);
        quote.context = {
          ...quote.context,
          runtimeProfile:
            kind === 'other-supported-source'
              ? GOAL_CATALOG_TARGET_SOURCE_PROFILES[1]
              : kind === 'target-as-source'
                ? GOAL_TARGET_MODEL_PROFILES.target
                : { ...quote.context.runtimeProfile, metadataSha256: 'e'.repeat(64) },
        };
        return quote;
      };
      await expect(f.run()).rejects.toThrow();
    }
  );
  it('rejects source-set or policy changes before calling the evidence source', () => {
    for (const mode of ['order', 'missing', 'old-policy']) {
      const f = v3fixture(true);
      if (mode === 'order') f.plan.runtimeProfiles = [...f.plan.runtimeProfiles].reverse();
      if (mode === 'missing') f.plan.runtimeProfiles = f.plan.runtimeProfiles.slice(1);
      if (mode === 'old-policy') f.plan.policy = GOAL_QUALIFICATION_POLICY_V3;
      expect(() => createGoalEpisodeEvaluatorV3({ plan: f.plan, source: f.source })).toThrow();
      expect(f.source.open).not.toHaveBeenCalled();
    }
  });
});
