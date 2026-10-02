// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { compactStripLength, hexToU8a, u8aToHex } from '@polkadot/util';
import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import {
  createGoalRuntimeCatalog,
  assertGoalRuntimeCatalog,
  assertGoalRuntimeCatalogEntry,
  lookupGoalRuntimeCatalogEntry,
  GOAL_RUNTIME_CATALOG_PROFILES,
  type GoalRuntimeCatalog,
  type GoalRuntimeCatalogInput,
} from '@/features/bot-trading/execution-codecs/runtime-catalog';

vi.unmock('@polkadot/util-crypto');
const instrumentation = vi.hoisted(() => ({ fault: '', calls: 0 }));
// Private SDK instrumentation exercises derived-layout checks without allowing caller-selected pins/decoders.
vi.mock('@polkadot/types/metadata', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@polkadot/types/metadata')>();
  return {
    ...actual,
    expandMetadata: (...args: Parameters<typeof actual.expandMetadata>) => {
      const result = actual.expandMetadata(...args);
      if (instrumentation.calls++ !== 0 || !instrumentation.fault) return result;
      const original = result.query.dexManager.dexInfos;
      if (instrumentation.fault === 'missing') {
        return { ...result, query: { ...result.query, dexManager: {} } };
      } else {
        const changed = Object.assign((...keys: unknown[]) => {
          const bytes = original(...keys);
          if (instrumentation.fault === 'key') bytes[bytes.length - 1] ^= 1;
          return bytes;
        }, original);
        const meta = { modifier: original.meta.modifier, fallback: original.meta.fallback, type: original.meta.type };
        if (instrumentation.fault === 'fallback')
          Object.defineProperty(meta, 'fallback', { value: { toHex: () => '0x01' } });
        if (instrumentation.fault === 'modifier')
          Object.defineProperty(meta, 'modifier', {
            value: { toString: () => (original.meta.modifier.toString() === 'Optional' ? 'Default' : 'Optional') },
          });
        if (instrumentation.fault === 'semantic-type')
          Object.defineProperty(meta, 'type', {
            value: {
              isMap: true,
              asMap: {
                hashers: original.meta.type.asMap.hashers,
                key: original.meta.type.asMap.key,
                value: original.meta.type.asMap.key,
              },
            },
          });
        Object.defineProperty(changed, 'meta', { value: meta });
        return { ...result, query: { ...result.query, dexManager: { ...result.query.dexManager, dexInfos: changed } } };
      }
      return result;
    },
  };
});

const network = vi.fn(() => {
  throw new Error('Network forbidden in catalog tests');
});
let input: GoalRuntimeCatalogInput, catalog: GoalRuntimeCatalog, otherCatalog: GoalRuntimeCatalog;
beforeAll(async () => {
  vi.stubGlobal('fetch', network);
  const source = async (version: number): Promise<string> =>
    JSON.parse(
      await readFile(
        `output/go-history/partial-target-window-metadata-20260921/source-schemas/source${version}-unverified-schema.json`,
        'utf8'
      )
    ).metadataHex;
  const target = JSON.parse(
    await readFile(
      'output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/metadata-131.json',
      'utf8'
    )
  ).actualExport.resultHex;
  input = {
    source128MetadataHex: await source(128),
    source129MetadataHex: await source(129),
    source130MetadataHex: await source(130),
    target131MetadataHex: u8aToHex(compactStripLength(hexToU8a(target))[1]),
  };
  catalog = createGoalRuntimeCatalog(input);
  otherCatalog = createGoalRuntimeCatalog(input);
}, 30_000);
afterAll(() => {
  expect(network).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
afterEach(() => {
  instrumentation.fault = '';
  instrumentation.calls = 0;
});

describe('owned runtime catalog', () => {
  it('verifies all four genuine metadata exports and all thirteen exact semantic layouts/keys', () => {
    expect(catalog.entries).toHaveLength(4);
    expect(catalog.entries.map((e) => e.profile.specVersion)).toEqual([128, 129, 130, 131]);
    expect(catalog.entries.map((e) => e.role)).toEqual([
      'historical-source',
      'historical-source',
      'historical-source',
      'execution-target',
    ]);
    expect(catalog.target).toBe(catalog.entries[3]);
    expect(catalog.catalogSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(catalog.catalogSha256).toBe(otherCatalog.catalogSha256);
    for (const entry of catalog.entries) {
      expect(Object.keys(entry.storage)).toHaveLength(13);
      expect(entry.storage).toEqual(catalog.target.storage);
      expect(entry.xstPrefix).toBe('0x94106571e04fc4fb4133da54a111ec64f0f8da9ca61ee022314c44009224fe9a');
      expect(() => assertGoalRuntimeCatalogEntry(entry, catalog)).not.toThrow();
      expect(lookupGoalRuntimeCatalogEntry(catalog, entry.profile.codeHash)).toBe(entry);
    }
    expect(catalog.entries.map((e) => e.profile)).toEqual(Object.values(GOAL_RUNTIME_CATALOG_PROFILES));
    expect(catalog.entries[0].metadataHex).toBe(input.source128MetadataHex);
    expect(catalog.target.metadataHex).toBe(input.target131MetadataHex);
    expect(() => assertGoalRuntimeCatalog(catalog)).not.toThrow();
  });

  it('deep freezes profiles, descriptors and semantic types without freezing the caller', () => {
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(catalog)).toBe(true);
    expect(Object.isFrozen(catalog.entries)).toBe(true);
    expect(Object.isFrozen(catalog.entries[0].profile)).toBe(true);
    expect(Object.isFrozen(catalog.entries[0].storage.poolKusd.layout.type)).toBe(true);
    expect(Reflect.set(catalog.entries[0].profile, 'specVersion', 131)).toBe(false);
    expect(Reflect.set(catalog.entries[0].storage.dex, 'keyHex', '0x00')).toBe(false);
    const saved = input.source128MetadataHex;
    (input as { source128MetadataHex: string }).source128MetadataHex = '0x00';
    expect(catalog.entries[0].metadataHex).toBe(saved);
    (input as { source128MetadataHex: string }).source128MetadataHex = saved;
  });

  it.each([null, {}, 128, '130', undefined])('rejects non-owned catalog %s', (value) => {
    expect(() => assertGoalRuntimeCatalog(value)).toThrow('catalog ownership');
    expect(() => lookupGoalRuntimeCatalogEntry(value, GOAL_RUNTIME_CATALOG_PROFILES.source128.codeHash)).toThrow(
      'catalog ownership'
    );
  });
  it('rejects copied/serialized catalogs and entries, and entries from another verified instance', () => {
    expect(() => assertGoalRuntimeCatalog({ ...catalog })).toThrow('catalog ownership');
    expect(() => assertGoalRuntimeCatalog(JSON.parse(JSON.stringify(catalog)))).toThrow('catalog ownership');
    expect(() => assertGoalRuntimeCatalogEntry({ ...catalog.entries[0] }, catalog)).toThrow('entry ownership');
    expect(() => assertGoalRuntimeCatalogEntry(JSON.parse(JSON.stringify(catalog.entries[0])), catalog)).toThrow(
      'entry ownership'
    );
    expect(() => assertGoalRuntimeCatalogEntry(catalog.entries[0], otherCatalog)).toThrow('entry ownership');
    expect(() => assertGoalRuntimeCatalogEntry(null, catalog)).toThrow('entry ownership');
    expect(() => assertGoalRuntimeCatalogEntry(catalog.entries[0], { ...catalog })).toThrow('catalog ownership');
  });
  it.each([
    `0x${'aa'.repeat(32)}`,
    '128',
    128,
    null,
    '0x01',
    GOAL_RUNTIME_CATALOG_PROFILES.source128.codeHash.toUpperCase(),
  ])('rejects unknown or malformed code identity %s', (hash) => {
    expect(() => lookupGoalRuntimeCatalogEntry(catalog, hash)).toThrow(/code hash/);
  });
});

describe('strict original metadata input', () => {
  it.each(['source128MetadataHex', 'source129MetadataHex', 'source130MetadataHex', 'target131MetadataHex'] as const)(
    'checks complete original pin for %s before any decoder',
    (key) => {
      instrumentation.calls = 0;
      expect(() =>
        createGoalRuntimeCatalog({
          ...input,
          [key]: `${input[key].slice(0, -2)}${input[key].endsWith('00') ? '01' : '00'}`,
        })
      ).toThrow('metadata pin');
      expect(instrumentation.calls).toBe(0);
    }
  );
  it('does not confuse different observed epochs even when their storage layouts agree', () => {
    expect(() =>
      createGoalRuntimeCatalog({
        ...input,
        source128MetadataHex: input.source129MetadataHex,
        source129MetadataHex: input.source128MetadataHex,
      })
    ).toThrow('metadata pin');
    expect(() => createGoalRuntimeCatalog({ ...input, source130MetadataHex: input.target131MetadataHex })).toThrow(
      'metadata pin'
    );
  });
  it.each(['0x', '0x0', '0xGG', 128, null, `0x${'00'.repeat(2 * 1024 * 1024 + 1)}`])(
    'rejects bounded hex input case %#',
    (hex) => {
      expect(() => createGoalRuntimeCatalog({ ...input, source128MetadataHex: hex })).toThrow('metadata bytes');
    }
  );
  it('rejects uppercase or trailing SCALE bytes', () => {
    expect(() =>
      createGoalRuntimeCatalog({ ...input, source128MetadataHex: input.source128MetadataHex.toUpperCase() })
    ).toThrow('metadata bytes');
    expect(() =>
      createGoalRuntimeCatalog({ ...input, source128MetadataHex: `${input.source128MetadataHex}00` })
    ).toThrow('metadata pin');
  });
  it('rejects accessors without invoking them, inherited fields, extra/symbol fields and hidden data', () => {
    const getter = vi.fn(() => input.source128MetadataHex);
    const access = { ...input };
    Object.defineProperty(access, 'source128MetadataHex', { get: getter });
    expect(() => createGoalRuntimeCatalog(access)).toThrow('input fields');
    expect(getter).not.toHaveBeenCalled();
    expect(() => createGoalRuntimeCatalog(Object.create(input))).toThrow('input');
    expect(() => createGoalRuntimeCatalog({ ...input, extra: true })).toThrow('input fields');
    expect(() => createGoalRuntimeCatalog({ ...input, [Symbol('extra')]: true })).toThrow('input fields');
    const hidden = { ...input };
    Object.defineProperty(hidden, 'source128MetadataHex', { enumerable: false });
    expect(() => createGoalRuntimeCatalog(hidden)).toThrow('input fields');
    expect(() => createGoalRuntimeCatalog(null)).toThrow('input');
  });
  it.each(['key', 'fallback', 'modifier', 'semantic-type'])(
    'rejects a derived %s disagreement even after genuine byte pins pass',
    (fault) => {
      instrumentation.calls = 0;
      instrumentation.fault = fault;
      expect(() => createGoalRuntimeCatalog(input)).toThrow('storage layout mismatch');
    }
  );
  it('rejects a missing audited storage domain', () => {
    instrumentation.calls = 0;
    instrumentation.fault = 'missing';
    expect(() => createGoalRuntimeCatalog(input)).toThrow('storage entry');
  });
});
