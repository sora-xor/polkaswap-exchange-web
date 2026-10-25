/** Pinned, offline storage decoder evidence across observed SORA runtime epochs. No runtime admission. */
import { Metadata, TypeRegistry } from '@polkadot/types';
import { expandMetadata } from '@polkadot/types/metadata';
import { compactStripLength, hexToU8a, u8aToHex } from '@polkadot/util';
import { sha256AsU8a } from '@polkadot/util-crypto';
import {
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from './execution';

export interface GoalRuntimeCatalogProfile {
  readonly genesisHash: string;
  readonly specVersion: 128 | 129 | 130 | 131;
  readonly transactionVersion: 128 | 129 | 130 | 131;
  readonly metadataSha256: string;
  readonly codeHash: string;
}

/** Complete observed metadata/code identities; numeric versions alone never select a decoder. */
export const GOAL_RUNTIME_CATALOG_PROFILES = Object.freeze({
  source128: Object.freeze({
    genesisHash: GENESIS,
    specVersion: 128,
    transactionVersion: 128,
    metadataSha256: 'fdc915c28363daeb74b1b0524731ed6cd61163610e021c67d44a20d0fc809fb7',
    codeHash: '0xb360a17644db55f9c3e17b7428645e45aab4fe41a50e13d106a6089ae479787d',
  } as const),
  source129: Object.freeze({
    genesisHash: GENESIS,
    specVersion: 129,
    transactionVersion: 129,
    metadataSha256: 'e5298fe292dac733548b53173ae5f29728f65d3eff798298fe5608864308c1f0',
    codeHash: '0x94fed6b837368b899593d9c5c9150e7a6bdbc3ecbee1bb9dac677b0d54bca3d8',
  } as const),
  source130: Object.freeze({
    genesisHash: GENESIS,
    specVersion: 130,
    transactionVersion: 130,
    metadataSha256: '726c0dcdc748164be3ed3cc65c149e936e08380ef99c1b3991a0db6c1d7d127b',
    codeHash: '0x2b33b01ba3f9e58e269b0e9619d25bedf3f60cdd6ed0ec519dacc75259c85d1e',
  } as const),
  target131: Object.freeze({
    genesisHash: GENESIS,
    specVersion: 131,
    transactionVersion: 131,
    metadataSha256: '18aedaf96860e55c96ac6ad1d26f77cb2dc877ea822edf3242fdbe4f58bdd824',
    codeHash: '0xf062ed07861255f5ec443930de9c5066d1e4133036126d48462c8e233a75f27e',
  } as const),
});

const SAMPLE_ACCOUNT = `0x${'11'.repeat(32)}`;
const DOMAINS = {
  dex: ['dexManager', 'dexInfos', [0]],
  sources: ['dexapi', 'enabledSourceTypes', []],
  locked: ['tradingPair', 'lockedLiquiditySources', []],
  properties: ['poolXYK', 'properties', [{ code: XOR }, { code: KUSD }]],
  poolXor: ['system', 'account', [SAMPLE_ACCOUNT]],
  poolKusd: ['tokens', 'accounts', [SAMPLE_ACCOUNT, { code: KUSD }]],
  multiplier: ['xorFee', 'multiplier', []],
  xst: ['xstPool', 'enabledSynthetics', [{ code: XOR }]],
  timestamp: ['timestamp', 'now', []],
  denominator: ['denomination', 'denominator', []],
  kusd: ['assets', 'assetInfosV2', [{ code: KUSD }]],
  xor: ['assets', 'assetInfosV2', [{ code: XOR }]],
  reserves: ['poolXYK', 'reserves', [{ code: XOR }, { code: KUSD }]],
} as const;
export type GoalRuntimeCatalogStorageLabel = keyof typeof DOMAINS;
export type GoalRuntimeCatalogShape =
  | string
  | number
  | boolean
  | null
  | readonly GoalRuntimeCatalogShape[]
  | { readonly [key: string]: GoalRuntimeCatalogShape };
export interface GoalRuntimeCatalogStorage {
  readonly pallet: string;
  readonly item: string;
  /** Account domains use the fixed invented 0x11…11 account, never an observed pool account. */
  readonly keyHex: string;
  readonly layout: {
    readonly modifier: string;
    readonly fallback: string;
    readonly type: {
      readonly hashers?: GoalRuntimeCatalogShape;
      readonly key?: GoalRuntimeCatalogShape;
      readonly value: GoalRuntimeCatalogShape;
    };
  };
  readonly layoutSha256: string;
}
export interface GoalRuntimeCatalogEntry {
  readonly role: 'historical-source' | 'execution-target';
  readonly profile: GoalRuntimeCatalogProfile;
  readonly metadataHex: string;
  readonly storage: Readonly<Record<GoalRuntimeCatalogStorageLabel, GoalRuntimeCatalogStorage>>;
  readonly xstPrefix: string;
}
export interface GoalRuntimeCatalog {
  readonly kind: 'verified-goal-runtime-catalog-v1';
  readonly catalogSha256: string;
  readonly entries: readonly GoalRuntimeCatalogEntry[];
  readonly target: GoalRuntimeCatalogEntry;
}
export interface GoalRuntimeCatalogInput {
  readonly source128MetadataHex: string;
  readonly source129MetadataHex: string;
  readonly source130MetadataHex: string;
  readonly target131MetadataHex: string;
}
const INPUT_KEYS = [
  'source128MetadataHex',
  'source129MetadataHex',
  'source130MetadataHex',
  'target131MetadataHex',
] as const;
const PROFILES = Object.values(GOAL_RUNTIME_CATALOG_PROFILES);
const owned = new WeakMap<object, ReadonlyMap<string, GoalRuntimeCatalogEntry>>();
const entryOwners = new WeakMap<object, GoalRuntimeCatalog>();
const fail = (reason: string): never => {
  throw new Error(`Invalid goal runtime catalog: ${reason}`);
};
const sha = (bytes: Uint8Array): string => u8aToHex(sha256AsU8a(bytes)).slice(2);
const digest = (value: unknown): string => sha(new TextEncoder().encode(JSON.stringify(value)));

/** Freeze only newly constructed records; no SDK registry or mutable codec escapes this module. */
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/** Read exactly four bounded own string fields without evaluating input getters. */
function inputHexes(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return fail('input');
  const ds = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(ds).length !== INPUT_KEYS.length) return fail('input fields');
  return INPUT_KEYS.map((key) => {
    const d = ds[key];
    if (!d || !d.enumerable || !('value' in d)) return fail('input fields');
    const hex = d.value;
    if (typeof hex !== 'string' || hex.length > 2 + 2 * 1024 * 1024 * 2 || !/^0x(?:[0-9a-f]{2})+$/.test(hex))
      return fail('metadata bytes');
    return hex;
  });
}

/** Resolve portable IDs to complete semantic shapes, including names, variants and nested key types. */
function shapeReader(registry: TypeRegistry) {
  let nodes = 0;
  const shape = (id: number, depth = 0): GoalRuntimeCatalogShape => {
    if (!Number.isSafeInteger(id) || id < 0 || depth > 24 || ++nodes > 100_000) return fail('portable type bound');
    const si = registry.lookup.getSiType(id);
    const def = si.def.toJSON() as Record<string, unknown>;
    const kinds = Object.keys(def);
    if (kinds.length !== 1) return fail('portable type definition');
    const kind = kinds[0];
    const child = (id: unknown): GoalRuntimeCatalogShape => {
      if (!Number.isSafeInteger(id)) return fail('portable type');
      return shape(id as number, depth + 1);
    };
    const fields = (raw: unknown): GoalRuntimeCatalogShape[] => {
      if (!Array.isArray(raw) || raw.length > 256) return fail('portable fields');
      return raw.map((f: Record<string, unknown>) => ({
        name: f.name as string | null,
        typeName: f.typeName as string | null,
        type: child(f.type),
      }));
    };
    const d = def[kind] as Record<string, unknown>;
    let value: GoalRuntimeCatalogShape;
    if (kind === 'primitive') value = def[kind] as string;
    else if (kind === 'tuple') value = (def[kind] as number[]).map(child);
    else if (kind === 'array') value = { len: d.len as number, type: child(d.type) };
    else if (kind === 'sequence' || kind === 'compact') value = { type: child(d.type) };
    else if (kind === 'composite') value = fields(d.fields);
    else if (kind === 'variant')
      value = (d.variants as Record<string, unknown>[]).map((v) => ({
        name: v.name as string,
        index: v.index as number,
        fields: fields(v.fields),
      }));
    else return fail('unsupported portable type');
    return { path: si.path.toJSON() as string[], [kind]: value };
  };
  return shape;
}

/** Decode a hash-pinned original V14 schema and derive all thirteen audited domains. */
function entry(
  metadataHex: string,
  profile: GoalRuntimeCatalogProfile,
  role: GoalRuntimeCatalogEntry['role']
): GoalRuntimeCatalogEntry {
  const registry = new TypeRegistry();
  const metadata = new Metadata(registry, hexToU8a(metadataHex));
  if (metadata.version !== 14 || u8aToHex(metadata.toU8a()) !== metadataHex) return fail('metadata SCALE');
  registry.setMetadata(metadata);
  const query = expandMetadata(registry, metadata).query;
  const shape = shapeReader(registry);
  const storage = Object.fromEntries(
    Object.entries(DOMAINS).map(([label, [pallet, item, args]]) => {
      const found = query[pallet]?.[item];
      if (!found) return fail('storage entry');
      const m = found.meta,
        t = m.type;
      const layout = {
        modifier: m.modifier.toString(),
        fallback: m.fallback.toHex(),
        type: t.isMap
          ? {
              hashers: t.asMap.hashers.toJSON() as GoalRuntimeCatalogShape,
              key: shape(t.asMap.key.toNumber()),
              value: shape(t.asMap.value.toNumber()),
            }
          : { value: shape(t.asPlain.toNumber()) },
      };
      const keyHex = u8aToHex(compactStripLength(found(...args))[1]);
      if (keyHex.length < 66 || keyHex.length > 2050) return fail('storage key');
      return [label, { pallet, item, keyHex, layout, layoutSha256: digest(layout) }];
    })
  ) as Record<GoalRuntimeCatalogStorageLabel, GoalRuntimeCatalogStorage>;
  return { role, profile, metadataHex, storage, xstPrefix: storage.xst.keyHex.slice(0, 66) };
}

/**
 * Verify all four exact metadata exports and their complete thirteen-domain layout/key parity.
 * This capability authenticates decoder provenance only; callers still authenticate each observed block/code.
 */
export function createGoalRuntimeCatalog(raw: unknown): GoalRuntimeCatalog {
  const hexes = inputHexes(raw);
  // Check every complete byte identity before parsing any potentially expensive metadata.
  hexes.forEach((hex, i) => {
    if (sha(hexToU8a(hex)) !== PROFILES[i].metadataSha256) fail('metadata pin');
  });
  const entries = hexes.map((hex, i) => entry(hex, PROFILES[i], i === 3 ? 'execution-target' : 'historical-source'));
  const target = entries[3];
  const reference = JSON.stringify(target.storage);
  for (const source of entries.slice(0, 3)) {
    if (JSON.stringify(source.storage) !== reference || source.xstPrefix !== target.xstPrefix)
      return fail('storage layout mismatch');
  }
  const kind = 'verified-goal-runtime-catalog-v1' as const;
  const catalogSha256 = digest({
    kind,
    entries: entries.map(({ role, profile, storage, xstPrefix }) => ({ role, profile, storage, xstPrefix })),
  });
  const catalog = freeze({ kind, catalogSha256, entries, target });
  owned.set(catalog, new Map(entries.map((e) => [e.profile.codeHash, e])));
  entries.forEach((e) => entryOwners.set(e, catalog));
  return catalog;
}

/** Reject copied/serialized catalogs; a digest cannot recreate decoder ownership. */
export function assertGoalRuntimeCatalog(value: unknown): asserts value is GoalRuntimeCatalog {
  if (!value || typeof value !== 'object' || !owned.has(value)) return fail('catalog ownership');
}

/** Select an exact owned profile using the upstream-authenticated :code hash, never its numeric version. */
export function lookupGoalRuntimeCatalogEntry(catalog: unknown, observedCodeHash: unknown): GoalRuntimeCatalogEntry {
  assertGoalRuntimeCatalog(catalog);
  if (typeof observedCodeHash !== 'string' || !/^0x[0-9a-f]{64}$/.test(observedCodeHash)) return fail('code hash');
  const selected = owned.get(catalog)!.get(observedCodeHash);
  if (!selected) return fail('unknown code hash');
  return selected;
}

/** Require the original entry and the exact catalog instance that verified it. */
export function assertGoalRuntimeCatalogEntry(
  value: unknown,
  catalog: unknown
): asserts value is GoalRuntimeCatalogEntry {
  assertGoalRuntimeCatalog(catalog);
  if (!value || typeof value !== 'object' || entryOwners.get(value) !== catalog) return fail('entry ownership');
}
