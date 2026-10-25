/** Structural coverage of a registered hourly research episode.
 * This neither authenticates marks nor replaces complete accounting replay.
 * Hourly observations do not establish continuous or live drawdown protection.
 */
import { createHash } from 'node:crypto';
import {
  canonicalAccumulationJournalJson as canonical,
  type AccumulationJournalSnapshot,
} from './accumulation-journal-store';

const HOUR = 3_600_000;
const SHA = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9_-]{1,96}$/;
type Data = Record<string, unknown>;

/** Supplied by the independently retained registration, before observing outcomes. */
export interface AccumulationHourlySchedule {
  kind: 'accumulation-hourly-research-schedule-v1';
  episodeId: string;
  registrationSha256: string;
  openingAtMs: number;
  /** Same offset at all 23 interior hourly controls; never selected from prices. */
  controlOffsetMs: number;
  /** Outcome must be recorded in [hour, hour + window); no later favorable replacement. */
  decisionWindowMs: number;
  capitalKusdCodec: string;
  feeReserveXorCodec: string;
}

export interface AccumulationCoverageIssue {
  kind: string;
  slot: number | null;
  sequence: number | null;
  reason: string;
}

export interface AccumulationHourlyCoverage {
  kind: 'accumulation-hourly-coverage-v1';
  scope: 'hourly-research-only';
  episodeId: string;
  registrationSha256: string;
  prefixSha256: string;
  throughAtMs: number;
  deadlineMs: number;
  /** Presence is distinct from failures: a retained failed observation is not omitted. */
  structuralCoverageComplete: boolean;
  requiredObservationsPassed: boolean;
  requiredDecisionSlots: number[];
  observedDecisionSlots: number[];
  requiredInteriorControls: number[];
  observedInteriorControls: number[];
  terminalRequired: boolean;
  terminalPresent: boolean;
  missing: AccumulationCoverageIssue[];
  failures: AccumulationCoverageIssue[];
  nativeEvidenceVerified: false;
  selectionRuleVerified: false;
  reducerResultsVerified: false;
  continuousDrawdownVerified: false;
  qualificationAuthority: false;
  financialActions: false;
}

function check(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(`accumulation-coverage:${reason}`);
}
function digest(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
function object(value: unknown): Data {
  check(value && typeof value === 'object' && !Array.isArray(value), 'object');
  return value as Data;
}
function keys(value: unknown, expected: string[]): Data {
  const row = object(value);
  check(Object.keys(row).length === expected.length && expected.every((k) => Object.hasOwn(row, k)), 'fields');
  return row;
}
function time(value: unknown): number {
  check(typeof value === 'number' && Number.isSafeInteger(value) && value >= 0, 'time');
  return value;
}
function hash(value: unknown): string {
  check(typeof value === 'string' && SHA.test(value), 'sha256');
  return value;
}
function amount(value: unknown, maximum: bigint): void {
  check(typeof value === 'string' && /^[1-9]\d{0,38}$/.test(value), 'amount');
  check(BigInt(value) <= maximum, 'funding-limit');
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/**
 * Check every due slot against the exact retained journal prefix. At a decision
 * before its window closes, requiredDecisionSlot explicitly requires that current
 * slot too. Missing/failed rows are reported, never removed or promoted to wait.
 * The independently owned session must also replay accounting and verify every
 * mark and acquisition/selection rule before any admission capability is granted.
 */
export function auditAccumulationHourlyCoverage(
  snapshot: AccumulationJournalSnapshot,
  trustedSchedule: AccumulationHourlySchedule,
  throughAtMs: number,
  requiredDecisionSlot: number | null = null
): AccumulationHourlyCoverage {
  const schedule = keys(JSON.parse(canonical(trustedSchedule)), [
    'kind',
    'episodeId',
    'registrationSha256',
    'openingAtMs',
    'controlOffsetMs',
    'decisionWindowMs',
    'capitalKusdCodec',
    'feeReserveXorCodec',
  ]) as unknown as AccumulationHourlySchedule;
  check(schedule.kind === 'accumulation-hourly-research-schedule-v1', 'schedule-kind');
  check(typeof schedule.episodeId === 'string' && ID.test(schedule.episodeId), 'episode');
  hash(schedule.registrationSha256);
  const start = time(schedule.openingAtMs),
    end = start + 24 * HOUR;
  check(start % HOUR === 0 && Number.isSafeInteger(end), 'opening-or-deadline');
  check(time(schedule.controlOffsetMs) < 60_000, 'control-offset');
  check(time(schedule.decisionWindowMs) > 0 && schedule.decisionWindowMs <= 60_000, 'decision-window');
  amount(schedule.capitalKusdCodec, 10n * 10n ** 18n);
  amount(schedule.feeReserveXorCodec, 10n ** 18n);
  check(time(throughAtMs) >= start, 'cutoff-before-opening');
  if (requiredDecisionSlot !== null) {
    check(time(requiredDecisionSlot) < 24, 'required-slot');
    check(start + requiredDecisionSlot * HOUR <= throughAtMs, 'future-required-slot');
  }
  // Snapshot only supported own data fields; do not invoke arbitrary accessors.
  const descriptors = Object.getOwnPropertyDescriptors(snapshot);
  for (const key of ['head', 'journalJsonl']) check(descriptors[key] && 'value' in descriptors[key], 'snapshot-data');
  const head = keys(JSON.parse(canonical(descriptors.head.value)), [
    'kind',
    'episodeId',
    'registrationSha256',
    'recordCount',
    'headSha256',
    'prefixSha256',
  ]);
  check(
    head.kind === 'accumulation-journal-head-v1' &&
      head.episodeId === schedule.episodeId &&
      head.registrationSha256 === schedule.registrationSha256,
    'head-registration'
  );
  const jsonl = descriptors.journalJsonl.value;
  check(
    typeof jsonl === 'string' && /^[\x00-\x7f]*$/.test(jsonl) && Buffer.byteLength(jsonl) <= 1024 * 1024,
    'journal-bound'
  );
  check(jsonl.endsWith('\n') && digest(jsonl) === hash(head.prefixSha256), 'prefix');
  const lines = jsonl.slice(0, -1).split('\n');
  check(lines.length > 0 && lines.length <= 512 && lines.length === time(head.recordCount), 'record-count');

  const missing: AccumulationCoverageIssue[] = [],
    failures: AccumulationCoverageIssue[] = [];
  const decisions = new Map<number, number>(),
    controls = new Map<number, number>();
  const requiredInteriorControls = Array.from({ length: 23 }, (_, i) => i + 1).filter(
    (slot) => start + slot * HOUR + schedule.controlOffsetMs <= throughAtMs
  );
  const requiredDecisionSlots = Array.from({ length: 24 }, (_, slot) => slot).filter(
    (slot) => start + slot * HOUR + schedule.decisionWindowMs <= throughAtMs || slot === requiredDecisionSlot
  );
  let previous: string | null = null,
    terminalPresent = false,
    lastEventAt = start;
  const failure = (kind: string, sequence: number, reason: string, slot: number | null = null) =>
    failures.push({ kind, slot, sequence, reason });
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i],
      record = keys(JSON.parse(line), [
        'kind',
        'episodeId',
        'registrationSha256',
        'sequence',
        'previousRecordSha256',
        'expectedReducerRevision',
        'input',
        'evidence',
        'result',
      ]);
    check(canonical(record) === line, 'canonical-record');
    check(
      record.episodeId === schedule.episodeId &&
        record.registrationSha256 === schedule.registrationSha256 &&
        record.sequence === i + 1 &&
        record.previousRecordSha256 === previous,
      'record-chain'
    );
    time(record.expectedReducerRevision);
    previous = digest(`${line}\n`);
    const kind = record.kind,
      input = object(record.input),
      result = keys(record.result, ['status', 'stateSha256', 'reason', 'details']);
    check(typeof kind === 'string' && ID.test(kind), 'record-kind');
    check(
      typeof result.status === 'string' && ['applied', 'recorded', 'rejected'].includes(result.status),
      'result-status'
    );
    hash(result.stateSha256);
    check(i === 0 ? kind === 'opening' : kind !== 'opening', 'sole-opening');
    // Terminal evidence may have arrived before a later-accounted settlement.
    // Its application time advances to the existing event clock, never backwards.
    const eventAt =
      kind === 'opening'
        ? time(input.openingAtMs)
        : kind === 'terminal'
          ? Math.max(lastEventAt, end, time(object(input.mark).receivedAtMs))
          : kind === 'order-frozen'
            ? time(object(input.order).decisionAtMs)
            : kind === 'settlement'
              ? time(input.receivedAtMs)
              : time(input.atMs);
    check(eventAt >= lastEventAt && eventAt <= throughAtMs, 'event-chronology');
    lastEventAt = eventAt;
    if (result.status === 'rejected') failure(kind, i + 1, 'reducer-rejected');
    if (kind === 'opening') {
      check(
        input.openingAtMs === start &&
          input.capitalKusdCodec === schedule.capitalKusdCodec &&
          input.feeReserveXorCodec === schedule.feeReserveXorCodec,
        'opening-funding'
      );
      if (result.status !== 'applied') failure(kind, i + 1, 'opening-not-applied');
    } else if (kind === 'valuation') {
      const at = time(input.atMs);
      check(at >= start && at < end && at <= throughAtMs, 'valuation-time');
      const slot = (at - start - schedule.controlOffsetMs) / HOUR;
      if (Number.isInteger(slot) && slot >= 1 && slot < 24) {
        check(!controls.has(slot), 'duplicate-scheduled-control');
        controls.set(slot, i + 1);
        if (result.status !== 'applied') failure(kind, i + 1, 'control-not-applied', slot);
      }
    } else if (kind === 'decision-slot') {
      const slot = time(input.slot),
        at = time(input.atMs);
      check(slot < 24 && !decisions.has(slot), 'duplicate-or-invalid-decision');
      check(
        at >= start + slot * HOUR && at < start + slot * HOUR + schedule.decisionWindowMs && at <= throughAtMs,
        'decision-time'
      );
      check(
        typeof input.status === 'string' &&
          ['ready', 'unavailable', 'failed', 'expired', 'skipped'].includes(input.status),
        'decision-status'
      );
      decisions.set(slot, i + 1);
      if (result.status !== 'recorded') failure(kind, i + 1, 'decision-not-recorded', slot);
      if (input.status === 'failed') failure(kind, i + 1, 'decision-failed', slot);
    } else if (kind === 'terminal') {
      check(!terminalPresent && throughAtMs >= end && i === lines.length - 1, 'duplicate-early-or-nonfinal-terminal');
      const mark = object(input.mark),
        receivedAt = time(mark.receivedAtMs);
      check(time(mark.observedAtMs) < end && receivedAt >= end && receivedAt <= throughAtMs, 'terminal-clock');
      terminalPresent = true;
      if (result.status !== 'applied') failure(kind, i + 1, 'terminal-not-applied');
    } else {
      check(
        [
          'admission-start',
          'admission-result',
          'admission-failure',
          'order-frozen',
          'order-cancelled',
          'attempt-committed',
          'settlement',
        ].includes(kind),
        'unknown-record-kind'
      );
      const at =
        kind === 'order-frozen'
          ? time(object(input.order).decisionAtMs)
          : kind === 'settlement'
            ? time(input.receivedAtMs)
            : time(input.atMs);
      check(at >= start && at <= throughAtMs, 'event-after-cutoff');
      if (kind === 'admission-failure' || (kind === 'admission-result' && input.status === 'incomplete'))
        failure(kind, i + 1, 'admission-incomplete');
    }
  }
  check(previous === hash(head.headSha256), 'head-digest');
  for (const slot of requiredInteriorControls)
    if (!controls.has(slot))
      missing.push({ kind: 'valuation', slot, sequence: null, reason: 'scheduled-control-missing' });
  for (const slot of requiredDecisionSlots)
    if (!decisions.has(slot))
      missing.push({ kind: 'decision-slot', slot, sequence: null, reason: 'decision-outcome-missing' });
  const terminalRequired = throughAtMs >= end;
  if (terminalRequired && !terminalPresent)
    missing.push({ kind: 'terminal', slot: null, sequence: null, reason: 'terminal-missing' });
  return freeze({
    kind: 'accumulation-hourly-coverage-v1',
    scope: 'hourly-research-only',
    episodeId: schedule.episodeId,
    registrationSha256: schedule.registrationSha256,
    prefixSha256: head.prefixSha256 as string,
    throughAtMs,
    deadlineMs: end,
    structuralCoverageComplete: missing.length === 0,
    requiredObservationsPassed: missing.length === 0 && failures.length === 0,
    requiredDecisionSlots,
    observedDecisionSlots: [...decisions.keys()].sort((a, b) => a - b),
    requiredInteriorControls,
    observedInteriorControls: [...controls.keys()].sort((a, b) => a - b),
    terminalRequired,
    terminalPresent,
    missing,
    failures,
    nativeEvidenceVerified: false,
    selectionRuleVerified: false,
    reducerResultsVerified: false,
    continuousDrawdownVerified: false,
    qualificationAuthority: false,
    financialActions: false,
  });
}
