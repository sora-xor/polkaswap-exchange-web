// @vitest-environment node
/** Invented native replies, an injected fetcher and a real exclusive temporary capture store only. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import {
  prepareAccumulationOpeningCapture,
  isAcquiredAccumulationOpeningCapture,
  type AccumulationOpeningCaptureRegistration,
} from '../../../../scripts/bots/accumulation-opening-capture';
import { isVerifiedAccumulationOpeningMark } from '../../../../scripts/bots/accumulation-opening-mark';
import { createAccumulationEvidenceFixture } from './fixtures/accumulation-evidence-fixture';
import { createHistoricalExecutionPoolCodec } from '../../../../scripts/bots/historical-execution-pool-codec';
import { HISTORICAL_EXECUTION_GENESIS as GENESIS } from '../../../../scripts/bots/historical-execution-codec';

const H = 3_600_000_000;
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const sha = (v: Uint8Array | string) => createHash('sha256').update(v).digest('hex');
const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

async function fixture(
  mode: 'normal' | 'runtime' | 'partial' | 'stale' | 'late' | 'advancing' | 'delayed-retention' = 'normal'
) {
  const baseDirectory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'opening-capture-test-')));
  roots.push(baseDirectory);
  let wall = H - 30000;
  let shiftAfterOriginalReceipt = false;
  vi.spyOn(Date, 'now').mockImplementation(() => {
    const original = wall;
    if (shiftAfterOriginalReceipt) {
      shiftAfterOriginalReceipt = false;
      wall = H + 2000;
    }
    return original;
  });
  const synthetic = createAccumulationEvidenceFixture(H - (mode === 'stale' ? 60001 : 10000));
  const identity = { ...synthetic.identity, blockHash: hash(100) },
    keys = createHistoricalExecutionPoolCodec(identity).storageKeys();
  const registration: AccumulationOpeningCaptureRegistration = {
    kind: 'accumulation-opening-capture-registration-v1',
    attemptName: 'invented-opening',
    episodeId: 'episode-test',
    slotId: 'opening-test',
    openingAtMs: H,
    deadlineMs: H + 24 * 3600000,
    runtime: {
      metadataSha256: sha(Buffer.from(identity.metadataHex.slice(2), 'hex')),
      codeHash: hash(902),
      ...identity.runtimeVersion,
      denominator: '1',
    },
  };
  const registrationBytes = Buffer.from(JSON.stringify(registration) + '\n');
  const calls: { method: string; params: unknown[]; id: number }[] = [];
  const ambient = vi.fn(() => {
    throw Error('external network forbidden');
  });
  vi.stubGlobal('fetch', ambient);
  const header = (n: number) => ({
    number: `0x${n.toString(16)}`,
    parentHash: hash(n - 1),
    stateRoot: hash(900),
    extrinsicsRoot: hash(901),
    digest: { logs: [] },
  });
  const fetcher: typeof fetch = vi.fn(async (url, init) => {
    expect(url).toBe('https://ws.mof.sora.org/');
    expect(init).toMatchObject({ method: 'POST', credentials: 'omit', redirect: 'error' });
    const call = JSON.parse(String(init?.body));
    calls.push(call);
    const { method, params, id } = call;
    let result: unknown;
    if (method === 'chain_getFinalizedHead') result = mode === 'advancing' && id !== 1 ? hash(101) : hash(100);
    else if (method === 'chain_getHeader') result = header(Number(BigInt(params[0])));
    else if (method === 'chain_getBlockHash') result = params[0] === 0 ? GENESIS : hash(params[0]);
    else if (method === 'state_getRuntimeVersion') result = { specName: 'sora-substrate', ...identity.runtimeVersion };
    else if (method === 'state_getMetadata') result = identity.metadataHex;
    else if (method === 'state_getStorageHash') result = hash(mode === 'runtime' ? 903 : 902);
    else if (method === 'state_queryStorageAt') {
      if (mode === 'late') wall = H + 1;
      if (mode === 'delayed-retention') shiftAfterOriginalReceipt = true;
      result = [
        {
          block: hash(100),
          changes: Object.entries(keys).map(([name, key]) => [
            key,
            synthetic.proof[name as keyof typeof synthetic.proof],
          ]),
        },
      ];
    } else throw Error('unexpected request');
    const body = JSON.stringify({ jsonrpc: '2.0', id, result });
    if (mode === 'partial' && method === 'state_queryStorageAt') {
      let reads = 0;
      return new Response(
        new ReadableStream<Uint8Array>({
          pull(controller) {
            if (reads++ === 0) controller.enqueue(Buffer.from(body.slice(0, 31)));
            else controller.error(Error('invented interruption'));
          },
        }),
        { status: 200 }
      );
    }
    return new Response(body, { status: 200 });
  });
  return {
    options: { baseDirectory, registrationBytes, expectedRegistrationSha256: sha(registrationBytes), fetch: fetcher },
    registration,
    calls,
    ambient,
    setNow: (at: number) => {
      wall = at;
    },
  };
}

describe('native-only prospective opening capture', () => {
  it('retains first discovery,14 bootstrap calls and original seven-key receipt in a real sealed store', async () => {
    const f = await fixture('advancing'),
      p = await prepareAccumulationOpeningCapture(f.options);
    expect(f.calls).toHaveLength(0);
    await expect(p.bootstrap()).rejects.toThrow('bootstrap-not-due');
    f.setNow(H - 19000);
    expect((await p.bootstrap()).status).toBe('bootstrapped');
    expect(f.calls).toHaveLength(16);
    await expect(p.bootstrap()).rejects.toThrow('bootstrap-unavailable');
    await expect(p.capture()).rejects.toThrow('capture-not-due');
    f.setNow(H - 2000);
    const result = await p.capture();
    expect(isAcquiredAccumulationOpeningCapture(result)).toBe(true);
    if (!isAcquiredAccumulationOpeningCapture(result)) throw Error('Expected owned capture');
    expect(isVerifiedAccumulationOpeningMark(result.verified)).toBe(true);
    expect(result.verified.selectedTarget).toEqual({ hash: hash(100), height: 100 });
    expect(result.verified.registeredSlot).toEqual({
      episodeId: 'episode-test',
      slotId: 'opening-test',
      openingAtMs: H,
      deadlineMs: H + 24 * 3600000,
    });
    expect(result.verified.mark.receivedAtMs).toBe(H - 2000);
    expect(result).toMatchObject({
      financialActions: false,
      qualificationAuthority: false,
      modelEvaluated: false,
      contemporaneousReadyClaimed: false,
      registrationSha256: f.options.expectedRegistrationSha256,
    });
    expect(isAcquiredAccumulationOpeningCapture(JSON.parse(JSON.stringify(result)))).toBe(false);
    expect(isAcquiredAccumulationOpeningCapture(result.verified)).toBe(false);
    expect(f.calls).toHaveLength(17);
    expect(f.calls.map((c) => c.id)).toEqual([...Array.from({ length: 16 }, (_, i) => i + 1), 1000]);
    expect(f.calls[16].params[0]).toHaveLength(7);
    expect(f.calls[16].params[1]).toBe(hash(100));
    expect(f.ambient).not.toHaveBeenCalled();
    const raw = JSON.parse(await fs.readFile(path.join(result.directory, 'opening-evidence.json'), 'utf8'));
    expect(raw.discoveryRpc).toHaveLength(2);
    expect(raw.bootstrapRpc).toHaveLength(14);
    expect(raw.poolRpc.completedAtMs).toBe(H - 2000);
    const sealBytes = await fs.readFile(result.seal.path);
    expect(sha(sealBytes)).toBe(result.seal.sha256);
    expect(JSON.parse(sealBytes.toString()).terminal.status).toBe('complete');
    expect((await fs.readdir(result.directory)).filter((name) => name.startsWith('bootstrap-rpc-'))).toHaveLength(32);
    expect((await fs.readdir(result.directory)).filter((name) => name.startsWith('pool-rpc-'))).toHaveLength(2);
    await expect(p.capture()).rejects.toThrow('capture-unavailable');
  });

  it.each(['runtime', 'partial', 'stale', 'late'] as const)(
    'retains %s failure once and cannot resample',
    async (mode) => {
      const f = await fixture(mode),
        p = await prepareAccumulationOpeningCapture(f.options);
      f.setNow(H - 19000);
      let result: { status: string } = await p.bootstrap();
      if (mode !== 'runtime') {
        expect(result.status).toBe('bootstrapped');
        f.setNow(H - 2000);
        result = await p.capture();
      }
      expect(result.status).toBe('failed');
      expect(isAcquiredAccumulationOpeningCapture(result)).toBe(false);
      const seal = JSON.parse(await fs.readFile(path.join(p.directory, 'seal.json'), 'utf8'));
      expect(seal.terminal.status).toBe('failed');
      expect(f.calls).toHaveLength(mode === 'runtime' ? 16 : 17);
      await expect(p.bootstrap()).rejects.toThrow('bootstrap-unavailable');
      await expect(p.capture()).rejects.toThrow('capture-unavailable');
      if (mode === 'partial') {
        const evidence = JSON.parse(await fs.readFile(path.join(p.directory, 'pool-rpc-1-outcome.json'), 'utf8'));
        expect(evidence.raw.retainedBytes).toBe(31);
        expect(evidence.receipt.failure).toBe('response-read-failed');
      }
    }
  );

  it.each(['bootstrap', 'capture'] as const)(
    'seals a missed %s window without issuing any late request',
    async (which) => {
      const f = await fixture(),
        p = await prepareAccumulationOpeningCapture(f.options);
      if (which === 'capture') {
        f.setNow(H - 19000);
        await p.bootstrap();
        f.setNow(H + 1);
      } else f.setNow(H - 5000);
      const result = await p[which]();
      expect(result.status).toBe('failed');
      expect(f.calls).toHaveLength(which === 'capture' ? 16 : 0);
      expect(JSON.parse(await fs.readFile(path.join(p.directory, 'seal.json'), 'utf8')).terminal.status).toBe('failed');
    }
  );

  it('permits verification and durable completion afterH while preserving the original timely arrival', async () => {
    const f = await fixture('delayed-retention'),
      p = await prepareAccumulationOpeningCapture(f.options);
    f.setNow(H - 19000);
    await p.bootstrap();
    f.setNow(H - 2000);
    const result = await p.capture();
    expect(isAcquiredAccumulationOpeningCapture(result)).toBe(true);
    if (!isAcquiredAccumulationOpeningCapture(result)) throw Error('Expected owned capture');
    expect(result.verified.mark.receivedAtMs).toBe(H - 2000);
    expect(result.completedAtMs).toBe(H + 2000);
    expect(result.contemporaneousReadyClaimed).toBe(false);
  });

  it('rejects a monotonic late receipt even when the wall clock remains within its slot', async () => {
    const f = await fixture();
    let ticks = 1_000_000_000n;
    vi.spyOn(process.hrtime, 'bigint').mockImplementation(() => ticks);
    const fetcher: typeof fetch = async (url, init) => {
      const response = await f.options.fetch(url, init);
      if (JSON.parse(String(init?.body)).method === 'state_queryStorageAt') ticks += 2_500_000_000n;
      return response;
    };
    const p = await prepareAccumulationOpeningCapture({ ...f.options, fetch: fetcher });
    f.setNow(H - 19000);
    ticks += 11_000_000_000n;
    await p.bootstrap();
    f.setNow(H - 2000);
    ticks += 17_000_000_000n;
    const result = await p.capture();
    expect(result.status).toBe('failed');
    expect(isAcquiredAccumulationOpeningCapture(result)).toBe(false);
    expect(f.calls).toHaveLength(17);
    const outcome = JSON.parse(await fs.readFile(path.join(p.directory, 'pool-rpc-1-outcome.json'), 'utf8'));
    expect(outcome.receipt.failure).toBeNull();
    expect(outcome.raw.elapsedNs).toBe('2500000000');
    expect(outcome.raw.responseComplete).toBe(true);
  });

  it('keeps a changed-inventory storage outcome unresolved rather than resetting or issuing ownership', async () => {
    const f = await fixture(),
      p = await prepareAccumulationOpeningCapture(f.options);
    f.setNow(H - 19000);
    await p.bootstrap();
    await fs.writeFile(path.join(p.directory, 'unexpected.json'), '{}\n', { flag: 'wx' });
    f.setNow(H - 2000);
    await expect(p.capture()).rejects.toThrow('accumulation-capture-store');
    await expect(fs.stat(path.join(p.directory, 'seal.json'))).rejects.toThrow();
    const count = f.calls.length;
    await expect(p.capture()).rejects.toThrow('capture-unavailable');
    expect(f.calls).toHaveLength(count);
  });

  it('never renews H from a wall rollback between bootstrap and pool capture', async () => {
    const f = await fixture();
    let ticks = 1_000_000_000n;
    vi.spyOn(process.hrtime, 'bigint').mockImplementation(() => ticks);
    const p = await prepareAccumulationOpeningCapture(f.options);
    f.setNow(H - 19000);
    ticks += 11_000_000_000n;
    expect((await p.bootstrap()).status).toBe('bootstrapped');
    // Actual time is H+2, but the observed wall stepped backward to H−2.
    f.setNow(H - 2000);
    ticks += 21_000_000_000n;
    const result = await p.capture();
    expect(result.status).toBe('failed');
    expect(isAcquiredAccumulationOpeningCapture(result)).toBe(false);
    expect(f.calls).toHaveLength(16);
    await expect(p.capture()).rejects.toThrow('capture-unavailable');
  });

  it('rejects late preparation, altered registration and reuse before any network access', async () => {
    const f = await fixture();
    f.setNow(H - 20000);
    await expect(prepareAccumulationOpeningCapture(f.options)).rejects.toThrow('preparation-too-late');
    f.setNow(H - 30000);
    await expect(
      prepareAccumulationOpeningCapture({ ...f.options, expectedRegistrationSha256: '0'.repeat(64) })
    ).rejects.toThrow('registration-binding');
    await prepareAccumulationOpeningCapture(f.options);
    await expect(prepareAccumulationOpeningCapture(f.options)).rejects.toThrow();
    expect(f.calls).toHaveLength(0);
  });
});
