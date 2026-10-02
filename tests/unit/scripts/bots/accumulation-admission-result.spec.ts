// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { canonicalAccumulationJournalJson as canonical } from '../../../../scripts/bots/accumulation-journal-store';
import {
  validateAccumulationAdmissionResult,
  isValidatedAccumulationAdmissionResult,
  AccumulationAdmissionResultError,
} from '../../../../scripts/bots/accumulation-admission-result';
import {
  createAccumulationAdmissionResultFixture as fixture,
  repinAccumulationAdmissionResultFixture as repin,
  admissionResultStream as stream,
  admissionResultSha as sha,
} from './fixtures/accumulation-admission-result-fixture';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const verify = (f = fixture()) => validateAccumulationAdmissionResult(f.inputBytes, f.receipt, f.trust);
function output(f: ReturnType<typeof fixture>) {
  f.receipt.stdout = stream(Buffer.from(canonical(f.output) + '\n'));
  return f;
}
function early(f: ReturnType<typeof fixture>, reason: string) {
  f.output.decision = {
    action: 'wait',
    selected_input_kusd: null,
    reason,
    expected_wait_terminal_xor: null,
    candidates: [],
    scenario_count: 0,
    wait_passing_paths: 0,
    wait_ambiguous_paths: 0,
    seed: 20260926,
  };
  return repin(f);
}
function rejected(f: ReturnType<typeof fixture>, reasons: string[], entry: unknown = null, failure: unknown = null) {
  Object.assign(f.output.decision, { action: 'wait', selected_input_kusd: null, reason: 'no_candidate_admitted' });
  Object.assign(f.output.decision.candidates[0], {
    admitted: false,
    reasons,
    post_entry_value_xor: entry,
    expected_terminal_xor: null,
    expected_growth_xor: null,
    expected_excess_xor: null,
    passing_paths: 0,
    ambiguous_paths: 0,
    failed_attempt_value_xor: failure,
  });
  return repin(f);
}
afterEach(() => vi.unstubAllGlobals());

describe('pure accumulation admission result validation', () => {
  it('validates a complete synthetic partial-buy receipt and preserves original candidate/clocks without invoking anything', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw Error('no network');
      })
    );
    const f = fixture(),
      result = verify(f);
    expect(isValidatedAccumulationAdmissionResult(result)).toBe(true);
    expect(result.decision?.selected_input_kusd).toBe(1);
    expect(result.selectedCandidate).toEqual(f.request.packet.candidates[0]);
    expect(result.request).toEqual(f.request);
    expect(result.candidateOutcomes).toHaveLength(9);
    expect(result.actualClocks.finished).toEqual(f.receipt.finished);
    expect(result.orderAuthority).toBe(false);
    expect(result.forecastRecomputed).toBe(false);
    expect(result.postComputationFreshnessVerified).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(Object.isFrozen(result.request.packet.candidates[0].quote)).toBe(true);
    f.request.packet.candidates[0].quote!.networkFeeXorCodec = '0';
    expect(result.selectedCandidate?.quote?.networkFeeXorCodec).toBe('100000000000000000');
    expect(isValidatedAccumulationAdmissionResult(clone(result))).toBe(false);
  });
  it('retains an incomplete packet instead of inventing a wait or policy call', () => {
    const f = fixture();
    f.request.packet.status = 'incomplete';
    f.request.packet.candidates[3].status = 'failed';
    f.request.packet.candidates[3].reason = 'synthetic-timeout';
    Object.assign(f.output, { status: 'incomplete', policyCalled: false, decision: null });
    repin(f);
    const result = verify(f);
    expect(result.status).toBe('incomplete');
    expect(result.decision).toBeNull();
    expect(result.selectedCandidate).toBeNull();
    f.output.policyCalled = true;
    output(f);
    expect(() => verify(f)).toThrow(/result-status/);
  });
  it('retains a genuine goal-stopped wait without candidate projections', () => {
    const f = fixture();
    f.request.episode.goalStopped = true;
    early(f, 'goal_stopped');
    expect(verify(f).decision?.reason).toBe('goal_stopped');
    f.output.decision.reason = 'no_candidate_admitted';
    output(f);
    expect(() => verify(f)).toThrow(/early-decision/);
  });
  it('retains a forecast-filtered wait including a positive but numerically guarded growth diagnostic', () => {
    const f = fixture(),
      row = f.output.decision.candidates[0];
    Object.assign(row, {
      admitted: false,
      reasons: ['expected_growth_not_robustly_positive', 'model_path_drawdown_filter_failed'],
      expected_growth_xor: '1E-70',
      passing_paths: 972,
      ambiguous_paths: 1,
    });
    Object.assign(f.output.decision, { action: 'wait', selected_input_kusd: null, reason: 'no_candidate_admitted' });
    output(f);
    expect(verify(f).decision?.action).toBe('wait');
  });
  it('validates exact entry and paid-failure accounting from the original quote', () => {
    const f = fixture();
    f.request.episode.current.peakXor = { numerator: '12', denominator: '1' };
    f.request.packet.candidates[0].quote!.networkFeeXorCodec = '500000000000000000';
    rejected(
      f,
      ['failed_attempt_drawdown_exceeded'],
      { numerator: '1149', denominator: '100' },
      { numerator: '21', denominator: '2' }
    );
    expect(verify(f).decision?.candidates[0].failed_attempt_value_xor).toEqual({ numerator: '21', denominator: '2' });
    f.output.decision.candidates[0].failed_attempt_value_xor.numerator = '22';
    output(f);
    expect(() => verify(f)).toThrow(AccumulationAdmissionResultError);
  });
  it('validates entry-only rejection with no fabricated future or failure diagnostics', () => {
    const f = fixture();
    Object.assign(f.request.packet.candidates[0].quote!, {
      quotedOutputXorCodec: '10000000000000000',
      minimumOutputXorCodec: '9950000000000000',
      networkFeeXorCodec: '200000000000000000',
    });
    rejected(f, ['entry_drawdown_exceeded'], { numerator: '196199', denominator: '20000' });
    expect(verify(f).decision?.candidates[0].reasons).toEqual(['entry_drawdown_exceeded']);
  });
  it('preserves over-impact native quotes as explicit pre-scenario rejections', () => {
    const f = fixture(),
      c = f.request.packet.candidates[0];
    c.status = 'rejected-impact';
    c.reason = 'synthetic-impact';
    c.quote!.priceImpact = { numerator: '1', denominator: '50' };
    rejected(f, ['price_impact_exceeded']);
    expect(verify(f).decision?.candidates[0].admitted).toBe(false);
  });
  it('binds exact original input bytes and complete trusted episode projection', () => {
    const f = fixture();
    f.inputBytes = Buffer.concat([f.inputBytes, Buffer.from(' ')]);
    expect(() => verify(f)).toThrow(/trusted-input-or-model/);
    const episode = fixture();
    episode.request.episode.current.peakXor = { numerator: '12', denominator: '1' };
    episode.inputBytes = Buffer.from(JSON.stringify(episode.request));
    const digest = sha(episode.inputBytes);
    episode.trust.expectedInputSha256 = digest;
    episode.receipt.input = { bytes: episode.inputBytes.length, sha256: digest, writeCompleted: true };
    episode.output.inputSha256 = digest;
    output(episode);
    expect(() => verify(episode)).toThrow(/episode-binding/);
  });
  it('rejects mutually changed declared model/dependency/source pins', () => {
    const f = fixture();
    f.trust.modelSha256 = 'a'.repeat(64);
    f.output.modelSha256 = f.trust.modelSha256;
    output(f);
    expect(() => verify(f)).toThrow(/trusted-input-or-model/);
    const changed = fixture();
    changed.trust.sourceBindings[1].sha256 = 'a'.repeat(64);
    expect(() => verify(changed)).toThrow(/held-source-pin/);
    const body = fixture();
    body.output.dependencySha256['accumulation_admission_policy.py'] = 'a'.repeat(64);
    output(body);
    expect(() => verify(body)).toThrow(/result-binding/);
  });
  it('checks exactly four distinct before/after paths and all expected/actual bytes', () => {
    const changes = [
      (f: ReturnType<typeof fixture>) => {
        f.receipt.before[1] = { ...f.receipt.before[0] };
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.after.pop();
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.after[2].actualSha256 = 'f'.repeat(64);
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.before[2].expectedSha256 = 'f'.repeat(64);
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.before[2].path += '/wrong';
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.after[0].reason = 'changed';
      },
    ];
    for (const change of changes) {
      const f = fixture();
      change(f);
      expect(() => verify(f)).toThrow(AccumulationAdmissionResultError);
    }
    const reordered = fixture();
    reordered.receipt.before.reverse();
    reordered.receipt.after.reverse();
    expect(verify(reordered).status).toBe('evaluated');
  });
  it('checks fixed argv, executable, cwd, environment, registration and limits', () => {
    const changes = [
      (f: ReturnType<typeof fixture>) => {
        f.receipt.argv[0] = '-c';
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.executable = '/other/python';
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.cwd = '/other';
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.registrationSha256 = 'a'.repeat(64);
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.limits.timeoutMs++;
      },
      (f: ReturnType<typeof fixture>) => {
        Object.assign(f.receipt.environment, { PATH: '/evil' });
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.runner = 'journal';
      },
    ];
    for (const change of changes) {
      const f = fixture();
      change(f);
      expect(() => verify(f)).toThrow(/runtime-receipt-binding/);
    }
  });
  it('rejects nonclosed, timed-out, failed, unknown and nonprimitive transport claims', () => {
    const changes: Record<string, unknown>[] = [
      { closeObserved: false },
      { exitObserved: false },
      { spawnAttempted: false },
      { exitCode: 1 },
      { exitCode: '0' },
      { exitSignal: 'SIGTERM' },
      { timedOut: true },
      { terminationUnconfirmed: true },
      { outcomeUnknown: true },
      { outcome: ['completed'] },
      { resultAuthority: true },
      { pid: null },
      { errors: [{ phase: 'close', code: 'x', message: 'x' }] },
      { terminationRequests: [{ signal: 'SIGTERM', accepted: true, at: { wallMs: 0, monotonicNs: '0' } }] },
    ];
    for (const change of changes) {
      const f = fixture();
      Object.assign(f.receipt, change);
      expect(() => verify(f)).toThrow(AccumulationAdmissionResultError);
    }
  });
  it('requires stdin completed plus exact byte count and hash', () => {
    for (const change of [{ writeCompleted: false }, { bytes: 1 }, { sha256: 'a'.repeat(64) }]) {
      const f = fixture();
      Object.assign(f.receipt.input, change);
      expect(() => verify(f)).toThrow(/stdin-binding/);
    }
  });
  it('rejects stderr, truncated/changed/noncanonical base64 or mismatched stream bytes', () => {
    const changes = [
      (f: ReturnType<typeof fixture>) => {
        f.receipt.stderr = stream(Buffer.from('warning'));
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.stdout.truncated = true;
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.stdout.retainedBase64 += ' ';
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.stdout.observedBytes++;
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.stdout.observedSha256 = 'a'.repeat(64);
      },
    ];
    for (const change of changes) {
      const f = fixture();
      change(f);
      expect(() => verify(f)).toThrow(AccumulationAdmissionResultError);
    }
  });
  it('rejects unsafe, reversed or inconsistent actual clocks without relabeling historical decisions', () => {
    const changes = [
      (f: ReturnType<typeof fixture>) => {
        f.receipt.finished.wallMs = f.receipt.started.wallMs - 1;
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.spawned!.monotonicNs = '0';
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.elapsedNs = '1';
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.started.wallMs = 1.5;
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.finished.monotonicNs = '01';
      },
    ];
    for (const change of changes) {
      const f = fixture();
      change(f);
      expect(() => verify(f)).toThrow(AccumulationAdmissionResultError);
    }
    const historical = fixture();
    historical.receipt.started.wallMs += 86400000;
    historical.receipt.spawned!.wallMs += 86400000;
    historical.receipt.finished.wallMs += 86400000;
    expect(verify(historical).actualClocks.finished.wallMs).toBe(historical.receipt.finished.wallMs);
  });
  it('requires one canonical ASCII output line without duplicate keys or coerced status', () => {
    for (const text of [' {}\n', '{}', '{}\n\n']) {
      const f = fixture();
      f.receipt.stdout = stream(Buffer.from(text));
      expect(() => verify(f)).toThrow(AccumulationAdmissionResultError);
    }
    const f = fixture();
    const text =
      canonical(f.output).replace('"status":"evaluated"', '"status":"evaluated","status":"evaluated"') + '\n';
    f.receipt.stdout = stream(Buffer.from(text));
    expect(() => verify(f)).toThrow(/duplicate-json-key/);
    for (const change of [
      { status: ['evaluated'] },
      { policyCalled: 'true' },
      { financialActions: 0 },
      { journalRevision: '2' },
      { extra: 1 },
    ]) {
      const f = fixture();
      Object.assign(f.output, change);
      output(f);
      expect(() => verify(f)).toThrow(AccumulationAdmissionResultError);
    }
  });
  it('preserves every original quote output, minimum, fee, impact, reason and evidence reference', () => {
    const edits = [
      (c: any) => {
        c.quote.quotedOutputXorCodec = '1';
      },
      (c: any) => {
        c.quote.minimumOutputXorCodec = '1';
      },
      (c: any) => {
        c.quote.networkFeeXorCodec = '0';
      },
      (c: any) => {
        c.quote.priceImpact = { numerator: '1', denominator: '100' };
      },
      (c: any) => {
        c.reason = 'new';
      },
      (c: any) => {
        c.evidenceSha256 = ['f'.repeat(64)];
      },
    ];
    for (const edit of edits) {
      const f = fixture();
      edit(f.output.candidateOutcomes[0]);
      output(f);
      expect(() => verify(f)).toThrow(/all-original-outcomes/);
    }
    const dropped = fixture();
    dropped.output.candidateOutcomes.pop();
    output(dropped);
    expect(() => verify(dropped)).toThrow(/all-original-outcomes/);
  });
  it('rejects changed original minima, contradictory impact and failed-as-verified requests', () => {
    const edits = [
      (f: ReturnType<typeof fixture>) => {
        f.request.packet.candidates[0].quote!.minimumOutputXorCodec = '1';
      },
      (f: ReturnType<typeof fixture>) => {
        f.request.packet.candidates[0].quote!.priceImpact = { numerator: '1', denominator: '50' };
      },
      (f: ReturnType<typeof fixture>) => {
        f.request.packet.candidates[1].status = 'failed';
      },
    ];
    for (const edit of edits) {
      const f = fixture();
      edit(f);
      repin(f);
      expect(() => verify(f)).toThrow(AccumulationAdmissionResultError);
    }
  });
  it('rejects missing/reordered/nonprimitive math candidates and selected unavailable outcomes', () => {
    const edits = [
      (d: any) => {
        d.candidates = [];
      },
      (d: any) => {
        d.candidates[0].input_kusd = 2;
      },
      (d: any) => {
        d.candidates[0].admitted = 'true';
      },
      (d: any) => {
        d.selected_input_kusd = 2;
      },
      (d: any) => {
        d.selected_input_kusd = '1';
      },
      (d: any) => {
        d.action = ['buy'];
      },
      (d: any) => {
        d.seed++;
      },
    ];
    for (const edit of edits) {
      const f = fixture();
      edit(f.output.decision);
      output(f);
      expect(() => verify(f)).toThrow(AccumulationAdmissionResultError);
    }
  });
  it('rejects fake immediate math, impossible path counts and unsupported/nonfinite forecast diagnostics', () => {
    const edits = [
      (c: any) => {
        c.post_entry_value_xor = { numerator: '99', denominator: '1' };
      },
      (c: any) => {
        c.failed_attempt_value_xor = null;
      },
      (c: any) => {
        c.passing_paths = 1025;
      },
      (c: any) => {
        c.ambiguous_paths = 1;
      },
      (c: any) => {
        c.expected_terminal_xor = 'NaN';
      },
      (c: any) => {
        c.expected_growth_xor = 'Infinity';
      },
      (c: any) => {
        c.expected_growth_xor = '-1';
      },
      (c: any) => {
        c.expected_terminal_xor = 11;
      },
      (c: any) => {
        c.expected_excess_xor = '1E+10000000';
      },
      (c: any) => {
        c.reasons = ['made_up'];
      },
    ];
    for (const edit of edits) {
      const f = fixture();
      edit(f.output.decision.candidates[0]);
      output(f);
      expect(() => verify(f)).toThrow(AccumulationAdmissionResultError);
    }
  });
  it('rejects input duplicate keys, accessor objects and bounds before parsing arbitrary diagnostics', () => {
    const f = fixture();
    f.inputBytes = Buffer.from(JSON.stringify(f.request).replace('"kind":', '"kind":"duplicate","kind":'));
    const digest = sha(f.inputBytes);
    f.trust.expectedInputSha256 = digest;
    f.receipt.input = { bytes: f.inputBytes.length, sha256: digest, writeCompleted: true };
    expect(() => verify(f)).toThrow(/duplicate-json-key/);
    const getter = vi.fn();
    const g = fixture();
    Object.defineProperty(g.receipt, 'outcome', { enumerable: true, get: getter });
    expect(() => verify(g)).toThrow(AccumulationAdmissionResultError);
    expect(getter).not.toHaveBeenCalled();
    const huge = fixture();
    huge.inputBytes = Buffer.alloc(256 * 1024 + 1);
    expect(() => verify(huge)).toThrow(/input-bytes/);
  });
});
