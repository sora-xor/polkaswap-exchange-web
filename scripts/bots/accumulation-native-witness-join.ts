/** Pure consistency joins between retained journal records and same-process native verifier results.
 * No acquisition/retention authentication, reducer replay, model call or admission authority.
 */
import { createHash } from 'node:crypto';
import {
  canonicalAccumulationJournalJson as canonical,
  type AccumulationEvidenceReference,
  type AccumulationJournalSnapshot,
} from './accumulation-journal-store';
import {
  auditAccumulationHourlyCoverage,
  type AccumulationHourlySchedule,
  type AccumulationHourlyCoverage,
} from './accumulation-hourly-coverage';
import {
  accumulationNativeMarkDigest,
  isVerifiedAccumulationNativeMark,
  type AccumulationNativeMarkResult,
  type AccumulationReplayMark,
} from './accumulation-native-mark';
import { isVerifiedAccumulationDecisionPacket, type AccumulationBridgeResult } from './accumulation-evidence-bridge';

const PURPOSE = 'native-mark-witness';
const SHA = /^[a-f0-9]{64}$/,
  ID = /^[A-Za-z0-9_-]{1,96}$/;
const owned = new WeakSet<object>();
type Data = Record<string, unknown>;
export interface AccumulationJournalNativeWitness {
  sequence: number;
  native: AccumulationNativeMarkResult;
  evidence: AccumulationEvidenceReference;
}
export interface JoinedAccumulationJournalNativeWitnesses {
  kind: 'accumulation-journal-native-witness-join-v1';
  episodeId: string;
  registrationSha256: string;
  prefixSha256: string;
  recordCount: number;
  throughAtMs: number;
  joined: {
    sequence: number;
    event: 'opening' | 'valuation' | 'terminal';
    claimedResultStatus: string;
    mark: AccumulationReplayMark;
    slotId: string;
    registeredSlotSha256: string;
    sourceRegistrationSha256: string;
    rawSha256: string;
    manifestSha256: string;
    evidence: AccumulationEvidenceReference;
  }[];
  coverage: AccumulationHourlyCoverage;
  /** This comparison is not a current-state projection. The parent must separately call real session.inspect(bridge). */
  bridgeComparison: null | {
    witnessSequence: number;
    packetSha256: string;
    sourceRegistrationSha256: string;
    fullMarkMatches: true;
  };
  sourceAcquisitionVerified: false;
  rawArtifactRetentionVerified: false;
  selectionRuleVerified: false;
  reducerResultsVerified: false;
  profitabilityVerified: false;
  admissionAuthority: false;
  qualificationAuthority: false;
  financialActions: false;
}
export class AccumulationNativeWitnessJoinError extends Error {
  constructor(readonly reason: string) {
    super(`accumulation-native-witness-join:${reason}`);
  }
}
function check(value: unknown, reason: string): asserts value {
  if (!value) throw new AccumulationNativeWitnessJoinError(reason);
}
function hash(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}
function data(value: unknown, keys: string): Data {
  check(value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype, 'plain-object');
  const descriptors = Object.getOwnPropertyDescriptors(value),
    expected = keys.split(' '),
    actual = Reflect.ownKeys(descriptors);
  check(
    actual.length === expected.length &&
      expected.every((key) => descriptors[key]?.enumerable && 'value' in descriptors[key]),
    'own-data-fields'
  );
  return Object.fromEntries(expected.map((key) => [key, descriptors[key].value]));
}
function copy<T>(value: T): T {
  return JSON.parse(canonical(value));
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function equal(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}
function integer(value: unknown, min = 0): number {
  check(typeof value === 'number' && Number.isSafeInteger(value) && value >= min, 'integer');
  return value;
}
function reference(value: unknown): AccumulationEvidenceReference {
  const r = data(value, 'purpose artifactId sha256');
  check(
    typeof r.purpose === 'string' &&
      ID.test(r.purpose) &&
      typeof r.artifactId === 'string' &&
      ID.test(r.artifactId) &&
      typeof r.sha256 === 'string' &&
      SHA.test(r.sha256),
    'evidence-reference'
  );
  return r as unknown as AccumulationEvidenceReference;
}
/** Small deterministic binding manifest; its presence does not prove raw artifact retention or acquisition. */
export function accumulationNativeWitnessManifestBytes(native: AccumulationNativeMarkResult): Uint8Array {
  check(isVerifiedAccumulationNativeMark(native), 'native-ownership-required');
  return Buffer.from(
    canonical({
      kind: 'accumulation-native-mark-witness-v1',
      rawSha256: native.source.rawSha256,
      sourceSha256: accumulationNativeMarkDigest(native.source),
      sourceRegistrationSha256: native.source.sourceRegistrationSha256,
      registeredSlotSha256: native.registeredSlotSha256,
      registeredSlot: native.registeredSlot,
      mark: native.mark,
      denominator: native.source.denominator,
      runtime: native.source.runtime,
      boundary: native.boundary,
      timingMode: native.timingMode,
    }) + '\n'
  );
}
/** Ownership establishes this exact consistency check, not source or reducer authority. */
export function isJoinedAccumulationJournalNativeWitnesses(
  value: unknown
): value is JoinedAccumulationJournalNativeWitnesses {
  return !!value && typeof value === 'object' && owned.has(value);
}
/** Join every retained mark record to one owned witness; omitted schedule records remain visible in coverage. */
export function joinAccumulationJournalNativeWitnesses(
  snapshot: AccumulationJournalSnapshot,
  trustedSchedule: AccumulationHourlySchedule,
  throughAtMs: number,
  witnesses: AccumulationJournalNativeWitness[],
  currentBridge: AccumulationBridgeResult | null = null
): JoinedAccumulationJournalNativeWitnesses {
  try {
    const rawSnapshot = data(
      snapshot,
      'head journalJsonl evidenceAuthentication financialActions qualificationAuthority'
    );
    check(
      rawSnapshot.evidenceAuthentication === 'registered-bytes-only' &&
        rawSnapshot.financialActions === false &&
        rawSnapshot.qualificationAuthority === false,
      'snapshot-claims'
    );
    const ownSnapshot = { ...rawSnapshot, head: copy(rawSnapshot.head) } as unknown as AccumulationJournalSnapshot;
    const schedule = copy(trustedSchedule),
      cutoff = integer(throughAtMs);
    // Reuse its bounded canonical JSONL/hash-chain and chronology checks, without promoting coverage to replay authority.
    const coverage = auditAccumulationHourlyCoverage(ownSnapshot, schedule, cutoff);
    check(
      Array.isArray(witnesses) && Object.getPrototypeOf(witnesses) === Array.prototype && witnesses.length <= 512,
      'witness-bound'
    );
    const descriptors = Object.getOwnPropertyDescriptors(witnesses);
    check(Reflect.ownKeys(descriptors).length === witnesses.length + 1, 'witness-array');
    const bySequence = new Map<number, AccumulationJournalNativeWitness>();
    const slots = new Set<string>(),
      artifactIds = new Set<string>();
    for (let i = 0; i < witnesses.length; i++) {
      check(descriptors[i]?.enumerable && 'value' in descriptors[i], 'witness-accessor');
      const w = data(descriptors[i].value, 'sequence native evidence'),
        sequence = integer(w.sequence, 1);
      check(!bySequence.has(sequence) && isVerifiedAccumulationNativeMark(w.native), 'witness-ownership-or-sequence');
      const native = w.native,
        evidence = reference(w.evidence);
      check(
        evidence.purpose === PURPOSE && evidence.sha256 === hash(accumulationNativeWitnessManifestBytes(native)),
        'manifest-reference'
      );
      check(
        !artifactIds.has(evidence.artifactId) && !slots.has(native.registeredSlot.slotId),
        'duplicate-artifact-or-slot'
      );
      slots.add(native.registeredSlot.slotId);
      artifactIds.add(evidence.artifactId);
      bySequence.set(sequence, { sequence, native, evidence });
    }
    const records = ownSnapshot.journalJsonl
      .slice(0, -1)
      .split('\n')
      .map((line) => JSON.parse(line) as Data);
    const joined: JoinedAccumulationJournalNativeWitnesses['joined'] = [];
    let lastMark: AccumulationJournalNativeWitness | null = null,
      lastEventAt = schedule.openingAtMs,
      bridgeComparable = true;
    for (const record of records) {
      const sequence = record.sequence as number,
        kind = record.kind as string,
        input = record.input as Data,
        result = record.result as Data;
      check(
        Array.isArray(record.evidence) && record.evidence.length >= 1 && record.evidence.length <= 16,
        'record-evidence-count'
      );
      const refs = record.evidence.map(reference),
        ids = new Set(refs.map((ref) => ref.artifactId));
      check(ids.size === refs.length, 'duplicate-record-evidence');
      if (!['opening', 'valuation', 'terminal'].includes(kind)) {
        check(!bySequence.has(sequence), 'witness-on-nonmark');
        if (!['decision-slot', 'admission-start', 'admission-result', 'admission-failure'].includes(kind))
          bridgeComparable = false;
        else lastEventAt = integer(input.atMs);
        if (result.status !== 'recorded') bridgeComparable = false;
        continue;
      }
      const w = bySequence.get(sequence);
      check(w, 'missing-native-witness');
      bySequence.delete(sequence);
      const n = w.native,
        s = n.registeredSlot;
      const role = kind === 'opening' ? 'opening' : kind === 'terminal' ? 'terminal' : 'risk';
      const markInput =
        kind === 'opening'
          ? data(input, 'openingAtMs capitalKusdCodec feeReserveXorCodec price mark')
          : kind === 'valuation'
            ? data(input, 'atMs mark')
            : data(input, 'mark');
      const control =
        kind === 'opening'
          ? schedule.openingAtMs
          : kind === 'terminal'
            ? schedule.openingAtMs + 24 * 3600000
            : integer(markInput.atMs);
      check(
        s.episodeId === schedule.episodeId &&
          s.role === role &&
          s.openingAtMs === schedule.openingAtMs &&
          s.deadlineMs === schedule.openingAtMs + 24 * 3600000 &&
          s.controlAtMs === control,
        'registered-slot-join'
      );
      check(equal(markInput.mark, n.mark), 'full-mark-join');
      if (kind === 'opening') check(equal(markInput.price, n.mark.price), 'opening-price-join');
      check(
        refs.some((ref) => equal(ref, w.evidence)),
        'record-witness-reference'
      );
      check(Math.max(n.mark.receivedAtMs, n.boundary?.confirmedAtMs ?? 0) <= cutoff, 'witness-not-yet-available');
      joined.push({
        sequence,
        event: kind as 'opening' | 'valuation' | 'terminal',
        claimedResultStatus: result.status as string,
        mark: copy(n.mark),
        slotId: s.slotId,
        registeredSlotSha256: n.registeredSlotSha256,
        sourceRegistrationSha256: n.source.sourceRegistrationSha256,
        rawSha256: n.source.rawSha256,
        manifestSha256: w.evidence.sha256,
        evidence: copy(w.evidence),
      });
      lastMark = w;
      lastEventAt = kind === 'terminal' ? Math.max(lastEventAt, control, n.mark.receivedAtMs) : control;
      if (result.status !== 'applied' || kind === 'terminal') bridgeComparable = false;
    }
    check(bySequence.size === 0, 'unused-native-witness');
    let bridgeComparison: JoinedAccumulationJournalNativeWitnesses['bridgeComparison'] = null;
    if (currentBridge !== null) {
      check(isVerifiedAccumulationDecisionPacket(currentBridge), 'bridge-ownership-required');
      check(bridgeComparable && lastMark, 'bridge-prefix-not-comparable');
      const p = currentBridge.packet,
        n = lastMark.native;
      const bridgeMark = {
        blockHash: p.block.hash,
        blockNumber: p.block.height,
        observedAtMs: p.block.timestampMs,
        receivedAtMs: p.contextReceivedAtMs,
        price: p.currentPrice,
      };
      check(equal(bridgeMark, n.mark) && p.denominator === n.source.denominator, 'bridge-full-mark-join');
      check(p.decisionAtMs >= lastEventAt && p.decisionAtMs <= cutoff, 'bridge-chronology');
      bridgeComparison = {
        witnessSequence: lastMark.sequence,
        packetSha256: p.packetSha256,
        sourceRegistrationSha256: currentBridge.sourceRegistrationSha256,
        fullMarkMatches: true,
      };
    }
    const output: JoinedAccumulationJournalNativeWitnesses = freeze({
      kind: 'accumulation-journal-native-witness-join-v1',
      episodeId: schedule.episodeId,
      registrationSha256: schedule.registrationSha256,
      prefixSha256: ownSnapshot.head.prefixSha256,
      recordCount: ownSnapshot.head.recordCount,
      throughAtMs: cutoff,
      joined,
      coverage,
      bridgeComparison,
      sourceAcquisitionVerified: false,
      rawArtifactRetentionVerified: false,
      selectionRuleVerified: false,
      reducerResultsVerified: false,
      profitabilityVerified: false,
      admissionAuthority: false,
      qualificationAuthority: false,
      financialActions: false,
    });
    owned.add(output);
    return output;
  } catch (error) {
    if (error instanceof AccumulationNativeWitnessJoinError) throw error;
    throw new AccumulationNativeWitnessJoinError('invalid-journal-native-consistency');
  }
}
