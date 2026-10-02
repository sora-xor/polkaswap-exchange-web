import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { Metadata, TypeRegistry } from '@polkadot/types';
import {
  createHistoricalExecutionBlockReader,
  HistoricalExecutionBlockReadError,
  type HistoricalBlockReaderSource,
} from '../../../../scripts/bots/historical-execution-block-reader';

const ENDPOINT = 'https://mof2.sora.org/';
const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const TIMESTAMP_KEY = '0xf0c365c3cf59d671eb72da0e7a4113c49f1f0515f462cdcf84e0f1d6045dfcbb';
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const source = (): HistoricalBlockReaderSource => ({
  finalizedSource: { hash: hash(110), height: 110, receiptSha256: 'f'.repeat(64) },
  schemaAnchor: { hash: hash(100), height: 100 },
});
const header = (height: number) => ({
  number: `0x${height.toString(16)}`,
  parentHash: hash(height - 1),
  stateRoot: GENESIS,
  extrinsicsRoot: GENESIS,
  digest: { logs: [] },
});
const timestamp = (n: bigint | number) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return `0x${b.toString('hex')}`;
};

/** Small invented metadata exercises the actual SCALE metadata parser without market fixtures. */
function metadata(kind = 'valid') {
  const registry = new TypeRegistry();
  const entry = {
    name: 'Now',
    modifier: 'Default',
    type: kind === 'map' ? { map: { hashers: ['Identity'], key: 0, value: 0 } } : { plain: 0 },
    fallback: '0x0000000000000000',
    docs: [],
  };
  const value = new Metadata(registry, {
    magicNumber: 0x6174656d,
    metadata: {
      V14: {
        lookup: {
          types: [
            { id: 0, type: { path: [], params: [], docs: [], def: { primitive: kind === 'u32' ? 'U32' : 'U64' } } },
            { id: 1, type: { path: [], params: [], docs: [], def: { tuple: [] } } },
          ],
        },
        pallets: [
          {
            name: 'Timestamp',
            index: 0,
            storage: {
              prefix: kind === 'key' ? 'OtherTimestamp' : 'Timestamp',
              items: kind === 'duplicate' ? [entry, entry] : [entry],
            },
            calls: null,
            events: null,
            errors: null,
            constants: [],
          },
        ],
        extrinsic: { type: 1, version: 4, signedExtensions: [] },
        type: 1,
      },
    },
  });
  return `0x${Buffer.from(value.toU8a()).toString('hex')}`;
}
type Call = { jsonrpc: string; id: number; method: string; params: Array<string | number> };
function transport(mutate?: (call: Call, value: unknown) => unknown) {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    expect(url).toBe(ENDPOINT);
    expect(init).toMatchObject({ method: 'POST', redirect: 'error', credentials: 'omit', cache: 'no-store' });
    const call = JSON.parse(String(init?.body)) as Call;
    let value: unknown;
    const height = Number(BigInt(String(call.params[0] ?? 0)));
    switch (call.method) {
      case 'chain_getBlockHash':
        value = call.params[0] === 0 ? GENESIS : hash(Number(call.params[0]));
        break;
      case 'chain_getFinalizedHead':
        value = hash(120);
        break;
      case 'chain_getHeader':
        value = header(height);
        break;
      case 'state_getRuntimeVersion':
        value = { specName: 'sora-substrate', specVersion: 130, transactionVersion: 130 };
        break;
      case 'state_getStorageHash':
        value = hash(900);
        break;
      case 'state_getMetadata':
        value = metadata();
        break;
      case 'state_getStorage':
        value = timestamp(1_000_000_000_000n + BigInt(call.params[1]));
        break;
      default:
        throw new Error('Unexpected fixture RPC');
    }
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: call.id, result: mutate ? mutate(call, value) : value }));
  });
}
const calls = (fetcher: ReturnType<typeof transport>) =>
  fetcher.mock.calls.map(([, init]) => JSON.parse(String(init?.body)) as Call);
async function failure(pending: Promise<unknown>) {
  try {
    await pending;
  } catch (error) {
    expect(error).toBeInstanceOf(HistoricalExecutionBlockReadError);
    return error as HistoricalExecutionBlockReadError;
  }
  throw new Error('Expected block reader failure');
}

beforeEach(() => vi.restoreAllMocks());

describe('bounded historical execution block reader', () => {
  it('attests the source once, verifies historical Timestamp.Now metadata, and pins all block reads', async () => {
    const fetcher = transport();
    const reader = await createHistoricalExecutionBlockReader(source(), { fetch: fetcher });
    expect(calls(fetcher)).toHaveLength(10);
    expect(reader.context).toMatchObject({
      endpoint: ENDPOINT,
      schema: {
        key: TIMESTAMP_KEY,
        type: 'u64',
        unit: 'milliseconds',
        codeHash: hash(900),
        runtimeVersion: { specVersion: 130 },
      },
      finalizedObservation: { height: 120 },
    });
    const before = reader.evidence();
    const result = await reader.readBlock(101);
    expect(result).toEqual({ hash: hash(101), parentHash: hash(100), height: 101, timestampMs: 1_000_000_000_101 });
    expect(
      calls(fetcher)
        .slice(10)
        .map(({ method, params }) => [method, params])
    ).toEqual([
      ['chain_getBlockHash', [101]],
      ['chain_getHeader', [hash(101)]],
      ['state_getStorageHash', ['0x3a636f6465', hash(101)]],
      ['state_getStorage', [TIMESTAMP_KEY, hash(101)]],
    ]);
    await reader.readBlock(102);
    expect(calls(fetcher).filter((item) => item.method === 'chain_getFinalizedHead')).toHaveLength(1);
    expect(calls(fetcher).filter((item) => item.method === 'state_getMetadata')).toHaveLength(1);
    expect(
      calls(fetcher)
        .filter((item) => item.method === 'state_getRuntimeVersion')
        .map((item) => item.params)
    ).toEqual([[hash(100)]]);
    expect(before).toHaveLength(10);
    expect(reader.evidence()).toHaveLength(18);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(before[0].params)).toBe(true);
    expect(Object.isFrozen(reader.context.schema)).toBe(true);
  });

  it('copies source inputs before an asynchronous transport can mutate them', async () => {
    const input = source();
    const fetcher = transport((call, value) => {
      if (call.id === 1) {
        input.schemaAnchor.height = 99;
        input.finalizedSource.hash = hash(999);
      }
      return value;
    });
    const reader = await createHistoricalExecutionBlockReader(input, { fetch: fetcher });
    expect(reader.context.schemaAnchor.height).toBe(100);
    expect(reader.context.finalizedSource.hash).toBe(hash(110));
  });

  it('rejects contradictory canonical anchors and reused hash/header identities', async () => {
    const conflict = transport((call, value) => (call.id === 2 ? hash(119) : call.id === 3 ? header(110) : value));
    await failure(createHistoricalExecutionBlockReader(source(), { fetch: conflict }));
    expect(conflict).toHaveBeenCalledTimes(5);
    const repeatedHash = transport();
    await failure(
      createHistoricalExecutionBlockReader(
        { ...source(), schemaAnchor: { height: 100, hash: hash(110) } },
        { fetch: repeatedHash }
      )
    );
    expect(repeatedHash).not.toHaveBeenCalled();
    const shared = { ...source(), schemaAnchor: { height: 110, hash: hash(110) } };
    const changedHeader = transport((call, value) =>
      call.id === 7 ? { ...header(110), stateRoot: hash(888) } : value
    );
    await failure(createHistoricalExecutionBlockReader(shared, { fetch: changedHeader }));
    expect(changedHeader).toHaveBeenCalledTimes(7);
  });

  it('rechecks each block against known canonical hash and complete header identities', async () => {
    const fetcher = transport((call, value) => (call.id === 12 ? { ...header(100), parentHash: hash(98) } : value));
    const reader = await createHistoricalExecutionBlockReader(source(), { fetch: fetcher });
    const error = await failure(reader.readBlock(100));
    expect(error.diagnostic).toMatchObject({ stage: 'block', reason: 'invalid-evidence' });
    expect(fetcher).toHaveBeenCalledTimes(12);
  });

  it.each([
    'genesis',
    'finality',
    'source-hash',
    'source-header',
    'schema-hash',
    'schema-header',
    'runtime-name',
    'runtime-version',
    'code',
  ])('rejects inconsistent %s attestation', async (kind) => {
    const fetcher = transport((call, value) => {
      if (kind === 'genesis' && call.id === 1) return hash(999);
      if (kind === 'finality' && call.id === 3) return header(109);
      if (kind === 'source-hash' && call.id === 4) return hash(999);
      if (kind === 'source-header' && call.id === 5) return header(109);
      if (kind === 'schema-hash' && call.id === 6) return hash(999);
      if (kind === 'schema-header' && call.id === 7) return header(99);
      if (kind === 'runtime-name' && call.id === 8)
        return { specName: 'sora', specVersion: 130, transactionVersion: 130 };
      if (kind === 'runtime-version' && call.id === 8)
        return { specName: 'sora-substrate', specVersion: 132, transactionVersion: 132 };
      if (kind === 'code' && call.id === 9) return null;
      return value;
    });
    await failure(createHistoricalExecutionBlockReader(source(), { fetch: fetcher }));
    expect(calls(fetcher).some((item) => item.method === 'state_getStorage')).toBe(false);
  });

  it.each(['map', 'u32', 'key', 'duplicate'])('rejects an unsupported Timestamp.Now %s layout', async (kind) => {
    const fetcher = transport((call, value) => (call.method === 'state_getMetadata' ? metadata(kind) : value));
    const error = await failure(createHistoricalExecutionBlockReader(source(), { fetch: fetcher }));
    expect(error.diagnostic.stage).toBe('schema');
    expect(error.diagnostic.rpcEvidence.at(-1)?.responseBody).toBeTruthy();
    expect(fetcher).toHaveBeenCalledTimes(10);
  });

  it.each([
    'missing-block',
    'missing-timestamp',
    'runtime-changed',
    'header',
    'timestamp-short',
    'timestamp-long',
    'timestamp-zero',
    'timestamp-unsafe',
  ])('retains %s and stops without replacement or retry', async (kind) => {
    const fetcher = transport((call, value) => {
      if (call.id <= 10) return value;
      if (kind === 'missing-block' && call.method === 'chain_getBlockHash') return null;
      if (kind === 'missing-timestamp' && call.method === 'state_getStorage') return null;
      if (kind === 'runtime-changed' && call.method === 'state_getStorageHash') return hash(901);
      if (kind === 'header' && call.method === 'chain_getHeader') return header(99);
      if (call.method === 'state_getStorage') {
        if (kind === 'timestamp-short') return '0x0000';
        if (kind === 'timestamp-long') return '0x000000000000000000';
        if (kind === 'timestamp-zero') return timestamp(0);
        if (kind === 'timestamp-unsafe') return timestamp(BigInt(Number.MAX_SAFE_INTEGER) + 1n);
      }
      return value;
    });
    const reader = await createHistoricalExecutionBlockReader(source(), { fetch: fetcher });
    const error = await failure(reader.readBlock(101));
    const count = fetcher.mock.calls.length;
    expect(error.diagnostic).toMatchObject({ stage: 'block', blockHeight: 101, blockReads: 1 });
    expect(error.diagnostic.rpcEvidence.at(-1)?.responseBody).toBeTruthy();
    await expect(reader.readBlock(102)).rejects.toBe(error);
    expect(fetcher).toHaveBeenCalledTimes(count);
  });

  it('rejects heights above the frozen source and enforces 64 total block reads', async () => {
    const fetcher = transport();
    const reader = await createHistoricalExecutionBlockReader(source(), { fetch: fetcher });
    await failure(reader.readBlock(111));
    expect(fetcher).toHaveBeenCalledTimes(10);
    const boundedFetch = transport();
    const bounded = await createHistoricalExecutionBlockReader(source(), { fetch: boundedFetch });
    for (let n = 1; n <= 64; n += 1) await bounded.readBlock(n);
    expect((await failure(bounded.readBlock(65))).diagnostic.reason).toBe('block-limit');
    expect(boundedFetch).toHaveBeenCalledTimes(266);
  });

  it('rejects malformed sources and accessors without invoking getters or fetching', async () => {
    const getter = vi.fn(() => hash(100));
    const accessor = source();
    Object.defineProperty(accessor.schemaAnchor, 'hash', { enumerable: true, get: getter });
    const fetcher = transport();
    for (const input of [
      accessor,
      { ...source(), schemaAnchor: { hash: hash(111), height: 111 } },
      { ...source(), finalizedSource: { ...source().finalizedSource, receiptSha256: 'invalid' } },
    ])
      await failure(createHistoricalExecutionBlockReader(input, { fetch: fetcher }));
    expect(getter).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(['status', 'id', 'jsonrpc', 'rpc-error', 'redirect', 'invalid-json'])(
    'retains bad HTTP/RPC %s without retrying',
    async (kind) => {
      const fetcher = vi.fn(async () => {
        const body: Record<string, unknown> = {
          jsonrpc: kind === 'jsonrpc' ? '1.0' : '2.0',
          id: kind === 'id' ? 2 : 1,
          result: GENESIS,
        };
        if (kind === 'rpc-error') body.error = { code: -32000, message: 'Fixture failure' };
        const response = new Response(kind === 'invalid-json' ? '{' : JSON.stringify(body), {
          status: kind === 'status' ? 502 : 200,
        });
        if (kind === 'redirect') Object.defineProperty(response, 'redirected', { value: true });
        return response;
      });
      const error = await failure(createHistoricalExecutionBlockReader(source(), { fetch: fetcher }));
      expect(error.diagnostic.rpcEvidence).toHaveLength(1);
      if (kind !== 'redirect') expect(error.diagnostic.rpcEvidence[0].responseBody).toBeTruthy();
      expect(fetcher).toHaveBeenCalledOnce();
    }
  );

  it('bounds actual, declared and cumulative response bytes', async () => {
    for (const response of [
      new Response('x'.repeat(2 * 1024 * 1024 + 1)),
      new Response('{}', { headers: { 'content-length': String(2 * 1024 * 1024 + 1) } }),
    ]) {
      const fetcher = vi.fn(async () => response);
      expect(
        (await failure(createHistoricalExecutionBlockReader(source(), { fetch: fetcher }))).diagnostic.reason
      ).toBe('response-limit');
      expect(fetcher).toHaveBeenCalledOnce();
    }
    const base = transport();
    const fetcher = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) =>
        new Response(`${await (await base(url, init)).text()}${' '.repeat(800_000)}`)
    );
    const reader = await createHistoricalExecutionBlockReader(source(), { fetch: fetcher });
    await reader.readBlock(101);
    expect((await failure(reader.readBlock(102))).diagnostic.reason).toBe('response-limit');
    expect(fetcher.mock.calls.length).toBeLessThan(18);
  });

  it('preserves exact malformed wire bytes and their hash instead of normalizing away encoding errors', async () => {
    for (const bytes of [Buffer.from([0xff]), Buffer.from('\uFEFF{}')]) {
      const fetcher = vi.fn(async () => new Response(bytes));
      const error = await failure(createHistoricalExecutionBlockReader(source(), { fetch: fetcher }));
      const evidence = error.diagnostic.rpcEvidence[0];
      expect(evidence.responseSha256).toBe(createHash('sha256').update(bytes).digest('hex'));
      const retained =
        evidence.responseBodyBase64 === undefined
          ? Buffer.from(evidence.responseBody!)
          : Buffer.from(evidence.responseBodyBase64, 'base64');
      expect(retained).toEqual(bytes);
      expect(fetcher).toHaveBeenCalledOnce();
    }
  });

  it('honors pre-abort and cancels a stalled body on timeout', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetcher = transport();
    expect(
      (await failure(createHistoricalExecutionBlockReader(source(), { fetch: fetcher, signal: controller.signal })))
        .diagnostic.reason
    ).toBe('aborted');
    expect(fetcher).not.toHaveBeenCalled();
    const cancel = vi.fn();
    const stalled = vi.fn(async () => new Response(new ReadableStream<Uint8Array>({ cancel })));
    expect(
      (await failure(createHistoricalExecutionBlockReader(source(), { fetch: stalled, timeoutMs: 2 }))).diagnostic
        .reason
    ).toBe('timeout');
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('rejects non-scalar heights and option accessors without retaining caller objects or invoking getters', async () => {
    const fetcher = transport();
    const reader = await createHistoricalExecutionBlockReader(source(), { fetch: fetcher });
    const coercion = vi.fn(() => 101);
    const invalid = { valueOf: coercion };
    const error = await failure(reader.readBlock(invalid as unknown as number));
    expect(error.diagnostic).not.toHaveProperty('blockHeight');
    expect(coercion).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledTimes(10);
    const getter = vi.fn(() => fetcher);
    const options = Object.defineProperty({}, 'fetch', { enumerable: true, get: getter });
    await failure(createHistoricalExecutionBlockReader(source(), options));
    expect(getter).not.toHaveBeenCalled();
  });

  it('honors abort between transport resolution and processing without reading or continuing', async () => {
    const controller = new AbortController();
    const cancel = vi.fn();
    const fetcher = vi.fn(async () => {
      controller.abort();
      return new Response(new ReadableStream<Uint8Array>({ cancel }));
    });
    const error = await failure(
      createHistoricalExecutionBlockReader(source(), { fetch: fetcher, signal: controller.signal })
    );
    expect(error.diagnostic.reason).toBe('aborted');
    expect(error.diagnostic.rpcEvidence[0]).not.toHaveProperty('httpStatus');
    expect(cancel).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('cancels an ignored-abort late response without mutating returned failure evidence', async () => {
    let resolveResponse!: (response: Response) => void;
    const fetcher = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        })
    );
    const error = await failure(createHistoricalExecutionBlockReader(source(), { fetch: fetcher, timeoutMs: 2 }));
    const before = JSON.stringify(error.diagnostic);
    const cancel = vi.fn();
    resolveResponse(new Response(new ReadableStream<Uint8Array>({ cancel })));
    await new Promise((resolve) => setImmediate(resolve));
    expect(error.diagnostic.reason).toBe('timeout');
    expect(JSON.stringify(error.diagnostic)).toBe(before);
    expect(error.diagnostic.rpcEvidence[0]).not.toHaveProperty('httpStatus');
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('rejects concurrent reads without extra RPC or abandoning the active serial read', async () => {
    const base = transport();
    let resume!: () => void;
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if ((JSON.parse(String(init?.body)) as Call).id === 11)
        await new Promise<void>((resolve) => {
          resume = resolve;
        });
      return base(url, init);
    });
    const reader = await createHistoricalExecutionBlockReader(source(), { fetch: fetcher });
    const first = reader.readBlock(101);
    const concurrent = await failure(reader.readBlock(102));
    const before = JSON.stringify(concurrent.diagnostic);
    expect(concurrent.diagnostic.reason).toBe('concurrent-read');
    expect(fetcher).toHaveBeenCalledTimes(11);
    resume();
    expect((await first).height).toBe(101);
    expect(JSON.stringify(concurrent.diagnostic)).toBe(before);
    expect((await reader.readBlock(102)).height).toBe(102);
    expect(fetcher).toHaveBeenCalledTimes(18);
  });

  it('keeps a timed-out block session stopped after a late response and retains its diagnostic', async () => {
    const base = transport();
    let resolveResponse!: (response: Response) => void;
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if ((JSON.parse(String(init?.body)) as Call).id === 11)
        return new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        });
      return base(url, init);
    });
    const reader = await createHistoricalExecutionBlockReader(source(), { fetch: fetcher, timeoutMs: 10 });
    const error = await failure(reader.readBlock(101));
    const before = JSON.stringify(error.diagnostic);
    const cancel = vi.fn();
    resolveResponse(new Response(new ReadableStream<Uint8Array>({ cancel })));
    await new Promise((resolve) => setImmediate(resolve));
    expect(error.diagnostic).toMatchObject({ stage: 'block', reason: 'timeout', blockHeight: 101 });
    expect(JSON.stringify(error.diagnostic)).toBe(before);
    await expect(reader.readBlock(102)).rejects.toBe(error);
    expect(fetcher).toHaveBeenCalledTimes(11);
    expect(cancel).toHaveBeenCalledOnce();
  });
});
