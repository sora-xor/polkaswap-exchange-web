// @vitest-environment node
/** Pinned local binary/metadata and invented state only. No historical market archive or network is read. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { TypeRegistry } from '@polkadot/types';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  replayGoalTargetRuntimeEstimate,
  type GoalTargetRuntimeEstimateReplayInput,
} from '../../../../scripts/bots/goal-target-runtime-replay';
import { createGoalTargetRuntimeQuoteAdapter } from '../../../../scripts/bots/goal-target-runtime-quote';
import {
  createGoalTargetRuntimeStateCodec,
  type GoalTargetStateReceipt,
} from '../../../../scripts/bots/goal-target-runtime-state';
import {
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '../../../../scripts/bots/historical-execution-codec';

type AsyncAdapter = Awaited<
  ReturnType<
    typeof import('../../../../scripts/bots/goal-target-runtime-quote').createGoalTargetRuntimeAsyncQuoteAdapter
  >
>;
const hooks = vi.hoisted(() => ({
  created: [] as Array<{
    quote: ReturnType<typeof vi.fn<AsyncAdapter['quote']>>;
    dispose: ReturnType<typeof vi.fn<() => Promise<void>>>;
  }>,
  onDisposed: undefined as undefined | (() => void),
}));
vi.mock('../../../../scripts/bots/goal-target-runtime-quote', async (original) => {
  const actual = await original<typeof import('../../../../scripts/bots/goal-target-runtime-quote')>();
  return {
    ...actual,
    async createGoalTargetRuntimeAsyncQuoteAdapter(
      ...args: Parameters<typeof actual.createGoalTargetRuntimeAsyncQuoteAdapter>
    ) {
      const adapter = await actual.createGoalTargetRuntimeAsyncQuoteAdapter(...args);
      const observed = {
        ...adapter,
        quote: vi.fn((...input: Parameters<AsyncAdapter['quote']>) => adapter.quote(...input)),
        dispose: vi.fn(async () => {
          await adapter.dispose();
          hooks.onDisposed?.();
        }),
      };
      hooks.created.push(observed);
      return observed;
    },
  };
});

const binaryPath =
  '/Users/takemiyamakoto/dev/sora2-network/runtime-upgrade-4.8.9/framenode-runtime-4.8.9.compact.compressed.wasm';
const directory = new URL(
  '../../../../output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/',
  import.meta.url
);
const original = (name: string) => JSON.parse(readFileSync(new URL(name, directory), 'utf8'));
const metadata = (version: number) =>
  new TypeRegistry()
    .createType('Bytes', Buffer.from(original(`metadata-${version}.json`).actualExport.resultHex.slice(2), 'hex'))
    .toHex();
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const block = { hash: `0x${'ab'.repeat(32)}`, height: 100 };
let bytes: Buffer;
let sourceMetadataHex: string;
let codec: ReturnType<typeof createGoalTargetRuntimeStateCodec>;
let oracle: ReturnType<typeof createGoalTargetRuntimeQuoteAdapter>;
const network = vi.fn(() => {
  throw new Error('Network forbidden');
});

/** Original-style complete receipts around invented pool state, with actual pinned metadata decoding. */
function fixture(disabled = false, reverse = false): GoalTargetRuntimeEstimateReplayInput {
  const declarations = original('dispatch-130-kusd-xor-success.json').declarations as {
    key: string;
    value: string | null;
  }[];
  const properties = declarations.find((d) => d.key === codec.fixedKeys.properties)!.value;
  const pool = codec.derivePoolKeys(properties);
  const keys = [...Object.values(codec.fixedKeys), pool.poolXor, pool.poolKusd];
  const receipts: GoalTargetStateReceipt[] = [];
  const add = (method: GoalTargetStateReceipt['method'], params: unknown[], result: unknown) => {
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
    add(
      'state_getStorage',
      [key, block.hash],
      disabled && key === codec.fixedKeys.sources ? '0x00' : declarations.find((d) => d.key === key)!.value
    );
  add('state_getKeysPaged', [codec.xstPrefix, 64, null, block.hash], []);
  add(
    'state_getKeysPaged',
    [null, 1, codec.xstPrefix, block.hash],
    [keys.filter((key) => key > codec.xstPrefix).sort()[0]]
  );
  const state = codec.verify({ sourceBlock: block, receipts });
  const estimate = oracle.quote({
    state,
    assetIn: reverse ? XOR : KUSD,
    assetOut: reverse ? KUSD : XOR,
    amountInCodec: reverse ? '250000000000000000' : '2500000000000000000',
  });
  return {
    compressedBytes: Buffer.from(bytes),
    sourceBlock: { ...block },
    sourceMetadataHex,
    receipts,
    estimate: structuredClone(estimate),
  };
}

function reseal(estimate: Record<string, unknown>) {
  const { evidenceSha256: _prior, ...body } = estimate;
  estimate.evidenceSha256 = sha(JSON.stringify(body));
}
function record(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

beforeAll(() => {
  vi.stubGlobal('fetch', network);
  bytes = readFileSync(binaryPath);
  sourceMetadataHex = metadata(130);
  codec = createGoalTargetRuntimeStateCodec({ sourceMetadataHex, targetMetadataHex: metadata(131) });
  oracle = createGoalTargetRuntimeQuoteAdapter(bytes);
}, 30000);
beforeEach(() => {
  hooks.created = [];
  hooks.onDisposed = undefined;
});
afterEach(async () => {
  hooks.onDisposed = undefined;
  await Promise.all(hooks.created.map((adapter) => adapter.dispose()));
  vi.restoreAllMocks();
});
afterAll(() => {
  expect(network).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

describe('offline target runtime complete estimate replay', () => {
  it.each([false, true])(
    'reverifies genuine receipts and reproduces all exact API/fee/trace fields, reverse=%s',
    async (reverse) => {
      const input = fixture(false, reverse);
      const result = await replayGoalTargetRuntimeEstimate(input);
      expect(result).toEqual(input.estimate);
      expect(result.kind).toBe('hypothetical-target-runtime-execution-estimate');
      expect(result.apis).toHaveLength(3);
      expect(result).toMatchObject({
        admissionGranted: false,
        qualificationEligible: false,
        observedFill: false,
        signatureVerified: false,
        transactionSubmitted: false,
      });
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.apis[0].hostReceipt)).toBe(true);
      expect(hooks.created).toHaveLength(1);
      expect(hooks.created[0].quote).toHaveBeenCalledOnce();
      expect(hooks.created[0].dispose).toHaveBeenCalledOnce();
    },
    30000
  );

  it('reproduces an actual unavailable route without fabricating a quote or fees', async () => {
    const input = fixture(true);
    const result = await replayGoalTargetRuntimeEstimate(input);
    expect(result).toEqual(input.estimate);
    expect(result.kind).toBe('target-runtime-route-unavailable');
    expect(result.apis).toHaveLength(1);
    expect(result.apis[0].hostReceipt.resultHex).toBe('0x00');
    expect(result).not.toHaveProperty('fees');
  });

  it('compares canonical object fields while retaining exact original response strings', async () => {
    const input = fixture();
    const reversed = (value: unknown): unknown =>
      Array.isArray(value)
        ? value.map(reversed)
        : value && typeof value === 'object'
          ? Object.fromEntries(
              Object.entries(value)
                .reverse()
                .map(([key, item]) => [key, reversed(item)])
            )
          : value;
    const result = await replayGoalTargetRuntimeEstimate({ ...input, estimate: reversed(input.estimate) });
    expect(result).toEqual(input.estimate);
  });

  it('snapshots all mutable evidence and bytes before the first awaited worker readiness', async () => {
    const input = fixture();
    const expected = structuredClone(input.estimate);
    const pending = replayGoalTargetRuntimeEstimate(input);
    record(input.sourceBlock).hash = `0x${'cd'.repeat(32)}`;
    record(input.receipts[0]).responseBody = '{}';
    record(record(input.estimate).request).amountInCodec = '1';
    input.compressedBytes.fill(0);
    await expect(pending).resolves.toEqual(expected);
  });

  it.each([
    'http-status',
    'body-digest',
    'request-id',
    'wrong-block',
    'duplicate',
    'missing-point',
    'missing-empty-page',
    'wrong-cursor',
    'wrong-global-successor',
  ])('rejects corrupt original receipt %s before requesting a quote', async (kind) => {
    const input = fixture();
    const receipts = input.receipts as GoalTargetStateReceipt[];
    if (kind === 'http-status') record(receipts[0]).httpStatus = 502;
    if (kind === 'body-digest') record(receipts[0]).responseSha256 = '0'.repeat(64);
    if (kind === 'request-id') record(receipts[0]).requestBody = receipts[0].requestBody.replace('"id":1', '"id":90');
    if (kind === 'wrong-block') record(input.sourceBlock).hash = `0x${'cd'.repeat(32)}`;
    if (kind === 'duplicate') receipts.push(structuredClone(receipts[0]));
    if (kind === 'missing-point') receipts.shift();
    if (kind === 'missing-empty-page') receipts.splice(receipts.length - 2, 1);
    if (kind === 'wrong-cursor') {
      const receipt = receipts.at(-2)!;
      const params = [codec.xstPrefix, 64, `${codec.xstPrefix}01`, block.hash];
      record(receipt).params = params;
      record(receipt).requestBody = JSON.stringify({ jsonrpc: '2.0', id: receipt.id, method: receipt.method, params });
    }
    if (kind === 'wrong-global-successor') {
      const receipt = receipts.at(-1)!;
      record(receipt).responseBody = JSON.stringify({
        jsonrpc: '2.0',
        id: receipt.id,
        result: [`${codec.xstPrefix}01`],
      });
      record(receipt).responseSha256 = sha(receipt.responseBody);
    }
    await expect(replayGoalTargetRuntimeEstimate(input)).rejects.toThrow();
    expect(hooks.created).toHaveLength(1);
    expect(hooks.created[0].quote).not.toHaveBeenCalled();
    expect(hooks.created[0].dispose).toHaveBeenCalledOnce();
  });

  it.each([
    'raw-result',
    'fee',
    'state-digest',
    'receipt-digest',
    'target',
    'flag',
    'host-calls',
    'input-bytes',
    'changed-amount',
    'changed-height',
    'acquisition-time',
  ])('rejects changed %s even when the saved estimate digest is re-sealed', async (kind) => {
    const input = fixture();
    const estimate = record(input.estimate);
    const apis = estimate.apis as Array<Record<string, unknown>>;
    if (kind === 'raw-result') record(apis[0].hostReceipt).resultHex = '0x00';
    if (kind === 'fee') record(estimate.fees).feeCodec = '1';
    if (kind === 'state-digest') record(estimate.source).stateSha256 = '0'.repeat(64);
    if (kind === 'receipt-digest') record(estimate.source).receiptSha256 = '0'.repeat(64);
    if (kind === 'target') record(record(estimate.target).profile).specVersion = 130;
    if (kind === 'flag') estimate.qualificationEligible = true;
    if (kind === 'host-calls') record(apis[0].hostReceipt).hostCalls = [];
    if (kind === 'input-bytes') apis[0].inputHex = '0x';
    if (kind === 'changed-amount') record(estimate.request).amountInCodec = '1000000000000000000';
    if (kind === 'changed-height') record(input.sourceBlock).height = 101;
    if (kind === 'acquisition-time') record(input.receipts[0]).completedAt = '2026-01-01T00:00:00.002Z';
    reseal(estimate);
    await expect(replayGoalTargetRuntimeEstimate(input)).rejects.toThrow('estimate mismatch');
    expect(hooks.created[0].dispose).toHaveBeenCalledOnce();
  });

  it('does not accept unavailable-route data substituted for successful state', async () => {
    const input = fixture();
    const unavailable = fixture(true);
    await expect(replayGoalTargetRuntimeEstimate({ ...input, estimate: unavailable.estimate })).rejects.toThrow(
      'estimate mismatch'
    );
  });

  it.each(['pair', 'route', 'amount', 'extra-field', 'missing-field', 'kind'])(
    'rejects an invalid estimate request/schema %s before worker construction',
    async (kind) => {
      const input = fixture();
      const estimate = record(input.estimate),
        request = record(estimate.request);
      if (kind === 'pair') request.assetOut = KUSD;
      if (kind === 'route') request.dexId = 1;
      if (kind === 'amount') request.amountInCodec = (1n << 128n).toString();
      if (kind === 'extra-field') request.resize = true;
      if (kind === 'missing-field') delete request.filter;
      if (kind === 'kind') estimate.kind = 'qualified-trading';
      await expect(replayGoalTargetRuntimeEstimate(input)).rejects.toThrow('Invalid target-runtime replay:');
      expect(hooks.created).toHaveLength(0);
    }
  );

  it.each(['metadata', 'binary', 'transport', 'timeout'])(
    'rejects unpinned or forbidden %s input without creating an adapter',
    async (kind) => {
      const input = fixture();
      if (kind === 'metadata') record(input).sourceMetadataHex = `${sourceMetadataHex.slice(0, -2)}00`;
      if (kind === 'binary') input.compressedBytes[20] ^= 1;
      if (kind === 'transport') record(input).fetch = network;
      if (kind === 'timeout') record(input).timeoutMs = 30001;
      await expect(replayGoalTargetRuntimeEstimate(input)).rejects.toThrow();
      expect(hooks.created).toHaveLength(0);
    }
  );

  it('rejects nested accessors and unsupported JSON without invoking getters', async () => {
    const getter = vi.fn(() => '0');
    for (const mode of ['root', 'request', 'receipt', 'undefined', 'symbol', 'cycle']) {
      const input = fixture();
      if (mode === 'root') Object.defineProperty(input, 'receipts', { get: getter });
      if (mode === 'request') Object.defineProperty(record(input.estimate).request, 'amountInCodec', { get: getter });
      if (mode === 'receipt') Object.defineProperty(input.receipts[0], 'responseBody', { get: getter });
      if (mode === 'undefined') record(input.estimate).unexpected = undefined;
      if (mode === 'symbol') Object.defineProperty(input.estimate, Symbol('unexpected'), { value: true });
      if (mode === 'cycle') record(input.estimate).cycle = input.estimate;
      await expect(replayGoalTargetRuntimeEstimate(input)).rejects.toThrow();
    }
    expect(getter).not.toHaveBeenCalled();
    expect(hooks.created).toHaveLength(0);
  });

  it('bounds oversized evidence before worker construction', async () => {
    const input = fixture();
    record(input.estimate).extra = 'x'.repeat(16 * 1024 * 1024 + 1);
    await expect(replayGoalTargetRuntimeEstimate(input)).rejects.toThrow('JSON string bound');
    expect(hooks.created).toHaveLength(0);
  });

  it.each(['before', 'during'] as const)(
    'rejects cancellation %s readiness without returning an estimate',
    async (when) => {
      const controller = new AbortController();
      const input = { ...fixture(), signal: controller.signal };
      if (when === 'before') controller.abort();
      const pending = replayGoalTargetRuntimeEstimate(input);
      if (when === 'during') controller.abort();
      await expect(pending).rejects.toThrow('Invalid target-runtime replay: aborted');
      expect(hooks.created).toHaveLength(0);
    }
  );

  it('does not return evidence after cancellation during final disposal', async () => {
    const controller = new AbortController();
    hooks.onDisposed = () => controller.abort();
    await expect(replayGoalTargetRuntimeEstimate({ ...fixture(), signal: controller.signal })).rejects.toThrow(
      'Invalid target-runtime replay: aborted'
    );
    expect(hooks.created[0].dispose).toHaveBeenCalledOnce();
  });

  it('checks the original absolute deadline after cleanup even if timer delivery was delayed', async () => {
    const start = performance.now();
    hooks.onDisposed = () => {
      vi.spyOn(performance, 'now').mockReturnValue(start + 60000);
    };
    await expect(replayGoalTargetRuntimeEstimate(fixture())).rejects.toThrow('Invalid target-runtime replay: timeout');
    expect(hooks.created[0].dispose).toHaveBeenCalledOnce();
  });
});
