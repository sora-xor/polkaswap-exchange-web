// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  assessAccumulationAdmissionCompletion,
  assessAccumulationAdmissionCompletionForTesting as assess,
} from '../../../../scripts/bots/accumulation-completion-clock';
import {
  validateAccumulationAdmissionResult,
  type ValidatedAccumulationAdmissionResult,
} from '../../../../scripts/bots/accumulation-admission-result';
import type { SubprocessClock } from '../../../../scripts/bots/accumulation-subprocess';
import {
  createAccumulationAdmissionResultFixture as fixture,
  repinAccumulationAdmissionResultFixture as repin,
  ADMISSION_FIXTURE_H as H,
} from './fixtures/accumulation-admission-result-fixture';

const HOUR = 3_600_000;
const MS = 1_000_000n;

/** Invented inputs pass the real result validator; no model, child or source acquisition is claimed. */
function input(options: { decisionAtMs?: number; nativeAgeMs?: number } = {}) {
  const decisionAtMs = options.decisionAtMs ?? H + 3000;
  const f = fixture({ decisionAtMs });
  const packet = f.request.packet;
  packet.block.timestampMs = decisionAtMs - (options.nativeAgeMs ?? 2000);
  packet.contextReceivedAtMs = decisionAtMs - 1000;
  packet.latestCompletedClose!.timestampMs = Math.floor(decisionAtMs / HOUR) * HOUR;
  packet.latestCompletedClose!.availableAtMs = packet.latestCompletedClose!.timestampMs;
  Object.assign(packet.candidates[0].quote!, {
    quoteReceivedAtMs: decisionAtMs - 800,
    feeReceivedAtMs: decisionAtMs - 500,
    expiresAtMs: decisionAtMs + 20_000,
  });
  f.request.episode.lastAtMs = packet.contextReceivedAtMs;
  return f;
}
function owned(f = input()) {
  repin(f);
  return validateAccumulationAdmissionResult(f.inputBytes, f.receipt, f.trust);
}
/** Advance the same synthetic monotonic clock by the exact wall-time difference. */
function at(result: ValidatedAccumulationAdmissionResult, wallMs: number): SubprocessClock {
  const end = result.actualClocks.finished;
  return {
    wallMs,
    monotonicNs: String(BigInt(end.monotonicNs) + BigInt(wallMs - end.wallMs) * MS),
  };
}
function wait(f: ReturnType<typeof fixture>) {
  f.request.episode.goalStopped = true;
  f.output.decision = {
    action: 'wait',
    selected_input_kusd: null,
    reason: 'goal_stopped',
    expected_wait_terminal_xor: null,
    candidates: [],
    scenario_count: 0,
    wait_passing_paths: 0,
    wait_ambiguous_paths: 0,
    seed: 20260926,
  };
  return owned(f);
}

describe('post-computation original admission clocks', () => {
  it('preserves original clocks and buy identity without granting any order authority', () => {
    const result = owned();
    const assessment = assess(result, at(result, result.actualClocks.finished.wallMs));
    expect(assessment).toMatchObject({
      status: 'fresh-research-buy',
      originalAction: 'buy',
      originalSelectedInputKusd: 1,
      inputSha256: result.inputSha256,
      outputSha256: result.outputSha256,
      selectionInputAtMs: result.request.packet.decisionAtMs,
      completionAtMs: result.actualClocks.finished.wallMs,
      originalContextReceivedAtMs: result.request.packet.contextReceivedAtMs,
      originalQuoteReceivedAtMs: result.selectedCandidate!.quote!.quoteReceivedAtMs,
      originalFeeReceivedAtMs: result.selectedCandidate!.quote!.feeReceivedAtMs,
      originalExpiresAtMs: result.selectedCandidate!.quote!.expiresAtMs,
      originalDeadlineMs: result.request.episode.deadlineMs,
      freshnessPassed: true,
      reasons: [],
      journalStillCurrentVerified: false,
      sourceAcquisitionVerified: false,
      qualificationAuthority: false,
      orderAuthority: false,
      financialActions: false,
    });
    expect(Object.isFrozen(assessment)).toBe(true);
    expect(Object.isFrozen(assessment.checkedAt)).toBe(true);
    expect(Object.isFrozen(assessment.reasons)).toBe(true);
  });

  it('accepts context age 4999ms and rejects exactly 5000ms', () => {
    const result = owned();
    const context = result.request.packet.contextReceivedAtMs;
    expect(assess(result, at(result, context + 4999)).freshnessPassed).toBe(true);
    const expired = assess(result, at(result, context + 5000));
    expect(expired.status).toBe('unusable-buy');
    expect(expired.reasons).toEqual(['context-expired']);
    expect(expired.originalAction).toBe('buy');
  });

  it('tracks quote age 4999/5000ms independently without renewing the older context', () => {
    const result = owned();
    const quote = result.selectedCandidate!.quote!;
    const before = assess(result, at(result, quote.quoteReceivedAtMs + 4999));
    expect(before.reasons).toContain('context-expired');
    expect(before.reasons).not.toContain('quote-expired');
    const exact = assess(result, at(result, quote.quoteReceivedAtMs + 5000));
    expect(exact.reasons).toContain('quote-expired');
    expect(exact.originalFeeReceivedAtMs).toBe(quote.feeReceivedAtMs);
    expect(exact.originalQuoteReceivedAtMs).toBe(quote.quoteReceivedAtMs);
  });

  it('accepts native block age 60000ms and rejects 60001ms', () => {
    const result = owned(input({ nativeAgeMs: 59_000 }));
    const native = result.request.packet.block.timestampMs;
    expect(assess(result, at(result, native + 60_000)).freshnessPassed).toBe(true);
    const stale = assess(result, at(result, native + 60_001));
    expect(stale.reasons).toEqual(['block-stale']);
  });

  it('preserves the exclusive original acceptance expiry', () => {
    const f = input();
    f.request.packet.candidates[0].quote!.expiresAtMs = f.request.packet.decisionAtMs + 1000;
    const result = owned(f);
    const expires = result.selectedCandidate!.quote!.expiresAtMs;
    expect(assess(result, at(result, expires - 1)).freshnessPassed).toBe(true);
    expect(assess(result, at(result, expires)).reasons).toEqual(['acceptance-expired']);
  });

  it('rejects crossing the completed hour even while original receipts remain young', () => {
    const boundary = H + HOUR;
    const result = owned(input({ decisionAtMs: boundary - 1000 }));
    expect(assess(result, at(result, boundary - 1)).freshnessPassed).toBe(true);
    expect(assess(result, at(result, boundary)).reasons).toEqual(['completed-hour-changed']);
  });

  it('never extends the original 24-hour deadline', () => {
    const deadline = H + 24 * HOUR;
    const result = owned(input({ decisionAtMs: deadline - 1000 }));
    expect(assess(result, at(result, deadline - 1)).freshnessPassed).toBe(true);
    const expired = assess(result, at(result, deadline));
    expect(expired.reasons).toEqual(['goal-deadline', 'completed-hour-changed']);
    expect(expired.originalDeadlineMs).toBe(deadline);
    expect(expired.originalSelectedInputKusd).toBe(1);
  });

  it('rechecks parent delay after a fast child instead of reusing completion freshness', () => {
    const result = owned();
    const end = result.actualClocks.finished.wallMs;
    expect(assess(result, at(result, end)).freshnessPassed).toBe(true);
    const delayed = assess(result, at(result, end + 5000));
    expect(delayed.status).toBe('unusable-buy');
    expect(delayed.reasons).toEqual(['context-expired', 'quote-expired']);
    expect(delayed.completionAtMs).toBe(end);
    expect(delayed.effectiveAtMs).toBe(end + 5000);
  });

  it('uses elapsed monotonic time when the observed wall clock falls backward', () => {
    const result = owned();
    const finish = result.actualClocks.finished;
    const assessment = assess(result, {
      wallMs: finish.wallMs - 100,
      monotonicNs: String(BigInt(finish.monotonicNs) + 5000n * MS),
    });
    expect(assessment.effectiveAtMs).toBe(finish.wallMs + 5000);
    expect(assessment.reasons).toEqual(['observed-wall-clock-regressed', 'context-expired', 'quote-expired']);
    expect(assessment.status).toBe('unusable-buy');
  });

  it('does not hide an earlier wall-clock pause behind a later nonregressing reading', () => {
    const result = owned();
    const finish = result.actualClocks.finished;
    const assessment = assess(result, {
      wallMs: finish.wallMs + 1,
      monotonicNs: String(BigInt(finish.monotonicNs) + 5000n * MS),
    });
    expect(assessment.effectiveAtMs).toBe(finish.wallMs + 5000);
    expect(assessment.reasons).toEqual(['context-expired', 'quote-expired']);
  });

  it.each(['before-finish', 'before-start'] as const)('rejects a monotonic clock %s', (mode) => {
    const result = owned();
    const anchor = mode === 'before-finish' ? result.actualClocks.finished : result.actualClocks.started;
    const assessment = assess(result, {
      wallMs: result.actualClocks.finished.wallMs,
      monotonicNs: String(BigInt(anchor.monotonicNs) - 1n),
    });
    expect(assessment.status).toBe('unusable-buy');
    expect(assessment.reasons).toEqual(['monotonic-clock-regressed']);
  });

  it('rounds a submillisecond elapsed remainder upward at a freshness boundary', () => {
    const result = owned();
    const lastFresh = result.request.packet.contextReceivedAtMs + 4999;
    const checked = at(result, lastFresh);
    checked.monotonicNs = String(BigInt(checked.monotonicNs) + 1n);
    const assessment = assess(result, checked);
    expect(assessment.effectiveAtMs).toBe(lastFresh + 1);
    expect(assessment.reasons).toEqual(['context-expired']);
  });

  it('advances from both start and finish anchors when their wall/monotonic deltas differ', () => {
    const f = input();
    f.receipt.finished.monotonicNs = String(BigInt(f.receipt.finished.monotonicNs) + 4000n * MS);
    f.receipt.elapsedNs = String(BigInt(f.receipt.finished.monotonicNs) - BigInt(f.receipt.started.monotonicNs));
    const result = owned(f);
    const assessment = assess(result, { ...result.actualClocks.finished });
    expect(assessment.effectiveAtMs).toBe(result.actualClocks.finished.wallMs + 4000);
    expect(assessment.reasons).toEqual(['context-expired', 'quote-expired']);
    expect(assessment.status).toBe('unusable-buy');
  });

  it('rejects a child invocation completed before its declared model input cutoff', () => {
    const f = input();
    const decision = f.request.packet.decisionAtMs;
    f.receipt.started.wallMs = decision - 30;
    f.receipt.spawned!.wallMs = decision - 20;
    f.receipt.finished.wallMs = decision - 10;
    const result = owned(f);
    const assessment = assess(result, { wallMs: decision + 200, monotonicNs: f.receipt.finished.monotonicNs });
    expect(assessment.reasons).toEqual(['evaluation-start-before-input', 'completion-before-input']);
    expect(assessment.status).toBe('unusable-buy');
  });

  it('keeps a validated wait and an incomplete null decision as no-buy, never fresh buys', () => {
    const waited = wait(input());
    const waitResult = assess(waited, at(waited, waited.actualClocks.finished.wallMs));
    expect(waitResult).toMatchObject({ status: 'no-buy', originalAction: 'wait', freshnessPassed: false });
    const f = input();
    f.request.packet.status = 'incomplete';
    f.request.packet.candidates[3].status = 'failed';
    f.request.packet.candidates[3].reason = 'synthetic-timeout';
    Object.assign(f.output, { status: 'incomplete', policyCalled: false, decision: null });
    const incomplete = owned(f);
    const incompleteResult = assess(incomplete, at(incomplete, incomplete.actualClocks.finished.wallMs));
    expect(incompleteResult).toMatchObject({
      status: 'no-buy',
      originalAction: null,
      originalSelectedInputKusd: null,
      originalQuoteReceivedAtMs: null,
      originalFeeReceivedAtMs: null,
      originalExpiresAtMs: null,
      freshnessPassed: false,
      orderAuthority: false,
    });
  });

  it('rejects copied results and malformed clocks without invoking clock accessors', () => {
    const result = owned();
    expect(() => assess(JSON.parse(JSON.stringify(result)), at(result, result.actualClocks.finished.wallMs))).toThrow(
      'validated-result-ownership-required'
    );
    const getter = vi.fn();
    const bad = { ...result.actualClocks.finished };
    Object.defineProperty(bad, 'wallMs', { enumerable: true, get: getter });
    expect(() => assess(result, bad)).toThrow('clock-fields');
    expect(getter).not.toHaveBeenCalled();
    for (const monotonicNs of ['01', '-1', '1.0', '1e6']) {
      expect(() => assess(result, { wallMs: result.actualClocks.finished.wallMs, monotonicNs })).toThrow(
        'monotonic-clock'
      );
    }
  });

  it('the production entry point samples real parent clocks without creating authority', () => {
    const result = owned();
    const wallBefore = Date.now();
    const monoBefore = process.hrtime.bigint();
    const assessment = assessAccumulationAdmissionCompletion(result);
    const monoAfter = process.hrtime.bigint();
    const wallAfter = Date.now();
    expect(assessment.checkedAt.wallMs).toBeGreaterThanOrEqual(wallBefore);
    expect(assessment.checkedAt.wallMs).toBeLessThanOrEqual(wallAfter);
    expect(BigInt(assessment.checkedAt.monotonicNs)).toBeGreaterThanOrEqual(monoBefore);
    expect(BigInt(assessment.checkedAt.monotonicNs)).toBeLessThanOrEqual(monoAfter);
    expect(assessment).toMatchObject({
      orderAuthority: false,
      financialActions: false,
      qualificationAuthority: false,
      journalStillCurrentVerified: false,
      sourceAcquisitionVerified: false,
    });
  });
});
