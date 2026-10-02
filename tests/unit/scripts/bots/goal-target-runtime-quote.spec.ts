/** Exact installed WASM plus invented retained state only; no network, wallet or cryptographic signing. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { TypeRegistry } from '@polkadot/types';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createGoalTargetRuntimeQuoteAdapter,
  createGoalTargetRuntimeAsyncQuoteAdapter,
  GoalTargetRuntimeQuoteError,
} from '../../../../scripts/bots/goal-target-runtime-quote';
import {
  createGoalTargetRuntimeStateCodec,
  type GoalTargetStateReceipt,
} from '../../../../scripts/bots/goal-target-runtime-state';
import {
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '../../../../scripts/bots/historical-execution-codec';

const hooks = vi.hoisted(() => ({
  transform: undefined as undefined | ((api: string, result: any) => any),
  calls: [] as any[],
}));
const workerHooks = vi.hoisted(() => ({ forge: false, created: [] as any[] }));
vi.mock('../../../../scripts/bots/goal-target-runtime-worker-client', async (original) => {
  const actual = await original<any>();
  return {
    ...actual,
    async createGoalTargetRuntimeWorker(options: unknown) {
      const worker = await actual.createGoalTargetRuntimeWorker(options);
      workerHooks.created.push(worker);
      return workerHooks.forge ? { ...worker } : worker;
    },
  };
});
// Fault injection is test-only: the shipped adapter never accepts a host function or API output.
vi.mock('../../../../scripts/bots/goal-target-runtime-host.cjs', async (original) => {
  const actual = await original<any>();
  return {
    ...actual,
    createGoalTargetRuntimeHost(bytes: Buffer) {
      const host = actual.createGoalTargetRuntimeHost(bytes);
      return {
        ...host,
        invoke(input: any) {
          hooks.calls.push(input);
          const result = host.invoke(input);
          return hooks.transform ? hooks.transform(input.api, result) : result;
        },
      };
    },
  };
});
const directory = new URL(
  '../../../../output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/',
  import.meta.url
);
const retainedSynthetic = (name: string) => JSON.parse(readFileSync(new URL(name, directory), 'utf8'));
const metadata = (version: number) =>
  new TypeRegistry()
    .createType(
      'Bytes',
      Buffer.from(retainedSynthetic(`metadata-${version}.json`).actualExport.resultHex.slice(2), 'hex')
    )
    .toHex();
const codec = createGoalTargetRuntimeStateCodec({ sourceMetadataHex: metadata(130), targetMetadataHex: metadata(131) });
const binaryPath =
  '/Users/takemiyamakoto/dev/sora2-network/runtime-upgrade-4.8.9/framenode-runtime-4.8.9.compact.compressed.wasm';
const block = { hash: `0x${'ab'.repeat(32)}`, height: 100 };

/** Wrap invented fixture values in exact retained-style RPC receipts to obtain genuine parser ownership. */
function state(disabled = false) {
  const declarations = retainedSynthetic('dispatch-130-kusd-xor-success.json').declarations as {
    key: string;
    value: string | null;
  }[];
  const properties = declarations.find((d) => d.key === codec.fixedKeys.properties)!.value;
  const pool = codec.derivePoolKeys(properties);
  const points = [...Object.values(codec.fixedKeys), pool.poolXor, pool.poolKusd];
  const receipts: GoalTargetStateReceipt[] = [];
  const add = (method: GoalTargetStateReceipt['method'], params: unknown[], result: unknown) => {
    const id = receipts.length + 1,
      responseBody = JSON.stringify({ jsonrpc: '2.0', id, result });
    receipts.push({
      id,
      method,
      params,
      requestBody: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
      requestedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:00:00.001Z',
      httpStatus: 200,
      responseBody,
      responseSha256: createHash('sha256').update(responseBody).digest('hex'),
    });
  };
  for (const key of points)
    add(
      'state_getStorage',
      [key, block.hash],
      disabled && key === codec.fixedKeys.sources ? '0x00' : declarations.find((d) => d.key === key)!.value
    );
  add('state_getKeysPaged', [codec.xstPrefix, 64, null, block.hash], []);
  add(
    'state_getKeysPaged',
    [null, 1, codec.xstPrefix, block.hash],
    [points.filter((k) => k > codec.xstPrefix).sort()[0]]
  );
  return codec.verify({ sourceBlock: block, receipts });
}

describe.skipIf(!existsSync(binaryPath))('offline exact target runtime quote adapter', () => {
  let adapter: ReturnType<typeof createGoalTargetRuntimeQuoteAdapter>;
  const network = vi.fn(() => {
    throw new Error('Network forbidden');
  });
  beforeAll(() => {
    vi.stubGlobal('fetch', network);
    adapter = createGoalTargetRuntimeQuoteAdapter(readFileSync(binaryPath));
  });
  beforeEach(() => {
    hooks.calls = [];
    hooks.transform = undefined;
  });
  afterAll(() => {
    expect(network).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it.each([
    [KUSD, XOR, '5000000000000000000', '496751624187906046'],
    [XOR, KUSD, '1000000000000000000', '9930129451325382569'],
    [KUSD, XOR, '2500000000000000000', undefined],
    [XOR, KUSD, '250000000000000000', undefined],
  ])(
    'binds full/partial %s input %s %s to source130 and target131 without signing',
    (assetIn, assetOut, amountInCodec, expected) => {
      const source = state();
      const result = adapter.quote({ state: source, assetIn, assetOut, amountInCodec });
      expect(result.kind).toBe('hypothetical-target-runtime-execution-estimate');
      if (result.kind !== 'hypothetical-target-runtime-execution-estimate') throw new Error('route');
      expect(result.source).toMatchObject({
        block,
        runtimeProfile: { specVersion: 130 },
        stateSha256: source.stateSha256,
        receiptSha256: source.receiptSha256,
      });
      expect(result.target.profile.specVersion).toBe(131);
      expect(result.request.amountInCodec).toBe(amountInCodec);
      if (expected) expect(result.quote.amountOutCodec).toBe(expected);
      else
        expect(BigInt(result.quote.amountOutCodec)).toBeLessThan(
          BigInt(assetIn === KUSD ? '496751624187906046' : '9930129451325382569')
        );
      const encodedAmount = Buffer.from(result.apis[0].inputHex.slice(2), 'hex').subarray(68, 84);
      expect(BigInt('0x' + Buffer.from(encodedAmount).reverse().toString('hex')).toString()).toBe(amountInCodec);
      expect(result.quote.minimumCodec).toBe(String((BigInt(result.quote.amountOutCodec) * 9950n) / 10000n));
      expect(result.quote.route).toEqual([assetIn, assetOut]);
      expect(result.fees).toMatchObject({
        basis: 'target131-api-over-source130-multiplier',
        feeCodec: '721500000000000',
        info: { partialFeeCodec: '721500000000000' },
        details: { finalFee: '721500000000000', tip: '0' },
      });
      expect(result.envelope.bound).toMatchObject({
        encodedLength: 215,
        minimumCodec: result.quote.minimumCodec,
        estimation: { signature: 'fake-placeholder-only', signatureType: 'Ecdsa', nonce: '4294967295', eraPeriod: 64 },
      });
      expect(result.apis).toHaveLength(3);
      expect(result.apis[1].inputHex).toBe(result.envelope.bound.feeQueryDataHex);
      expect(result.apis[2].inputHex).toBe(result.apis[1].inputHex);
      expect(result).toMatchObject({
        observedFill: false,
        transactionSubmitted: false,
        signatureVerified: false,
        qualificationEligible: false,
        admissionGranted: false,
        feeAdequacyVerified: false,
      });
      const { evidenceSha256, ...body } = result;
      expect(evidenceSha256).toBe(createHash('sha256').update(JSON.stringify(body)).digest('hex'));
      expect(Object.isFrozen(result.apis[0].hostReceipt)).toBe(true);
    }
  );

  it('reports the actual unavailable route distinctly and does not query fees', () => {
    const result = adapter.quote({
      state: state(true),
      assetIn: KUSD,
      assetOut: XOR,
      amountInCodec: '5000000000000000000',
    });
    expect(result.kind).toBe('target-runtime-route-unavailable');
    expect(result.apis).toHaveLength(1);
    expect(result.apis[0].hostReceipt.resultHex).toBe('0x00');
    expect(hooks.calls).toHaveLength(1);
  });

  it.each(['0', '01', '-1', '1e18', '1.1', String(1n << 128n), '9'.repeat(1000)])(
    'rejects noncanonical/out-of-u128 amount %s before execution',
    (amountInCodec) => {
      expect(() => adapter.quote({ state: state(), assetIn: KUSD, assetOut: XOR, amountInCodec })).toThrow('amount');
      expect(hooks.calls).toHaveLength(0);
    }
  );

  it('rejects forged ownership, unsupported pairs and getters before execution', () => {
    const source = state();
    expect(() =>
      adapter.quote({ state: JSON.parse(JSON.stringify(source)), assetIn: KUSD, assetOut: XOR, amountInCodec: '1' })
    ).toThrow('unowned');
    expect(() => adapter.quote({ state: source, assetIn: XOR, assetOut: XOR, amountInCodec: '1' })).toThrow(
      'native pair'
    );
    const getter = vi.fn();
    expect(() =>
      adapter.quote(
        Object.defineProperty({ state: source, assetIn: KUSD, assetOut: XOR }, 'amountInCodec', {
          enumerable: true,
          get: getter,
        })
      )
    ).toThrow('own fields');
    expect(getter).not.toHaveBeenCalled();
    expect(hooks.calls).toHaveLength(0);
  });

  it('snapshots pending input before a callback can mutate the original object', () => {
    const input = { state: state(), assetIn: KUSD, assetOut: XOR, amountInCodec: '2500000000000000000' };
    hooks.transform = (_api, result) => {
      input.amountInCodec = '999';
      input.assetIn = XOR;
      return result;
    };
    const result = adapter.quote(input);
    expect(result.request).toMatchObject({ assetIn: KUSD, amountInCodec: '2500000000000000000' });
    if (result.kind !== 'hypothetical-target-runtime-execution-estimate') throw new Error('route');
    expect(result.envelope.bound.amountInCodec).toBe('2500000000000000000');
  });

  it.each([
    'quote-tail',
    'quote-truncated',
    'quote-route',
    'quote-fee-asset',
    'quote-zero-minimum',
    'info-tail',
    'details-tip',
    'details-disagreement',
    'details-truncated',
    'host-state',
    'host-trap',
  ])('retains raw receipts and rejects malformed or contradictory %s', (fault) => {
    hooks.transform = (api, result) => {
      if (fault === 'host-trap' && api === 'LiquidityProxyAPI_quote')
        return { ...result, success: false, error: 'invented trap' };
      if (fault === 'host-state') return { ...result, stateSha256: '0'.repeat(64) };
      if (api === 'LiquidityProxyAPI_quote') {
        if (fault === 'quote-tail') return { ...result, resultHex: result.resultHex + '00' };
        if (fault === 'quote-truncated') return { ...result, resultHex: result.resultHex.slice(0, -2) };
        if (fault === 'quote-route') return { ...result, resultHex: result.resultHex.slice(0, -64) + KUSD.slice(2) };
        if (fault === 'quote-fee-asset') {
          const raw = Buffer.from(result.resultHex.slice(2), 'hex');
          Buffer.from(KUSD.slice(2), 'hex').copy(raw, 34);
          return { ...result, resultHex: '0x' + raw.toString('hex') };
        }
        if (fault === 'quote-zero-minimum') {
          const raw = Buffer.from(result.resultHex.slice(2), 'hex');
          raw.fill(0, 1, 17);
          raw[1] = 1;
          return { ...result, resultHex: '0x' + raw.toString('hex') };
        }
      }
      if (fault === 'info-tail' && api === 'TransactionPaymentApi_query_info')
        return { ...result, resultHex: result.resultHex + '00' };
      if (api === 'TransactionPaymentApi_query_fee_details') {
        if (fault === 'details-truncated') return { ...result, resultHex: result.resultHex.slice(0, -2) };
        const raw = Buffer.from(result.resultHex.slice(2), 'hex');
        if (fault === 'details-tip') raw[49] = 1;
        if (fault === 'details-disagreement') raw[1] ^= 1;
        return { ...result, resultHex: '0x' + raw.toString('hex') };
      }
      return result;
    };
    try {
      adapter.quote({ state: state(), assetIn: KUSD, assetOut: XOR, amountInCodec: '5000000000000000000' });
      throw new Error('unexpected success');
    } catch (error) {
      expect(error).toBeInstanceOf(GoalTargetRuntimeQuoteError);
      const failure = error as GoalTargetRuntimeQuoteError;
      expect(failure.receipts.length).toBeGreaterThan(0);
      expect(Object.isFrozen(failure.receipts)).toBe(true);
      expect(failure.stage).toBe(fault.startsWith('details') ? 'details' : fault.startsWith('info') ? 'info' : 'quote');
    }
  });
});

describe.skipIf(!existsSync(binaryPath))('owned asynchronous target quote worker', () => {
  const create = (options = {}) =>
    createGoalTargetRuntimeAsyncQuoteAdapter({ compressedBytes: readFileSync(binaryPath), ...options });
  const pending = () => ({ state: state(), assetIn: KUSD, assetOut: XOR, amountInCodec: '2500000000000000000' });
  beforeEach(() => {
    hooks.transform = undefined;
    workerHooks.forge = false;
  });
  afterAll(async () => {
    await Promise.all(workerHooks.created.map((worker) => worker.dispose()));
  });

  it.each([false, true])('matches every synchronous exact131 result byte for direction reverse=%s', async (reverse) => {
    const sync = createGoalTargetRuntimeQuoteAdapter(readFileSync(binaryPath));
    const asyncAdapter = await create();
    try {
      const input = reverse
        ? { ...pending(), assetIn: XOR, assetOut: KUSD, amountInCodec: '250000000000000000' }
        : pending();
      const expected = sync.quote(input);
      expect(
        createHash('sha256')
          .update(Buffer.from(asyncAdapter.metadataHex.slice(2), 'hex'))
          .digest('hex')
      ).toBe(asyncAdapter.profile.metadataSha256);
      const mainThreadCalls = hooks.calls.length;
      expect(await asyncAdapter.quote(input)).toEqual(expected);
      expect(hooks.calls).toHaveLength(mainThreadCalls);
    } finally {
      await asyncAdapter.dispose();
    }
  });

  it('preserves pending input and call-option snapshots across worker awaits', async () => {
    const asyncAdapter = await create();
    try {
      const input = pending(),
        options = { timeoutMs: 10000 };
      const work = asyncAdapter.quote(input, options);
      input.amountInCodec = '99';
      input.assetIn = XOR;
      options.timeoutMs = 1;
      const result = await work;
      expect(result.request).toMatchObject({ amountInCodec: '2500000000000000000', assetIn: KUSD });
    } finally {
      await asyncAdapter.dispose();
    }
  });

  it('rejects overlapping quotes without cancelling the already active operation', async () => {
    const asyncAdapter = await create();
    try {
      const work = asyncAdapter.quote(pending());
      await expect(asyncAdapter.quote(pending())).rejects.toThrow('busy');
      expect((await work).kind).toBe('hypothetical-target-runtime-execution-estimate');
    } finally {
      await asyncAdapter.dispose();
    }
  });

  it.each(['caller', 'parent', 'dispose'])('cannot emit an estimate after in-flight %s cancellation', async (kind) => {
    const controller = new AbortController();
    const asyncAdapter = await create(kind === 'parent' ? { signal: controller.signal } : {});
    const work = asyncAdapter.quote(pending(), kind === 'caller' ? { signal: controller.signal } : {});
    const rejection = expect(work).rejects.toMatchObject({
      name: 'GoalTargetRuntimeQuoteError',
      reason: kind === 'dispose' ? 'worker-unavailable' : 'cancelled',
    });
    if (kind === 'dispose') await asyncAdapter.dispose();
    else controller.abort();
    await rejection;
    await expect(asyncAdapter.quote(pending())).rejects.toThrow('target-worker:');
    await asyncAdapter.dispose();
  });

  it('uses one original whole-quote deadline and permanently closes after its expiry', async () => {
    const asyncAdapter = await create();
    await expect(asyncAdapter.quote(pending(), { timeoutMs: 1 })).rejects.toMatchObject({
      name: 'GoalTargetRuntimeQuoteError',
      reason: 'timeout',
    });
    await expect(asyncAdapter.quote(pending())).rejects.toThrow('target-worker:');
    await asyncAdapter.dispose();
  });

  it('passes decreasing remaining deadlines instead of resetting the budget for each API', async () => {
    const asyncAdapter = await create();
    const delays: number[] = [];
    const original = globalThis.setTimeout;
    const timer = vi.spyOn(globalThis, 'setTimeout').mockImplementation(((
      callback: (...args: unknown[]) => void,
      delay?: number,
      ...args: unknown[]
    ) => {
      if (typeof delay === 'number' && delay > 0 && delay <= 10000) delays.push(delay);
      return original(callback, delay, ...args);
    }) as typeof setTimeout);
    try {
      const result = await asyncAdapter.quote(pending(), { timeoutMs: 10000 });
      expect(result.kind).toBe('hypothetical-target-runtime-execution-estimate');
      expect(delays).toHaveLength(3);
      expect(delays[0]).toBeLessThan(10000);
      expect(delays[1]).toBeLessThan(delays[0]);
      expect(delays[2]).toBeLessThan(delays[1]);
    } finally {
      timer.mockRestore();
      await asyncAdapter.dispose();
    }
  });

  it('rejects forged worker ownership and closes the actual underlying worker', async () => {
    workerHooks.forge = true;
    await expect(create()).rejects.toThrow('target-worker:');
    const worker = workerHooks.created.at(-1);
    await expect(worker.invoke({ api: 'Core_version', inputHex: '0x' })).rejects.toThrow('target-worker:');
  });

  it('rejects an aborted startup and forbidden worker injection without returning an adapter', async () => {
    const controller = new AbortController();
    const work = create({ signal: controller.signal });
    const rejected = expect(work).rejects.toThrow('target-worker:aborted');
    controller.abort();
    await rejected;
    await expect(
      createGoalTargetRuntimeAsyncQuoteAdapter({ compressedBytes: readFileSync(binaryPath), worker: {} } as any)
    ).rejects.toThrow('own fields');
  });
});
