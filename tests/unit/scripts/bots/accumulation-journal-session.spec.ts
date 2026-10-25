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
  canonicalAccumulationJournalJson as canonical,
  type AccumulationJournalStore,
} from '../../../../scripts/bots/accumulation-journal-store';
import {
  AccumulationJournalSession,
  type AccumulationJournalRuntime,
} from '../../../../scripts/bots/accumulation-journal-session';
import { runAccumulationSubprocess } from '../../../../scripts/bots/accumulation-subprocess';
import type { AccumulationBridgeResult } from '../../../../scripts/bots/accumulation-evidence-bridge';
import { verifyAccumulationDecisionPacket } from '../../../../scripts/bots/accumulation-evidence-bridge';
import { createAccumulationJournalBridgeFixture } from './fixtures/accumulation-journal-bridge-fixture';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const START = 1785261600000 + 3600000;
const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const ratio = (numerator: number, denominator = 1) => ({
  numerator: String(numerator),
  denominator: String(denominator),
});
const mark = (n: number, observed: number, received: number, price = ratio(2)) => ({
  blockHash: '0x' + n.toString(16).padStart(64, '0'),
  blockNumber: n,
  observedAtMs: observed,
  receivedAtMs: received,
  price,
});
const directories: string[] = [],
  owners: AccumulationJournalStore[] = [];
afterEach(async () => {
  for (const owner of owners.splice(0)) await owner.close().catch(() => {});
  for (const directory of directories.splice(0)) await fs.rm(directory, { recursive: true, force: true });
});
async function fixture() {
  const temporary = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'accumulation-session-test-')));
  directories.push(temporary);
  const registration = Buffer.from('invented-journal-session-registration');
  const store = await openAccumulationJournalStore(
    path.join(temporary, 'journal'),
    { episodeId: 'invented-session', bytes: registration, sha256: sha(registration) },
    null
  );
  owners.push(store);
  // These test-only pins bind current local source to invented events. This is
  // not a prospective acquisition registration or approval to use market data.
  const executable = await fs.realpath(
    execFileSync('python3', ['-I', '-S', '-B', '-c', 'import sys; print(sys.executable)'], {
      encoding: 'utf8',
      timeout: 5000,
    }).trim()
  );
  const names = [
    'accumulation_journal_replay',
    'accumulation_execution_replay',
    'accumulation_stopping_model',
    'accumulation_admission_policy',
    'accumulation_admission_runner',
  ];
  const runtime: AccumulationJournalRuntime = {
    repositoryRoot: await fs.realpath(root),
    pythonExecutable: executable,
    trusted: {
      registrationSha256: sha(registration),
      pythonSha256: sha(await fs.readFile(executable)),
      sourceBindings: await Promise.all(
        names.map(async (name) => ({
          path: `scripts/bots/${name}.py`,
          sha256: sha(await fs.readFile(path.join(root, `scripts/bots/${name}.py`))),
        }))
      ),
    },
  };
  const evidence = [await store.retainEvidence('invented-mark', 'mark', Buffer.from('invented source data'))];
  const opening = {
    kind: 'opening',
    evidence,
    input: {
      openingAtMs: START,
      capitalKusdCodec: '10000000000000000000',
      feeReserveXorCodec: '1000000000000000000',
      price: ratio(2),
      mark: mark(1, START - 6000, START - 1000),
    },
  };
  return { store, runtime, evidence, opening, session: AccumulationJournalSession.create(store, runtime) };
}

describe('real bounded journal worker and durable store composition', () => {
  it('joins an actual verifier-owned native packet with the full replayed mark without calling the policy', async () => {
    const { session, opening, evidence } = await fixture();
    const synthetic = createAccumulationJournalBridgeFixture(START);
    const bridge = verifyAccumulationDecisionPacket(synthetic.packet, synthetic.trusted);
    await session.transition(opening);
    await session.transition({
      kind: 'valuation',
      evidence,
      input: {
        atMs: bridge.packet.decisionAtMs,
        mark: {
          blockHash: bridge.packet.block.hash,
          blockNumber: bridge.packet.block.height,
          observedAtMs: bridge.packet.block.timestampMs,
          receivedAtMs: bridge.packet.contextReceivedAtMs,
          price: bridge.packet.currentPrice,
        },
      },
    });
    const joined = await session.inspect(bridge);
    expect(joined.replay.status).toBe('eligible');
    expect(joined.replay.policyCalled).toBe(false);
    expect(joined.replay.scheduleCompletenessVerified).toBe(false);
    expect(joined.replay.episode).toMatchObject({
      journalPrefixSha256: joined.snapshot.head.prefixSha256,
      journalRevision: 2,
      targetReached: false,
      goalStopped: false,
    });
    expect(joined.qualificationAuthority).toBe(false);
  }, 10000);
  it('replays real source into immutable records, preserves a loss stop and remains research-only', async () => {
    const { session, opening, evidence, store } = await fixture();
    const first = await session.transition(opening);
    expect(first.snapshot.head.recordCount).toBe(1);
    expect(first.replay.baseJournal).toMatchObject({ recordCount: 0, headSha256: null });
    expect(first.transport.outcome).toBe('completed');
    const loss = await session.transition({
      kind: 'valuation',
      evidence,
      input: { atMs: START + 1300, mark: mark(2, START, START + 1000, ratio(3)) },
    });
    expect(loss.replay.state).toMatchObject({ stopReason: 'loss', revision: 2 });
    const inspected = await session.inspect();
    expect(inspected.replay.status).toBe('ineligible');
    expect(inspected.replay.episode).toBeNull();
    expect(inspected.replay.policyCalled).toBe(false);
    expect(inspected.evidenceAuthentication).toBe('registered-journal-reconstruction-only');
    expect(inspected.financialActions).toBe(false);
    expect((await store.snapshot()).head).toEqual(loss.snapshot.head);
    expect((await fs.readdir(path.join(store.directory, 'evidence'))).length).toBeGreaterThan(6);
  }, 10000);
  it('retains child rejection and quarantines the owner without appending a false result or retrying', async () => {
    const { session, opening, evidence, store } = await fixture();
    const first = await session.transition(opening);
    await expect(
      session.transition({
        kind: 'valuation',
        evidence,
        input: { atMs: START - 100, mark: mark(2, START - 200, START - 100) },
      })
    ).rejects.toThrow(/worker-not-complete/);
    expect(await fs.readdir(path.join(store.directory, 'records'))).toHaveLength(first.snapshot.head.recordCount);
    expect(JSON.parse(await fs.readFile(path.join(store.directory, 'RECOVERY.json'), 'utf8')).reason).toBe(
      'transition-unresolved'
    );
    await expect(session.inspect()).rejects.toThrow(/unavailable/);
    await store.close();
    expect(await fs.readdir(store.directory)).toContain('LOCK');
  }, 10000);
  it('rejects a cloned bridge result before any subprocess or journal change', async () => {
    const { session, store } = await fixture();
    const before = await store.snapshot();
    await expect(session.inspect({ packet: { status: 'verified' } } as AccumulationBridgeResult)).rejects.toThrow(
      /ownership/
    );
    expect(await store.snapshot()).toEqual(before);
  });
  it('rejects contradictory source or state claims even when transport byte hashes are recomputed', async () => {
    for (const mutation of ['source', 'state', 'worker-status', 'record-status']) {
      const { store, runtime, opening } = await fixture();
      const session = AccumulationJournalSession.forTesting(store, runtime, async (request) => {
        const receipt = await runAccumulationSubprocess(request);
        const result = JSON.parse(Buffer.from(receipt.stdout.retainedBase64, 'base64').toString());
        if (mutation === 'source') result.sourceSha256.accumulation_stopping_model_py = 'a'.repeat(64);
        else if (mutation === 'state') result.stateSha256 = 'b'.repeat(64);
        else if (mutation === 'worker-status') result.status = [result.status];
        else {
          const record = JSON.parse(result.proposal.recordJsonl);
          record.result.status = [record.result.status];
          const line = canonical(record) + '\n';
          result.proposal.recordJsonl = line;
          result.proposal.headSha256 = result.proposal.prefixSha256 = sha(line);
          result.journal.headSha256 = result.journal.prefixSha256 = sha(line);
        }
        const bytes = Buffer.from(canonical(result) + '\n');
        receipt.stdout = {
          observedBytes: bytes.length,
          retainedBytes: bytes.length,
          observedSha256: sha(bytes),
          retainedSha256: sha(bytes),
          retainedBase64: bytes.toString('base64'),
          truncated: false,
        };
        return receipt;
      });
      await expect(session.transition(opening)).rejects.toThrow(/source-or-state|result-consistency/);
      expect(await fs.readdir(path.join(store.directory, 'records'))).toEqual([]);
      expect(await fs.readdir(store.directory)).toContain('RECOVERY.json');
    }
  }, 10000);
});
