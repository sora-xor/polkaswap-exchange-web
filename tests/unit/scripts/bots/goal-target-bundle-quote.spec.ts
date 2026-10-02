/** Original-style invented artifacts with real metadata, market codecs and the exact target worker. No network. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Metadata, TypeRegistry } from '@polkadot/types';
import { expandMetadata } from '@polkadot/types/metadata';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import {
  verifyGoalTargetBundleQuote,
  type GoalTargetBundleQuoteBinding,
  type GoalTargetBundleQuoteBytes,
} from '../../../../scripts/bots/goal-target-bundle-quote';
import {
  createGoalTargetRuntimeStateCodec,
  createGoalCatalogTargetRuntimeStateCodec,
  type GoalTargetStateReceipt,
} from '../../../../scripts/bots/goal-target-runtime-state';
import { createGoalTargetRuntimeQuoteAdapter } from '../../../../scripts/bots/goal-target-runtime-quote';
import {
  createHistoricalGoalMarketReader,
  createCatalogHistoricalGoalMarketReader,
} from '../../../../scripts/bots/historical-goal-market-reader';
import { createHistoricalExecutionPoolCodec } from '@/features/bot-trading/execution-codecs/pool';
import {
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '../../../../scripts/bots/historical-execution-codec';
import {
  verifyGoalBundleValuation,
  verifyGoalBundleCatalogValuation,
  getGoalBundleVerifiedMarketCatalog,
  getGoalBundleVerifiedMarketState,
  type GoalBundleValuationBinding,
  type GoalBundleCatalogValuationBinding,
} from '@/features/bot-trading/goal-bundle-market';
import { goalRawEvidenceDigest as digest } from '@/features/bot-trading/goal-raw-envelope';
import {
  GOAL_TARGET_MODEL_PROTOCOL,
  GOAL_CATALOG_TARGET_MODEL_PROTOCOL,
  GOAL_CATALOG_TARGET_SOURCE_PROFILES,
  GOAL_TARGET_RUNTIME_CATALOG_SHA256,
  GOAL_TARGET_COST_PROTOCOL,
  GOAL_TARGET_MODEL_PROFILES,
  GOAL_TARGET_COMPRESSED_SHA256,
  type GoalTargetExecutionModel,
  type GoalSource130TargetExecutionModel,
} from '@/features/bot-trading/goal-target-model';
import { createCatalogHistoricalExecutionPoolCodec } from '@/features/bot-trading/execution-codecs/catalog-pool';
import { verifyGoalBundleCatalogMetadata } from '@/features/bot-trading/goal-bundle-metadata';
import {
  createGoalBundleCatalogMetadataFixture,
  catalogMetadataFixtureVersion,
} from '../../../fixtures/bots/goal-bundle-catalog-metadata';

const directory = new URL(
  '../../../../output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/',
  import.meta.url
);
const artifact = (name: string) => JSON.parse(readFileSync(new URL(name, directory), 'utf8'));
const metadata = (version: number) =>
  new TypeRegistry()
    .createType('Bytes', Buffer.from(artifact(`metadata-${version}.json`).actualExport.resultHex.slice(2), 'hex'))
    .toHex();
const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const canonical = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
          .join(',')}}`
      : JSON.stringify(value);
const requestSha256 = 'c'.repeat(64);
const wrap = (name: string, value: unknown) =>
  new TextEncoder().encode(
    canonical({ kind: 'goal-study-raw-evidence-v1', requestSha256, name, sha256: digest(value), value }) + '\n'
  );
const H = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const block = { hash: H(100), height: 100 };
let binary: Uint8Array;
let sourceMetadataHex: string;
let codec: ReturnType<typeof createGoalTargetRuntimeStateCodec>;
let oracle: ReturnType<typeof createGoalTargetRuntimeQuoteAdapter>;
let valuation: ReturnType<typeof verifyGoalBundleValuation>;
let model: GoalSource130TargetExecutionModel;
const network = vi.fn(() => {
  throw Error('Network forbidden');
});

beforeAll(async () => {
  vi.stubGlobal('fetch', network);
  binary = readFileSync(
    '/Users/takemiyamakoto/dev/sora2-network/runtime-upgrade-4.8.9/framenode-runtime-4.8.9.compact.compressed.wasm'
  );
  sourceMetadataHex = metadata(130);
  codec = createGoalTargetRuntimeStateCodec({ sourceMetadataHex, targetMetadataHex: metadata(131) });
  oracle = createGoalTargetRuntimeQuoteAdapter(Buffer.from(binary));
  model = {
    protocol: GOAL_TARGET_MODEL_PROTOCOL,
    sourceRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.source,
    targetRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.target,
    targetCompressedSha256: GOAL_TARGET_COMPRESSED_SHA256,
    implementation: Object.fromEntries(
      [
        ['hostSha256', 'goal-target-runtime-host.cjs'],
        ['stateCodecSha256', 'goal-target-runtime-state.ts'],
        ['quoteCodecSha256', 'goal-target-runtime-quote.ts'],
      ].map(([key, path]) => [key, sha(readFileSync(new URL('../../../../scripts/bots/' + path, import.meta.url)))])
    ) as GoalSource130TargetExecutionModel['implementation'],
    stateModel: 'source130-exact-storage-complete-xst-v1',
    fillModel: 'minimum-output-hypothetical-no-market-feedback',
    costPolicy: { protocol: GOAL_TARGET_COST_PROTOCOL, maximumLiveFeeCodec: '100000000000000000' },
  };
  const registry = new TypeRegistry();
  const meta = new Metadata(registry, sourceMetadataHex as `0x${string}`);
  registry.setMetadata(meta);
  const query = expandMetadata(registry, meta).query;
  const encode = (pallet: string, name: string, value: unknown) => {
    const type = query[pallet][name].meta.type;
    return `0x${Buffer.from(registry.createType(registry.createLookupType(type.isPlain ? type.asPlain : type.asMap.value), value).toU8a()).toString('hex')}`;
  };
  const declarations = artifact('dispatch-130-kusd-xor-success.json').declarations as {
    key: string;
    value: string | null;
  }[];
  const properties = declarations.find((row) => row.key === codec.fixedKeys.properties)!.value;
  const identity = {
    genesisHash: GENESIS,
    blockHash: block.hash,
    metadataHex: sourceMetadataHex,
    runtimeVersion: { specVersion: 130, transactionVersion: 130 },
  };
  const poolKeys = createHistoricalExecutionPoolCodec(identity).storageKeys();
  const values = {
    timestamp: encode('timestamp', 'now', 1000000),
    denominator: encode('denomination', 'denominator', '1'),
    kusd: encode('assets', 'assetInfosV2', { symbol: 'KUSD', precision: 18 }),
    xor: encode('assets', 'assetInfosV2', { symbol: 'XOR', precision: 18 }),
    dex0: encode('dexManager', 'dexInfos', { baseAssetId: { code: XOR } }),
    properties,
    // Cached valuation reserves are deliberately distinct from host account balances.
    reserves: encode('poolXYK', 'reserves', ['100000000000000000000', '900000000000000000000']),
  };
  expect(createHistoricalExecutionPoolCodec(identity).decodeStorage(values).status).toBe('present');
  const source = {
    finalizedSource: { hash: H(200), height: 200, receiptSha256: 'a'.repeat(64) },
    schemaAnchor: { hash: H(10), height: 10 },
  };
  const fetcher: typeof fetch = async (_url, init) => {
    const r = JSON.parse(String(init!.body));
    let result: unknown;
    if (r.method === 'chain_getBlockHash') result = r.params[0] === 0 ? GENESIS : H(r.params[0]);
    else if (r.method === 'chain_getFinalizedHead') result = H(210);
    else if (r.method === 'chain_getHeader') {
      const height = Number(BigInt(r.params[0]));
      result = {
        number: `0x${height.toString(16)}`,
        parentHash: H(height - 1),
        stateRoot: H(500),
        extrinsicsRoot: H(501),
        digest: { logs: [] },
      };
    } else if (r.method === 'state_getRuntimeVersion')
      result = { specName: 'sora-substrate', specVersion: 130, transactionVersion: 130 };
    else if (r.method === 'state_getStorageHash') result = model.sourceRuntimeProfile.codeHash;
    else if (r.method === 'state_getMetadata') result = sourceMetadataHex;
    else if (r.method === 'state_getStorage') result = values.timestamp;
    else if (r.method === 'state_queryStorageAt')
      result = [
        {
          block: r.params[1],
          changes: Object.entries(poolKeys).map(([name, key]) => [key, values[name as keyof typeof values]]),
        },
      ];
    else throw Error('Unexpected synthetic RPC');
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: r.id, result }));
  };
  const reader = await createHistoricalGoalMarketReader({ source, expectedDenominator: '1' }, { fetch: fetcher });
  const schema = structuredClone({ context: reader.context, evidence: reader.evidence() });
  const value = await reader.readMark(block.height);
  const evidence = reader.evidence();
  const state = {
    schemaSha256: digest(schema),
    value,
    blockEvidence: evidence.blockEvidence.slice(10),
    storageEvidence: evidence.storageEvidence,
  };
  const projection = {
    sourceManifestSha256: 'b'.repeat(64),
    genesisHash: GENESIS,
    block: value.block,
    mark: { ...value.mark!, blockNumber: block.height, denominator: '1' },
    runtimeProfile: model.sourceRuntimeProfile,
    captureStartedAtMs: 1000005,
    receivedAtMs: 1000020,
  };
  const mark = { ...projection, rawSha256: digest(state), timingKind: 'fixed-pinned-capture-delays-v1' };
  const binding: GoalBundleValuationBinding = {
    requestSha256,
    sourceManifestSha256: projection.sourceManifestSha256,
    genesisHash: GENESIS,
    denominator: '1',
    source,
    runtimeProfiles: [model.sourceRuntimeProfile],
    block: value.block,
    captureStartedAtMs: projection.captureStartedAtMs,
    receivedAtMs: projection.receivedAtMs,
    timingKind: 'fixed-pinned-capture-delays-v1',
    schema: { name: 'market-schema-1.json', valueSha256: digest(schema) },
    state: { name: 'market-state-100.json', valueSha256: digest(state) },
    valuation: { name: 'valuation-1.json', valueSha256: digest(mark) },
  };
  valuation = verifyGoalBundleValuation(binding, {
    schemaBytes: wrap(binding.schema.name, schema),
    stateBytes: wrap(binding.state.name, state),
    valuationBytes: wrap(binding.valuation.name, mark),
  });
}, 30000);
afterAll(() => {
  expect(network).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

type QuoteScenario = {
  codec:
    | ReturnType<typeof createGoalTargetRuntimeStateCodec>
    | ReturnType<typeof createGoalCatalogTargetRuntimeStateCodec>;
  valuation: ReturnType<typeof verifyGoalBundleValuation>;
  model: GoalTargetExecutionModel;
  block: { hash: string; height: number };
};
function fixture(disabled = false, reverse = false, scenario: QuoteScenario = { codec, valuation, model, block }) {
  const { codec, valuation, model, block } = scenario;
  const declarations = artifact('dispatch-130-kusd-xor-success.json').declarations as {
    key: string;
    value: string | null;
  }[];
  const properties = declarations.find((row) => row.key === codec.fixedKeys.properties)!.value;
  const pool = codec.derivePoolKeys(properties);
  const keys = [...Object.values(codec.fixedKeys), pool.poolXor, pool.poolKusd];
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
      responseSha256: sha(responseBody),
    });
  };
  for (const key of keys)
    add(
      'state_getStorage',
      [key, block.hash],
      disabled && key === codec.fixedKeys.sources ? '0x00' : declarations.find((row) => row.key === key)!.value
    );
  add('state_getKeysPaged', [codec.xstPrefix, 64, null, block.hash], []);
  add(
    'state_getKeysPaged',
    [null, 1, codec.xstPrefix, block.hash],
    [keys.filter((key) => key > codec.xstPrefix).sort()[0]]
  );
  const state = codec.verify({ sourceBlock: block, receipts });
  const pending = {
    assetIn: reverse ? XOR : KUSD,
    assetOut: reverse ? KUSD : XOR,
    amountInCodec: reverse ? '250000000000000000' : '2500000000000000000',
    expectedDenominator: '1',
  };
  const estimate = structuredClone(
    oracle.quote({ state, assetIn: pending.assetIn, assetOut: pending.assetOut, amountInCodec: pending.amountInCodec })
  );
  const sourceState = getGoalBundleVerifiedMarketState(valuation);
  const quote: Record<string, unknown> = {
    protocol: 'target-runtime-archive-quote-v1',
    executionModelSha256: digest(model),
    sourceRawSha256: sourceState.sourceRawSha256,
    sourcePropertiesHex: sourceState.sourcePropertiesHex,
    receipts,
    estimate,
  };
  const success = estimate.kind === 'hypothetical-target-runtime-execution-estimate';
  const fee: Record<string, unknown> | undefined = success
    ? {
        protocol: 'target-runtime-archive-fee-v1',
        quoteEvidenceSha256: digest(quote),
        fees: estimate.fees,
        envelope: estimate.envelope,
        apis: estimate.apis.slice(1),
      }
    : undefined;
  const bound = success
    ? estimate.envelope.bound
    : oracle.quote({
        state: codec.verify({ sourceBlock: block, receipts: fixtureReceipts(scenario) }),
        assetIn: KUSD,
        assetOut: XOR,
        amountInCodec: pending.amountInCodec,
      });
  const policy = success ? estimate.envelope.bound : ('envelope' in bound ? bound.envelope.bound : undefined)!;
  const context: Record<string, unknown> = {
    context: { ...valuation, captureStartedAtMs: valuation.receivedAtMs, receivedAtMs: valuation.receivedAtMs },
    pending,
    valuationEvidenceSha256: valuation.evidenceSha256,
    quoteEvidenceSha256: digest(quote),
    ...(fee ? { feeEvidenceSha256: digest(fee) } : {}),
    executionModelSha256: digest(model),
    receivedAtMs: valuation.receivedAtMs + 100,
    timingKind: 'fixed-pinned-capture-delays-v1',
  };
  const binding: GoalTargetBundleQuoteBinding = {
    requestSha256,
    checkId: 1,
    finalizedSource: sourceState.finalizedSource,
    valuation,
    pending,
    decisionAtMs: valuation.receivedAtMs,
    quoteAndFeeReadMs: 100,
    cutoffAtMs: valuation.receivedAtMs + 980,
    timingKind: 'fixed-pinned-capture-delays-v1',
    feePolicyId: policy.policy.id,
    feePolicySha256: policy.policySha256,
    quote: { name: 'quote-1.json', valueSha256: digest(quote) },
    ...(fee ? { fee: { name: 'fee-1.json', valueSha256: digest(fee) } } : {}),
    context: { name: 'quote-context-1.json', valueSha256: digest(context) },
    executionModel: structuredClone(model),
    budget: { maxTradeKusdCodec: '2500000000000000000', maxTradeXorCodec: '250000000000000000' },
    sourceState,
  };
  const refresh = () => {
    binding.quote.valueSha256 = digest(quote);
    context.quoteEvidenceSha256 = binding.quote.valueSha256;
    if (fee) {
      fee.quoteEvidenceSha256 = binding.quote.valueSha256;
      binding.fee!.valueSha256 = digest(fee);
      context.feeEvidenceSha256 = binding.fee!.valueSha256;
    }
    binding.context.valueSha256 = digest(context);
  };
  const inputs = (): GoalTargetBundleQuoteBytes => ({
    quoteBytes: wrap('quote-1.json', quote),
    contextBytes: wrap('quote-context-1.json', context),
    ...(fee ? { feeBytes: wrap('fee-1.json', fee) } : {}),
    rpc: receipts.map((r) => ({
      name: `target-rpc-1-${r.id}.json`,
      valueSha256: digest(r),
      bytes: wrap(`target-rpc-1-${r.id}.json`, r),
    })),
  });
  return {
    binding,
    quote,
    fee,
    context,
    receipts,
    estimate,
    refresh,
    inputs,
    verify: () => verifyGoalTargetBundleQuote(binding, inputs(), { compressedBytes: binary }),
  };
}
// Only used to obtain the unchanged fee policy for unavailable fixtures, never to replace their raw receipt.
function fixtureReceipts(scenario?: QuoteScenario): GoalTargetStateReceipt[] {
  const f = fixture(false, false, scenario);
  return f.receipts;
}

describe('fixed V3 quote artifact join', () => {
  it.each([false, true])(
    'replays every original artifact and actual worker result, reverse=%s',
    async (reverse) => {
      const f = fixture(false, reverse),
        result = await f.verify();
      expect(result.result).toMatchObject({
        pending: f.binding.pending,
        executionRuntimeProfile: model.targetRuntimeProfile,
        executionModelSha256: digest(model),
        quoteEvidenceSha256: f.binding.quote.valueSha256,
        feeEvidenceSha256: f.binding.fee!.valueSha256,
        observedFill: false,
        transactionSubmitted: false,
        feeAdequacyVerified: false,
      });
      expect(result.result.context.runtimeProfile).toEqual(model.sourceRuntimeProfile);
      expect(result.result.context.evidenceSha256).toBe(f.binding.context.valueSha256);
      expect(result.counts).toEqual({
        httpRequests: 9,
        responseBytes: f.receipts.reduce((n, r) => n + Buffer.byteLength(r.responseBody), 0),
      });
      expect(Object.isFrozen(result.result)).toBe(true);
      expect(Object.isFrozen(result.result.context)).toBe(true);
      expect(Object.isFrozen(result.counts)).toBe(true);
    },
    30000
  );
  it('requires no fee for genuine unavailable route and never invents one', async () => {
    const f = fixture(true),
      result = await f.verify();
    expect(result.result).toMatchObject({ kind: 'target-runtime-route-unavailable' });
    expect(result.result).not.toHaveProperty('feeEvidenceSha256');
    expect(result.result).not.toHaveProperty('feeCodec');
    expect(result.counts.httpRequests).toBe(9);
  }, 30000);
  it('rejects copied source capability before worker replay', async () => {
    const f = fixture();
    Object.assign(f.binding, { sourceState: { ...f.binding.sourceState } });
    await expect(f.verify()).rejects.toThrow('unverified-market-state');
  });
  it.each([
    [
      'request',
      (f) => {
        f.binding.requestSha256 = 'e'.repeat(64);
      },
    ],
    [
      'source mark',
      (f) => {
        f.binding.valuation = { ...f.binding.valuation, mark: { ...f.binding.valuation.mark, kusdReserveCodec: '1' } };
      },
    ],
    [
      'source block',
      (f) => {
        f.binding.valuation = { ...f.binding.valuation, block: { ...f.binding.valuation.block, height: 101 } };
      },
    ],
    [
      'source profile',
      (f) => {
        f.binding.valuation = { ...f.binding.valuation, runtimeProfile: model.targetRuntimeProfile };
      },
    ],
    [
      'source manifest',
      (f) => {
        f.binding.valuation = { ...f.binding.valuation, sourceManifestSha256: 'e'.repeat(64) };
      },
    ],
    [
      'finalized source',
      (f) => {
        f.binding.finalizedSource = { ...f.binding.finalizedSource, height: 201 };
      },
    ],
    [
      'input budget',
      (f) => {
        Object.assign(f.binding.budget, { maxTradeKusdCodec: '1' });
      },
    ],
    [
      'input amount',
      (f) => {
        Object.assign(f.binding.pending, { amountInCodec: '1' });
      },
    ],
    [
      'denominator',
      (f) => {
        Object.assign(f.binding.pending, { expectedDenominator: '2' });
      },
    ],
    [
      'non-native asset',
      (f) => {
        Object.assign(f.binding.pending, { assetIn: '0x' + '99'.repeat(32) });
      },
    ],
    [
      'decision',
      (f) => {
        f.binding.decisionAtMs++;
      },
    ],
    [
      'cutoff',
      (f) => {
        f.binding.cutoffAtMs = 1000119;
      },
    ],
    [
      'read duration',
      (f) => {
        f.binding.quoteAndFeeReadMs = 60001;
      },
    ],
    [
      'source raw digest',
      (f) => {
        f.quote.sourceRawSha256 = 'e'.repeat(64);
      },
    ],
    [
      'source Properties',
      (f) => {
        f.quote.sourcePropertiesHex = '0x' + '99'.repeat(64);
      },
    ],
    [
      'model digest',
      (f) => {
        f.quote.executionModelSha256 = 'e'.repeat(64);
      },
    ],
    [
      'source model',
      (f) => {
        Object.assign(f.binding.executionModel, { sourceRuntimeProfile: model.targetRuntimeProfile });
      },
    ],
    [
      'host pin',
      (f) => {
        Object.assign(f.binding.executionModel.implementation, { hostSha256: 'e'.repeat(64) });
      },
    ],
    [
      'state codec pin',
      (f) => {
        Object.assign(f.binding.executionModel.implementation, { stateCodecSha256: 'e'.repeat(64) });
      },
    ],
    [
      'quote codec pin',
      (f) => {
        Object.assign(f.binding.executionModel.implementation, { quoteCodecSha256: 'e'.repeat(64) });
      },
    ],
    [
      'context time',
      (f) => {
        f.context.receivedAtMs = 1000121;
      },
    ],
    [
      'context valuation',
      (f) => {
        f.context.valuationEvidenceSha256 = 'e'.repeat(64);
      },
    ],
    [
      'fee policy',
      (f) => {
        f.binding.feePolicySha256 = 'e'.repeat(64);
      },
    ],
    [
      'fee artifact',
      (f) => {
        f.fee!.fees = {};
      },
    ],
  ] satisfies Array<[string, (f: ReturnType<typeof fixture>) => void]>)(
    'rejects changed %s even with rehashed wrapper joins',
    async (_name, change) => {
      const f = fixture();
      change(f);
      f.refresh();
      await expect(f.verify()).rejects.toThrow();
    }
  );

  it.each(['missing', 'duplicate', 'reordered', 'name', 'value-pin', 'body', 'extra'] as const)(
    'rejects %s RPC wrapper',
    async (mode) => {
      const f = fixture(),
        input = f.inputs(),
        rpc = [...input.rpc];
      if (mode === 'missing') rpc.pop();
      if (mode === 'duplicate') rpc[1] = rpc[0];
      if (mode === 'reordered') [rpc[0], rpc[1]] = [rpc[1], rpc[0]];
      if (mode === 'name') rpc[0] = { ...rpc[0], name: 'target-rpc-2-1.json' };
      if (mode === 'value-pin') rpc[0] = { ...rpc[0], valueSha256: 'e'.repeat(64) };
      if (mode === 'body') rpc[0] = { ...rpc[0], bytes: wrap(rpc[0].name, { ...f.receipts[0], httpStatus: 502 }) };
      if (mode === 'extra') rpc.push(rpc[0]);
      await expect(
        verifyGoalTargetBundleQuote(f.binding, { ...input, rpc }, { compressedBytes: binary })
      ).rejects.toThrow();
    }
  );

  it('requires independently retained RPC body to match its embedded quote value', async () => {
    const f = fixture(),
      input = f.inputs(),
      rpc = [...input.rpc];
    const changed = { ...f.receipts[0], completedAt: '2026-01-01T00:00:00.002Z' };
    rpc[0] = { ...rpc[0], valueSha256: digest(changed), bytes: wrap(rpc[0].name, changed) };
    await expect(
      verifyGoalTargetBundleQuote(f.binding, { ...input, rpc }, { compressedBytes: binary })
    ).rejects.toThrow('rpc-join');
  });

  it('requires actual target Properties to match the independently authenticated source bytes', async () => {
    const f = fixture(),
      index = f.receipts.findIndex((r) => r.params[0] === codec.fixedKeys.properties);
    const original = f.receipts[index];
    const body = JSON.stringify({ ...JSON.parse(original.responseBody), result: '0x' + '99'.repeat(64) });
    f.receipts[index] = { ...original, responseBody: body, responseSha256: sha(body) };
    f.refresh();
    await expect(f.verify()).rejects.toThrow('properties-join');
  });

  it('preserves acquisition timestamps and rejects a changed timestamp against the original estimate', async () => {
    const f = fixture();
    f.receipts[0] = { ...f.receipts[0], completedAt: '2026-01-01T00:00:00.002Z' };
    f.refresh();
    await expect(f.verify()).rejects.toThrow('estimate mismatch');
  });

  it.each([false, true])('requires exact fee absence/presence, unavailable=%s', async (disabled) => {
    const f = fixture(disabled),
      input = f.inputs();
    if (disabled) {
      const fee = { invented: true };
      Object.assign(f.binding, { fee: { name: 'fee-1.json', valueSha256: digest(fee) } });
      await expect(
        verifyGoalTargetBundleQuote(
          f.binding,
          { ...input, feeBytes: wrap('fee-1.json', fee) },
          { compressedBytes: binary }
        )
      ).rejects.toThrow('fee-presence');
    } else {
      const { feeBytes: _fee, ...rest } = input;
      await expect(verifyGoalTargetBundleQuote(f.binding, rest, { compressedBytes: binary })).rejects.toThrow(
        'fee-presence'
      );
    }
  });

  it('reexecutes instead of trusting a re-sealed normalized output or authority flag', async () => {
    const f = fixture();
    Object.assign(f.estimate, { admissionGranted: true });
    const { evidenceSha256: _old, ...body } = f.estimate;
    Object.assign(f.estimate, { evidenceSha256: sha(JSON.stringify(body)) });
    f.refresh();
    await expect(f.verify()).rejects.toThrow('estimate mismatch');
  });

  it('returns genuine above-cap raw fees for the unchanged evaluator to reject', async () => {
    const f = fixture();
    Object.assign(f.binding.executionModel.costPolicy, { maximumLiveFeeCodec: '1' });
    f.quote.executionModelSha256 = digest(f.binding.executionModel);
    f.context.executionModelSha256 = f.quote.executionModelSha256;
    f.refresh();
    const result = await f.verify();
    expect('feeCodec' in result.result && BigInt(result.result.feeCodec) > 1n).toBe(true);
  });

  it('snapshots caller data and binary before the first worker await', async () => {
    const f = fixture(),
      input = f.inputs(),
      compressedBytes = new Uint8Array(binary);
    const expected = structuredClone(f.binding.pending);
    const pending = verifyGoalTargetBundleQuote(f.binding, input, { compressedBytes });
    Object.assign(f.binding.pending, { amountInCodec: '1' });
    input.quoteBytes.fill(0);
    input.rpc[0].bytes.fill(0);
    compressedBytes.fill(0);
    expect((await pending).result.pending).toEqual(expected);
  });

  it.each(['binding', 'options', 'rpc'] as const)('rejects %s getters without invoking them', async (where) => {
    const f = fixture(),
      input = f.inputs(),
      options = { compressedBytes: binary },
      getter = vi.fn(() => binary);
    if (where === 'binding') Object.defineProperty(f.binding, 'sourceState', { enumerable: true, get: getter });
    if (where === 'options') Object.defineProperty(options, 'compressedBytes', { enumerable: true, get: getter });
    if (where === 'rpc') Object.defineProperty(input.rpc, 0, { enumerable: true, get: getter });
    await expect(verifyGoalTargetBundleQuote(f.binding, input, options)).rejects.toThrow();
    expect(getter).not.toHaveBeenCalled();
  });

  it('copies typed bytes intrinsically without evaluating supplied byte getters', async () => {
    const f = fixture(),
      input = f.inputs(),
      getter = vi.fn(() => {
        throw Error('getter invoked');
      });
    Object.defineProperty(input.quoteBytes, 'buffer', { get: getter });
    expect((await verifyGoalTargetBundleQuote(f.binding, input, { compressedBytes: binary })).counts.httpRequests).toBe(
      9
    );
    expect(getter).not.toHaveBeenCalled();
  });

  it('rejects pre-abort and malformed binary before replay', async () => {
    const f = fixture(),
      controller = new AbortController();
    controller.abort();
    await expect(
      verifyGoalTargetBundleQuote(f.binding, f.inputs(), { compressedBytes: binary, signal: controller.signal })
    ).rejects.toThrow('aborted');
    await expect(
      verifyGoalTargetBundleQuote(f.binding, f.inputs(), { compressedBytes: new Uint8Array([1]) })
    ).rejects.toThrow('binary-pin');
  });

  it('cancels the actual worker and cannot return an estimate after abort', async () => {
    const f = fixture(),
      controller = new AbortController();
    const result = verifyGoalTargetBundleQuote(f.binding, f.inputs(), {
      compressedBytes: binary,
      signal: controller.signal,
    });
    controller.abort();
    await expect(result).rejects.toThrow(/abort/i);
  });

  it('shares one finite timeout across preparation and actual worker execution', async () => {
    const f = fixture();
    await expect(
      verifyGoalTargetBundleQuote(f.binding, f.inputs(), { compressedBytes: binary, timeoutMs: 1 })
    ).rejects.toThrow(/timeout/i);
  });
});

/** Genuine public schema bytes and wholly invented original reader receipts produce actual owned market state. */
async function catalogScenario(
  f: Awaited<ReturnType<typeof createGoalBundleCatalogMetadataFixture>>,
  metadata: Awaited<ReturnType<typeof verifyGoalBundleCatalogMetadata>>,
  height: number
): Promise<QuoteScenario> {
  const { catalog, protocol } = f;
  const source = protocol.source;
  const entryAt = (n: number) =>
    catalog.entries.find((e) => e.profile.specVersion === catalogMetadataFixtureVersion(n))!;
  const entry = entryAt(height),
    selectedBlock = { hash: H(height), height };
  const stateCodec = createGoalCatalogTargetRuntimeStateCodec({ catalog, sourceCodeHash: entry.profile.codeHash });
  const declarations = artifact('dispatch-130-kusd-xor-success.json').declarations as {
    key: string;
    value: string | null;
  }[];
  const properties = declarations.find((r) => r.key === stateCodec.fixedKeys.properties)!.value;
  const registry = new TypeRegistry(),
    meta = new Metadata(registry, entry.metadataHex as `0x${string}`);
  registry.setMetadata(meta);
  const query = expandMetadata(registry, meta).query;
  const encode = (pallet: string, name: string, value: unknown) => {
    const type = query[pallet][name].meta.type;
    return `0x${Buffer.from(registry.createType(registry.createLookupType(type.isPlain ? type.asPlain : type.asMap.value), value).toU8a()).toString('hex')}`;
  };
  const values = {
    timestamp: encode('timestamp', 'now', height * 6000),
    denominator: encode('denomination', 'denominator', '1'),
    kusd: encode('assets', 'assetInfosV2', { symbol: 'KUSD', precision: 18 }),
    xor: encode('assets', 'assetInfosV2', { symbol: 'XOR', precision: 18 }),
    dex0: encode('dexManager', 'dexInfos', { baseAssetId: { code: XOR } }),
    properties,
    reserves: encode('poolXYK', 'reserves', ['100000000000000000000', '900000000000000000000']),
  };
  const pool = createCatalogHistoricalExecutionPoolCodec({
    catalog,
    sourceCodeHash: entry.profile.codeHash,
    blockHash: selectedBlock.hash,
  });
  const fetcher: typeof fetch = async (_url, init) => {
    const r = JSON.parse(String(init!.body));
    let result: unknown;
    if (r.method === 'chain_getBlockHash') result = r.params[0] === 0 ? GENESIS : H(r.params[0]);
    else if (r.method === 'chain_getFinalizedHead') result = H(1100);
    else if (r.method === 'chain_getHeader') {
      const n = Number(BigInt(r.params[0]));
      result = {
        number: `0x${n.toString(16)}`,
        parentHash: H(n - 1),
        stateRoot: H(3),
        extrinsicsRoot: H(4),
        digest: { logs: [] },
      };
    } else if (r.method === 'state_getRuntimeVersion') {
      const p = entryAt(Number(BigInt(r.params[0]))).profile;
      result = { specName: 'sora-substrate', specVersion: p.specVersion, transactionVersion: p.transactionVersion };
    } else if (r.method === 'state_getStorageHash') result = entryAt(Number(BigInt(r.params[1]))).profile.codeHash;
    else if (r.method === 'state_getMetadata') result = entryAt(Number(BigInt(r.params[0]))).metadataHex;
    else if (r.method === 'state_getStorage') result = values.timestamp;
    else if (r.method === 'state_queryStorageAt')
      result = [
        {
          block: r.params[1],
          changes: Object.entries(pool.storageKeys()).map(([label, key]) => [
            key,
            values[label as keyof typeof values],
          ]),
        },
      ];
    else throw Error('Unexpected synthetic RPC');
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: r.id, result }));
  };
  const reader = await createCatalogHistoricalGoalMarketReader(
    { source, expectedDenominator: '1' },
    { catalog, fetch: fetcher }
  );
  const schema = structuredClone({ context: reader.context, evidence: reader.evidence() });
  const value = await reader.readMark(height),
    evidence = reader.evidence();
  const state = {
    schemaSha256: digest(schema),
    value,
    blockEvidence: evidence.blockEvidence.slice(20),
    storageEvidence: evidence.storageEvidence,
    blockProfiles: evidence.blockProfiles,
  };
  const projected = {
    sourceManifestSha256: 'b'.repeat(64),
    genesisHash: GENESIS,
    block: value.block,
    mark: { ...value.mark!, blockNumber: height, denominator: '1' },
    runtimeProfile: value.runtimeProfile,
    captureStartedAtMs: height * 6000 + 5,
    receivedAtMs: height * 6000 + 20,
  };
  const mark = { ...projected, rawSha256: digest(state), timingKind: 'fixed-pinned-capture-delays-v1' };
  const binding: GoalBundleCatalogValuationBinding = {
    requestSha256,
    sourceManifestSha256: projected.sourceManifestSha256,
    genesisHash: GENESIS,
    denominator: '1',
    source,
    runtimeProfiles: GOAL_CATALOG_TARGET_SOURCE_PROFILES,
    block: value.block,
    captureStartedAtMs: projected.captureStartedAtMs,
    receivedAtMs: projected.receivedAtMs,
    timingKind: 'fixed-pinned-capture-delays-v1',
    schema: { name: 'market-schema-1.json', valueSha256: digest(schema) },
    state: { name: `market-state-${height}.json`, valueSha256: digest(state) },
    valuation: { name: 'valuation-1.json', valueSha256: digest(mark) },
  };
  const valuation = verifyGoalBundleCatalogValuation(
    binding,
    {
      schemaBytes: wrap(binding.schema.name, schema),
      stateBytes: wrap(binding.state.name, state),
      valuationBytes: wrap(binding.valuation.name, mark),
    },
    { catalog, metadata }
  );
  const { sourceRuntimeProfile: _source, ...legacy } = model;
  const catalogModel: GoalTargetExecutionModel = {
    ...legacy,
    protocol: GOAL_CATALOG_TARGET_MODEL_PROTOCOL,
    sourceRuntimeProfiles: GOAL_CATALOG_TARGET_SOURCE_PROFILES,
    catalogSha256: GOAL_TARGET_RUNTIME_CATALOG_SHA256,
    stateModel: 'catalog-source-exact-storage-complete-xst-v1',
    implementation: {
      ...legacy.implementation,
      catalogCodecSha256: sha(
        readFileSync(
          new URL('../../../../src/features/bot-trading/execution-codecs/runtime-catalog.ts', import.meta.url)
        )
      ),
    },
  };
  return { codec: stateCodec, valuation, model: catalogModel, block: selectedBlock };
}

describe('catalog V3 quote artifact replay', () => {
  let metadataFixture: Awaited<ReturnType<typeof createGoalBundleCatalogMetadataFixture>>;
  let metadata: Awaited<ReturnType<typeof verifyGoalBundleCatalogMetadata>>;
  const scenarios = new Map<number, QuoteScenario>();
  beforeAll(async () => {
    metadataFixture = await createGoalBundleCatalogMetadataFixture();
    metadata = await verifyGoalBundleCatalogMetadata(metadataFixture.binding, {
      catalog: metadataFixture.catalog,
      readArtifact: async (name) => new TextEncoder().encode(metadataFixture.files.get(name)!),
    });
    for (const height of [100, 130, 160])
      scenarios.set(catalogMetadataFixtureVersion(height), await catalogScenario(metadataFixture, metadata, height));
  }, 60000);
  it.each([128, 129, 130])(
    'replays the actual source%s profile with exact131 quote and fee APIs',
    async (version) => {
      const scenario = scenarios.get(version)!,
        f = fixture(false, false, scenario),
        result = await f.verify();
      expect(getGoalBundleVerifiedMarketCatalog(f.binding.sourceState)).toBe(metadataFixture.catalog);
      expect(result.result.context.runtimeProfile).toEqual(GOAL_CATALOG_TARGET_SOURCE_PROFILES[version - 128]);
      expect(result.result.executionRuntimeProfile).toEqual(GOAL_TARGET_MODEL_PROFILES.target);
      expect(result.result.executionModelSha256).toBe(digest(scenario.model));
      expect(result.counts).toEqual({
        httpRequests: 9,
        responseBytes: f.receipts.reduce((n, r) => n + Buffer.byteLength(r.responseBody), 0),
      });
      expect(f.estimate.source).toMatchObject({
        catalogSha256: metadataFixture.catalog.catalogSha256,
        runtimeProfile: { specVersion: version },
        sourceBindingSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
      });
      expect(result.result).toMatchObject({
        observedFill: false,
        transactionSubmitted: false,
        feeAdequacyVerified: false,
      });
    },
    30000
  );
  it('preserves reverse-direction and unavailable-route semantics', async () => {
    const reverse = fixture(false, true, scenarios.get(129)),
      result = await reverse.verify();
    expect(result.result.pending.assetIn).toBe(XOR);
    const unavailable = await fixture(true, false, scenarios.get(128)).verify();
    expect(unavailable.result).toMatchObject({ kind: 'target-runtime-route-unavailable' });
    expect(unavailable.result).not.toHaveProperty('feeCodec');
  }, 60000);
  it.each([
    'different-profile',
    'changed-binding',
    'changed-catalog',
    'changed-properties',
    'changed-receipt',
    'copied-state',
    'decoder-pin',
    'legacy-state',
    'legacy-model',
  ])(
    'rejects a rehashed catalog mismatch: %s',
    async (mode) => {
      const f = fixture(false, false, scenarios.get(128));
      if (mode === 'different-profile')
        f.binding.valuation = { ...f.binding.valuation, runtimeProfile: GOAL_CATALOG_TARGET_SOURCE_PROFILES[1] };
      if (mode === 'changed-binding') Object.assign(f.estimate.source, { sourceBindingSha256: 'e'.repeat(64) });
      if (mode === 'changed-catalog') Object.assign(f.estimate.source, { catalogSha256: 'e'.repeat(64) });
      if (mode === 'changed-properties') f.quote.sourcePropertiesHex = '0x' + '99'.repeat(64);
      if (mode === 'changed-receipt') {
        const r = f.receipts[0];
        Object.assign(r, { requestedAt: '2026-01-01T00:00:00.000Z', completedAt: '2026-01-01T00:00:00.002Z' });
      }
      if (mode === 'copied-state') Object.assign(f.binding, { sourceState: { ...f.binding.sourceState } });
      if (mode === 'decoder-pin')
        Object.assign(f.binding.executionModel.implementation, { catalogCodecSha256: 'e'.repeat(64) });
      if (mode === 'legacy-state')
        Object.assign(f.binding, { sourceState: getGoalBundleVerifiedMarketState(valuation) });
      if (mode === 'legacy-model') Object.assign(f.binding, { executionModel: model });
      f.refresh();
      await expect(f.verify()).rejects.toThrow();
    },
    30000
  );
  it('rechecks source ownership after worker await when metadata is revoked', async () => {
    const controller = new AbortController();
    const owned = await verifyGoalBundleCatalogMetadata(metadataFixture.binding, {
      catalog: metadataFixture.catalog,
      signal: controller.signal,
      readArtifact: async (name) => new TextEncoder().encode(metadataFixture.files.get(name)!),
    });
    const scenario = await catalogScenario(metadataFixture, owned, 100),
      f = fixture(false, false, scenario);
    const pending = f.verify();
    controller.abort();
    await expect(pending).rejects.toThrow('aborted');
  }, 30000);
});
