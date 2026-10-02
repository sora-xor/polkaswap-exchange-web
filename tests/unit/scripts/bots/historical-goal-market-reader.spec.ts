import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHistoricalPoolFixture } from '../../../fixtures/bots/historical-pool';
import { createHistoricalExecutionPoolCodec } from '../../../../scripts/bots/historical-execution-pool-codec';
import {
  createHistoricalGoalMarketReader,
  HistoricalGoalMarketReadError,
} from '../../../../scripts/bots/historical-goal-market-reader';

const doubles = vi.hoisted(() => ({ createBlockReader: vi.fn() }));
vi.mock('../../../../scripts/bots/historical-execution-block-reader', () => ({
  createHistoricalExecutionBlockReader: doubles.createBlockReader,
  HistoricalExecutionBlockReadError: class extends Error {},
}));

const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const le = (value: number | bigint, size = 8) => {
  const bytes = Buffer.alloc(size);
  let n = BigInt(value);
  for (let i = 0; i < size; i++, n >>= 8n) bytes[i] = Number(n & 255n);
  return `0x${bytes.toString('hex')}`;
};

function setup() {
  const fixture = createHistoricalPoolFixture();
  const source = {
    finalizedSource: { hash: hash(1000), height: 1000, receiptSha256: 'a'.repeat(64) },
    schemaAnchor: { hash: fixture.identity.blockHash, height: 10 },
  };
  const keys = createHistoricalExecutionPoolCodec(fixture.identity).storageKeys();
  const block = (height: number) =>
    Object.freeze({
      height,
      hash: height === 10 ? fixture.identity.blockHash : hash(height),
      parentHash: hash(height - 1),
      timestampMs: 1_000_000 + (height - 10) * 6_000,
    });
  const readBlock = vi.fn(async (height: number) => block(height));
  const context = Object.freeze({
    endpoint: 'https://mof2.sora.org/',
    genesisHash: fixture.identity.genesisHash,
    ...source,
    finalizedObservation: { kind: 'rpc-canonical-finalized', hash: hash(1000), height: 1000 },
    schema: {
      metadataSha256: createHash('sha256')
        .update(Buffer.from(fixture.identity.metadataHex.slice(2), 'hex'))
        .digest('hex'),
      codeHash: hash(2),
      runtimeVersion: { specName: 'sora-substrate', ...fixture.identity.runtimeVersion },
    },
    observedFill: false,
  });
  const evidence = Object.freeze([
    {
      id: 10,
      method: 'state_getMetadata',
      params: Object.freeze([source.schemaAnchor.hash]),
      responseBody: JSON.stringify({ jsonrpc: '2.0', id: 10, result: fixture.identity.metadataHex }),
    },
  ]);
  doubles.createBlockReader.mockResolvedValue({ context, readBlock, evidence: () => evidence });
  let transform: (body: Record<string, unknown>) => unknown = (body) => body;
  let proof = { ...fixture.proof };
  const fetch = vi.fn(async (_url: unknown, init: RequestInit) => {
    const request = JSON.parse(init.body as string);
    const height = readBlock.mock.calls.at(-1)![0];
    const values = {
      ...proof,
      timestamp: proof.timestamp === fixture.proof.timestamp ? le(block(height).timestampMs) : proof.timestamp,
    };
    const body = {
      jsonrpc: '2.0',
      id: request.id,
      result: [
        {
          block: request.params[1],
          changes: Object.entries(keys).map(([label, key]) => [key, values[label as keyof typeof values]]),
        },
      ],
    };
    return new Response(JSON.stringify(transform(body)), { status: 200 });
  });
  return {
    fixture,
    source,
    keys,
    block,
    readBlock,
    context,
    evidence,
    fetch,
    setTransform: (value: typeof transform) => {
      transform = value;
    },
    setProof: (value: Partial<Record<keyof typeof proof, string | null>>) => {
      proof = { ...proof, ...value } as typeof proof;
    },
    create: (options: Record<string, unknown> = {}) =>
      createHistoricalGoalMarketReader(
        { source, expectedDenominator: '1' },
        { fetch: fetch as unknown as typeof globalThis.fetch, ...options }
      ),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('historical goal market reader', () => {
  it('reads all seven fields at one canonical hash and decodes an exact positive pool', async () => {
    const h = setup();
    const reader = await h.create();
    const result = await reader.readMark(10);
    expect(h.readBlock).toHaveBeenCalledWith(10);
    expect(h.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = h.fetch.mock.calls[0];
    expect(url).toBe('https://mof2.sora.org/');
    expect(init).toMatchObject({ redirect: 'error', credentials: 'omit', method: 'POST' });
    expect(JSON.parse(init.body as string)).toEqual({
      jsonrpc: '2.0',
      id: 1,
      method: 'state_queryStorageAt',
      params: [Object.values(h.keys), h.block(10).hash],
    });
    expect(result.mark).toEqual({
      timestampMs: 1_000_000,
      blockHash: h.block(10).hash,
      kusdReserveCodec: '2000000000000000000',
      xorReserveCodec: '3000000000000000000',
    });
    expect(result.poolEvidence.binding.blockHash).toBe(h.block(10).hash);
    expect(result.poolEvidence.state.denominator).toBe('1');
    expect(reader.evidence()).toMatchObject({ blockReads: 1, markReads: 1 });
    expect(Object.isFrozen(result.poolEvidence.binding.runtimeVersion)).toBe(true);
    expect(Object.isFrozen(reader.evidence().storageEvidence[0].keys)).toBe(true);
  });

  it('shares immutable canonical and mark caches without rereading or transferring identity fields to a new block', async () => {
    const h = setup();
    const reader = await h.create();
    await reader.readBlock(10);
    const first = await reader.readMark(10);
    expect(await reader.readMark(10)).toBe(first);
    expect(await reader.readBlock(10)).toBe(first.block);
    const second = await reader.readMark(11);
    expect(h.readBlock).toHaveBeenCalledTimes(2);
    expect(h.fetch).toHaveBeenCalledTimes(2);
    expect(second.poolEvidence.binding.blockHash).toBe(h.block(11).hash);
    expect(second.poolEvidence.state.timestampMs).toBe(h.block(11).timestampMs);
    expect(reader.evidence()).toMatchObject({ blockReads: 2, markReads: 2 });
  });

  it.each(['absent', 'missing-reserves', 'zero-reserves'] as const)(
    'retains %s without fabricating a usable mark',
    async (status) => {
      const h = setup();
      h.setProof(
        status === 'absent'
          ? { properties: null, reserves: null }
          : status === 'missing-reserves'
            ? { reserves: null }
            : { reserves: `0x${'00'.repeat(32)}` }
      );
      const result = await (await h.create()).readMark(10);
      expect(result.poolEvidence.status).toBe(status);
      expect(result.mark).toBeUndefined();
      expect(result.poolEvidence.marks).toBeNull();
    }
  );

  it.each(['denominator', 'timestamp', 'asset-metadata'] as const)(
    'rejects inconsistent same-state %s and permanently stops the shard',
    async (kind) => {
      const h = setup();
      h.setProof(
        kind === 'denominator'
          ? { denominator: le(2, 16) }
          : kind === 'timestamp'
            ? { timestamp: le(1) }
            : { kusd: '0x00' }
      );
      const reader = await h.create();
      const error = await reader.readMark(10).catch((e) => e);
      expect(error).toBeInstanceOf(HistoricalGoalMarketReadError);
      expect(error.diagnostic.stage).toBe('mark');
      await expect(reader.readMark(11)).rejects.toBe(error);
      expect(h.fetch).toHaveBeenCalledTimes(1);
      expect(Object.isFrozen(error.diagnostic.storageEvidence)).toBe(true);
    }
  );

  it.each([
    'wrong-block',
    'missing-key',
    'duplicate-key',
    'extra-key',
    'multiple-sets',
    'missing-set',
    'wrong-id',
    'error',
    'invalid-value',
  ] as const)('rejects %s batch evidence without fallback', async (kind) => {
    const h = setup();
    h.setTransform((body) => {
      const value = body as { id: number; error?: unknown; result: { block: string; changes: unknown[][] }[] };
      const set = value.result[0];
      if (kind === 'wrong-block') set.block = hash(999);
      if (kind === 'missing-key') set.changes.pop();
      if (kind === 'duplicate-key') set.changes[6] = set.changes[0];
      if (kind === 'extra-key') set.changes[6][0] = '0x1234';
      if (kind === 'multiple-sets') value.result.push(set);
      if (kind === 'missing-set') value.result = [];
      if (kind === 'wrong-id') value.id++;
      if (kind === 'error') value.error = { code: -32601, message: 'unsupported' };
      if (kind === 'invalid-value') set.changes[0][1] = 2;
      return value;
    });
    const reader = await h.create();
    await expect(reader.readMark(10)).rejects.toBeInstanceOf(HistoricalGoalMarketReadError);
    expect(h.fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects an oversized response before reading it and records a bounded failure', async () => {
    const h = setup();
    h.fetch.mockResolvedValue(new Response('x', { headers: { 'content-length': String(128 * 1024 + 1) } }));
    const reader = await h.create();
    const error = await reader.readMark(10).catch((e) => e);
    expect(error.diagnostic.reason).toBe('response-limit');
    expect(error.diagnostic.storageEvidence[0].responseBody).toBeUndefined();
  });

  it('also bounds streamed response bytes without content-length', async () => {
    const h = setup();
    h.fetch.mockResolvedValue(new Response('x'.repeat(128 * 1024 + 1)));
    const error = await (await h.create()).readMark(10).catch((e) => e);
    expect(error.diagnostic.reason).toBe('response-limit');
    expect(error.diagnostic.storageEvidence[0].responseBody).toBeUndefined();
  });

  it('times out body reads, preserves the diagnostic, and prevents late completion from changing it', async () => {
    const h = setup();
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    h.fetch.mockResolvedValue(
      new Response(
        new ReadableStream<Uint8Array>({
          start: (value) => {
            controller = value;
          },
        })
      )
    );
    const reader = await h.create({ timeoutMs: 5 });
    const error = await reader.readMark(10).catch((e) => e);
    expect(error.diagnostic.reason).toBe('timeout');
    const diagnostic = JSON.stringify(error.diagnostic);
    controller!.enqueue(new TextEncoder().encode('{}'));
    controller!.close();
    await new Promise((resolve) => setTimeout(resolve, 1));
    expect(JSON.stringify(error.diagnostic)).toBe(diagnostic);
    expect(reader.evidence().storageEvidence).toEqual(error.diagnostic.storageEvidence);
    await expect(reader.readMark(10)).rejects.toBe(error);
  });

  it('rejects concurrent use without duplicating or poisoning the active request', async () => {
    const h = setup();
    const original = h.fetch.getMockImplementation()!;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    h.fetch.mockImplementation(async (...args) => {
      await gate;
      return original(...args);
    });
    const reader = await h.create();
    const pending = reader.readMark(10);
    await expect(reader.readBlock(11)).rejects.toMatchObject({ diagnostic: { reason: 'concurrent-read' } });
    release();
    expect((await pending).mark).toBeDefined();
    expect(await reader.readMark(10)).toBe(await pending);
    expect(h.fetch).toHaveBeenCalledTimes(1);
  });

  it('cancels a response body returned by a transport after timeout without mutating evidence', async () => {
    const h = setup();
    let respond: (value: Response) => void = () => undefined;
    h.fetch.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          respond = resolve;
        })
    );
    const reader = await h.create({ timeoutMs: 5 });
    const error = await reader.readMark(10).catch((e) => e);
    expect(error.diagnostic.reason).toBe('timeout');
    const retained = JSON.stringify(reader.evidence());
    const cancel = vi.fn();
    respond(new Response(new ReadableStream<Uint8Array>({ cancel })));
    await new Promise((resolve) => setTimeout(resolve, 1));
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(reader.evidence())).toBe(retained);
    await expect(reader.readMark(10)).rejects.toBe(error);
  });

  it('retains the 64 unique-block cap even for metadata-only caller requests', async () => {
    const h = setup();
    const reader = await h.create();
    for (let i = 10; i < 74; i++) await reader.readBlock(i);
    expect(await reader.readBlock(10)).toEqual(h.block(10));
    await expect(reader.readBlock(74)).rejects.toMatchObject({ diagnostic: { reason: 'block-limit' } });
    expect(h.readBlock).toHaveBeenCalledTimes(64);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it('pins the denominator before awaits and rejects request accessors without invoking them', async () => {
    const h = setup();
    const input = { source: h.source, expectedDenominator: '1' };
    const creating = createHistoricalGoalMarketReader(input, { fetch: h.fetch as unknown as typeof fetch });
    input.expectedDenominator = '2';
    expect((await (await creating).readMark(10)).poolEvidence.state.denominator).toBe('1');
    const getter = vi.fn(() => '1');
    Object.defineProperty(input, 'expectedDenominator', { enumerable: true, get: getter });
    await expect(createHistoricalGoalMarketReader(input)).rejects.toBeInstanceOf(HistoricalGoalMarketReadError);
    expect(getter).not.toHaveBeenCalled();
  });

  it('rejects metadata hash mismatches before requesting market state', async () => {
    const h = setup();
    doubles.createBlockReader.mockResolvedValue({
      context: { ...h.context, schema: { ...h.context.schema, metadataSha256: 'b'.repeat(64) } },
      readBlock: h.readBlock,
      evidence: () => h.evidence,
    });
    await expect(h.create()).rejects.toBeInstanceOf(HistoricalGoalMarketReadError);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it('aborts before a market request and does not serve cached results after cancellation', async () => {
    const h = setup();
    const controller = new AbortController();
    const reader = await h.create({ signal: controller.signal });
    await reader.readMark(10);
    controller.abort();
    await expect(reader.readMark(10)).rejects.toMatchObject({ diagnostic: { reason: 'aborted' } });
    expect(h.fetch).toHaveBeenCalledTimes(1);
  });
});
