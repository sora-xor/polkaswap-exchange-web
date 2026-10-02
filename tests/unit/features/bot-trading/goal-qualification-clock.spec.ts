import { describe, expect, it, vi } from 'vitest';
import {
  verifyGoalQualificationClock,
  validateGoalQualificationArrivalModel,
  type GoalQualificationClockEvent,
  type GoalQualificationArrivalModel,
} from '@/features/bot-trading/goal-qualification-clock';
import { GOAL_LIVE_CLOCK_PROTOCOL } from '@/features/bot-trading/goal-live-clock';
import { goalTestHash, goalTestSha } from './goal-storage-fixtures';
const start = 3600000,
  end = start + 86400000;
const observed: GoalQualificationArrivalModel = {
  kind: 'observed-finalized-callbacks',
  recorderSha256: goalTestSha(1),
};
function trace(offset = 0) {
  const events: GoalQualificationClockEvent[] = [];
  for (let i = 0; i < 14400; i++) {
    const blockAt = start + i * 6000,
      at = blockAt + offset;
    if (at >= end) break;
    events.push({
      kind: 'callback',
      arrivedAtMs: at,
      processedAtMs: at,
      block: { height: 100 + i, hash: goalTestHash(100 + i), parentHash: goalTestHash(99 + i), timestampMs: blockAt },
    });
    if (i % 10 === 0) events.push({ kind: 'complete', checkId: i / 10 + 1, atMs: at + 3000 });
  }
  events.push({ kind: 'deadline', atMs: end });
  return { protocol: GOAL_LIVE_CLOCK_PROTOCOL, events };
}
describe('qualification callback clock correspondence', () => {
  it('uses actual callback time for sliding checks rather than fixed minute-grid slots', () => {
    const checks = verifyGoalQualificationClock(trace(18000), observed, { startAtMs: start, endAtMs: end });
    expect(checks[0].checkedAtMs).toBe(start + 18000);
    expect(checks[1].checkedAtMs).toBe(start + 78000);
  });
  it('labels and derives hypothetical timestamps from the preregistered delay model', () => {
    const model: GoalQualificationArrivalModel = {
      kind: 'modeled-finalized-callbacks',
      model: 'fixed-nonnegative-delays-v1',
      finalityDelayMs: 200,
      callbackDelayMs: 300,
      processingDelayMs: 0,
      checkDurationMs: 3000,
    };
    const checks = verifyGoalQualificationClock(trace(500), model, { startAtMs: start, endAtMs: end });
    expect(checks[0].checkedAtMs).toBe(start + 500);
    expect(() =>
      verifyGoalQualificationClock(trace(500), { ...model, callbackDelayMs: 301 }, { startAtMs: start, endAtMs: end })
    ).toThrow();
  });
  it('coalesces busy callbacks and drains the newest queued arrival at completion', () => {
    const input = trace();
    const firstComplete = input.events[1];
    input.events.splice(1, 1);
    (firstComplete as { atMs: number }).atMs = start + 25000;
    input.events.splice(5, 0, firstComplete);
    const checks = verifyGoalQualificationClock(input, observed, { startAtMs: start, endAtMs: end });
    expect(checks[0].completedAtMs).toBe(start + 25000);
    expect(checks[1].checkedAtMs).toBe(start + 60000);
  });
  it('rejects a scheduler gap instead of manufacturing checks or changing the start', () => {
    const input = trace();
    input.events = input.events.filter(
      (e) =>
        e.kind === 'deadline' ||
        (e.kind === 'callback' && e.arrivedAtMs >= start + 66000) ||
        (e.kind === 'complete' && e.atMs >= start + 69000)
    );
    expect(() => verifyGoalQualificationClock(input, observed, { startAtMs: start, endAtMs: end })).toThrow();
  });
  it('requires every started check to complete and rejects a wrong completion identity', () => {
    const input = trace();
    input.events.splice(1, 1);
    expect(() => verifyGoalQualificationClock(input, observed, { startAtMs: start, endAtMs: end })).toThrow();
    const other = trace();
    (other.events[1] as { checkId: number }).checkId = 99;
    expect(() => verifyGoalQualificationClock(other, observed, { startAtMs: start, endAtMs: end })).toThrow();
  });
  it('rejects two retained heights claiming the same parent across sparse observed callbacks', () => {
    const input = trace();
    const callback = input.events[2] as Extract<GoalQualificationClockEvent, { kind: 'callback' }>;
    callback.block = { ...callback.block, height: 107, hash: goalTestHash(107), parentHash: goalTestHash(99) };
    expect(() => verifyGoalQualificationClock(input, observed, { startAtMs: start, endAtMs: end })).toThrow();
  });
  it('rejects header conflicts, impossible future receipts and sparse/accessor models', () => {
    const input = trace();
    const callback = input.events[0] as Extract<GoalQualificationClockEvent, { kind: 'callback' }>;
    callback.block.parentHash = callback.block.hash;
    expect(() => verifyGoalQualificationClock(input, observed, { startAtMs: start, endAtMs: end })).toThrow();
    const getter = vi.fn();
    const model = Object.defineProperty({}, 'kind', { enumerable: true, get: getter });
    expect(() => validateGoalQualificationArrivalModel(model as GoalQualificationArrivalModel)).toThrow();
    expect(getter).not.toHaveBeenCalled();
    const sparse = trace();
    Reflect.deleteProperty(sparse.events, '0');
    expect(() => verifyGoalQualificationClock(sparse, observed, { startAtMs: start, endAtMs: end })).toThrow();
  });
});
