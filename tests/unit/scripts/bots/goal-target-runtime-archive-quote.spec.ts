/** Invented storage, exact installed target WASM, and injected transport only. */
import { readFileSync, existsSync } from 'node:fs';
import { Metadata, TypeRegistry } from '@polkadot/types';
import { expandMetadata } from '@polkadot/types/metadata';
import { compactStripLength, u8aToHex } from '@polkadot/util';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createGoalTargetRuntimeArchiveQuote,
  type GoalTargetRuntimeArchiveQuoteRequest,
} from '../../../../scripts/bots/goal-target-runtime-archive-quote';
import {
  assertGoalTargetRuntimeState,
  createGoalTargetRuntimeStateCodec,
} from '../../../../scripts/bots/goal-target-runtime-state';
import type { GoalTargetStateRpcReceipt } from '../../../../scripts/bots/goal-target-runtime-transport';
import {
  GoalTargetRuntimeQuoteError,
  type GoalTargetRuntimeApiReceipt,
} from '../../../../scripts/bots/goal-target-runtime-quote';
import {
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '../../../../scripts/bots/historical-execution-codec';

const hooks = vi.hoisted(() => ({
  created: 0,
  quote: vi.fn(),
  afterQuote: undefined as undefined | ((value: { apis: readonly GoalTargetRuntimeApiReceipt[] }) => void),
}));
// Observe composition only; every estimate still executes the genuine fixed owned worker.
vi.mock('../../../../scripts/bots/goal-target-runtime-quote', async (original) => {
  const actual = await original<typeof import('../../../../scripts/bots/goal-target-runtime-quote')>();
  return {
    ...actual,
    async createGoalTargetRuntimeAsyncQuoteAdapter(
      ...args: Parameters<typeof actual.createGoalTargetRuntimeAsyncQuoteAdapter>
    ) {
      const adapter = await actual.createGoalTargetRuntimeAsyncQuoteAdapter(...args);
      hooks.created++;
      return {
        ...adapter,
        async quote(...input: Parameters<typeof adapter.quote>) {
          hooks.quote(...input);
          const result = await adapter.quote(...input);
          hooks.afterQuote?.(result);
          return result;
        },
      };
    },
  };
});
const directory = new URL(
  '../../../../output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/',
  import.meta.url
);
const synthetic = (name: string) => JSON.parse(readFileSync(new URL(name, directory), 'utf8'));
const metadata = (version: number) =>
  new TypeRegistry()
    .createType('Bytes', Buffer.from(synthetic(`metadata-${version}.json`).actualExport.resultHex.slice(2), 'hex'))
    .toHex();
const sourceMetadataHex = metadata(130);
const codec = createGoalTargetRuntimeStateCodec({ sourceMetadataHex, targetMetadataHex: metadata(131) });
const binaryPath =
  '/Users/takemiyamakoto/dev/sora2-network/runtime-upgrade-4.8.9/framenode-runtime-4.8.9.compact.compressed.wasm';
const block = { hash: `0x${'ab'.repeat(32)}`, height: 100 };
const declarations = synthetic('dispatch-130-kusd-xor-success.json').declarations as {
  key: string;
  value: string | null;
}[];
const properties = declarations.find((d) => d.key === codec.fixedKeys.properties)!.value!;
const network = vi.fn(() => {
  throw new Error('Network forbidden');
});

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** Synthetic RPC responder includes real SCALE shapes and a genuinely ordered declared successor. */
function fixture(nonempty = false, disabled = false) {
  const pool = codec.derivePoolKeys(properties);
  const keys = [...Object.values(codec.fixedKeys), pool.poolXor, pool.poolKusd];
  const values = new Map(keys.map((k) => [k, declarations.find((d) => d.key === k)!.value]));
  if (disabled) values.set(codec.fixedKeys.sources, '0x00');
  const members: string[] = [];
  if (nonempty) {
    const registry = new TypeRegistry();
    const meta = new Metadata(registry, sourceMetadataHex);
    registry.setMetadata(meta);
    const entry = expandMetadata(registry, meta).query.xstPool.enabledSynthetics;
    const key = u8aToHex(compactStripLength(entry({ code: `0x${'00'.repeat(31)}64` }))[1]);
    members.push(key);
    values.set(
      key,
      registry
        .createType(registry.createLookupType(entry.meta.type.asMap.value), {
          referenceSymbol: 'TEST',
          feeRatio: { inner: '1000000000000000' },
        })
        .toHex()
    );
  }
  const records: Readonly<GoalTargetStateRpcReceipt>[] = [];
  const events: string[] = [];
  const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    expect(url).toBe('https://mof2.sora.org/');
    const request = JSON.parse(init!.body as string);
    expect(request.params.at(-1)).toBe(block.hash);
    events.push(`fetch:${request.id}`);
    let result: unknown;
    if (request.method === 'state_getStorage') {
      if (!values.has(request.params[0])) throw new Error('Undeclared synthetic key');
      result = values.get(request.params[0]);
    } else if (request.params[0] === codec.xstPrefix) {
      result = request.params[2] === null ? members : [];
    } else {
      expect(request.params).toEqual([null, 1, members.at(-1) ?? codec.xstPrefix, block.hash]);
      result = keys
        .filter((k) => k > request.params[2] && values.get(k) !== null)
        .sort()
        .slice(0, 1);
    }
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }));
  });
  const retain = vi.fn(async (receipt: Readonly<GoalTargetStateRpcReceipt>) => {
    events.push(`retain:${receipt.id}`);
    records.push(receipt);
  });
  const input: GoalTargetRuntimeArchiveQuoteRequest = {
    sourceBlock: { ...block },
    sourceMetadataHex,
    sourcePropertiesHex: properties,
    assetIn: KUSD,
    assetOut: XOR,
    amountInCodec: '2500000000000000000',
    fetch: fetcher as typeof fetch,
    retain,
  };
  return { input, fetcher, retain, records, events, values };
}

describe.skipIf(!existsSync(binaryPath))('owned archive target-runtime quote session', () => {
  const sessions: Awaited<ReturnType<typeof createGoalTargetRuntimeArchiveQuote>>[] = [];
  const open = async (signal?: AbortSignal) => {
    const session = await createGoalTargetRuntimeArchiveQuote({ compressedBytes: readFileSync(binaryPath), signal });
    sessions.push(session);
    return session;
  };
  beforeAll(() => vi.stubGlobal('fetch', network));
  beforeEach(() => {
    hooks.quote.mockClear();
    hooks.created = 0;
    hooks.afterQuote = undefined;
  });
  afterEach(async () => {
    await Promise.all(sessions.splice(0).map((s) => s.dispose()));
  });
  afterAll(() => {
    expect(network).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it.each([false, true])(
    'retains and verifies empty/nonempty prefix=%s before actual target quote/fees',
    async (nonempty) => {
      const session = await open();
      const f = fixture(nonempty);
      hooks.quote.mockImplementationOnce(() => expect(f.records).toHaveLength(nonempty ? 11 : 9));
      const result = await session.quote(f.input);
      expect(() => assertGoalTargetRuntimeState(result.state)).not.toThrow();
      expect(result.receipts).toEqual(f.records);
      expect(f.events).toEqual(f.records.flatMap((r) => [`fetch:${r.id}`, `retain:${r.id}`]));
      expect(result.state.prefixKeys).toBe(nonempty ? 1 : 0);
      expect(result.estimate.kind).toBe('hypothetical-target-runtime-execution-estimate');
      expect(result.estimate.source.runtimeProfile.specVersion).toBe(130);
      expect(result.estimate.target.profile.specVersion).toBe(131);
      expect(result.estimate.apis).toHaveLength(3);
      expect(result.estimate.admissionGranted).toBe(false);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.receipts[0].params)).toBe(true);
      expect(Object.isFrozen(result.state.hostState.entries)).toBe(true);
    }
  );

  it('reuses exactly one owned worker for both directions and partial inputs', async () => {
    const session = await open();
    const first = await session.quote(fixture().input);
    const f = fixture();
    const second = await session.quote({
      ...f.input,
      assetIn: XOR,
      assetOut: KUSD,
      amountInCodec: '250000000000000000',
    });
    expect(hooks.created).toBe(1);
    expect(hooks.quote).toHaveBeenCalledTimes(2);
    expect(second.estimate.request).toMatchObject({
      assetIn: XOR,
      assetOut: KUSD,
      amountInCodec: '250000000000000000',
    });
    expect(second.estimate.evidenceSha256).not.toBe(first.estimate.evidenceSha256);
  });

  it('returns unavailable route evidence with acquired state and no fee APIs', async () => {
    const session = await open();
    const f = fixture(false, true);
    const result = await session.quote(f.input);
    expect(result.estimate.kind).toBe('target-runtime-route-unavailable');
    expect(result.estimate.apis).toHaveLength(1);
    expect(result.receipts).toHaveLength(9);
  });

  it('pins metadata before any fetch and refuses an acquired Properties mismatch before invoking target APIs', async () => {
    const first = await open();
    const f = fixture();
    await expect(first.quote({ ...f.input, sourceMetadataHex: metadata(131) })).rejects.toThrow();
    expect(f.fetcher).not.toHaveBeenCalled();
    const second = await open();
    // Only the fee account changes: genuine pool account and all derived point keys remain constant.
    f.values.set(codec.fixedKeys.properties, properties.slice(0, 66) + '12'.repeat(32));
    await expect(second.quote(f.input)).rejects.toThrow('properties-changed');
    expect(f.records).toHaveLength(9);
    expect(hooks.quote).not.toHaveBeenCalled();
  });

  it('requires explicit dependencies and rejects accessors and unsupported input without side effects', async () => {
    const session = await open();
    const f = fixture();
    const getter = vi.fn();
    await expect(session.quote({ ...f.input, fetch: undefined as never })).rejects.toThrow('dependencies');
    await expect(session.quote({ ...f.input, retain: undefined as never })).rejects.toThrow('dependencies');
    await expect(
      session.quote(Object.defineProperty({ ...f.input }, 'sourceBlock', { enumerable: true, get: getter }))
    ).rejects.toThrow('fields');
    await expect(session.quote({ ...f.input, amountInCodec: String(1n << 128n) })).rejects.toThrow('amount');
    await expect(session.quote({ ...f.input, endpoint: 'elsewhere' } as never)).rejects.toThrow('fields');
    expect(getter).not.toHaveBeenCalled();
    expect(f.fetcher).not.toHaveBeenCalled();
  });

  it('stops immediately after failed retention and closes the session', async () => {
    const session = await open();
    const f = fixture();
    f.retain.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(session.quote(f.input)).rejects.toThrow();
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    expect(hooks.quote).not.toHaveBeenCalled();
    await expect(session.quote(f.input)).rejects.toThrow('failed');
  });

  it('snapshots block, request and executable dependencies before awaiting retention', async () => {
    const session = await open();
    const f = fixture();
    const entered = deferred(),
      released = deferred();
    f.retain.mockImplementationOnce(async (r) => {
      f.records.push(r);
      entered.resolve();
      await released.promise;
    });
    const input = { ...f.input, sourceBlock: { ...block } };
    const pending = session.quote(input);
    await entered.promise;
    input.sourceBlock.hash = `0x${'ff'.repeat(32)}`;
    input.amountInCodec = '1';
    input.assetIn = XOR;
    input.fetch = network;
    input.retain = async () => {
      throw new Error('changed callback');
    };
    released.resolve();
    const result = await pending;
    expect(result.estimate.source.block).toEqual(block);
    expect(result.estimate.request.amountInCodec).toBe(f.input.amountInCodec);
    expect(f.fetcher).toHaveBeenCalledTimes(9);
    expect(f.records).toHaveLength(9);
  });

  it.each(['caller', 'parent', 'dispose', 'deadline'] as const)(
    'retains incomplete request when %s cancels and cannot emit an estimate',
    async (mode) => {
      const parent = new AbortController(),
        caller = new AbortController();
      const session = await open(parent.signal);
      const f = fixture();
      const entered = deferred();
      f.fetcher.mockImplementationOnce(async () => {
        entered.resolve();
        return new Promise<Response>(() => undefined);
      });
      const pending = session.quote(f.input, { signal: caller.signal, timeoutMs: mode === 'deadline' ? 750 : 20000 });
      const rejected = expect(pending).rejects.toThrow(
        mode === 'deadline' ? 'timeout' : mode === 'dispose' ? 'disposed' : 'aborted'
      );
      await entered.promise;
      if (mode === 'caller') caller.abort();
      if (mode === 'parent') parent.abort();
      if (mode === 'dispose') await session.dispose();
      await rejected;
      expect(f.fetcher).toHaveBeenCalledTimes(1);
      expect(f.records).toHaveLength(1);
      expect(f.records[0]).toMatchObject({ responseComplete: false, failure: 'target-state:aborted-or-timeout' });
      expect(hooks.quote).not.toHaveBeenCalled();
      await expect(session.quote(f.input)).rejects.toThrow();
    }
  );

  it('keeps the same deadline across acquisition, retention and worker execution', async () => {
    const session = await open();
    const f = fixture();
    f.retain.mockImplementationOnce(async (r) => {
      await new Promise((resolve) => setTimeout(resolve, 80));
      f.records.push(r);
    });
    await session.quote(f.input, { timeoutMs: 5000 });
    expect(hooks.quote).toHaveBeenCalledTimes(1);
    const remaining = hooks.quote.mock.calls[0][1].timeoutMs;
    expect(remaining).toBeLessThan(4920);
    expect(remaining).toBeGreaterThan(0);
  });

  it.each(['typed-failure', 'delivered-boundary'] as const)(
    'preserves completed actual API receipts on %s cancellation',
    async (mode) => {
      const session = await open();
      const caller = new AbortController();
      const f = fixture();
      let delivered: readonly GoalTargetRuntimeApiReceipt[] | undefined;
      let typed: GoalTargetRuntimeQuoteError | undefined;
      hooks.afterQuote = (value) => {
        delivered = value.apis;
        caller.abort();
        if (mode === 'typed-failure') {
          typed = new GoalTargetRuntimeQuoteError('details', value.apis, 'cancelled');
          throw typed;
        }
      };
      const error = await session.quote(f.input, { signal: caller.signal }).catch((reason: unknown) => reason);
      expect(error).toBeInstanceOf(GoalTargetRuntimeQuoteError);
      if (!(error instanceof GoalTargetRuntimeQuoteError)) throw new Error('Expected retained estimate failure');
      expect(error.receipts).toBe(delivered);
      expect(error.receipts).toHaveLength(3);
      expect(error.reason).toBe('cancelled');
      if (typed) expect(error).toBe(typed);
      expect(f.records).toHaveLength(9);
    }
  );

  it('rejects overlapping calls without interrupting the first and refuses calls after disposal', async () => {
    const session = await open();
    const f = fixture();
    const entered = deferred(),
      released = deferred();
    f.retain.mockImplementationOnce(async (r) => {
      f.records.push(r);
      entered.resolve();
      await released.promise;
    });
    const pending = session.quote(f.input);
    await entered.promise;
    await expect(session.quote(f.input)).rejects.toThrow('busy');
    released.resolve();
    expect((await pending).estimate.kind).toBe('hypothetical-target-runtime-execution-estimate');
    await session.dispose();
    await expect(session.quote(f.input)).rejects.toThrow('disposed');
  });
});
