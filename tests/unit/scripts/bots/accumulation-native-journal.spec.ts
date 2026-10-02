// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  openAccumulationJournalStore,
  type AccumulationJournalStore,
} from '../../../../scripts/bots/accumulation-journal-store';
import {
  AccumulationJournalSession,
  type AccumulationJournalRuntime,
} from '../../../../scripts/bots/accumulation-journal-session';
import {
  verifyAccumulationNativeMark,
  isVerifiedAccumulationNativeMark,
} from '../../../../scripts/bots/accumulation-native-mark';
import {
  auditAccumulationHourlyCoverage,
  type AccumulationHourlySchedule,
} from '../../../../scripts/bots/accumulation-hourly-coverage';
import { createAccumulationNativeMarkFixture } from './fixtures/accumulation-native-mark-fixture';

const HOUR = 3_600_000;
const START = 1785265200000; // Invented observations after the fixed training end; no market file is read.
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const directories: string[] = [],
  owners: AccumulationJournalStore[] = [];
afterEach(async () => {
  for (const owner of owners.splice(0)) await owner.close().catch(() => {});
  for (const directory of directories.splice(0)) await fs.rm(directory, { recursive: true, force: true });
});

describe('invented native evidence through the real durable accounting worker', () => {
  it('replays a complete synthetic day with all observations, unavailable decisions and unchanged funding', async () => {
    const temp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'native-journal-test-')));
    directories.push(temp);
    const registration = Buffer.from('invented-native-hourly-journal-registration');
    const registrationSha256 = sha(registration),
      episodeId = 'invented-native-episode';
    const store = await openAccumulationJournalStore(
      path.join(temp, 'journal'),
      {
        episodeId,
        bytes: registration,
        sha256: registrationSha256,
      },
      null
    );
    owners.push(store);
    // Current pins are test-only around invented bytes; no acquisition registration
    // or purported historical/live evidence is created here.
    const executable = await fs.realpath(
      execFileSync('python3', ['-I', '-S', '-B', '-c', 'import sys; print(sys.executable)'], {
        encoding: 'utf8',
        timeout: 5000,
      }).trim()
    );
    const runtime: AccumulationJournalRuntime = {
      repositoryRoot: await fs.realpath(root),
      pythonExecutable: executable,
      trusted: {
        registrationSha256,
        pythonSha256: sha(await fs.readFile(executable)),
        sourceBindings: await Promise.all(
          [
            'accumulation_journal_replay',
            'accumulation_execution_replay',
            'accumulation_stopping_model',
            'accumulation_admission_policy',
            'accumulation_admission_runner',
          ].map(async (name) => ({
            path: `scripts/bots/${name}.py`,
            sha256: sha(await fs.readFile(path.join(root, `scripts/bots/${name}.py`))),
          }))
        ),
      },
    };
    const session = AccumulationJournalSession.create(store, runtime);
    const schedule: AccumulationHourlySchedule = {
      kind: 'accumulation-hourly-research-schedule-v1',
      episodeId,
      registrationSha256,
      openingAtMs: START,
      controlOffsetMs: 0,
      decisionWindowMs: 30_000,
      capitalKusdCodec: '10000000000000000000',
      feeReserveXorCodec: '1000000000000000000',
    };
    for (let hour = 0; hour <= 24; hour++) {
      const controlAtMs = START + hour * HOUR;
      const role = hour === 0 ? 'opening' : hour === 24 ? 'terminal' : 'risk';
      const fixture = createAccumulationNativeMarkFixture(role, 'observed-receipts', {
        openingAtMs: START,
        controlAtMs,
        targetHeight: 100 + 10 * hour,
      });
      fixture.slot.episodeId = episodeId;
      fixture.slot.slotId = `hour-${hour}`;
      fixture.slot.timing.registrationSha256 = registrationSha256;
      const native = verifyAccumulationNativeMark(fixture.raw, fixture.trusted, fixture.slot);
      expect(isVerifiedAccumulationNativeMark(native)).toBe(true);
      expect(isVerifiedAccumulationNativeMark(JSON.parse(JSON.stringify(native)))).toBe(false);
      const evidence = [
        await store.retainEvidence(
          'synthetic-native-mark',
          `hour-${hour}`,
          Buffer.from(
            JSON.stringify({
              raw: fixture.raw,
              trusted: fixture.trusted,
              slot: fixture.slot,
            })
          )
        ),
      ];
      if (hour === 0) {
        const opened = await session.transition({
          kind: 'opening',
          evidence,
          input: {
            openingAtMs: START,
            capitalKusdCodec: schedule.capitalKusdCodec,
            feeReserveXorCodec: schedule.feeReserveXorCodec,
            price: native.mark.price,
            mark: native.mark,
          },
        });
        expect(opened.replay.policyCalled).toBe(false);
      } else if (hour < 24) {
        await session.transition({ kind: 'valuation', evidence, input: { atMs: controlAtMs, mark: native.mark } });
      } else {
        await session.transition({ kind: 'terminal', evidence, input: { mark: native.mark } });
      }
      if (hour < 24) {
        // Explicit invented unavailable outcomes exercise schedule retention.
        // These are not authenticated quote receipts or model evaluations.
        await session.transition({
          kind: 'decision-slot',
          evidence,
          input: {
            slot: hour,
            atMs: controlAtMs + 100,
            status: 'unavailable',
            packetSha256: 'e'.repeat(64),
            reason: 'invented-native-null',
          },
        });
      }
    }
    const result = await session.inspect();
    expect(result.snapshot.head.recordCount).toBe(49);
    expect(result.replay).toMatchObject({
      status: 'ineligible',
      policyCalled: false,
      scheduleCompletenessVerified: false,
      financialActions: false,
      qualificationAuthority: false,
    });
    const state = result.replay.state as Record<string, unknown>;
    expect(state).toMatchObject({
      finalized: true,
      attemptCommitted: false,
      successfulPurchase: false,
      openingAtMs: START,
      deadlineMs: START + 24 * HOUR,
      kusd: { numerator: '10', denominator: '1' },
      xor: { numerator: '1', denominator: '1' },
      feesPaidXor: { numerator: '0', denominator: '1' },
      remainingFeeReserveXor: { numerator: '1', denominator: '1' },
    });
    const coverage = auditAccumulationHourlyCoverage(result.snapshot, schedule, START + 24 * HOUR + 1000);
    expect(coverage.requiredObservationsPassed).toBe(true);
    expect(coverage.observedInteriorControls).toHaveLength(23);
    expect(coverage.observedDecisionSlots).toHaveLength(24);
    expect(coverage.qualificationAuthority).toBe(false);
    expect(coverage.nativeEvidenceVerified).toBe(false);
    expect(result.qualificationAuthority).toBe(false);
  }, 30_000);
});
