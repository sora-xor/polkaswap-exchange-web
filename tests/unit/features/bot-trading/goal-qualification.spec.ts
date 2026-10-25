import { beforeAll, describe, expect, it, vi } from 'vitest';
vi.unmock('@polkadot/util-crypto');
import {
  createGoalQualificationBoundary,
  assertGoalQualificationVerification,
  assertGoalQualificationRuntime,
  goalQualificationDigest,
  readGoalQualificationBinding,
  type GoalQualificationCertificate,
  type GoalQualificationFill,
  type GoalQualificationValuation,
} from '@/features/bot-trading/goal-qualification';
import { createGoalExactLedger } from '@/features/bot-trading/goal-exact-ledger';
import { goalStorageBot, goalTestSha, goalTestMark, goalTestHash } from './goal-storage-fixtures';
import { syntheticQualificationPlan, syntheticQualificationEvaluator } from './goal-qualification-fixtures';
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const p = syntheticQualificationPlan();
function botFor(certificate: GoalQualificationCertificate) {
  const bot = goalStorageBot(),
    b = p.candidates[0];
  const state = createGoalExactLedger(
    {
      goalId: bot.goalExecution.goalId,
      startedAtMs: bot.exactGoalState.episode.startedAtMs,
      initialKusdCodec: b.initialKusdCodec,
      maxTradeKusdCodec: b.maxTradeKusdCodec,
      maxTradeXorCodec: b.maxTradeXorCodec,
    },
    goalTestMark()
  );
  return {
    ...bot,
    strategy: b.strategy,
    policy: {
      ...bot.policy,
      maxTradeCodec: { [bot.assetIn.address]: b.maxTradeKusdCodec, [bot.assetOut.address]: b.maxTradeXorCodec },
    },
    exactGoalState: state,
    goalExecution: {
      ...bot.goalExecution,
      qualificationDigest: certificate.certificateSha256,
      policyDigest: goalQualificationDigest(p.policy),
    },
  };
}
describe('explicit exact goal qualification boundary', () => {
  let result: Awaited<ReturnType<ReturnType<typeof createGoalQualificationBoundary>['qualify']>>;
  let successful: ReturnType<typeof createGoalQualificationBoundary>;
  const provider = syntheticQualificationEvaluator(p);
  beforeAll(async () => {
    successful = createGoalQualificationBoundary(provider.evaluator);
    result = await successful.qualify(p);
  }, 120000);
  it('derives complete fee-paid episode results before locally owning a configuration-bound capability', () => {
    expect(provider.calls).toEqual([
      'register',
      'training:0',
      'training:1',
      'training:2',
      'training:3',
      'seal',
      'validation:0',
      'validation:1',
    ]);
    expect(result.certificate.validation).toHaveLength(2);
    expect(
      result.certificate.validation.every(
        (e) =>
          e.fills === 2 &&
          e.feesPaidCodec === '2000000000000000' &&
          BigInt(e.netReturn.numerator) > 0n &&
          BigInt(e.excessReturn.numerator) > 0n &&
          e.outcome === 'expired'
      )
    ).toBe(true);
    expect(() => assertGoalQualificationVerification(result.verification, botFor(result.certificate))).not.toThrow();
    expect(() => assertGoalQualificationRuntime(result.verification, p.runtimeProfiles[0])).not.toThrow();
    expect(Object.isFrozen(result.certificate.plan.candidates[0].strategy)).toBe(true);
  });
  it('rejects plain true-returning hooks, serialized capabilities and digest-only records', () => {
    for (const value of [
      { assertCurrent: () => true },
      { certificateSha256: result.certificate.certificateSha256 },
      clone(result.verification),
    ])
      expect(() => assertGoalQualificationVerification(value, botFor(result.certificate))).toThrow();
  });
  it('rejects changed strategy, lots, network, denomination, certificate or policy binding', () => {
    const bot = botFor(result.certificate);
    for (const value of [
      { ...bot, strategy: { ...bot.strategy, amount: '1' } },
      { ...bot, network: 'other' },
      { ...bot, goalExecution: { ...bot.goalExecution, qualificationDigest: goalTestSha(99) } },
      { ...bot, goalExecution: { ...bot.goalExecution, policyDigest: goalTestSha(99) } },
      {
        ...bot,
        goalExecution: {
          ...bot.goalExecution,
          execution: { ...bot.goalExecution.execution, expectedDenominator: '2' },
        },
      },
    ])
      expect(() => assertGoalQualificationVerification(result.verification, value)).toThrow();
    expect(() =>
      assertGoalQualificationRuntime(result.verification, { ...p.runtimeProfiles[0], codeHash: `0x${'9'.repeat(64)}` })
    ).toThrow();
  });
  it('restoring the exact certificate reruns sealed immutable evidence, never trusting its digest alone', async () => {
    const restoredProvider = syntheticQualificationEvaluator(p),
      boundary = createGoalQualificationBoundary(restoredProvider.evaluator);
    const restored = await boundary.reverify(clone(result.certificate));
    expect(restored.certificate).toEqual(result.certificate);
    expect(restoredProvider.calls).toHaveLength(8);
    expect(() =>
      assertGoalQualificationVerification(restored.verification, botFor(restored.certificate))
    ).not.toThrow();
    boundary.revoke();
    expect(() => assertGoalQualificationRuntime(restored.verification, p.runtimeProfiles[0])).toThrow();
    expect(() => assertGoalQualificationVerification(restored.verification, botFor(restored.certificate))).toThrow();
  }, 120000);
  it('refuses a second unsealed attempt and corrupted imported certificates', async () => {
    await expect(successful.qualify(p)).rejects.toThrow();
    const changed = clone(result.certificate);
    changed.validation[0].feesPaidCodec = '0';
    expect(() => createGoalQualificationBoundary(provider.evaluator).reverify(changed)).toThrow();
  });
  it.each([
    'goal-episodes-v2',
    'goal-ordered-replay-v3-development',
    'goal-ordered-replay-v3-bound-fee-v1-development',
  ])('rejects %s instead of relabeling it', async (protocol) => {
    const { evaluator, calls } = syntheticQualificationEvaluator(p, (_r, e) => ({ ...e, protocol }) as never);
    await expect(createGoalQualificationBoundary(evaluator).qualify(p)).rejects.toThrow();
    expect(calls).toEqual(['register', 'training:0']);
  });
  it.each([
    'missing-valuation',
    'duplicate-hour',
    'wrong-request',
    'wrong-fee',
    'wrong-minimum',
    'impact',
    'resized-lot',
    'stale-context',
    'wrong-runtime',
    'duplicate-check',
    'capture-age',
    'capture-before-check',
    'signal-before-valuation',
    'known-block-time',
    'terminal-successor',
    'model-drift',
  ] as const)('refuses %s without opening validation', async (kind) => {
    const { evaluator, calls } = syntheticQualificationEvaluator(p, (_r, e) => {
      const next = clone(e),
        fill = next.events[1] as GoalQualificationFill,
        valuation = next.events[0] as GoalQualificationValuation;
      if (kind === 'missing-valuation') next.events = next.events.slice(1);
      if (kind === 'duplicate-hour') next.signals = [next.signals[0], ...next.signals.slice(0, 23)];
      if (kind === 'wrong-request') next.requestSha256 = goalTestSha(44);
      if (kind === 'wrong-fee') fill.queryInfoFeeCodec = '1';
      if (kind === 'wrong-minimum') fill.minimumOutputCodec = '1';
      if (kind === 'impact') fill.withoutImpactCodec = '20000000000000000000';
      if (kind === 'resized-lot') fill.inputCodec = '1000000000000000000';
      if (kind === 'stale-context') fill.receivedAtMs = fill.contextReceivedAtMs + 5000;
      if (kind === 'wrong-runtime') fill.runtimeProfileSha256 = goalTestSha(45);
      if (kind === 'duplicate-check') (next.events[2] as GoalQualificationValuation).checkId = 1;
      if (kind === 'capture-age') valuation.receivedAtMs = valuation.captureStartedAtMs + 5000;
      if (kind === 'capture-before-check') valuation.captureStartedAtMs--;
      if (kind === 'signal-before-valuation') next.signals[0].decisionAtMs--;
      if (kind === 'known-block-time')
        valuation.mark = { ...valuation.mark, timestampMs: valuation.mark.timestampMs - 1 };
      if (kind === 'terminal-successor') next.terminal.successor.timestampMs = next.terminal.accountingAtMs;
      if (kind === 'model-drift') {
        const first = next.clock.events[0];
        if (first.kind === 'callback') first.processedAtMs++;
      }
      return next;
    });
    await expect(createGoalQualificationBoundary(evaluator).qualify(p)).rejects.toThrow();
    expect(calls.some((c) => c.startsWith('validation'))).toBe(false);
  });
  it.each(['signal', 'valuation', 'duplicate-valuation'] as const)(
    'rejects a late invalid %s check identity without opening validation',
    async (kind) => {
      const { evaluator, calls } = syntheticQualificationEvaluator(p, (_request, evidence) => {
        const e = clone(evidence);
        if (kind === 'signal') e.signals[23].checkId = 1441;
        else {
          const last = e.events.at(-1) as GoalQualificationValuation;
          last.checkId = kind === 'valuation' ? 1441 : 1439;
        }
        return e;
      });
      await expect(createGoalQualificationBoundary(evaluator).qualify(p)).rejects.toThrow('bots.errors.research');
      expect(calls).toEqual(['register', 'training:0']);
    }
  );

  it('allows asynchronous history before a fresh capture without relabeling check start as observation time', async () => {
    const delayed = clone(p);
    if (delayed.arrivalModel.kind === 'modeled-finalized-callbacks') delayed.arrivalModel.checkDurationMs = 20000;
    const { evaluator } = syntheticQualificationEvaluator(delayed, (_request, evidence) => {
      const e = clone(evidence);
      for (const event of e.events) {
        event.receivedAtMs += 10000;
        if (event.kind === 'valuation') event.captureStartedAtMs += 10000;
        else event.contextReceivedAtMs += 10000;
        event.mark = {
          ...event.mark,
          blockNumber: event.mark.blockNumber + 1,
          blockHash: goalTestHash(event.mark.blockNumber + 1),
          timestampMs: event.mark.timestampMs + 6000,
        };
      }
      e.signals = e.signals.map((signal) => ({ ...signal, decisionAtMs: signal.decisionAtMs + 10000 }));
      e.clock = {
        ...e.clock,
        events: e.clock.events
          .map((event) => (event.kind === 'complete' ? { ...event, atMs: event.atMs + 17000 } : event))
          .sort(
            (a, b) =>
              (a.kind === 'callback' ? a.processedAtMs : a.atMs) - (b.kind === 'callback' ? b.processedAtMs : b.atMs)
          ),
      };
      return e;
    });
    const delayedResult = await createGoalQualificationBoundary(evaluator).qualify(delayed);
    expect(delayedResult.certificate.validation.every((row) => row.fills === 2)).toBe(true);
    expect(delayedResult.certificate.plan.arrivalModel).toEqual(delayed.arrivalModel);
  }, 120000);
  it('rejects positive mean percentage returns that conceal a negative absolute XOR gain', async () => {
    const { evaluator, calls } = syntheticQualificationEvaluator(p, (request, evidence) => {
      const e = clone(evidence),
        high = request.episodeIndex === 3;
      const ratio = high ? 100n : 1n,
        unit = 10n ** 18n;
      const mark = (m: typeof e.opening.mark) => ({ ...m, xorReserveCodec: String(100000n * unit * ratio) });
      e.opening = { ...e.opening, mark: mark(e.opening.mark) };
      e.terminal = { ...e.terminal, mark: mark(e.terminal.mark) };
      e.signals = e.signals.map((s) => ({ ...s, action: s.index === 0 ? 'filled' : 'hold' }));
      e.events = e.events
        .filter((event) => event.kind === 'valuation' || event.signalIndex === 0)
        .map((event) => {
          if (event.kind === 'valuation') return { ...event, mark: mark(event.mark) };
          const output = high ? 200n * unit : (21n * unit) / 10n;
          return {
            ...event,
            mark: mark(event.mark),
            quotedOutputCodec: String(output),
            withoutImpactCodec: String(output),
            minimumOutputCodec: String((output * 995n) / 1000n),
          };
        });
      return e;
    });
    // Three +0.0885 XOR /11 opening episodes versus one -1.001 XOR /1001 episode:
    // both percentage means are positive, but both absolute means are negative.
    expect(3n * 885n * 1001n - 10010n * 11n).toBeGreaterThan(0n);
    expect(3n * 885n - 10010n).toBeLessThan(0n);
    await expect(createGoalQualificationBoundary(evaluator).qualify(p)).rejects.toThrow();
    expect(calls).toEqual(['register', 'training:0', 'training:1', 'training:2', 'training:3']);
  }, 120000);
  it('rejects zero-fill evidence even with complete valuation coverage', async () => {
    const { evaluator, calls } = syntheticQualificationEvaluator(p, (_r, e) => ({
      ...e,
      signals: e.signals.map((s) => ({ ...s, action: 'hold' })),
      events: e.events.filter((event) => event.kind === 'valuation'),
    }));
    await expect(createGoalQualificationBoundary(evaluator).qualify(p)).rejects.toThrow();
    expect(calls.includes('seal')).toBe(false);
  }, 120000);
  it('rejects sparse/accessor inputs and changed partition identity before an evaluator call', async () => {
    const { evaluator, calls } = syntheticQualificationEvaluator(p),
      boundary = createGoalQualificationBoundary(evaluator);
    const getter = vi.fn();
    const hostile = clone(p);
    Object.defineProperty(hostile, 'source', { get: getter, enumerable: true });
    await expect(boundary.qualify(hostile)).rejects.toThrow();
    expect(getter).not.toHaveBeenCalled();
    const sparse = clone(p);
    Reflect.deleteProperty(sparse.candidates, '0');
    await expect(boundary.qualify(sparse)).rejects.toThrow();
    const reused = clone(p);
    reused.validation.identitySha256 = reused.training.identitySha256;
    await expect(boundary.qualify(reused)).rejects.toThrow();
    expect(calls).toEqual([]);
    expect(() => readGoalQualificationBinding({ ...p.candidates[0], qualified: true })).toThrow();
  });
});
