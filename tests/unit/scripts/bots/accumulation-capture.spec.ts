// @vitest-environment node
/** Entire capture uses invented source replies and a real exclusive temporary filesystem store. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  prepareAccumulationCapture,
  type AccumulationCaptureRegistration,
} from '../../../../scripts/bots/accumulation-capture';
import { createAccumulationEvidenceFixture } from './fixtures/accumulation-evidence-fixture';
import { feeBytes, hex } from './fixtures/historical-goal-bound-fee-fixture';
import { createHistoricalExecutionPoolCodec } from '../../../../scripts/bots/historical-execution-pool-codec';
import {
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '../../../../scripts/bots/historical-execution-codec';
import { isVerifiedAccumulationDecisionPacket } from '../../../../scripts/bots/accumulation-evidence-bridge';

const H = 3_600_000_000,
  UNIT = 10n ** 18n;
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const sha = (v: string | Uint8Array) => createHash('sha256').update(v).digest('hex');
const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

async function fixture(
  mode: 'normal' | 'null' | 'partial' | 'slow' | 'runtime' | 'missing-close' | 'monotonic' = 'normal'
) {
  const baseDirectory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'accumulation-capture-test-')));
  roots.push(baseDirectory);
  let wall = H + 2000;
  vi.spyOn(Date, 'now').mockImplementation(() => wall++);
  if (mode === 'monotonic') {
    let realElapsedNs = 0n;
    // Each local interval is below its timeout, while the original context genuinely expires.
    vi.spyOn(process.hrtime, 'bigint').mockImplementation(() => (realElapsedNs += 100_000_000n));
  }
  const synthetic = createAccumulationEvidenceFixture(H + 1000);
  const identity = { ...synthetic.identity, blockHash: hash(100) };
  const keys = createHistoricalExecutionPoolCodec(identity).storageKeys();
  const sourceRegistration: AccumulationCaptureRegistration = {
    kind: 'accumulation-capture-registration-v1',
    attemptName: 'invented-attempt',
    opensAtMs: H + 2100,
    closesAtMs: H + 60000,
    completedHourMs: H,
    runtime: {
      metadataSha256: sha(Buffer.from(identity.metadataHex.slice(2), 'hex')),
      codeHash: hash(902),
      ...identity.runtimeVersion,
      denominator: '1',
    },
  };
  const registrationBytes = Buffer.from(JSON.stringify(sourceRegistration) + '\n');
  const header = (n: number) => ({
    number: `0x${n.toString(16)}`,
    parentHash: hash(n - 1),
    stateRoot: hash(900),
    extrinsicsRoot: hash(901),
    digest: { logs: [] },
  });
  const row = (symbol: 'KUSD' | 'XOR') => {
    const asset = symbol === 'KUSD' ? KUSD : XOR;
    return {
      id: `asset-${asset}-HOUR-${(H - 3600000) / 1000}`,
      assetId: asset,
      type: 'HOUR',
      timestamp: H / 1000 - 1,
      denominator: '1',
      closeEvidence: {
        kind: 'finalized-hour-close',
        genesisHash: GENESIS,
        completedAt: H / 1000,
        timestamp: H / 1000 - 1,
        symbol,
        requestedSymbol: symbol,
        decimals: 18,
        blockHeight: 99,
        blockHash: hash(99),
        nextBlockHeight: 100,
        nextBlockHash: hash(100),
        nextTimestamp: H / 1000 + 1,
        xorPool:
          symbol === 'XOR'
            ? null
            : {
                baseAssetId: XOR,
                targetAssetId: KUSD,
                baseDecimals: 18,
                targetDecimals: 18,
                baseAssetReserves: String(1000n * UNIT),
                targetAssetReserves: String(2000n * UNIT),
              },
      },
    };
  };
  const connection = (symbol: 'KUSD' | 'XOR') => ({
    pageInfo: { hasNextPage: false, endCursor: null },
    edges: mode === 'missing-close' ? [] : [{ node: row(symbol) }],
  });
  const dispatch = hex(
    synthetic.registry.createType('RuntimeDispatchInfo', { weight: 3, class: 'Normal', partialFee: '6' }).toU8a()
  );
  const calls: { url: string; body: string; method: string }[] = [];
  const ambient = vi.fn(() => {
    throw Error('ambient network forbidden');
  });
  vi.stubGlobal('fetch', ambient);
  const fetcher: typeof globalThis.fetch = vi.fn(async (url, init) => {
    expect(init?.redirect).toBe('error');
    expect(init?.credentials).toBe('omit');
    const body = String(init?.body);
    const request = JSON.parse(body);
    calls.push({ url: String(url), body, method: request.method ?? 'graphql' });
    if (String(url) === 'https://pi.soramitsu.io/graphql')
      return new Response(JSON.stringify({ data: { kusd: connection('KUSD'), xor: connection('XOR') } }), {
        status: 200,
      });
    expect(String(url)).toBe('https://ws.mof.sora.org/');
    const { method, params, id } = request;
    let result: unknown;
    if (method === 'chain_getFinalizedHead') result = hash(100);
    else if (method === 'chain_getBlockHash') result = params[0] === 0 ? GENESIS : hash(params[0]);
    else if (method === 'chain_getHeader') result = header(Number(BigInt(params[0])));
    else if (method === 'state_getRuntimeVersion') result = { specName: 'sora-substrate', ...identity.runtimeVersion };
    else if (method === 'state_getMetadata') result = identity.metadataHex;
    else if (method === 'state_getStorageHash') result = mode === 'runtime' ? hash(903) : hash(902);
    else if (method === 'state_queryStorageAt')
      result = [
        {
          block: hash(100),
          changes: Object.entries(keys).map(([name, key]) => [
            key,
            synthetic.proof[name as keyof typeof synthetic.proof],
          ]),
        },
      ];
    else if (method === 'liquidityProxy_quote') {
      if (mode === 'slow') wall += 700;
      result =
        mode === 'null' && params[3] === String(5n * UNIT)
          ? null
          : {
              amount: params[3],
              amount_without_impact: params[3],
              fee: { [XOR]: '10' },
              route: [KUSD, XOR],
              rewards: [],
            };
    } else if (method === 'state_call')
      result = params[0] === 'TransactionPaymentApi_query_info' ? dispatch : feeBytes(1, 2, 3);
    else throw Error('unexpected fixture request');
    const text = JSON.stringify({ jsonrpc: '2.0', id, result });
    if (mode === 'partial' && method === 'liquidityProxy_quote' && params[3] === String(5n * UNIT)) {
      let reads = 0;
      return new Response(
        new ReadableStream<Uint8Array>({
          pull(controller) {
            if (reads++ === 0) controller.enqueue(Buffer.from(text.slice(0, 31)));
            else controller.error(Error('invented partial wire'));
          },
        }),
        { status: 200 }
      );
    }
    return new Response(text, { status: 200 });
  });
  const options = {
    baseDirectory,
    registrationBytes,
    expectedRegistrationSha256: sha(registrationBytes),
    fetch: fetcher,
  };
  return {
    options,
    calls,
    ambient,
    setNow: (value: number) => {
      wall = value;
    },
    sourceRegistration,
  };
}

describe('preregistered prospective capture orchestration', () => {
  it('durably collects the original source,16 bootstrap calls and28 quote/fee calls without a model or transaction', async () => {
    const f = await fixture();
    const prepared = await prepareAccumulationCapture(f.options);
    expect(f.calls).toHaveLength(0);
    await expect(prepared.collect()).rejects.toThrow('not-due');
    f.setNow(H + 2100);
    const result = await prepared.collect();
    expect(result.status).toBe('verified');
    expect(isVerifiedAccumulationDecisionPacket(result.verified)).toBe(true);
    expect(result).toMatchObject({ financialActions: false, qualificationAuthority: false, modelEvaluated: false });
    expect(f.calls).toHaveLength(45);
    expect(f.calls.filter((v) => v.method === 'liquidityProxy_quote')).toHaveLength(9);
    expect(f.calls.filter((v) => v.method === 'state_call')).toHaveLength(18);
    expect(f.ambient).not.toHaveBeenCalled();
    const packet = JSON.parse(await fs.readFile(path.join(result.directory, 'packet.json'), 'utf8'));
    expect(packet.contextRpc).toHaveLength(15);
    expect(packet.candidates).toHaveLength(9);
    expect(packet.contextRpc.at(-1).requestBody).toBe(f.calls.find((v) => v.method === 'state_queryStorageAt')?.body);
    expect((await fs.readdir(result.directory)).filter((name) => name.startsWith('bootstrap-rpc-'))).toHaveLength(32);
    expect((await fs.readdir(result.directory)).filter((name) => name.startsWith('quote-rpc-'))).toHaveLength(56);
    await expect(prepared.collect()).rejects.toThrow('already-attempted');
  });

  it.each(['null', 'partial', 'slow'] as const)(
    'preserves %s outcomes and original expiration without resampling',
    async (mode) => {
      const f = await fixture(mode);
      const prepared = await prepareAccumulationCapture(f.options);
      f.setNow(H + 2100);
      const result = await prepared.collect();
      expect(result.status).toBe(mode === 'null' ? 'verified' : 'incomplete');
      expect(result.verified?.packet.candidates).toHaveLength(9);
      expect(f.calls.filter((v) => v.method === 'liquidityProxy_quote')).toHaveLength(9);
      if (mode === 'null') expect(result.verified?.packet.candidates[4].status).toBe('unavailable');
      if (mode === 'partial') expect(result.verified?.packet.candidates[4].status).toBe('failed');
      if (mode === 'slow') expect(result.verified?.diagnostics).toContain('stale-context-or-block');
      expect(result.modelEvaluated).toBe(false);
    }
  );

  it.each(['runtime', 'missing-close'] as const)(
    'retains and seals %s failure before any native quote',
    async (mode) => {
      const f = await fixture(mode);
      const prepared = await prepareAccumulationCapture(f.options);
      f.setNow(H + 2100);
      const result = await prepared.collect();
      expect(result.status).toBe('failed');
      expect(result.verified).toBeNull();
      expect(f.calls.filter((v) => v.method === 'liquidityProxy_quote')).toHaveLength(0);
      expect(JSON.parse(await fs.readFile(path.join(result.directory, 'failure.json'), 'utf8')).reason).toBe(
        mode === 'runtime' ? 'capture-failed-native-bootstrap' : 'capture-failed-completed-close'
      );
      expect(await fs.stat(path.join(result.directory, 'seal.json'))).toBeTruthy();
    }
  );

  it('rejects late or changed registration before creating capture files or accessing sources', async () => {
    const f = await fixture();
    await expect(
      prepareAccumulationCapture({ ...f.options, expectedRegistrationSha256: '0'.repeat(64) })
    ).rejects.toThrow('registration-digest');
    f.setNow(H + 2100);
    await expect(prepareAccumulationCapture(f.options)).rejects.toThrow('preparation-too-late');
    expect(await fs.readdir(f.options.baseDirectory)).toEqual([]);
    expect(f.calls).toHaveLength(0);
  });

  it('seals a missed window with no source calls and never resets that attempt', async () => {
    const f = await fixture();
    const prepared = await prepareAccumulationCapture(f.options);
    f.setNow(H + 60000);
    const result = await prepared.collect();
    expect(result.status).toBe('failed');
    expect(f.calls).toHaveLength(0);
    await expect(prepared.collect()).rejects.toThrow('already-attempted');
  });

  it('rejects real elapsed context expiry even when wall receipts alone still appear fresh', async () => {
    const f = await fixture('monotonic');
    const prepared = await prepareAccumulationCapture(f.options);
    f.setNow(H + 2100);
    const result = await prepared.collect();
    expect(result.status).toBe('failed');
    expect(result.verified).toBeNull();
    const packet = JSON.parse(await fs.readFile(path.join(result.directory, 'packet.json'), 'utf8'));
    expect(packet.decisionAtMs - packet.contextReceivedAtMs).toBeLessThan(5000);
    expect(
      packet.candidates.every((c: { rpc: { failure: string | null }[] }) => c.rpc.every((r) => r.failure === null))
    ).toBe(true);
    const clocks = JSON.parse(await fs.readFile(path.join(result.directory, 'observation-clocks.json'), 'utf8'));
    expect(BigInt(clocks.decisionElapsedNs)).toBeGreaterThanOrEqual(5_000_000_000n);
    expect(JSON.parse(await fs.readFile(path.join(result.directory, 'failure.json'), 'utf8')).reason).toBe(
      'capture-failed-decision-clock'
    );
  });
});
