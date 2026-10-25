// @vitest-environment node
/** Real capture/store/journal; invented RPC replies and explicitly synthetic admission receipts. No fitted model is read. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { prepareAccumulationOpeningCapture } from '../../../../scripts/bots/accumulation-opening-capture';
import {
  prepareAccumulationFirstAdmission,
  type AccumulationFirstAdmissionOptions,
} from '../../../../scripts/bots/accumulation-first-admission';
import * as workers from '../../../../scripts/bots/accumulation-subprocess';
import { canonicalAccumulationJournalJson as canonical } from '../../../../scripts/bots/accumulation-journal-store';
import { createAccumulationEvidenceFixture } from './fixtures/accumulation-evidence-fixture';
import {
  createAccumulationAdmissionResultFixture,
  admissionResultStream,
} from './fixtures/accumulation-admission-result-fixture';
import { createHistoricalExecutionPoolCodec } from '../../../../scripts/bots/historical-execution-pool-codec';
import {
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '../../../../scripts/bots/historical-execution-codec';
import { feeBytes, hex, le } from './fixtures/historical-goal-bound-fee-fixture';

const H = 1785265200000,
  UNIT = 10n ** 18n,
  DENOM = '100000000000000000000000000000000000000';
const sha = (v: string | Uint8Array) => createHash('sha256').update(v).digest('hex');
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const root = path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));
const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await Promise.all(roots.splice(0).map((p) => fs.rm(p, { recursive: true, force: true })));
});

async function fixture(
  mode:
    | 'wait'
    | 'buy'
    | 'late-buy'
    | 'start-expiry'
    | 'large-failure'
    | 'capture-failure'
    | 'wall-rollback'
    | 'changed-prefix' = 'wait'
) {
  const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'first-admission-test-')));
  roots.push(base);
  let wall = H - 30000;
  vi.spyOn(Date, 'now').mockImplementation(() => wall++);
  const synthetic = createAccumulationEvidenceFixture(H - 25000);
  const identity = { ...synthetic.identity, blockHash: hash(100) };
  const keys = createHistoricalExecutionPoolCodec(identity).storageKeys();
  const runtime = {
    metadataSha256: sha(Buffer.from(identity.metadataHex.slice(2), 'hex')),
    codeHash: hash(902),
    ...identity.runtimeVersion,
    denominator: DENOM,
  };
  const header = (n: number) => ({
    number: `0x${n.toString(16)}`,
    parentHash: hash(n - 1),
    stateRoot: hash(900),
    extrinsicsRoot: hash(901),
    digest: { logs: [] },
  });
  const calls: string[] = [];
  const fetcher: typeof fetch = vi.fn(async (_url, init) => {
    const request = JSON.parse(String(init?.body));
    calls.push(request.method ?? 'graphql');
    const { id, method, params } = request;
    const n = wall < H ? 100 : 101;
    let result: unknown;
    if (!method) {
      const connection = (symbol: 'KUSD' | 'XOR') => ({
        pageInfo: { hasNextPage: false, endCursor: null },
        edges: [
          {
            node: {
              id: `asset-${symbol === 'KUSD' ? KUSD : XOR}-HOUR-${(H - 3600000) / 1000}`,
              assetId: symbol === 'KUSD' ? KUSD : XOR,
              type: 'HOUR',
              timestamp: H / 1000 - 1,
              denominator: DENOM,
              closeEvidence: {
                kind: 'finalized-hour-close',
                genesisHash: GENESIS,
                completedAt: H / 1000,
                timestamp: H / 1000 - 1,
                symbol,
                requestedSymbol: symbol,
                decimals: 18,
                blockHeight: 100,
                blockHash: hash(100),
                nextBlockHeight: 101,
                nextBlockHash: hash(101),
                nextTimestamp: H / 1000 + 2,
                xorPool:
                  symbol === 'XOR'
                    ? null
                    : {
                        baseAssetId: XOR,
                        targetAssetId: KUSD,
                        baseDecimals: 18,
                        targetDecimals: 18,
                        baseAssetReserves: String(1000n * UNIT),
                        targetAssetReserves: String(1000n * UNIT),
                      },
              },
            },
          },
        ],
      });
      return new Response(JSON.stringify({ data: { kusd: connection('KUSD'), xor: connection('XOR') } }));
    }
    if (method === 'chain_getFinalizedHead') result = hash(n);
    else if (method === 'chain_getBlockHash') result = params[0] === 0 ? GENESIS : hash(params[0]);
    else if (method === 'chain_getHeader') result = header(Number(BigInt(params[0])));
    else if (method === 'state_getRuntimeVersion') result = { specName: 'sora-substrate', ...identity.runtimeVersion };
    else if (method === 'state_getMetadata') result = identity.metadataHex;
    else if (method === 'state_getStorageHash') result = mode === 'capture-failure' && wall > H ? hash(999) : hash(902);
    else if (method === 'state_queryStorageAt') {
      const proof: Record<string, string> = {
        ...synthetic.proof,
        denominator: hex(le(BigInt(DENOM))),
        timestamp: hex(le(wall < H ? H - 25000 : H + 2000, 8)),
      };
      result = [{ block: hash(n), changes: Object.entries(keys).map(([name, key]) => [key, proof[name]]) }];
    } else if (method === 'liquidityProxy_quote')
      result =
        (mode === 'buy' || mode === 'late-buy') && params[3] === String(UNIT)
          ? {
              amount: String(2n * UNIT),
              amount_without_impact: String(2n * UNIT),
              fee: { [XOR]: '10' },
              route: [KUSD, XOR],
              rewards: [],
            }
          : null;
    else if (method === 'state_call')
      result =
        params[0] === 'TransactionPaymentApi_query_info'
          ? hex(
              synthetic.registry
                .createType('RuntimeDispatchInfo', { weight: 3, class: 'Normal', partialFee: String(UNIT / 10n) })
                .toU8a()
            )
          : feeBytes(UNIT / 10n, 0, 0);
    else throw Error('unexpected synthetic RPC');
    return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }));
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw Error('ambient network forbidden');
    })
  );
  const openingReg = {
    kind: 'accumulation-opening-capture-registration-v1',
    attemptName: 'opening',
    episodeId: 'synthetic-first',
    slotId: 'opening',
    openingAtMs: H,
    deadlineMs: H + 86400000,
    runtime,
  };
  const openingBytes = Buffer.from(JSON.stringify(openingReg) + '\n');
  const openingOwner = await prepareAccumulationOpeningCapture({
    baseDirectory: base,
    registrationBytes: openingBytes,
    expectedRegistrationSha256: sha(openingBytes),
    fetch: fetcher,
  });
  wall = H - 20000;
  expect((await openingOwner.bootstrap()).status).toBe('bootstrapped');
  wall = H - 3000;
  const acquired = await openingOwner.capture();
  expect(acquired.status).toBe('verified');
  if (acquired.status !== 'verified') throw Error('opening fixture failed');
  wall = H + 1000;
  const decisionReg = {
    kind: 'accumulation-capture-registration-v1',
    attemptName: 'decision',
    opensAtMs: H + 30000,
    closesAtMs: H + 60000,
    completedHourMs: H,
    runtime,
  };
  const decisionBytes = Buffer.from(JSON.stringify(decisionReg) + '\n');
  const python = await fs.realpath(
    execFileSync('python3', ['-I', '-S', '-B', '-c', 'import sys; print(sys.executable)'], { encoding: 'utf8' }).trim()
  );
  const names = [
    'accumulation_journal_replay',
    'accumulation_execution_replay',
    'accumulation_stopping_model',
    'accumulation_admission_policy',
    'accumulation_admission_runner',
  ];
  const pins = await Promise.all(
    names.map(async (name) => ({
      path: `scripts/bots/${name}.py`,
      sha256: sha(await fs.readFile(path.join(root, `scripts/bots/${name}.py`))),
    }))
  );
  const reg = {
    kind: 'accumulation-first-shadow-registration-v2',
    episodeId: 'synthetic-first',
    openingAtMs: H,
    deadlineMs: H + 86400000,
    openingRegistrationSha256: sha(openingBytes),
    decisionRegistrationSha256: sha(decisionBytes),
    capitalKusdCodec: String(10n * UNIT),
    feeReserveXorCodec: String(UNIT),
    modelSha256: '59c55ea8eb27b9efcf6e14cff95f3a56f73f2e65d9e66c82bad7b1a5b5fff355',
    runtime: {
      repositoryRoot: root,
      pythonExecutable: python,
      pythonSha256: sha(await fs.readFile(python)),
      journalSourceBindings: pins,
      admissionSourceBindings: pins.filter(
        (p) => !p.path.includes('journal_replay') && !p.path.includes('execution_replay')
      ),
    },
  };
  const bytes = Buffer.from(JSON.stringify(reg) + '\n');
  const options: AccumulationFirstAdmissionOptions = {
    registrationBytes: bytes,
    expectedRegistrationSha256: sha(bytes),
    ownedOpeningCapture: acquired,
    decisionCaptureOptions: {
      baseDirectory: base,
      registrationBytes: decisionBytes,
      expectedRegistrationSha256: sha(decisionBytes),
      fetch: fetcher,
    },
    journalDirectory: path.join(base, 'journal'),
  };
  const actualWorker = workers.runAccumulationSubprocess;
  let admissions = 0;
  vi.spyOn(workers, 'runAccumulationSubprocess').mockImplementation(async (request) => {
    if (request.runner === 'journal') {
      const result = await actualWorker(request);
      const input = JSON.parse(Buffer.from(request.input).toString());
      if (mode === 'start-expiry' && input.nextEvent?.kind === 'admission-start') wall += 6000;
      if (mode === 'wall-rollback' && input.operation === 'replay' && input.packet) wall -= 10000;
      return result;
    }
    admissions++;
    const input = JSON.parse(Buffer.from(request.input).toString());
    const records = (await fs.readdir(path.join(base, 'journal', 'records'))).sort();
    const latest = JSON.parse(await fs.readFile(path.join(base, 'journal', 'records', records.at(-1)!), 'utf8'));
    expect(latest.kind).toBe('admission-start');
    expect(latest.input.inputSha256).toBe(sha(request.input));
    // X must name the prefix before the durable start, not the now-pending S.
    const prefix = (
      await Promise.all(
        records.slice(0, -1).map((name) => fs.readFile(path.join(base, 'journal', 'records', name), 'utf8'))
      )
    ).join('');
    expect(input.episode.journalPrefixSha256).toBe(sha(prefix));
    if (mode === 'changed-prefix') await fs.appendFile(path.join(base, 'journal', 'records', records.at(-1)!), '\n');
    const f = createAccumulationAdmissionResultFixture();
    const output = {
      ...f.output,
      inputSha256: sha(request.input),
      packetSha256: input.packet.packetSha256,
      episodeId: input.episode.episodeId,
      journalPrefixSha256: input.episode.journalPrefixSha256,
      journalRevision: input.episode.journalRevision,
      candidateOutcomes: input.packet.candidates,
      decision:
        mode === 'buy' || mode === 'late-buy'
          ? f.output.decision
          : {
              action: 'wait',
              selected_input_kusd: null,
              reason: 'no_candidates',
              expected_wait_terminal_xor: null,
              candidates: [],
              scenario_count: 0,
              wait_passing_paths: 0,
              wait_ambiguous_paths: 0,
              seed: 20260926,
            },
    };
    const started = { wallMs: Date.now(), monotonicNs: process.hrtime.bigint().toString() };
    if (mode === 'late-buy') wall += 6000;
    const finished = { wallMs: Date.now(), monotonicNs: process.hrtime.bigint().toString() };
    const checks = [
      { path: request.pythonExecutable, sha256: request.trusted.pythonSha256 },
      ...request.trusted.sourceBindings.map((b) => ({ path: path.join(root, b.path), sha256: b.sha256 })),
    ].map((b) => ({
      path: b.path,
      expectedSha256: b.sha256,
      actualSha256: b.sha256,
      status: 'match' as const,
      reason: null,
    }));
    return {
      ...f.receipt,
      registrationSha256: request.trusted.registrationSha256,
      executable: request.pythonExecutable,
      argv: ['-I', '-S', '-B', path.join(root, 'scripts/bots/accumulation_admission_runner.py')],
      cwd: root,
      input: { bytes: request.input.length, sha256: sha(request.input), writeCompleted: true },
      limits: request.limits,
      started,
      spawned: started,
      finished,
      elapsedNs: String(BigInt(finished.monotonicNs) - BigInt(started.monotonicNs)),
      before: checks,
      after: checks,
      stdout: admissionResultStream(
        mode === 'large-failure' ? Buffer.alloc(256 * 1024, 65) : Buffer.from(canonical(output) + '\n')
      ),
      stderr: admissionResultStream(mode === 'large-failure' ? Buffer.alloc(64 * 1024, 66) : Buffer.alloc(0)),
    };
  });
  return {
    options,
    base,
    calls,
    setWall: (value: number) => {
      wall = value;
    },
    admissions: () => admissions,
  };
}

describe('first prospective shadow admission owner', () => {
  it('records actual capture and B→X→durable S→worker result, without an order or a model read', async () => {
    const f = await fixture();
    const owner = await prepareAccumulationFirstAdmission(f.options);
    await expect(owner.runOnce()).rejects.toThrow('not-due');
    f.setWall(H + 30000);
    const result = await owner.runOnce();
    expect(result.status).toBe('evaluated');
    expect(result).toMatchObject({
      decision: { action: 'wait', reason: 'no_candidates' },
      financialActions: false,
      qualificationAuthority: false,
      completeEpisodeVerified: false,
    });
    expect(f.admissions()).toBe(1);
    await expect(owner.runOnce()).rejects.toThrow('already-attempted');
    expect(await fs.readdir(path.join(f.base, 'journal', 'records'))).toHaveLength(5);
    await expect(prepareAccumulationFirstAdmission(f.options)).rejects.toThrow('opening-already-consumed');
  }, 15000);
  it('rejects a JSON-cloned opening before observation or journal creation', async () => {
    const f = await fixture();
    const calls = f.calls.length;
    await expect(
      prepareAccumulationFirstAdmission({
        ...f.options,
        ownedOpeningCapture: JSON.parse(JSON.stringify(f.options.ownedOpeningCapture)),
      })
    ).rejects.toThrow('acquired-opening-required');
    expect(f.calls).toHaveLength(calls);
    await expect(fs.stat(f.options.journalDirectory)).rejects.toThrow();
  }, 15000);
  it.each(['journalSourceBindings', 'admissionSourceBindings'] as const)(
    'rejects altered %s before capture or process creation',
    async (key) => {
      const f = await fixture();
      const calls = f.calls.length;
      const registration = JSON.parse(Buffer.from(f.options.registrationBytes).toString());
      registration.runtime[key][0].sha256 = 'b'.repeat(64);
      const bytes = Buffer.from(JSON.stringify(registration) + '\n');
      await expect(
        prepareAccumulationFirstAdmission({
          ...f.options,
          registrationBytes: bytes,
          expectedRegistrationSha256: sha(bytes),
        })
      ).rejects.toThrow('sealed-source-pin');
      expect(f.calls).toHaveLength(calls);
      expect(f.admissions()).toBe(0);
      await expect(fs.stat(f.options.journalDirectory)).rejects.toThrow();
    },
    15000
  );
  it('detaches capture bytes, pins and options before the first await', async () => {
    const f = await fixture();
    const pending = prepareAccumulationFirstAdmission(f.options);
    f.options.decisionCaptureOptions.registrationBytes.fill(0);
    f.options.expectedRegistrationSha256 = 'b'.repeat(64);
    f.options.decisionCaptureOptions.fetch = async () => {
      throw Error('mutated fetch used');
    };
    const owner = await pending;
    f.setWall(H + 30000);
    expect((await owner.runOnce()).status).toBe('evaluated');
  }, 15000);
  it('does not invoke a worker when the durable start consumes the original freshness budget', async () => {
    const f = await fixture('start-expiry');
    const owner = await prepareAccumulationFirstAdmission(f.options);
    f.setWall(H + 30000);
    expect((await owner.runOnce()).status).toBe('expired-before-invocation');
    expect(f.admissions()).toBe(0);
    const records = (await fs.readdir(path.join(f.base, 'journal', 'records'))).sort();
    const last = JSON.parse(await fs.readFile(path.join(f.base, 'journal', 'records', records.at(-1)!), 'utf8'));
    expect(last.kind).toBe('admission-failure');
    expect(last.input.reason).toBe('expired-before-invocation');
  }, 15000);
  it('retains a late genuine synthetic buy and labels it unusable instead of changing it to wait', async () => {
    const f = await fixture('late-buy');
    const owner = await prepareAccumulationFirstAdmission(f.options);
    f.setWall(H + 30000);
    const result = await owner.runOnce();
    expect(result).toMatchObject({
      status: 'evaluated',
      decision: { action: 'buy', selected_input_kusd: 1 },
      completion: { status: 'unusable-buy' },
      originalCaptureStillFresh: false,
    });
    expect(f.admissions()).toBe(1);
  }, 15000);
  it('retains an entire maximum-sized malformed child receipt before quarantining', async () => {
    const f = await fixture('large-failure');
    const owner = await prepareAccumulationFirstAdmission(f.options);
    f.setWall(H + 30000);
    await expect(owner.runOnce()).rejects.toThrow();
    expect(f.admissions()).toBe(1);
    const names = await fs.readdir(path.join(f.base, 'journal', 'evidence'));
    const sizes = await Promise.all(
      names.map(async (name) => (await fs.stat(path.join(f.base, 'journal', 'evidence', name))).size)
    );
    expect(Math.max(...sizes)).toBeGreaterThan(426000);
    expect(await fs.readdir(path.join(f.base, 'journal'))).toContain('RECOVERY.json');
  }, 15000);
  it('records a failed capture as a failed decision without invoking admission', async () => {
    const f = await fixture('capture-failure');
    const owner = await prepareAccumulationFirstAdmission(f.options);
    f.setWall(H + 30000);
    expect((await owner.runOnce()).status).toBe('capture-failed');
    expect(f.admissions()).toBe(0);
    expect(await fs.readdir(path.join(f.base, 'journal', 'records'))).toHaveLength(2);
  }, 15000);
  it('keeps an on-time synthetic buy as research only, with no order capability', async () => {
    const f = await fixture('buy');
    const owner = await prepareAccumulationFirstAdmission(f.options);
    f.setWall(H + 30000);
    const result = await owner.runOnce();
    expect(result).toMatchObject({
      status: 'evaluated',
      decision: { action: 'buy', selected_input_kusd: 1 },
      completion: { status: 'fresh-research-buy' },
      originalCaptureStillFresh: true,
      orderAuthority: false,
      qualificationAuthority: false,
      profitabilityVerified: false,
    });
  }, 15000);
  it.each(['wall-rollback', 'changed-prefix'] as const)(
    'quarantines %s instead of accepting a result',
    async (mode) => {
      const f = await fixture(mode);
      const owner = await prepareAccumulationFirstAdmission(f.options);
      f.setWall(H + 30000);
      await expect(owner.runOnce()).rejects.toThrow();
      expect(f.admissions()).toBe(mode === 'wall-rollback' ? 0 : 1);
      expect(await fs.readdir(path.join(f.base, 'journal'))).toContain('RECOVERY.json');
    },
    15000
  );
});
