import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  auditAccumulationHourlyCoverage,
  type AccumulationHourlySchedule,
} from '../../../../scripts/bots/accumulation-hourly-coverage';
import {
  canonicalAccumulationJournalJson as canonical,
  type AccumulationJournalSnapshot,
} from '../../../../scripts/bots/accumulation-journal-store';

const HOUR = 3_600_000,
  START = 500 * HOUR;
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const schedule: AccumulationHourlySchedule = {
  kind: 'accumulation-hourly-research-schedule-v1',
  episodeId: 'invented',
  registrationSha256: 'a'.repeat(64),
  openingAtMs: START,
  controlOffsetMs: 0,
  decisionWindowMs: 30_000,
  capitalKusdCodec: '10000000000000000000',
  feeReserveXorCodec: '1000000000000000000',
};
type Event = { kind: string; input: Record<string, unknown>; status?: string };
const mark = (at: number) => ({
  blockHash: `0x${'1'.repeat(64)}`,
  blockNumber: 100,
  observedAtMs: at - 1000,
  receivedAtMs: at,
  price: { numerator: '2', denominator: '1' },
});
/** Invented structural records, deliberately not represented as valid accounting replay. */
function events(): Event[] {
  const rows: Event[] = [
    {
      kind: 'opening',
      input: {
        openingAtMs: START,
        capitalKusdCodec: schedule.capitalKusdCodec,
        feeReserveXorCodec: schedule.feeReserveXorCodec,
        price: { numerator: '2', denominator: '1' },
        mark: mark(START - 100),
      },
    },
  ];
  for (let slot = 0; slot < 24; slot++) {
    if (slot > 0)
      rows.push({ kind: 'valuation', input: { atMs: START + slot * HOUR, mark: mark(START + slot * HOUR) } });
    rows.push({
      kind: 'decision-slot',
      input: {
        slot,
        atMs: START + slot * HOUR + 100,
        status: 'unavailable',
        packetSha256: 'b'.repeat(64),
        reason: 'native-null',
      },
    });
  }
  rows.push({ kind: 'terminal', input: { mark: mark(START + 24 * HOUR + 100) } });
  return rows;
}
function snapshot(rows: Event[]): AccumulationJournalSnapshot {
  let previous: string | null = null;
  const lines = rows.map((event, i) => {
    const record = {
      kind: event.kind,
      episodeId: schedule.episodeId,
      registrationSha256: schedule.registrationSha256,
      sequence: i + 1,
      previousRecordSha256: previous,
      expectedReducerRevision: 0,
      input: event.input,
      evidence: [{ purpose: 'invented', artifactId: `fake-${i}`, sha256: 'c'.repeat(64) }],
      result: {
        status: event.status ?? (event.kind === 'decision-slot' ? 'recorded' : 'applied'),
        stateSha256: 'd'.repeat(64),
        reason: null,
        details: [],
      },
    };
    const line = `${canonical(record)}\n`;
    previous = sha(line);
    return line;
  });
  const journalJsonl = lines.join('');
  return {
    head: {
      kind: 'accumulation-journal-head-v1',
      episodeId: schedule.episodeId,
      registrationSha256: schedule.registrationSha256,
      recordCount: rows.length,
      headSha256: previous,
      prefixSha256: sha(journalJsonl),
    },
    journalJsonl,
    evidenceAuthentication: 'registered-bytes-only',
    financialActions: false,
    qualificationAuthority: false,
  };
}
const end = START + 24 * HOUR + 100;

describe('registered hourly observation coverage', () => {
  it('requires all 23 interior controls, 24 outcomes and terminal but grants no accounting/source authority', () => {
    const result = auditAccumulationHourlyCoverage(snapshot(events()), schedule, end);
    expect(result.structuralCoverageComplete).toBe(true);
    expect(result.requiredObservationsPassed).toBe(true);
    expect(result.observedInteriorControls).toHaveLength(23);
    expect(result.observedDecisionSlots).toHaveLength(24);
    expect(result.terminalPresent).toBe(true);
    expect(result).toMatchObject({
      nativeEvidenceVerified: false,
      selectionRuleVerified: false,
      reducerResultsVerified: false,
      continuousDrawdownVerified: false,
      qualificationAuthority: false,
      financialActions: false,
      scope: 'hourly-research-only',
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.observedDecisionSlots)).toBe(true);
  });
  it('reports missing unfavorable controls and hours even when the remaining chain is rehashed', () => {
    const rows = events().filter(
      (e) =>
        !(e.kind === 'valuation' && e.input.atMs === START + 7 * HOUR) &&
        !(e.kind === 'decision-slot' && e.input.slot === 11)
    );
    const result = auditAccumulationHourlyCoverage(snapshot(rows), schedule, end);
    expect(result.structuralCoverageComplete).toBe(false);
    expect(result.missing).toEqual([
      { kind: 'valuation', slot: 7, sequence: null, reason: 'scheduled-control-missing' },
      { kind: 'decision-slot', slot: 11, sequence: null, reason: 'decision-outcome-missing' },
    ]);
  });
  it('preserves a failed/rejected row as present but unacceptable rather than turning it into wait', () => {
    const rows = events();
    rows.find((e) => e.kind === 'decision-slot' && e.input.slot === 4)!.input.status = 'failed';
    rows.find((e) => e.kind === 'valuation' && e.input.atMs === START + 8 * HOUR)!.status = 'rejected';
    const result = auditAccumulationHourlyCoverage(snapshot(rows), schedule, end);
    expect(result.structuralCoverageComplete).toBe(true);
    expect(result.requiredObservationsPassed).toBe(false);
    expect(result.failures.map((e) => e.reason)).toEqual([
      'decision-failed',
      'reducer-rejected',
      'control-not-applied',
    ]);
    expect(result.missing).toEqual([]);
  });
  it('requires only the due causal prefix and can require the current decision before its deadline', () => {
    const opening = snapshot(events().slice(0, 1));
    expect(auditAccumulationHourlyCoverage(opening, schedule, START).requiredDecisionSlots).toEqual([]);
    const pending = auditAccumulationHourlyCoverage(opening, schedule, START + 100, 0);
    expect(pending.missing).toEqual([
      { kind: 'decision-slot', slot: 0, sequence: null, reason: 'decision-outcome-missing' },
    ]);
    const checked = auditAccumulationHourlyCoverage(snapshot(events().slice(0, 2)), schedule, START + 100, 0);
    expect(checked.requiredObservationsPassed).toBe(true);
    expect(checked.terminalRequired).toBe(false);
    expect(() => auditAccumulationHourlyCoverage(opening, schedule, START, 1)).toThrow('future-required-slot');
  });
  it('never substitutes near-hour marks, an expired decision, duplicate outcomes or future evidence', () => {
    const shifted = events();
    shifted.find((e) => e.kind === 'valuation')!.input.atMs = START + HOUR + 1;
    expect(auditAccumulationHourlyCoverage(snapshot(shifted), schedule, end).missing[0].slot).toBe(1);
    const late = events();
    late[1].input.atMs = START + schedule.decisionWindowMs;
    expect(() => auditAccumulationHourlyCoverage(snapshot(late), schedule, end)).toThrow('decision-time');
    const duplicate = events();
    duplicate.splice(2, 0, duplicate[1]);
    expect(() => auditAccumulationHourlyCoverage(snapshot(duplicate), schedule, end)).toThrow(
      'duplicate-or-invalid-decision'
    );
    expect(() => auditAccumulationHourlyCoverage(snapshot(events()), schedule, START + 100)).toThrow(
      'event-chronology'
    );
  });
  it('does not stop requiring later controls or terminal after a retained stop/admission failure', () => {
    const rows = events();
    rows.splice(2, 0, {
      kind: 'admission-failure',
      input: { atMs: START + 101, invocationId: 'one', inputSha256: 'e'.repeat(64), reason: 'timeout' },
      status: 'recorded',
    });
    const short = rows.filter(
      (e) => e.kind !== 'terminal' && !(e.kind === 'valuation' && e.input.atMs === START + 23 * HOUR)
    );
    const result = auditAccumulationHourlyCoverage(snapshot(short), schedule, end);
    expect(result.missing.map((e) => e.kind)).toEqual(['valuation', 'terminal']);
    expect(result.failures[0].reason).toBe('admission-incomplete');
  });
  it('rejects altered original funding, cutoff, malformed status, stale head and noncanonical/duplicate JSON', () => {
    const funding = events();
    funding[0].input.feeReserveXorCodec = '2000000000000000000';
    expect(() => auditAccumulationHourlyCoverage(snapshot(funding), schedule, end)).toThrow('opening-funding');
    expect(() =>
      auditAccumulationHourlyCoverage(snapshot(events()), { ...schedule, controlOffsetMs: 60_000 }, end)
    ).toThrow('control-offset');
    expect(() => auditAccumulationHourlyCoverage(snapshot(events()), schedule, START - 1)).toThrow(
      'cutoff-before-opening'
    );
    const stale = snapshot(events());
    stale.head.headSha256 = '0'.repeat(64);
    expect(() => auditAccumulationHourlyCoverage(stale, schedule, end)).toThrow('head-digest');
    const changed = snapshot(events());
    changed.journalJsonl = changed.journalJsonl.replace('"kind":"opening"', '"kind":"opening","kind":"opening"');
    changed.head.prefixSha256 = sha(changed.journalJsonl);
    expect(() => auditAccumulationHourlyCoverage(changed, schedule, end)).toThrow('canonical-record');
    const bad = events();
    bad[1].input.status = ['unavailable'];
    expect(() => auditAccumulationHourlyCoverage(snapshot(bad), schedule, end)).toThrow('decision-status');
  });
  it('rejects reordered records, prematurely placed terminal and repeated scheduled controls after rehashing', () => {
    const reversed = events();
    [reversed[2], reversed[3]] = [reversed[3], reversed[2]];
    expect(() => auditAccumulationHourlyCoverage(snapshot(reversed), schedule, end)).toThrow('event-chronology');
    const premature = events();
    premature.splice(1, 0, premature.pop()!);
    expect(() => auditAccumulationHourlyCoverage(snapshot(premature), schedule, end)).toThrow('nonfinal-terminal');
    const duplicate = events();
    duplicate.splice(3, 0, duplicate[2]);
    expect(() => auditAccumulationHourlyCoverage(snapshot(duplicate), schedule, end)).toThrow(
      'duplicate-scheduled-control'
    );
    const retrospective = events();
    retrospective.splice(retrospective.length - 1, 0, { kind: 'settlement', input: { receivedAtMs: end + 100 } });
    expect(
      auditAccumulationHourlyCoverage(snapshot(retrospective), schedule, end + 100).structuralCoverageComplete
    ).toBe(true);
  });
  it('does not invoke snapshot accessors', () => {
    let called = false;
    const data = snapshot(events());
    Object.defineProperty(data, 'journalJsonl', {
      get: () => {
        called = true;
        throw new Error('getter');
      },
    });
    expect(() => auditAccumulationHourlyCoverage(data, schedule, end)).toThrow('snapshot-data');
    expect(called).toBe(false);
  });
});
