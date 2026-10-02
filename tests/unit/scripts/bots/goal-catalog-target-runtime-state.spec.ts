import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Metadata, TypeRegistry } from '@polkadot/types';
import { expandMetadata } from '@polkadot/types/metadata';
import { compactStripLength } from '@polkadot/util';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createGoalRuntimeCatalog } from '@/features/bot-trading/execution-codecs/runtime-catalog';
import {
  assertGoalTargetRuntimeState,
  createGoalCatalogTargetRuntimeStateCodec,
  createGoalTargetRuntimeStateCodec,
  GOAL_TARGET_STATE_PROFILES,
  type GoalTargetStateReceipt,
} from '../../../../scripts/bots/goal-target-runtime-state';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const fixtureRoot = 'output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/';
const metadata = (version: 128 | 129 | 130) =>
  JSON.parse(
    readFileSync(
      `output/go-history/partial-target-window-metadata-20260921/source-schemas/source${version}-unverified-schema.json`,
      'utf8'
    )
  ).metadataHex as string;
const targetMetadata = new TypeRegistry()
  .createType(
    'Bytes',
    Buffer.from(
      JSON.parse(readFileSync(`${fixtureRoot}metadata-131.json`, 'utf8')).actualExport.resultHex.slice(2),
      'hex'
    )
  )
  .toHex();
const catalog = createGoalRuntimeCatalog({
  source128MetadataHex: metadata(128),
  source129MetadataHex: metadata(129),
  source130MetadataHex: metadata(130),
  target131MetadataHex: targetMetadata,
});
const sourceEntry = (version: number) => catalog.entries.find((entry) => entry.profile.specVersion === version)!;
const network = vi.fn(() => {
  throw Error('No network in catalog-state tests');
});
beforeAll(() => vi.stubGlobal('fetch', network));
afterAll(() => {
  expect(network).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
const block = { hash: `0x${'ab'.repeat(32)}`, height: 100 };

/** Invented state only; retained exact metadata chooses the decoder, never market observations. */
function fixture(version: 128 | 129 | 130, members = 1) {
  const entry = sourceEntry(version);
  const codec = createGoalCatalogTargetRuntimeStateCodec({ catalog, sourceCodeHash: entry.profile.codeHash });
  const declarations = JSON.parse(readFileSync(`${fixtureRoot}dispatch-130-kusd-xor-success.json`, 'utf8'))
    .declarations as { key: string; value: string | null }[];
  const properties = declarations.find((row) => row.key === codec.fixedKeys.properties)!.value;
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
    add('state_getStorage', [key, block.hash], declarations.find((row) => row.key === key)!.value);
  const registry = new TypeRegistry(),
    runtimeMetadata = new Metadata(registry, Buffer.from(entry.metadataHex.slice(2), 'hex'));
  registry.setMetadata(runtimeMetadata);
  const xst = expandMetadata(registry, runtimeMetadata).query.xstPool.enabledSynthetics;
  const values = Array.from({ length: members }, (_, index) => {
    const asset = `0x${(BigInt(index) + 100n).toString(16).padStart(64, '0')}`;
    return {
      key: `0x${Buffer.from(compactStripLength(xst({ code: asset }))[1]).toString('hex')}`,
      value: registry
        .createType(registry.createLookupType(xst.meta.type.asMap.value), {
          referenceSymbol: 'TEST',
          feeRatio: { inner: '1000000000000000' },
        })
        .toHex(),
    };
  }).sort((a, b) => a.key.localeCompare(b.key, 'en'));
  let cursor: string | null = null;
  for (let offset = 0; offset < members; offset += 64) {
    const page = values.slice(offset, offset + 64).map((row) => row.key);
    add('state_getKeysPaged', [codec.xstPrefix, 64, cursor, block.hash], page);
    cursor = page.at(-1)!;
  }
  add('state_getKeysPaged', [codec.xstPrefix, 64, cursor, block.hash], []);
  for (const value of values) add('state_getStorage', [value.key, block.hash], value.value);
  const after = keys
    .filter((key) => key > (cursor ?? codec.xstPrefix) && declarations.find((row) => row.key === key)!.value !== null)
    .sort()[0];
  add('state_getKeysPaged', [null, 1, cursor ?? codec.xstPrefix, block.hash], after ? [after] : []);
  return { codec, evidence: { sourceBlock: block, receipts }, receipts };
}
function changeResult(receipt: GoalTargetStateReceipt, result: unknown) {
  const responseBody = JSON.stringify({ jsonrpc: '2.0', id: receipt.id, result });
  return { ...receipt, responseBody, responseSha256: sha(responseBody) };
}

describe('catalog-backed exact historical state for target131', () => {
  it.each([128, 129, 130] as const)(
    'retains actual source%d with the same strict finite storage verifier',
    (version) => {
      const f = fixture(version, 65),
        result = f.codec.verify(f.evidence);
      expect(result.kind).toBe('verified-catalog-source-target131-storage-v1');
      expect(result.profiles.source).toEqual(sourceEntry(version).profile);
      expect(result.profiles.target).toEqual(GOAL_TARGET_STATE_PROFILES.target);
      expect(result.catalogSha256).toBe(catalog.catalogSha256);
      expect(result.provenance).toBe('catalog-bound-rpc-storage-claims-only');
      expect(result.prefixKeys).toBe(65);
      expect(result.receiptCount).toBe(76);
      expect(result.stateSha256).toBe(sha(JSON.stringify(result.hostState)));
      expect(result.receiptSha256).toBe(sha(JSON.stringify(f.receipts)));
      expect(result.sourceBindingSha256).toBe(
        sha(
          JSON.stringify({
            kind: result.kind,
            catalogSha256: result.catalogSha256,
            profiles: result.profiles,
            sourceBlock: result.sourceBlock,
            receiptSha256: result.receiptSha256,
            stateSha256: result.stateSha256,
            provenance: result.provenance,
          })
        )
      );
      expect(() => assertGoalTargetRuntimeState(result)).not.toThrow();
      expect(() => assertGoalTargetRuntimeState({ ...result })).toThrow('unowned');
      expect(Object.isFrozen(result.profiles.source)).toBe(true);
      expect(Object.isFrozen(result.hostState.entries)).toBe(true);
    }
  );
  it('preserves original130 shape/digests while the catalog binding distinguishes identical storage at different versions', () => {
    const f = fixture(130),
      legacyCodec = createGoalTargetRuntimeStateCodec({
        sourceMetadataHex: metadata(130),
        targetMetadataHex: targetMetadata,
      });
    const original = legacyCodec.verify(f.evidence),
      catalog130 = f.codec.verify(f.evidence);
    const catalog128 = fixture(128).codec.verify(f.evidence);
    expect(original.kind).toBe('verified-source130-target131-storage-v1');
    expect(original.provenance).toBe('rpc-storage-claims-only');
    expect(Object.keys(original)).toEqual([
      'kind',
      'sourceBlock',
      'profiles',
      'hostState',
      'poolAccount',
      'receiptSha256',
      'stateSha256',
      'receiptCount',
      'prefixKeys',
      'provenance',
    ]);
    expect(catalog130.hostState).toEqual(original.hostState);
    expect(catalog130.stateSha256).toBe(original.stateSha256);
    expect(catalog130.receiptSha256).toBe(original.receiptSha256);
    expect(catalog128.stateSha256).toBe(catalog130.stateSha256);
    expect(catalog128.sourceBindingSha256).not.toBe(catalog130.sourceBindingSha256);
    expect(() =>
      createGoalTargetRuntimeStateCodec({ sourceMetadataHex: metadata(128), targetMetadataHex: targetMetadata })
    ).toThrow('metadata pin');
  });
  it('rejects unowned catalog, unknown hash, target-role source and caller metadata substitution before receipts', () => {
    expect(() =>
      createGoalCatalogTargetRuntimeStateCodec({
        catalog: { ...catalog },
        sourceCodeHash: sourceEntry(128).profile.codeHash,
      })
    ).toThrow();
    expect(() =>
      createGoalCatalogTargetRuntimeStateCodec({ catalog, sourceCodeHash: `0x${'ff'.repeat(32)}` })
    ).toThrow();
    expect(() =>
      createGoalCatalogTargetRuntimeStateCodec({ catalog, sourceCodeHash: catalog.target.profile.codeHash })
    ).toThrow('historical catalog source');
    expect(() =>
      createGoalCatalogTargetRuntimeStateCodec({
        catalog,
        sourceCodeHash: sourceEntry(128).profile.codeHash,
        sourceMetadataHex: metadata(130),
      })
    ).toThrow('own fields');
    const getter = vi.fn(() => catalog);
    expect(() =>
      createGoalCatalogTargetRuntimeStateCodec({
        get catalog() {
          return getter();
        },
        sourceCodeHash: sourceEntry(128).profile.codeHash,
      })
    ).toThrow('own fields');
    expect(getter).not.toHaveBeenCalled();
  });
  it.each(['response-digest', 'block', 'missing', 'extra', 'SCALE', 'prefix'] as const)(
    'rejects mutated %s evidence using the shared verifier',
    (mutation) => {
      const f = fixture(129);
      if (mutation === 'response-digest') f.receipts[0] = { ...f.receipts[0], responseSha256: '00'.repeat(32) };
      if (mutation === 'block') f.evidence.sourceBlock = { ...block, hash: `0x${'cd'.repeat(32)}` };
      if (mutation === 'missing') f.receipts.splice(0, 1);
      if (mutation === 'extra') f.receipts.push(f.receipts[0]);
      if (mutation === 'SCALE')
        f.receipts[0] = changeResult(f.receipts[0], `${JSON.parse(f.receipts[0].responseBody).result}00`);
      if (mutation === 'prefix') {
        const index = f.receipts.findIndex((row) => row.method === 'state_getKeysPaged');
        f.receipts[index] = changeResult(f.receipts[index], []);
      }
      expect(() => f.codec.verify(f.evidence)).toThrow();
    }
  );
  it('detaches verified state from later mutation and never treats omitted storage as absent', () => {
    const f = fixture(128),
      result = f.codec.verify(f.evidence),
      before = JSON.stringify(result);
    const index = f.receipts.findIndex((row) => row.params[0] === f.codec.fixedKeys.multiplier);
    f.receipts[index] = changeResult(f.receipts[index], null);
    expect(f.codec.verify(f.evidence).hostState.entries[f.codec.fixedKeys.multiplier]).toBeNull();
    expect(JSON.stringify(result)).toBe(before);
    f.receipts.splice(index, 1);
    expect(() => f.codec.verify(f.evidence)).toThrow('missing point');
  });
});
