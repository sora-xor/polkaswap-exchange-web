import { describe, it, expect, vi } from 'vitest';
vi.unmock('@polkadot/util-crypto');
import {
  createGoalQualificationBoundary,
  createGoalQualificationBoundaryV2,
  GOAL_QUALIFICATION_PROTOCOL_V2,
  GOAL_QUALIFICATION_POLICY_V2,
  type GoalQualificationEpisodeEvidence,
} from '@/features/bot-trading/goal-qualification';
import {
  GOAL_QUALIFICATION_CLOCK_V2,
  type GoalQualificationClockEventV2,
} from '@/features/bot-trading/goal-qualification-clock-v2';
import { syntheticQualificationPlan, syntheticQualificationEvaluator } from './goal-qualification-fixtures';
function fixture(mutate?: (e: GoalQualificationEpisodeEvidence) => void) {
  const p = syntheticQualificationPlan();
  p.protocol = GOAL_QUALIFICATION_PROTOCOL_V2;
  p.policy = GOAL_QUALIFICATION_POLICY_V2;
  if (p.arrivalModel.kind !== 'modeled-finalized-callbacks') throw Error('fixture');
  p.arrivalModel.checkDurationMs = 60000;
  const f = syntheticQualificationEvaluator(p, (request, e) => {
    const callbacks = e.clock.events.filter((x) => x.kind === 'callback');
    const complete: GoalQualificationClockEventV2[] = Array.from({ length: 1439 }, (_, i) => ({
      kind: 'complete',
      checkId: i + 1,
      atMs: request.startAtMs + (i + 1) * 60000,
    }));
    const events: GoalQualificationClockEventV2[] = [...callbacks, ...complete];
    events.sort(
      (a, b) =>
        ('arrivedAtMs' in a ? a.arrivedAtMs : a.atMs) - ('arrivedAtMs' in b ? b.arrivedAtMs : b.atMs) ||
        (a.kind === 'complete' ? -1 : 1)
    );
    events.push(
      { kind: 'deadline-cancel', checkId: 1440, atMs: request.endAtMs },
      { kind: 'deadline', atMs: request.endAtMs }
    );
    e.protocol = 'finalized-xyk-execution-validation-v2';
    e.deadlineCancellation = null;
    e.clock = { protocol: GOAL_QUALIFICATION_CLOCK_V2, events };
    mutate?.(e);
    return e;
  });
  f.evaluator.protocol = 'finalized-xyk-execution-validation-v2';
  return { p, ...f };
}
describe('qualification boundary v2 protocol and accounting', () => {
  it('independently recomputes all episodes with retained final-prefix valuations', async () => {
    const f = fixture();
    const result = await createGoalQualificationBoundaryV2(f.evaluator).qualify(f.p);
    expect(result.certificate.protocol).toBe(GOAL_QUALIFICATION_PROTOCOL_V2);
    expect(result.certificate.validation).toHaveLength(2);
    expect(result.certificate.validation.every((x) => x.fills === 2 && x.feesPaidCodec === '2000000000000000')).toBe(
      true
    );
    expect(f.calls).toHaveLength(8);
  }, 120000);
  it('keeps both constructors strict across versions', async () => {
    const f = fixture();
    expect(() => createGoalQualificationBoundary(f.evaluator)).toThrow();
    expect(() => createGoalQualificationBoundaryV2(syntheticQualificationEvaluator().evaluator)).toThrow();
    await expect(
      createGoalQualificationBoundaryV2(f.evaluator).qualify(syntheticQualificationPlan())
    ).rejects.toThrow();
  });
  it('does not silently omit the cancelled check valuation without a stage cancellation receipt', async () => {
    const f = fixture((e) => {
      e.events = e.events.filter((x) => x.kind !== 'valuation' || x.checkId !== 1440);
    });
    await expect(createGoalQualificationBoundaryV2(f.evaluator).qualify(f.p)).rejects.toThrow();
  });
  it('rejects a pre-deadline event relabelled as completing at deadline', async () => {
    const f = fixture((e) => {
      const last = e.events.at(-1)!;
      last.receivedAtMs = e.terminal.accountingAtMs;
    });
    await expect(createGoalQualificationBoundaryV2(f.evaluator).qualify(f.p)).rejects.toThrow();
  });
});
