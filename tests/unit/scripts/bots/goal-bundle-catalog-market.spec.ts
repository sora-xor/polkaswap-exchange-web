import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createGoalBundleCatalogMetadataFixture,
  catalogMetadataFixtureHash as hash,
  catalogMetadataFixtureVersion as version,
} from '../../../fixtures/bots/goal-bundle-catalog-metadata';
import { catalogPoolStorageFixture, CATALOG_POOL_DENOMINATOR } from '../../../fixtures/bots/catalog-pool';
import { createCatalogHistoricalGoalMarketReader } from '../../../../scripts/bots/historical-goal-market-reader';
import { createCatalogHistoricalExecutionPoolCodec } from '@/features/bot-trading/execution-codecs/catalog-pool';
import { verifyGoalBundleCatalogMetadata } from '@/features/bot-trading/goal-bundle-metadata';
import {
  verifyGoalBundleCatalogValuation,
  verifyGoalBundleCatalogOpening,
  verifyGoalBundleCatalogTerminal,
  verifyGoalBundleValuation,
  getGoalBundleVerifiedMarketState,
  getGoalBundleVerifiedMarketCatalog,
  assertGoalBundleVerifiedCatalogMarketState,
  assertGoalBundleVerifiedMarketState,
  type GoalBundleCatalogValuationBinding,
  type GoalBundleValuationBinding,
} from '@/features/bot-trading/goal-bundle-market';
import { goalRawBytesSha256, goalRawEvidenceDigest } from '@/features/bot-trading/goal-raw-envelope';

const canonical = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
          .join(',')}}`
      : JSON.stringify(value);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
type Row = { id: number; method: string; responseBody: string; responseSha256: string; [key: string]: unknown };
type Records = {
  schema: {
    context: Record<string, unknown>;
    evidence: { blockEvidence: Row[]; blockProfiles: unknown[]; [key: string]: unknown };
  };
  state: {
    schemaSha256: string;
    value: Record<string, unknown>;
    blockEvidence: Row[];
    storageEvidence: Row[];
    blockProfiles: Record<string, unknown>[];
  };
  valuation: Record<string, unknown>;
};
let source: Awaited<ReturnType<typeof createGoalBundleCatalogMetadataFixture>>;
let metadata: Awaited<ReturnType<typeof verifyGoalBundleCatalogMetadata>>;
const originals = new Map<number, { records: Records; binding: GoalBundleCatalogValuationBinding }>();
const encode = (s: string) => new TextEncoder().encode(s);

beforeAll(async () => {
  source = await createGoalBundleCatalogMetadataFixture();
  metadata = await verifyGoalBundleCatalogMetadata(source.binding, {
    catalog: source.catalog,
    readArtifact: async (name) => encode(source.files.get(name)!),
  });
  const storage = new Map([128, 129, 130].map((n) => [n, catalogPoolStorageFixture(source.catalog, n)]));
  const fetcher: typeof fetch = async (_url, init) => {
    const r = JSON.parse(String(init?.body));
    const height = Number(BigInt(String(Array.isArray(r.params[0]) ? 0 : (r.params[0] ?? 0))));
    const entry = (h: number) => storage.get(version(h))!.entry;
    let result: unknown;
    switch (r.method) {
      case 'chain_getBlockHash':
        result = r.params[0] === 0 ? source.catalog.target.profile.genesisHash : hash(Number(r.params[0]));
        break;
      case 'chain_getFinalizedHead':
        result = hash(1100);
        break;
      case 'chain_getHeader':
        result = {
          number: `0x${height.toString(16)}`,
          parentHash: hash(height - 1),
          stateRoot: hash(3),
          extrinsicsRoot: hash(4),
          digest: { logs: [] },
        };
        break;
      case 'state_getRuntimeVersion':
        result = { specName: 'sora-substrate', specVersion: version(height), transactionVersion: version(height) };
        break;
      case 'state_getMetadata':
        result = entry(height).metadataHex;
        break;
      case 'state_getStorageHash':
        result = entry(Number(BigInt(r.params[1]))).profile.codeHash;
        break;
      case 'state_getStorage':
        result = storage.get(version(Number(BigInt(r.params[1]))))!.proof(Number(BigInt(r.params[1]))).timestamp;
        break;
      case 'state_queryStorageAt': {
        const h = Number(BigInt(r.params[1]));
        const codec = createCatalogHistoricalExecutionPoolCodec({
          catalog: source.catalog,
          sourceCodeHash: entry(h).profile.codeHash,
          blockHash: r.params[1],
        });
        const proof = storage.get(version(h))!.proof(h);
        result = [
          {
            block: r.params[1],
            changes: Object.entries(codec.storageKeys()).map(([label, key]) => [
              key,
              proof[label as keyof typeof proof],
            ]),
          },
        ];
        break;
      }
      default:
        throw Error('Unexpected synthetic RPC');
    }
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: r.id, result }));
  };
  const market = await createCatalogHistoricalGoalMarketReader(
    { source: source.protocol.source, expectedDenominator: CATALOG_POOL_DENOMINATOR },
    { catalog: source.catalog, fetch: fetcher }
  );
  const schema = clone({ context: market.context, evidence: market.evidence() });
  let offset = 20,
    storageOffset = 0;
  for (const height of [105, 125, 155, 164, 100]) {
    const value = await market.readMark(height),
      raw = market.evidence();
    const state = {
      schemaSha256: goalRawEvidenceDigest(schema),
      value,
      blockEvidence: raw.blockEvidence.slice(offset),
      storageEvidence: raw.storageEvidence.slice(storageOffset),
      blockProfiles: raw.blockProfiles.filter((b) => b.height === height),
    };
    offset = raw.blockEvidence.length;
    storageOffset = raw.storageEvidence.length;
    const binding: GoalBundleCatalogValuationBinding = {
      requestSha256: 'c'.repeat(64),
      sourceManifestSha256: 'd'.repeat(64),
      genesisHash: source.catalog.target.profile.genesisHash,
      denominator: CATALOG_POOL_DENOMINATOR,
      source: source.protocol.source,
      runtimeProfiles: source.catalog.entries
        .filter((e) => e.role === 'historical-source')
        .map((e) => ({
          specVersion: e.profile.specVersion,
          transactionVersion: e.profile.transactionVersion,
          metadataSha256: e.profile.metadataSha256,
          codeHash: e.profile.codeHash,
        })),
      block: value.block,
      captureStartedAtMs: value.block.timestampMs + 5,
      receivedAtMs: value.block.timestampMs + 20,
      timingKind: 'fixed-pinned-capture-delays-v1',
      schema: { name: 'market-schema-1.json', valueSha256: goalRawEvidenceDigest(schema) },
      state: { name: `market-state-${height}.json`, valueSha256: goalRawEvidenceDigest(state) },
      valuation: { name: `valuation-${height}.json`, valueSha256: '' },
    };
    const valuation = {
      sourceManifestSha256: binding.sourceManifestSha256,
      genesisHash: binding.genesisHash,
      block: value.block,
      mark: { ...value.mark!, blockNumber: height, denominator: binding.denominator },
      runtimeProfile: value.runtimeProfile,
      captureStartedAtMs: binding.captureStartedAtMs,
      receivedAtMs: binding.receivedAtMs,
      rawSha256: binding.state.valueSha256,
      timingKind: binding.timingKind,
    };
    binding.valuation.valueSha256 = goalRawEvidenceDigest(valuation);
    originals.set(
      height,
      clone({ records: { schema, state, valuation }, binding }) as unknown as typeof originals extends Map<
        number,
        infer T
      >
        ? T
        : never
    );
  }
}, 30000);

function fixture(height = 105) {
  const { records, binding } = clone(originals.get(height)!);
  const refresh = () => {
    binding.schema.valueSha256 = goalRawEvidenceDigest(records.schema);
    records.state.schemaSha256 = binding.schema.valueSha256;
    binding.state.valueSha256 = goalRawEvidenceDigest(records.state);
    records.valuation.rawSha256 = binding.state.valueSha256;
    binding.valuation.valueSha256 = goalRawEvidenceDigest(records.valuation);
  };
  const wrapper = (part: 'schema' | 'state' | 'valuation') =>
    encode(
      canonical({
        kind: 'goal-study-raw-evidence-v1',
        requestSha256: binding.requestSha256,
        name: binding[part].name,
        sha256: binding[part].valueSha256,
        value: records[part],
      }) + '\n'
    );
  const bytes = () => ({
    schemaBytes: wrapper('schema'),
    stateBytes: wrapper('state'),
    valuationBytes: wrapper('valuation'),
  });
  const dependencies = { catalog: source.catalog, metadata };
  return {
    records,
    binding,
    refresh,
    bytes,
    dependencies,
    verify: () => verifyGoalBundleCatalogValuation(binding, bytes(), dependencies),
  };
}
function response(row: Row, change: (parsed: Record<string, unknown>) => void) {
  const parsed = JSON.parse(row.responseBody);
  change(parsed);
  row.responseBody = JSON.stringify(parsed);
  row.responseSha256 = goalRawBytesSha256(encode(row.responseBody));
}

describe('catalog browser market reconstruction', () => {
  it('reuses only unchanged schema envelope bytes while checking every mark and binding', () => {
    const f = fixture();
    const bytes = f.bytes();
    const parse = vi.spyOn(JSON, 'parse');
    try {
      for (let index = 0; index < 6; index++) {
        expect(verifyGoalBundleCatalogValuation(f.binding, bytes, f.dependencies).block).toEqual(f.binding.block);
      }
      const schemaParses = parse.mock.calls.filter(
        ([raw]) =>
          typeof raw === 'string' &&
          raw.includes('"kind":"goal-study-raw-evidence-v1"') &&
          raw.includes('"name":"market-schema-1.json"')
      );
      expect(schemaParses).toHaveLength(1);
    } finally {
      parse.mockRestore();
    }
    const badBinding = clone(f.binding);
    badBinding.schema.valueSha256 = 'f'.repeat(64);
    expect(() => verifyGoalBundleCatalogValuation(badBinding, bytes, f.dependencies)).toThrow('wrapper');
    bytes.schemaBytes[bytes.schemaBytes.length - 1] = 0x20;
    expect(() => verifyGoalBundleCatalogValuation(f.binding, bytes, f.dependencies)).toThrow('wrapper');
  });

  it.each([105, 125, 155, 164, 100])(
    'reconstructs exact real-reader mark and source profile at invented block %i',
    (height) => {
      const f = fixture(height),
        spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(Error('Network forbidden'));
      try {
        const result = f.verify(),
          { rawSha256: _raw, timingKind: _timing, ...projection } = f.records.valuation;
        expect(result).toEqual({ ...projection, evidenceSha256: f.binding.valuation.valueSha256 });
        const state = getGoalBundleVerifiedMarketState(result);
        assertGoalBundleVerifiedCatalogMarketState(state);
        expect(getGoalBundleVerifiedMarketCatalog(state)).toBe(source.catalog);
        expect(state.runtimeProfile.specVersion).toBe(version(height));
        expect(state.blockProfile.profile.genesisHash).toBe(f.binding.genesisHash);
        expect(state.catalogBinding.profileSha256).toBe(metadata.profileForBlock(hash(height), height).profileSha256);
        expect(state.sourcePropertiesHex).toBe(`0x${hash(8000).slice(2)}${hash(8001).slice(2)}`);
        expect(Object.isFrozen(state.blockProfile.profile)).toBe(true);
        expect(spy).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    }
  );
  it('preserves explicit opening and original deadline semantics', () => {
    const f = fixture(125);
    f.binding.valuation.name = 'opening.json';
    expect(verifyGoalBundleCatalogOpening(f.binding, f.bytes(), f.dependencies).runtimeProfile.specVersion).toBe(129);
    f.binding.valuation.name = 'terminal.json';
    f.binding.captureStartedAtMs += 61000;
    f.binding.receivedAtMs += 62000;
    Object.assign(f.records.valuation, {
      captureStartedAtMs: f.binding.captureStartedAtMs,
      receivedAtMs: f.binding.receivedAtMs,
    });
    f.refresh();
    expect(
      verifyGoalBundleCatalogTerminal(f.binding, f.bytes(), f.binding.block.timestampMs + 60000, f.dependencies)
        .receivedAtMs
    ).toBe(f.binding.receivedAtMs);
    expect(() =>
      verifyGoalBundleCatalogTerminal(f.binding, f.bytes(), f.binding.block.timestampMs + 60001, f.dependencies)
    ).toThrow('modeled-time');
  });
  it('does not admit catalog evidence through the legacy constructor', () => {
    const f = fixture();
    expect(() => verifyGoalBundleValuation(f.binding as unknown as GoalBundleValuationBinding, f.bytes())).toThrow();
  });
  it('rejects copied metadata, catalog, state and mark capabilities', () => {
    const f = fixture(),
      mark = f.verify(),
      state = getGoalBundleVerifiedMarketState(mark);
    expect(() =>
      verifyGoalBundleCatalogValuation(f.binding, f.bytes(), { ...f.dependencies, metadata: { ...metadata } })
    ).toThrow();
    expect(() =>
      verifyGoalBundleCatalogValuation(f.binding, f.bytes(), { ...f.dependencies, catalog: { ...source.catalog } })
    ).toThrow();
    expect(() => getGoalBundleVerifiedMarketState({ ...mark })).toThrow('unverified-market-state');
    expect(() => getGoalBundleVerifiedMarketCatalog({ ...state })).toThrow('unverified-market-state');
    expect(() => assertGoalBundleVerifiedCatalogMarketState(clone(state))).toThrow('unverified-market-state');
  });
  it.each([
    [
      'known-code sidecar',
      (f: ReturnType<typeof fixture>) => {
        f.records.state.blockProfiles[0].codeHash = source.catalog.entries.find(
          (e) => e.profile.specVersion === 129
        )!.profile.codeHash;
      },
    ],
    [
      'missing sidecar',
      (f: ReturnType<typeof fixture>) => {
        f.records.state.blockProfiles = [];
      },
    ],
    [
      'duplicate sidecar',
      (f: ReturnType<typeof fixture>) => {
        f.records.state.blockProfiles.push(clone(f.records.state.blockProfiles[0]));
      },
    ],
    [
      'profile digest',
      (f: ReturnType<typeof fixture>) => {
        f.records.state.blockProfiles[0].profileSha256 = 'f'.repeat(64);
      },
    ],
    [
      'value runtime',
      (f: ReturnType<typeof fixture>) => {
        (f.records.state.value.runtimeProfile as Record<string, unknown>).specVersion = 129;
      },
    ],
    [
      'value catalog',
      (f: ReturnType<typeof fixture>) => {
        (f.records.state.value.catalogBinding as Record<string, unknown>).catalogSha256 = 'f'.repeat(64);
      },
    ],
    [
      'schema profile',
      (f: ReturnType<typeof fixture>) => {
        (f.records.schema.context.profiles as Record<string, unknown>[])[0].profileSha256 = 'f'.repeat(64);
      },
    ],
    [
      'schema sidecar',
      (f: ReturnType<typeof fixture>) => {
        f.records.schema.evidence.blockProfiles = [f.records.state.blockProfiles[0]];
      },
    ],
    [
      'saved reserves',
      (f: ReturnType<typeof fixture>) => {
        (f.records.state.value.mark as Record<string, unknown>).xorReserveCodec = '999';
      },
    ],
  ])('rejects rehashed %s projections', (_name, mutate) => {
    const f = fixture();
    mutate(f);
    f.refresh();
    expect(() => f.verify()).toThrow();
  });
  it.each([
    [
      'anchor runtime',
      7,
      (r: Record<string, unknown>) => {
        (r.result as Record<string, unknown>).specVersion = 129;
      },
    ],
    [
      'anchor code',
      8,
      (r: Record<string, unknown>) => {
        r.result = source.catalog.entries.find((e) => e.profile.specVersion === 129)!.profile.codeHash;
      },
    ],
    [
      'anchor metadata',
      9,
      (r: Record<string, unknown>) => {
        r.result = source.catalog.entries.find((e) => e.profile.specVersion === 129)!.metadataHex;
      },
    ],
    [
      'third-anchor code',
      18,
      (r: Record<string, unknown>) => {
        r.result = source.catalog.entries.find((e) => e.profile.specVersion === 128)!.profile.codeHash;
      },
    ],
  ] as const)('rejects rehashed %s wire changes', (_name, index, mutate) => {
    const f = fixture();
    response(f.records.schema.evidence.blockEvidence[index], mutate);
    f.refresh();
    expect(() => f.verify()).toThrow();
  });
  it('rejects a known relabeled block profile even if the entire market projection is changed', () => {
    const f = fixture(),
      entry = source.catalog.entries.find((e) => e.profile.specVersion === 129)!;
    response(f.records.state.blockEvidence[2], (r) => {
      r.result = entry.profile.codeHash;
    });
    f.records.state.blockProfiles[0].codeHash = entry.profile.codeHash;
    f.records.state.blockProfiles[0].profileSha256 = goalRawEvidenceDigest(entry.profile);
    f.refresh();
    expect(() => f.verify()).toThrow('runtime-changed');
  });
  it('rejects a contradictory anchor/block code claim for the same hash', () => {
    const f = fixture(100);
    response(f.records.state.blockEvidence[2], (r) => {
      r.result = source.catalog.entries.find((e) => e.profile.specVersion === 129)!.profile.codeHash;
    });
    f.refresh();
    expect(() => f.verify()).toThrow('block-profile-conflict');
  });
  it('preserves original metadata wire casing while matching exact decoded bytes', () => {
    const f = fixture();
    for (const index of [9, 14, 19])
      response(f.records.schema.evidence.blockEvidence[index], (r) => {
        r.result = `0x${String(r.result).slice(2).toUpperCase()}`;
      });
    f.refresh();
    expect(f.verify().runtimeProfile.specVersion).toBe(128);
  });
  it('rejects binding/dependency accessors without invoking them', () => {
    const f = fixture(),
      getter = vi.fn(() => source.catalog);
    Object.defineProperty(f.dependencies, 'catalog', { enumerable: true, get: getter });
    expect(() => f.verify()).toThrow('own-data');
    expect(getter).not.toHaveBeenCalled();
  });
  it('revokes a returned source capability with its metadata owner', async () => {
    const controller = new AbortController();
    const owned = await verifyGoalBundleCatalogMetadata(source.binding, {
      catalog: source.catalog,
      signal: controller.signal,
      readArtifact: async (name) => encode(source.files.get(name)!),
    });
    const f = fixture(),
      mark = verifyGoalBundleCatalogValuation(f.binding, f.bytes(), { catalog: source.catalog, metadata: owned }),
      state = getGoalBundleVerifiedMarketState(mark);
    controller.abort();
    expect(() => getGoalBundleVerifiedMarketState(mark)).toThrow();
    expect(() => assertGoalBundleVerifiedMarketState(state)).toThrow();
    expect(() => getGoalBundleVerifiedMarketCatalog(state)).toThrow();
  });
  it('keeps retained mark lifetimes bound to their own metadata owner across runtime changes', async () => {
    const controller = new AbortController();
    const owned = await verifyGoalBundleCatalogMetadata(source.binding, {
      catalog: source.catalog,
      signal: controller.signal,
      readArtifact: async (name) => encode(source.files.get(name)!),
    });
    const retained = [105, 125, 155].map((height) => {
      const f = fixture(height);
      return verifyGoalBundleCatalogValuation(f.binding, f.bytes(), { catalog: source.catalog, metadata: owned });
    });
    const independent = fixture(164).verify();
    expect(retained.map((mark) => getGoalBundleVerifiedMarketState(mark).runtimeProfile.specVersion)).toEqual([
      128, 129, 130,
    ]);
    controller.abort();
    for (const mark of retained) expect(() => getGoalBundleVerifiedMarketState(mark)).toThrow();
    expect(getGoalBundleVerifiedMarketState(independent).runtimeProfile.specVersion).toBe(128);
    expect(getGoalBundleVerifiedMarketCatalog(getGoalBundleVerifiedMarketState(independent))).toBe(source.catalog);
  });
});
