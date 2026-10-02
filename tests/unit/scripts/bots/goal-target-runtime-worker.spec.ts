// @vitest-environment node
/** All storage is invented; local pinned runtime/metadata are offline codec and execution oracles. */
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runInThisContext } from 'node:vm';
import { Worker as NativeWorker, type WorkerOptions } from 'node:worker_threads';
import { TypeRegistry } from '@polkadot/types';
import ts from 'typescript';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as stateModule from '../../../../scripts/bots/goal-target-runtime-state';
import {
  assertGoalTargetRuntimeWorker,
  createGoalTargetRuntimeWorker,
  type GoalTargetRuntimeWorker,
  type GoalTargetRuntimeWorkerOptions,
} from '../../../../scripts/bots/goal-target-runtime-worker-client';

const require = createRequire(import.meta.url);
const binaryPath =
  '/Users/takemiyamakoto/dev/sora2-network/runtime-upgrade-4.8.9/framenode-runtime-4.8.9.compact.compressed.wasm';
const clientPath = resolve('scripts/bots/goal-target-runtime-worker-client.ts');
const workerPath = resolve('scripts/bots/goal-target-runtime-worker.cjs');
const hostPath = resolve('scripts/bots/goal-target-runtime-host.cjs');
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const artifacts = resolve('output/go-history/goal-runtime-wasm-offline-20260921');
const original = (name: string) => JSON.parse(readFileSync(resolve(artifacts, 'synthetic-episode-v2', name), 'utf8'));
const { createGoalTargetRuntimeHost } = require(hostPath);
let bytes: Buffer;
let oracle: { profile: GoalTargetRuntimeWorker['profile']; metadataHex: string; invoke(value: unknown): unknown };
let state: stateModule.GoalTargetRuntimeState;
let quoteInput: string;
let feeInput: string;
const clients: GoalTargetRuntimeWorker[] = [];

/** Use genuine state-verifier ownership around complete synthetic RPC receipts, never a capability mock. */
function verifiedState() {
  const metadata = (version: number) =>
    new TypeRegistry()
      .createType('Bytes', Buffer.from(original(`metadata-${version}.json`).actualExport.resultHex.slice(2), 'hex'))
      .toHex();
  const codec = stateModule.createGoalTargetRuntimeStateCodec({
    sourceMetadataHex: metadata(130),
    targetMetadataHex: metadata(131),
  });
  const fixture = original('dispatch-130-kusd-xor-success.json');
  const declarations = fixture.declarations as { key: string; value: string | null }[];
  const pool = codec.derivePoolKeys(declarations.find((value) => value.key === codec.fixedKeys.properties)!.value);
  const keys = [...Object.values(codec.fixedKeys), pool.poolXor, pool.poolKusd];
  const block = { hash: `0x${'ab'.repeat(32)}`, height: 100 };
  const receipts: stateModule.GoalTargetStateReceipt[] = [];
  const add = (method: stateModule.GoalTargetStateReceipt['method'], params: unknown[], result: unknown) => {
    const id = receipts.length + 1;
    const responseBody = JSON.stringify({ jsonrpc: '2.0', id, result });
    receipts.push({
      id,
      method,
      params,
      requestBody: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
      requestedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:00:00.001Z',
      httpStatus: 200,
      responseBody,
      responseSha256: sha(responseBody),
    });
  };
  for (const key of keys)
    add('state_getStorage', [key, block.hash], declarations.find((value) => value.key === key)!.value);
  add('state_getKeysPaged', [codec.xstPrefix, 64, null, block.hash], []);
  const after = keys
    .filter((key) => key > codec.xstPrefix && declarations.find((value) => value.key === key)!.value !== null)
    .sort()[0];
  add('state_getKeysPaged', [null, 1, codec.xstPrefix, block.hash], after ? [after] : []);
  const extrinsic = Buffer.from(fixture.extrinsicHex.slice(2), 'hex');
  const length = Buffer.alloc(4);
  length.writeUInt32LE(extrinsic.length);
  feeInput = `0x${Buffer.concat([extrinsic, length]).toString('hex')}`;
  quoteInput = `0x${require(resolve(artifacts, 'runtime-host.cjs')).quoteInput(false).toString('hex')}`;
  return codec.verify({ sourceBlock: block, receipts });
}

beforeAll(() => {
  // Intentionally required, not skipped: this suite must execute the actual pinned131 binary.
  bytes = readFileSync(binaryPath);
  oracle = createGoalTargetRuntimeHost(bytes);
  state = verifiedState();
}, 30000);
afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.dispose()));
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Private test-only module evaluation substitutes the Worker constructor; the shipped API has no seam. */
function instrument(Worker: unknown, clock?: { now(): number }) {
  const source = readFileSync(clientPath, 'utf8').replaceAll(
    'import.meta.url',
    JSON.stringify(pathToFileURL(clientPath).href)
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} as { createGoalTargetRuntimeWorker: typeof createGoalTargetRuntimeWorker } };
  const localRequire = (id: string) => {
    if (id === 'node:worker_threads') return { Worker };
    if (id === 'node:perf_hooks' && clock) return { performance: clock };
    if (id === './goal-target-runtime-state') return stateModule;
    return require(id);
  };
  runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename: clientPath })(
    localRequire,
    module,
    module.exports
  );
  return module.exports.createGoalTargetRuntimeWorker;
}

function fakeWorker() {
  const instances: Fake[] = [];
  let now = 0;
  class Fake extends EventEmitter {
    readonly messages: unknown[] = [];
    readonly terminate = vi.fn(async () => 1);
    constructor(
      readonly filename: URL,
      readonly options: WorkerOptions
    ) {
      super();
      instances.push(this);
    }
    postMessage(message: unknown) {
      this.messages.push(structuredClone(message));
    }
  }
  const create = instrument(Fake, { now: () => now });
  const ready = async (options: Partial<GoalTargetRuntimeWorkerOptions> = {}) => {
    const promise = create({ compressedBytes: bytes, ...options });
    instances.at(-1)!.emit('message', { kind: 'ready', profile: oracle.profile, metadataHex: oracle.metadataHex });
    const client = await promise;
    clients.push(client);
    return client;
  };
  return {
    instances,
    create,
    ready,
    advance: (elapsed: number) => {
      now += elapsed;
    },
  };
}

describe('fixed exact target runtime worker', () => {
  it('executes pinned131 core, metadata, quote and both fees with exact synchronous-host parity', async () => {
    const inputBytes = Buffer.from(bytes);
    const pending = createGoalTargetRuntimeWorker({ compressedBytes: inputBytes });
    inputBytes.fill(0);
    const client = await pending;
    clients.push(client);
    expect(() => assertGoalTargetRuntimeWorker(client)).not.toThrow();
    expect(() => assertGoalTargetRuntimeWorker({ ...client })).toThrow('target-worker:unowned');
    expect(client.profile).toEqual(oracle.profile);
    expect(client.metadataHex).toBe(oracle.metadataHex);
    const invocations = [
      { api: 'Core_version', inputHex: '0x' },
      { api: 'Metadata_metadata', inputHex: '0x' },
      { api: 'LiquidityProxyAPI_quote', inputHex: quoteInput, state },
      { api: 'TransactionPaymentApi_query_info', inputHex: feeInput, state },
      { api: 'TransactionPaymentApi_query_fee_details', inputHex: feeInput, state },
    ] as const;
    for (const input of invocations) {
      const expected = oracle.invoke({ ...input, ...('state' in input ? { state: state.hostState } : {}) });
      const actual = await client.invoke(input);
      expect(actual).toEqual(expected);
      expect(actual).toMatchObject({ success: true, storageWrites: 0, historicalFill: false, admissionGranted: false });
      expect(Object.isFrozen(actual)).toBe(true);
      expect(Object.isFrozen(actual.hostCalls)).toBe(true);
    }
    await client.dispose();
    expect(() => assertGoalTargetRuntimeWorker(client)).toThrow('target-worker:disposed');
    await expect(client.invoke({ api: 'Core_version', inputHex: '0x' })).rejects.toThrow('target-worker:disposed');
  }, 30000);

  it.each(['ready', 'invoke'] as const)(
    'terminates a real synchronously blocked worker at the %s deadline',
    async (stage) => {
      const source = readFileSync(workerPath, 'utf8').replace(
        "require('./goal-target-runtime-host.cjs')",
        `require(${JSON.stringify(hostPath)})`
      );
      const injected =
        stage === 'ready' ? `for (;;) {}` : source.replace('host.invoke(message.value)', '(() => { for (;;) {} })()');
      const workers: NativeWorker[] = [];
      const create = instrument(
        class {
          constructor(filename: URL, options: WorkerOptions) {
            expect(filename.href).toBe(pathToFileURL(workerPath).href);
            const worker = new NativeWorker(injected, { ...options, eval: true });
            workers.push(worker);
            return worker;
          }
        }
      );
      const started = performance.now();
      if (stage === 'ready')
        await expect(create({ compressedBytes: bytes, readinessTimeoutMs: 50 })).rejects.toThrow(
          'target-worker:timeout'
        );
      else {
        const client = await create({ compressedBytes: bytes });
        clients.push(client);
        await expect(client.invoke({ api: 'Core_version', inputHex: '0x' }, { timeoutMs: 50 })).rejects.toThrow(
          'target-worker:timeout'
        );
        await expect(client.invoke({ api: 'Core_version', inputHex: '0x' })).rejects.toThrow('target-worker:timeout');
      }
      expect(performance.now() - started).toBeLessThan(10000);
      expect(workers[0].threadId).toBe(-1);
    },
    30000
  );

  it('uses only the fixed script, copies bytes, snapshots input and sends only owned host state', async () => {
    const f = fakeWorker();
    const client = await f.ready();
    const worker = f.instances[0];
    expect(worker.filename.href).toBe(pathToFileURL(workerPath).href);
    expect(worker.options).toMatchObject({
      workerData: { kind: 'goal-target-runtime-worker-v1' },
      resourceLimits: { maxOldGenerationSizeMb: 256 },
    });
    expect(worker.options.workerData.compressedBytes).not.toBe(bytes);
    const input = { api: 'LiquidityProxyAPI_quote' as const, inputHex: quoteInput, state };
    const pending = client.invoke(input);
    input.inputHex = '0x';
    expect(worker.messages[0]).toEqual({
      kind: 'invoke',
      id: 1,
      value: { api: 'LiquidityProxyAPI_quote', inputHex: quoteInput, state: state.hostState },
    });
    worker.emit('message', {
      kind: 'result',
      id: 1,
      result: oracle.invoke({ api: 'LiquidityProxyAPI_quote', inputHex: quoteInput, state: state.hostState }),
    });
    await expect(pending).resolves.toMatchObject({ success: true, stateSha256: state.stateSha256 });
  });

  it('rejects overlapping work without queueing it or disturbing the current request', async () => {
    const f = fakeWorker();
    const client = await f.ready();
    const pending = client.invoke({ api: 'Core_version', inputHex: '0x' });
    await expect(client.invoke({ api: 'Metadata_metadata', inputHex: '0x' })).rejects.toThrow('target-worker:busy');
    expect(f.instances[0].messages).toHaveLength(1);
    f.instances[0].emit('message', {
      kind: 'result',
      id: 1,
      result: oracle.invoke({ api: 'Core_version', inputHex: '0x' }),
    });
    await expect(pending).resolves.toMatchObject({ success: true });
  });

  it.each(['timeout', 'abort', 'dispose'] as const)(
    'permanently revokes work on %s and ignores late replies',
    async (mode) => {
      vi.useFakeTimers();
      const f = fakeWorker();
      const client = await f.ready();
      const controller = new AbortController();
      const pending = client.invoke(
        { api: 'Core_version', inputHex: '0x' },
        { signal: controller.signal, timeoutMs: 100 }
      );
      const rejected = expect(pending).rejects.toThrow(
        `target-worker:${mode === 'abort' ? 'aborted' : mode === 'dispose' ? 'disposed' : mode}`
      );
      if (mode === 'timeout') await vi.advanceTimersByTimeAsync(100);
      else if (mode === 'abort') controller.abort();
      else await client.dispose();
      await rejected;
      f.instances[0].emit('message', {
        kind: 'result',
        id: 1,
        result: oracle.invoke({ api: 'Core_version', inputHex: '0x' }),
      });
      await expect(client.invoke({ api: 'Core_version', inputHex: '0x' })).rejects.toThrow('target-worker:');
      await client.dispose();
      expect(f.instances[0].terminate).toHaveBeenCalledTimes(1);
      expect(f.instances[0].messages).toHaveLength(1);
    }
  );

  it.each(['ready', 'invoke'] as const)(
    'enforces monotonic %s deadline even when timer callbacks are delayed',
    async (stage) => {
      const f = fakeWorker();
      if (stage === 'ready') {
        const pending = f.create({ compressedBytes: bytes, readinessTimeoutMs: 100 });
        f.advance(101);
        f.instances[0].emit('message', { kind: 'ready', profile: oracle.profile, metadataHex: oracle.metadataHex });
        await expect(pending).rejects.toThrow('target-worker:timeout');
      } else {
        const client = await f.ready();
        const pending = client.invoke({ api: 'Core_version', inputHex: '0x' }, { timeoutMs: 100 });
        f.advance(101);
        f.instances[0].emit('message', {
          kind: 'result',
          id: 1,
          result: oracle.invoke({ api: 'Core_version', inputHex: '0x' }),
        });
        await expect(pending).rejects.toThrow('target-worker:timeout');
      }
      expect(f.instances[0].terminate).toHaveBeenCalledTimes(1);
    }
  );

  it('cancels initialization through its lifetime signal and retains that cancellation after readiness', async () => {
    const f = fakeWorker();
    const before = new AbortController();
    const pending = f.create({ compressedBytes: bytes, signal: before.signal });
    before.abort();
    await expect(pending).rejects.toThrow('target-worker:aborted');
    const after = new AbortController();
    const client = await f.ready({ signal: after.signal });
    after.abort();
    await expect(client.invoke({ api: 'Core_version', inputHex: '0x' })).rejects.toThrow('target-worker:aborted');
    expect(f.instances.every((worker) => worker.terminate.mock.calls.length === 1)).toBe(true);
  });

  it('does not return a ready handle if cancellation wins before the readiness continuation resumes', async () => {
    const f = fakeWorker();
    const controller = new AbortController();
    const pending = f.create({ compressedBytes: bytes, signal: controller.signal });
    f.instances[0].emit('message', { kind: 'ready', profile: oracle.profile, metadataHex: oracle.metadataHex });
    controller.abort();
    await expect(pending).rejects.toThrow('target-worker:aborted');
    expect(f.instances[0].terminate).toHaveBeenCalledTimes(1);
  });

  it('rejects altered worker readiness metadata or profile instead of returning authority', async () => {
    const f = fakeWorker();
    const pending = f.create({ compressedBytes: bytes });
    f.instances[0].emit('message', {
      kind: 'ready',
      profile: { ...oracle.profile, specVersion: 130 },
      metadataHex: oracle.metadataHex,
    });
    await expect(pending).rejects.toThrow('target-worker:profile');
    expect(f.instances[0].terminate).toHaveBeenCalledTimes(1);
  });

  it.each(['error', 'exit', 'failure', 'wrong-id'] as const)(
    'sanitizes %s, terminates and refuses later work',
    async (mode) => {
      const f = fakeWorker();
      const client = await f.ready();
      const pending = client.invoke({ api: 'Core_version', inputHex: '0x' });
      if (mode === 'error') f.instances[0].emit('error', new Error('sensitive arbitrary error /private/path'));
      else if (mode === 'exit') f.instances[0].emit('exit', 9);
      else if (mode === 'failure') f.instances[0].emit('message', { kind: 'failure' });
      else f.instances[0].emit('message', { kind: 'result', id: 99, result: {} });
      await expect(pending).rejects.toThrow(/^target-worker:(worker-failed|worker-exited|protocol)$/);
      await expect(client.invoke({ api: 'Core_version', inputHex: '0x' })).rejects.toThrow('target-worker:');
      expect(f.instances[0].terminate).toHaveBeenCalledTimes(1);
    }
  );

  it('sanitizes worker construction errors', async () => {
    const create = instrument(
      class {
        constructor() {
          throw new Error('sensitive /local/path');
        }
      }
    );
    await expect(create({ compressedBytes: bytes })).rejects.toThrow(/^target-worker:worker-failed$/);
  });

  it('reports termination failure without reopening or falsely completing disposal', async () => {
    const f = fakeWorker();
    const client = await f.ready();
    f.instances[0].terminate.mockRejectedValueOnce(new Error('sensitive OS cleanup error'));
    await expect(client.dispose()).rejects.toThrow(/^target-worker:termination-failed$/);
    await expect(client.dispose()).rejects.toThrow(/^target-worker:termination-failed$/);
    await expect(client.invoke({ api: 'Core_version', inputHex: '0x' })).rejects.toThrow('target-worker:disposed');
    expect(f.instances[0].terminate).toHaveBeenCalledTimes(1);
    clients.splice(clients.indexOf(client), 1);
  });

  it('rejects an already-aborted factory or invocation without starting work', async () => {
    const f = fakeWorker();
    const controller = new AbortController();
    controller.abort();
    await expect(f.create({ compressedBytes: bytes, signal: controller.signal })).rejects.toThrow(
      'target-worker:aborted'
    );
    expect(f.instances).toHaveLength(0);
    const client = await f.ready();
    await expect(client.invoke({ api: 'Core_version', inputHex: '0x' }, { signal: controller.signal })).rejects.toThrow(
      'target-worker:aborted'
    );
    expect(f.instances[0].messages).toHaveLength(0);
    expect(f.instances[0].terminate).toHaveBeenCalledTimes(1);
  });

  it('ignores overridden byte getters and iteration while copying the original pinned bytes', async () => {
    const f = fakeWorker();
    const inputBytes = Buffer.from(bytes);
    const getter = vi.fn(() => {
      throw new Error('must not run');
    });
    Object.defineProperties(inputBytes, {
      buffer: { get: getter },
      byteLength: { get: getter },
      length: { get: getter },
      [Symbol.iterator]: { get: getter },
    });
    const client = await f.ready({ compressedBytes: inputBytes });
    expect(getter).not.toHaveBeenCalled();
    expect(Buffer.from(f.instances[0].options.workerData.compressedBytes)).toEqual(bytes);
    await client.dispose();
  });

  it.each([
    { workerPath: '/tmp/arbitrary.cjs' },
    { code: 'while(true){}' },
    { readinessTimeoutMs: 30001 },
    { invocationTimeoutMs: 0 },
    { signal: {} },
    { compressedBytes: new Uint8Array([0, 1]) },
  ])('rejects unsupported configuration before constructing a worker %j', async (change) => {
    const f = fakeWorker();
    await expect(f.create({ compressedBytes: bytes, ...change } as GoalTargetRuntimeWorkerOptions)).rejects.toThrow(
      'target-worker:'
    );
    expect(f.instances).toHaveLength(0);
  });

  it('rejects accessors without evaluating them, and shared binary memory before spawning', async () => {
    const f = fakeWorker();
    const getter = vi.fn(() => bytes);
    const input = Object.defineProperty({}, 'compressedBytes', { enumerable: true, get: getter });
    await expect(f.create(input as GoalTargetRuntimeWorkerOptions)).rejects.toThrow('target-worker:input');
    const shared = new Uint8Array(new SharedArrayBuffer(bytes.length));
    shared.set(bytes);
    await expect(f.create({ compressedBytes: shared })).rejects.toThrow('target-worker:binary');
    expect(getter).not.toHaveBeenCalled();
    expect(f.instances).toHaveLength(0);
  });

  it('rejects forged/cloned state, nonallowlisted APIs and oversized inputs before sending work', async () => {
    const f = fakeWorker();
    const client = await f.ready();
    await expect(
      client.invoke({ api: 'LiquidityProxyAPI_quote', inputHex: quoteInput, state: structuredClone(state) })
    ).rejects.toThrow('unowned verified state');
    await expect(client.invoke({ api: 'TransactionPaymentApi_query_info', inputHex: feeInput })).rejects.toThrow(
      'target-worker:state-required'
    );
    await expect(client.invoke({ api: 'BlockBuilder_apply_extrinsic', inputHex: '0x' } as never)).rejects.toThrow(
      'target-worker:api'
    );
    await expect(client.invoke({ api: 'Core_version', inputHex: `0x${'00'.repeat(4097)}` })).rejects.toThrow(
      'target-worker:input-hex'
    );
    const getter = vi.fn(() => 'Core_version');
    const value = Object.defineProperty({ inputHex: '0x' }, 'api', { enumerable: true, get: getter });
    await expect(client.invoke(value as never)).rejects.toThrow('target-worker:input');
    expect(getter).not.toHaveBeenCalled();
    expect(f.instances[0].messages).toHaveLength(0);
  });
});
