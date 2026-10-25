import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createCatalogHistoricalExecutionPoolCodec } from '@/features/bot-trading/execution-codecs/catalog-pool';
import { createHistoricalExecutionPoolCodec } from '../../../../scripts/bots/historical-execution-pool-codec';
import { historicalCatalogProfileSha256 } from '../../../../scripts/bots/historical-execution-block-reader';
import {
  loadCatalogPoolFixture,
  catalogPoolStorageFixture,
  catalogPoolHash,
} from '../../../fixtures/bots/catalog-pool';

let catalog: Awaited<ReturnType<typeof loadCatalogPoolFixture>>;
const fixtures = new Map<number, ReturnType<typeof catalogPoolStorageFixture>>();
const network = vi.fn(() => {
  throw Error('No network');
});
beforeAll(async () => {
  vi.stubGlobal('fetch', network);
  catalog = await loadCatalogPoolFixture();
  for (const v of [128, 129, 130]) fixtures.set(v, catalogPoolStorageFixture(catalog, v));
});
afterAll(() => {
  expect(network).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
const codec = (v = 128) =>
  createCatalogHistoricalExecutionPoolCodec({
    catalog,
    sourceCodeHash: fixtures.get(v)!.entry.profile.codeHash,
    blockHash: catalogPoolHash(124),
  });

describe('catalog pool observation decoder', () => {
  it.each([128, 129, 130])('decodes invented state under exact runtime %i with no signing or quote authority', (v) => {
    const f = fixtures.get(v)!,
      reader = codec(v),
      result = reader.decodeStorage(f.proof());
    expect(reader.runtimeProfile).toEqual({
      specVersion: v,
      transactionVersion: v,
      metadataSha256: f.entry.profile.metadataSha256,
      codeHash: f.entry.profile.codeHash,
    });
    expect(reader.catalogBinding).toEqual({
      catalogSha256: catalog.catalogSha256,
      profileSha256: historicalCatalogProfileSha256(f.entry.profile),
    });
    expect(Object.keys(reader).sort()).toEqual([
      'binding',
      'catalogBinding',
      'decodeStorage',
      'runtimeProfile',
      'storageKeys',
    ]);
    expect(Object.values(reader.storageKeys())).toHaveLength(7);
    expect(result).toMatchObject({
      status: 'present',
      state: {
        timestampMs: 744000,
        denominator: '100000000000000000000000000000000000000',
        assets: { kusd: { decimals: 18 }, xor: { decimals: 18 } },
      },
      marks: { xorPerKusd: { numeratorCodec: '3000000000000000000', denominatorCodec: '2000000000000000000' } },
    });
    expect(Object.isFrozen(result.binding)).toBe(true);
    expect(Object.isFrozen(reader.runtimeProfile)).toBe(true);
  });
  it('reuses only schema keys while every block binding and decoded state remains separate', () => {
    const first = codec(128),
      second = createCatalogHistoricalExecutionPoolCodec({
        catalog,
        sourceCodeHash: fixtures.get(128)!.entry.profile.codeHash,
        blockHash: catalogPoolHash(125),
      });
    expect(second.storageKeys()).toBe(first.storageKeys());
    expect(codec(129).storageKeys()).not.toBe(first.storageKeys());
    const initial = first.decodeStorage(fixtures.get(128)!.proof(124));
    const next = second.decodeStorage(fixtures.get(128)!.proof(125));
    expect(initial.binding.blockHash).toBe(catalogPoolHash(124));
    expect(initial.state.timestampMs).toBe(744000);
    expect(next.binding.blockHash).toBe(catalogPoolHash(125));
    expect(next.state.timestampMs).toBe(750000);
    expect(next.binding).not.toBe(initial.binding);
    expect(next.reserves).not.toBe(initial.reserves);
    expect(first.binding.blockHash).toBe(catalogPoolHash(124));
  });

  it('matches the unchanged runtime130 decoder economics and exact seven keys', () => {
    const f = fixtures.get(130)!,
      modern = codec(130),
      legacy = createHistoricalExecutionPoolCodec({
        genesisHash: f.entry.profile.genesisHash,
        blockHash: catalogPoolHash(124),
        metadataHex: f.entry.metadataHex,
        runtimeVersion: { specVersion: 130, transactionVersion: 130 },
      });
    expect(modern.storageKeys()).toEqual(legacy.storageKeys());
    const { binding: ignored, ...result } = modern.decodeStorage(f.proof());
    const { binding: ignoredLegacy, ...expected } = legacy.decodeStorage(f.proof());
    expect(result).toEqual(expected);
    expect(ignored.metadataSha256).toBe(ignoredLegacy.metadataSha256);
    expect(() =>
      createHistoricalExecutionPoolCodec({
        genesisHash: f.entry.profile.genesisHash,
        blockHash: catalogPoolHash(124),
        metadataHex: fixtures.get(128)!.entry.metadataHex,
        runtimeVersion: { specVersion: 128, transactionVersion: 128 },
      })
    ).toThrow();
  });
  it.each(['forged', 'unknown', 'target', 'extra', 'getter'])('rejects %s input before granting a decoder', (kind) => {
    const input: Record<string, unknown> = {
      catalog,
      sourceCodeHash: fixtures.get(128)!.entry.profile.codeHash,
      blockHash: catalogPoolHash(124),
    };
    const getter = vi.fn();
    if (kind === 'forged') input.catalog = { ...catalog };
    if (kind === 'unknown') input.sourceCodeHash = catalogPoolHash(999);
    if (kind === 'target') input.sourceCodeHash = catalog.target.profile.codeHash;
    if (kind === 'extra') input.extra = true;
    if (kind === 'getter') Object.defineProperty(input, 'catalog', { enumerable: true, get: getter });
    expect(() => createCatalogHistoricalExecutionPoolCodec(input)).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });
  it.each(['absent', 'missing-reserves', 'zero-reserves'])('preserves %s without a synthetic mark', (status) => {
    const f = fixtures.get(128)!,
      proof = f.proof();
    if (status === 'absent') {
      proof.properties = null;
      proof.reserves = null;
    } else if (status === 'missing-reserves') proof.reserves = null;
    else proof.reserves = f.encode('reserves', ['0', '2']);
    expect(codec().decodeStorage(proof)).toMatchObject({ status, marks: null });
  });
  it.each([
    'extra',
    'missing',
    'trailing',
    'zero-denominator',
    'bad-symbol',
    'bad-precision',
    'bad-dex',
    'unsafe-time',
    'contradiction',
  ])('rejects %s raw state', (kind) => {
    const f = fixtures.get(128)!,
      proof: Record<string, unknown> = f.proof();
    if (kind === 'extra') proof.extra = '0x00';
    if (kind === 'missing') delete proof.xor;
    if (kind === 'trailing') proof.reserves += '00';
    if (kind === 'zero-denominator') proof.denominator = f.encode('denominator', '0');
    if (kind === 'bad-symbol') proof.kusd = f.encode('kusd', { symbol: 'DAI', precision: 18 });
    if (kind === 'bad-precision') proof.kusd = f.encode('kusd', { symbol: 'KUSD', precision: 17 });
    if (kind === 'bad-dex') proof.dex0 = f.encode('dex0', { baseAssetId: { code: catalogPoolHash(77) } });
    if (kind === 'unsafe-time') proof.timestamp = f.encode('timestamp', '9007199254740992');
    if (kind === 'contradiction') proof.properties = null;
    expect(() => codec().decodeStorage(proof)).toThrow();
  });
  it('preserves u128 reserve precision and reciprocal rational marks', () => {
    const f = fixtures.get(129)!,
      proof = f.proof(),
      max = ((1n << 128n) - 1n).toString();
    proof.reserves = f.encode('reserves', [max, '1']);
    const result = codec(129).decodeStorage(proof);
    expect(result.reserves).toEqual({ xorCodec: max, kusdCodec: '1' });
    expect(result.marks?.kusdPerXor).toEqual({ numeratorCodec: '1', denominatorCodec: max });
  });
});
