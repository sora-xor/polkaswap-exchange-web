/** Actual target WASM with invented storage under genuine historical schemas; no economic observations. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { TypeRegistry } from '@polkadot/types';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createGoalRuntimeCatalog } from '@/features/bot-trading/execution-codecs/runtime-catalog';
import {
  createGoalCatalogTargetRuntimeStateCodec,
  type GoalTargetStateReceipt,
} from '../../../../scripts/bots/goal-target-runtime-state';
import { createGoalTargetRuntimeAsyncQuoteAdapter } from '../../../../scripts/bots/goal-target-runtime-quote';
import {
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '../../../../scripts/bots/historical-execution-codec';

vi.unmock('@polkadot/util-crypto');
const syntheticRoot = new URL(
  '../../../../output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/',
  import.meta.url
);
const schemaRoot = new URL(
  '../../../../output/go-history/partial-target-window-metadata-20260921/source-schemas/',
  import.meta.url
);
const sourceSchema = (version: number) =>
  JSON.parse(readFileSync(new URL(`source${version}-unverified-schema.json`, schemaRoot), 'utf8'));
const synthetic = (name: string) => JSON.parse(readFileSync(new URL(name, syntheticRoot), 'utf8'));
const targetMetadataHex = new TypeRegistry()
  .createType('Bytes', Buffer.from(synthetic('metadata-131.json').actualExport.resultHex.slice(2), 'hex'))
  .toHex();
const sourceSchemas = [128, 129, 130].map(sourceSchema);
const catalog = createGoalRuntimeCatalog({
  source128MetadataHex: sourceSchemas[0].metadataHex,
  source129MetadataHex: sourceSchemas[1].metadataHex,
  source130MetadataHex: sourceSchemas[2].metadataHex,
  target131MetadataHex: targetMetadataHex,
});
const block = { hash: `0x${'ab'.repeat(32)}`, height: 100 };

/** Genuine parser ownership from invented retained-style RPC values, without historical price access. */
function verifiedState(version: number, unavailable = false) {
  const codec = createGoalCatalogTargetRuntimeStateCodec({
    catalog,
    sourceCodeHash: sourceSchemas.find((s) => s.runtimeProfile.specVersion === version).runtimeProfile.codeHash,
  });
  const declarations = synthetic('dispatch-130-kusd-xor-success.json').declarations as {
    key: string;
    value: string | null;
  }[];
  const properties = declarations.find((d) => d.key === codec.fixedKeys.properties)!.value;
  const pool = codec.derivePoolKeys(properties);
  const points = [...Object.values(codec.fixedKeys), pool.poolXor, pool.poolKusd];
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
      responseSha256: createHash('sha256').update(responseBody).digest('hex'),
    });
  };
  for (const key of points)
    add(
      'state_getStorage',
      [key, block.hash],
      unavailable && key === codec.fixedKeys.sources ? '0x00' : declarations.find((d) => d.key === key)!.value
    );
  add('state_getKeysPaged', [codec.xstPrefix, 64, null, block.hash], []);
  add(
    'state_getKeysPaged',
    [null, 1, codec.xstPrefix, block.hash],
    [points.filter((k) => k > codec.xstPrefix).sort()[0]]
  );
  return codec.verify({ sourceBlock: block, receipts });
}

describe('actual target runtime over catalog-owned source schemas', () => {
  let adapter: Awaited<ReturnType<typeof createGoalTargetRuntimeAsyncQuoteAdapter>>;
  const network = vi.fn(() => {
    throw Error('Network forbidden');
  });
  beforeAll(async () => {
    vi.stubGlobal('fetch', network);
    adapter = await createGoalTargetRuntimeAsyncQuoteAdapter({
      compressedBytes: readFileSync(
        '/Users/takemiyamakoto/dev/sora2-network/runtime-upgrade-4.8.9/framenode-runtime-4.8.9.compact.compressed.wasm'
      ),
    });
  }, 30000);
  afterAll(() => {
    adapter?.dispose();
    expect(network).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it.each([128, 129, 130])(
    'preserves source %i provenance and executes both directions with target131 fees',
    async (version) => {
      const state = verifiedState(version);
      for (const [assetIn, assetOut, amountInCodec] of [
        [KUSD, XOR, '5000000000000000000'],
        [XOR, KUSD, '1000000000000000000'],
      ]) {
        const result = await adapter.quote({ state, assetIn, assetOut, amountInCodec });
        expect(result.kind).toBe('hypothetical-target-runtime-execution-estimate');
        if (result.kind !== 'hypothetical-target-runtime-execution-estimate') throw Error('Fixture route unavailable');
        expect(result.source.runtimeProfile.specVersion).toBe(version);
        expect(result.source.catalogSha256).toBe(state.catalogSha256);
        expect(result.source.sourceBindingSha256).toBe(state.sourceBindingSha256);
        expect(result.fees.basis).toBe(`target131-api-over-source${version}-multiplier`);
        expect(result.fees.info.partialFeeCodec).toBe(result.fees.details.finalFee);
        expect(result.apis.map((r) => r.api)).toEqual([
          'LiquidityProxyAPI_quote',
          'TransactionPaymentApi_query_info',
          'TransactionPaymentApi_query_fee_details',
        ]);
        expect(result.observedFill).toBe(false);
        expect(result.transactionSubmitted).toBe(false);
        expect(result.admissionGranted).toBe(false);
      }
    },
    60000
  );

  it('retains source identity on unavailable routes without fee APIs', async () => {
    const state = verifiedState(128, true);
    const result = await adapter.quote({ state, assetIn: KUSD, assetOut: XOR, amountInCodec: '5000000000000000000' });
    expect(result.kind).toBe('target-runtime-route-unavailable');
    expect(result.source.runtimeProfile.specVersion).toBe(128);
    expect(result.source.sourceBindingSha256).toBe(state.sourceBindingSha256);
    expect(result.apis).toHaveLength(1);
  }, 30000);

  it('cannot recover parser authority by serializing or editing a verified source state', async () => {
    const state = verifiedState(129);
    await expect(
      adapter.quote({
        state: JSON.parse(JSON.stringify(state)),
        assetIn: KUSD,
        assetOut: XOR,
        amountInCodec: '5000000000000000000',
      })
    ).rejects.toThrow('unowned');
    await expect(
      adapter.quote({
        state: { ...state, profiles: { ...state.profiles, source: { ...state.profiles.source, specVersion: 130 } } },
        assetIn: KUSD,
        assetOut: XOR,
        amountInCodec: '5000000000000000000',
      } as never)
    ).rejects.toThrow('unowned');
  });
});
