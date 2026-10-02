// @vitest-environment node
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  accumulationNativeWitnessManifestBytes,
  joinAccumulationJournalNativeWitnesses,
  isJoinedAccumulationJournalNativeWitnesses,
  AccumulationNativeWitnessJoinError,
  type AccumulationJournalNativeWitness,
} from '../../../../scripts/bots/accumulation-native-witness-join';
import {
  canonicalAccumulationJournalJson as canonical,
  type AccumulationJournalSnapshot,
} from '../../../../scripts/bots/accumulation-journal-store';
import type { AccumulationHourlySchedule } from '../../../../scripts/bots/accumulation-hourly-coverage';
import { verifyAccumulationNativeMark } from '../../../../scripts/bots/accumulation-native-mark';
import {
  verifyAccumulationDecisionPacket,
  accumulationEvidenceDigest,
} from '../../../../scripts/bots/accumulation-evidence-bridge';
import {
  createAccumulationNativeMarkFixture,
  repinNativeMarkFixture,
} from './fixtures/accumulation-native-mark-fixture';
import { createAccumulationJournalBridgeFixture } from './fixtures/accumulation-journal-bridge-fixture';
import { hex, le } from './fixtures/historical-goal-bound-fee-fixture';

const HOUR = 3600000,
  START = 1785265200000;
const sha = (v: string | Uint8Array) => createHash('sha256').update(v).digest('hex');
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
type Row = Record<string, any>;
const schedule: AccumulationHourlySchedule = {
  kind: 'accumulation-hourly-research-schedule-v1',
  episodeId: 'invented-join',
  registrationSha256: 'a'.repeat(64),
  openingAtMs: START,
  controlOffsetMs: 0,
  decisionWindowMs: 30000,
  capitalKusdCodec: '10000000000000000000',
  feeReserveXorCodec: '1000000000000000000',
};
function native(role: 'opening' | 'risk' | 'terminal', control: number, height: number) {
  const f = createAccumulationNativeMarkFixture(role, 'historical-modeled', {
    openingAtMs: START,
    controlAtMs: control,
    targetHeight: height,
  });
  f.slot.episodeId = schedule.episodeId;
  f.slot.slotId = `slot-${height}`;
  return verifyAccumulationNativeMark(f.raw, f.trusted, f.slot);
}
function witness(sequence: number, n: ReturnType<typeof native>): AccumulationJournalNativeWitness {
  return {
    sequence,
    native: n,
    evidence: {
      purpose: 'native-mark-witness',
      artifactId: `mark-${sequence}`,
      sha256: sha(accumulationNativeWitnessManifestBytes(n)),
    },
  };
}
function record(w: AccumulationJournalNativeWitness, kind: string): Row {
  const n = w.native;
  const input =
    kind === 'opening'
      ? {
          openingAtMs: START,
          capitalKusdCodec: schedule.capitalKusdCodec,
          feeReserveXorCodec: schedule.feeReserveXorCodec,
          price: n.mark.price,
          mark: n.mark,
        }
      : kind === 'terminal'
        ? { mark: n.mark }
        : { atMs: n.registeredSlot.controlAtMs, mark: n.mark };
  return {
    kind,
    input,
    evidence: [clone(w.evidence)],
    result: { status: 'applied', stateSha256: 'b'.repeat(64), reason: null, details: [] },
  };
}
/** Only structural journal claims; no accounting replay or acquisition is asserted by this fixture. */
function snapshot(rows: Row[]): AccumulationJournalSnapshot {
  let previous: string | null = null;
  const lines = rows.map((row, i) => {
    const r = {
      ...row,
      episodeId: schedule.episodeId,
      registrationSha256: schedule.registrationSha256,
      sequence: i + 1,
      previousRecordSha256: previous,
      expectedReducerRevision: 0,
    };
    const line = canonical(r) + '\n';
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
function fixture(terminal = true) {
  const witnesses = [witness(1, native('opening', START, 90)), witness(2, native('risk', START + HOUR, 100))];
  if (terminal) witnesses.push(witness(3, native('terminal', START + 24 * HOUR, 200)));
  const rows = witnesses.map((w, i) => record(w, i === 0 ? 'opening' : i === 2 ? 'terminal' : 'valuation'));
  return { witnesses, rows, throughAtMs: START + (terminal ? 24 : 1) * HOUR + 1000 };
}
function run(f = fixture()) {
  return joinAccumulationJournalNativeWitnesses(snapshot(f.rows), schedule, f.throughAtMs, f.witnesses);
}
function withBridge() {
  const H = START + HOUR,
    bridgeFixture = createAccumulationJournalBridgeFixture(H, '1');
  const n = createAccumulationNativeMarkFixture('risk', 'historical-modeled', {
    openingAtMs: START,
    controlAtMs: H + 2500,
    targetHeight: 100,
    nativeAtMs: H + 1000,
  });
  n.slot.episodeId = schedule.episodeId;
  n.slot.slotId = 'bridge-context';
  n.slot.timing.contextReceivedAtMs = H + 2100;
  const receipt = n.raw.contextRpc.at(-1)!;
  const body = JSON.parse(receipt.responseBody!);
  body.result[0].changes.find((c: string[]) => c[0] === n.keys.reserves)[1] = hex(
    Buffer.concat([le(1000n * 10n ** 18n), le(1000n * 10n ** 18n)])
  );
  receipt.responseBody = JSON.stringify(body);
  receipt.responseSha256 = sha(receipt.responseBody);
  repinNativeMarkFixture(n);
  const witnesses = [
    witness(1, native('opening', START, 90)),
    witness(2, verifyAccumulationNativeMark(n.raw, n.trusted, n.slot)),
  ];
  const rows = [record(witnesses[0], 'opening'), record(witnesses[1], 'valuation')];
  return {
    witnesses,
    rows,
    throughAtMs: H + 3000,
    bridgeFixture,
    bridge: verifyAccumulationDecisionPacket(bridgeFixture.packet, bridgeFixture.trusted),
  };
}
afterEach(() => vi.unstubAllGlobals());

describe('pure journal/native witness consistency', () => {
  it('joins all retained opening/valuation/terminal records without claiming missing coverage or acquisition', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw Error('network forbidden');
      })
    );
    const f = fixture(),
      result = run(f);
    expect(isJoinedAccumulationJournalNativeWitnesses(result)).toBe(true);
    expect(result.joined.map((j) => j.event)).toEqual(['opening', 'valuation', 'terminal']);
    expect(result.coverage.structuralCoverageComplete).toBe(false);
    expect(result).toMatchObject({
      sourceAcquisitionVerified: false,
      rawArtifactRetentionVerified: false,
      selectionRuleVerified: false,
      reducerResultsVerified: false,
      profitabilityVerified: false,
      admissionAuthority: false,
      qualificationAuthority: false,
      financialActions: false,
    });
    expect(result.coverage.missing.length).toBeGreaterThan(0);
    expect(Object.isFrozen(result.joined[0].mark.price)).toBe(true);
    expect(isJoinedAccumulationJournalNativeWitnesses(clone(result))).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it('creates deterministic small manifests binding original raw/source/slot and full mark', () => {
    const n = native('opening', START, 90),
      bytes = accumulationNativeWitnessManifestBytes(n),
      manifest = JSON.parse(Buffer.from(bytes).toString());
    expect(bytes.byteLength).toBeLessThan(5000);
    expect(Buffer.from(bytes).toString()).toBe(canonical(manifest) + '\n');
    expect(manifest).toMatchObject({
      rawSha256: n.source.rawSha256,
      registeredSlotSha256: n.registeredSlotSha256,
      registeredSlot: n.registeredSlot,
      mark: n.mark,
    });
    bytes.fill(0);
    expect(Buffer.from(accumulationNativeWitnessManifestBytes(n)).toString()).toContain(
      'accumulation-native-mark-witness-v1'
    );
    expect(() => accumulationNativeWitnessManifestBytes(clone(n))).toThrow(/native-ownership/);
  });
  it('requires every full tuple field and the original opening price', () => {
    const mutations = [
      (m: Row) => {
        m.blockHash = '0x' + '9'.repeat(64);
      },
      (m: Row) => {
        m.blockNumber++;
      },
      (m: Row) => {
        m.observedAtMs--;
      },
      (m: Row) => {
        m.receivedAtMs--;
      },
      (m: Row) => {
        m.price = { numerator: '3', denominator: '2' };
      },
    ];
    for (const mutate of mutations) {
      const f = fixture(false);
      f.rows = clone(f.rows);
      mutate(f.rows[1].input.mark);
      expect(() => run(f)).toThrow(/full-mark-join/);
    }
    const f = fixture(false);
    f.rows = clone(f.rows);
    f.rows[0].input.price = { numerator: '9', denominator: '1' };
    expect(() => run(f)).toThrow(/opening-price-join/);
  });
  it('rejects copied native claims, missing/extra/duplicate witnesses and duplicate slot identities', () => {
    const changes = [
      (f: ReturnType<typeof fixture>) => {
        f.witnesses[1].native = clone(f.witnesses[1].native);
      },
      (f: ReturnType<typeof fixture>) => {
        f.witnesses.pop();
      },
      (f: ReturnType<typeof fixture>) => {
        f.witnesses.push(witness(99, native('risk', START + 2 * HOUR, 110)));
      },
      (f: ReturnType<typeof fixture>) => {
        f.witnesses.push(f.witnesses[0]);
      },
      (f: ReturnType<typeof fixture>) => {
        f.witnesses[1] = witness(2, f.witnesses[0].native);
      },
    ];
    for (const edit of changes) {
      const f = fixture();
      edit(f);
      expect(() => run(f)).toThrow(AccumulationNativeWitnessJoinError);
    }
  });
  it('requires exact evidence reference purpose, artifact identity and internally derived manifest digest', () => {
    for (const key of ['purpose', 'artifactId', 'sha256']) {
      const f = fixture();
      f.rows = clone(f.rows);
      f.rows[1].evidence[0][key] = key === 'sha256' ? 'e'.repeat(64) : 'other';
      expect(() => run(f)).toThrow(/record-witness-reference/);
    }
    const f = fixture();
    f.witnesses[0].evidence.sha256 = 'e'.repeat(64);
    expect(() => run(f)).toThrow(/manifest-reference/);
    const duplicate = fixture();
    duplicate.rows[0].evidence.push(clone(duplicate.rows[0].evidence[0]));
    expect(() => run(duplicate)).toThrow(/duplicate-record-evidence/);
  });
  it('joins exact registered control time, role and original episode identity', () => {
    const f = fixture(false);
    f.rows = clone(f.rows);
    f.rows[1].input.atMs++;
    expect(() => run(f)).toThrow(/registered-slot-join/);
    const foreign = fixture(false),
      nf = createAccumulationNativeMarkFixture('risk', 'historical-modeled', {
        openingAtMs: START,
        controlAtMs: START + HOUR,
        targetHeight: 100,
      });
    nf.slot.episodeId = 'other-episode';
    const owned = verifyAccumulationNativeMark(nf.raw, nf.trusted, nf.slot);
    foreign.witnesses[1] = witness(2, owned);
    foreign.rows[1] = record(foreign.witnesses[1], 'valuation');
    expect(() => run(foreign)).toThrow(/registered-slot-join/);
  });
  it('does not backdate retrospective opening confirmation into an earlier cutoff', () => {
    const w = witness(1, native('opening', START, 90));
    expect(() =>
      joinAccumulationJournalNativeWitnesses(snapshot([record(w, 'opening')]), schedule, START, [w])
    ).toThrow(/witness-not-yet-available/);
    expect(
      joinAccumulationJournalNativeWitnesses(snapshot([record(w, 'opening')]), schedule, START + 1000, [w]).joined
    ).toHaveLength(1);
  });
  it('retains rejected record claims without promoting them into reducer success', () => {
    const f = fixture(false);
    f.rows[1].result.status = 'rejected';
    f.rows[1].result.reason = 'invented-rejection';
    const result = run(f);
    expect(result.joined[1].claimedResultStatus).toBe('rejected');
    expect(result.coverage.failures.some((x) => x.reason === 'reducer-rejected')).toBe(true);
    expect(result.reducerResultsVerified).toBe(false);
  });
  it('rejects altered heads, noncanonical lines, omitted prefixes and malformed references', () => {
    const f = fixture(),
      good = snapshot(f.rows);
    for (const edit of [
      (s: AccumulationJournalSnapshot) => {
        s.head.prefixSha256 = 'e'.repeat(64);
      },
      (s: AccumulationJournalSnapshot) => {
        s.head.headSha256 = 'e'.repeat(64);
      },
      (s: AccumulationJournalSnapshot) => {
        s.journalJsonl = s.journalJsonl.slice(s.journalJsonl.indexOf('\n') + 1);
      },
      (s: AccumulationJournalSnapshot) => {
        s.journalJsonl = ' ' + s.journalJsonl;
      },
    ]) {
      const s = clone(good);
      edit(s);
      expect(() => joinAccumulationJournalNativeWitnesses(s, schedule, f.throughAtMs, f.witnesses)).toThrow(
        AccumulationNativeWitnessJoinError
      );
    }
  });
  it('compares owned bridge full mark with the last listed mark without granting current-state authority', () => {
    const f = withBridge(),
      result = joinAccumulationJournalNativeWitnesses(snapshot(f.rows), schedule, f.throughAtMs, f.witnesses, f.bridge);
    expect(result.bridgeComparison).toEqual({
      witnessSequence: 2,
      packetSha256: f.bridge.packet.packetSha256,
      sourceRegistrationSha256: f.bridge.sourceRegistrationSha256,
      fullMarkMatches: true,
    });
    expect(result.reducerResultsVerified).toBe(false);
    expect(result.admissionAuthority).toBe(false);
    expect(() =>
      joinAccumulationJournalNativeWitnesses(snapshot(f.rows), schedule, f.throughAtMs, f.witnesses, clone(f.bridge))
    ).toThrow(/bridge-ownership/);
    f.bridgeFixture.packet.contextReceivedAtMs++;
    f.bridgeFixture.trusted.packetSha256 = accumulationEvidenceDigest(f.bridgeFixture.packet);
    const changed = verifyAccumulationDecisionPacket(f.bridgeFixture.packet, f.bridgeFixture.trusted);
    expect(() =>
      joinAccumulationJournalNativeWitnesses(snapshot(f.rows), schedule, f.throughAtMs, f.witnesses, changed)
    ).toThrow(/bridge-full-mark-join/);
  });
  it('refuses optional bridge comparison on execution/rejected/terminal prefixes or before the last event', () => {
    const f = withBridge();
    f.rows.push({
      kind: 'attempt-committed',
      input: { atMs: f.throughAtMs },
      evidence: [{ purpose: 'invented', artifactId: 'attempt', sha256: 'e'.repeat(64) }],
      result: { status: 'applied', stateSha256: 'e'.repeat(64), reason: null, details: [] },
    });
    expect(() =>
      joinAccumulationJournalNativeWitnesses(snapshot(f.rows), schedule, f.throughAtMs, f.witnesses, f.bridge)
    ).toThrow(/bridge-prefix-not-comparable/);
    const rejected = withBridge();
    rejected.rows[1].result.status = 'rejected';
    expect(() =>
      joinAccumulationJournalNativeWitnesses(
        snapshot(rejected.rows),
        schedule,
        rejected.throughAtMs,
        rejected.witnesses,
        rejected.bridge
      )
    ).toThrow(/bridge-prefix-not-comparable/);
    const late = withBridge();
    late.rows.push({
      kind: 'admission-start',
      input: { atMs: late.throughAtMs + 1 },
      evidence: [{ purpose: 'invented', artifactId: 'start', sha256: 'e'.repeat(64) }],
      result: { status: 'recorded', stateSha256: 'e'.repeat(64), reason: null, details: [] },
    });
    expect(() =>
      joinAccumulationJournalNativeWitnesses(
        snapshot(late.rows),
        schedule,
        late.throughAtMs + 2,
        late.witnesses,
        late.bridge
      )
    ).toThrow(/bridge-chronology/);
  });
  it('rejects accessors and oversized witness arrays without evaluating supplied getters', () => {
    const f = fixture(),
      getter = vi.fn();
    Object.defineProperty(f.witnesses[0], 'native', { get: getter, enumerable: true });
    expect(() => run(f)).toThrow(/own-data-fields/);
    expect(getter).not.toHaveBeenCalled();
    const oversized = fixture();
    oversized.witnesses = new Array(513);
    Object.defineProperty(oversized.witnesses, 0, { get: getter, enumerable: true });
    expect(() => run(oversized)).toThrow(/witness-bound/);
    expect(getter).not.toHaveBeenCalled();
  });
});
