/** Offline, bounded historical storage verification for target131 quote/fee simulation. No RPC or admission. */
import { createHash } from 'node:crypto';
import { Metadata, TypeRegistry } from '@polkadot/types';
import { expandMetadata } from '@polkadot/types/metadata';
import { compactStripLength } from '@polkadot/util';
import {
  assertGoalRuntimeCatalog,
  lookupGoalRuntimeCatalogEntry,
  type GoalRuntimeCatalogEntry,
} from '../../src/features/bot-trading/execution-codecs/runtime-catalog';
import {
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from './historical-execution-codec';

/** These identities delimit one explicit hypothetical model, not a runtime compatibility whitelist. */
export const GOAL_TARGET_STATE_PROFILES = Object.freeze({
  source: Object.freeze({
    genesisHash: GENESIS,
    specVersion: 130,
    transactionVersion: 130,
    metadataSha256: '726c0dcdc748164be3ed3cc65c149e936e08380ef99c1b3991a0db6c1d7d127b',
    codeHash: '0x2b33b01ba3f9e58e269b0e9619d25bedf3f60cdd6ed0ec519dacc75259c85d1e',
  }),
  target: Object.freeze({
    genesisHash: GENESIS,
    specVersion: 131,
    transactionVersion: 131,
    metadataSha256: '18aedaf96860e55c96ac6ad1d26f77cb2dc877ea822edf3242fdbe4f58bdd824',
    codeHash: '0xf062ed07861255f5ec443930de9c5066d1e4133036126d48462c8e233a75f27e',
  }),
});
export const GOAL_TARGET_STATE_LIMITS = Object.freeze({
  prefixKeys: 256,
  pageSize: 64,
  prefixPages: 5,
  receipts: 269,
  valueBytes: 4096,
  keyBytes: 1024,
  stateBytes: 2 * 1024 * 1024,
  responseBytes: 1024 * 1024,
  receiptBytes: 8 * 1024 * 1024,
});

/** Exact retained transport envelope; result:null is different from a missing storage receipt. */
export interface GoalTargetStateReceipt {
  readonly id: number;
  readonly method: 'state_getStorage' | 'state_getKeysPaged';
  readonly params: readonly unknown[];
  readonly requestBody: string;
  readonly requestedAt: string;
  readonly completedAt: string;
  readonly httpStatus: number;
  readonly responseBody: string;
  readonly responseSha256: string;
}
export interface GoalTargetRuntimeHostState {
  readonly entries: Readonly<Record<string, string | null>>;
  readonly prefix: {
    readonly prefix: string;
    readonly complete: true;
    readonly entries: Readonly<Record<string, string>>;
    readonly after: string | null;
  };
}
interface GoalTargetRuntimeStateData {
  readonly sourceBlock: { readonly hash: string; readonly height: number };
  readonly hostState: GoalTargetRuntimeHostState;
  readonly poolAccount: string;
  readonly receiptSha256: string;
  readonly stateSha256: string;
  readonly receiptCount: number;
  readonly prefixKeys: number;
}
/** Original fixed130 state contract; serialized fields and digest meanings remain unchanged. */
export interface GoalSource130TargetRuntimeState extends GoalTargetRuntimeStateData {
  readonly kind: 'verified-source130-target131-storage-v1';
  readonly profiles: typeof GOAL_TARGET_STATE_PROFILES;
  readonly provenance: 'rpc-storage-claims-only';
}
/** An owned catalog selects the actual historical identity; this is still RPC storage evidence, not admission. */
export interface GoalCatalogTargetRuntimeState extends GoalTargetRuntimeStateData {
  readonly kind: 'verified-catalog-source-target131-storage-v1';
  readonly profiles: {
    readonly source: GoalRuntimeCatalogEntry['profile'];
    readonly target: typeof GOAL_TARGET_STATE_PROFILES.target;
  };
  readonly provenance: 'catalog-bound-rpc-storage-claims-only';
  readonly catalogSha256: string;
  readonly sourceBindingSha256: string;
}
export type GoalTargetRuntimeState = GoalSource130TargetRuntimeState | GoalCatalogTargetRuntimeState;
type StateBinding =
  | Pick<GoalSource130TargetRuntimeState, 'kind' | 'profiles' | 'provenance'>
  | Pick<GoalCatalogTargetRuntimeState, 'kind' | 'profiles' | 'provenance' | 'catalogSha256'>;
const owned = new WeakSet<object>();
const sha = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const encode = (bytes: Uint8Array) => `0x${Buffer.from(bytes).toString('hex')}`;
const fail = (reason: string): never => {
  throw new Error(`Invalid target-runtime state: ${reason}`);
};
/** Snapshot plain own data without invoking accessors. */
function own(value: unknown, keys?: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype)
    return fail('data object');
  const fields = Object.getOwnPropertyDescriptors(value);
  const names = Reflect.ownKeys(fields);
  if (
    names.some((n) => typeof n !== 'string') ||
    Object.values(fields).some((d) => !d.enumerable || !('value' in d)) ||
    (keys && (names.length !== keys.length || keys.some((k) => !Object.hasOwn(fields, k))))
  )
    return fail('own fields');
  return Object.fromEntries(Object.entries(fields).map(([k, d]) => [k, d.value]));
}
/** Reject sparse arrays, added fields and accessors before reading elements. */
function array(value: unknown, maximum: number): unknown[] {
  if (!Array.isArray(value) || value.length > maximum) return fail('array bound');
  const ds = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(ds).length !== value.length + 1) return fail('array fields');
  return Array.from({ length: value.length }, (_, n) => {
    if (!ds[n] || !('value' in ds[n]) || !ds[n].enumerable) return fail('array accessor');
    return ds[n].value;
  });
}
/** Canonical lowercase bytes preserve exact RPC and SCALE identity. */
function hex(value: unknown, maximum: number, exact?: number): string {
  if (
    typeof value !== 'string' ||
    !/^0x(?:[0-9a-f]{2})*$/.test(value) ||
    value.length > 2 + maximum * 2 ||
    (exact !== undefined && value.length !== 2 + exact * 2)
  )
    return fail('hex bytes');
  return value;
}
/** Parse bounded retained wire bytes; callers subsequently require exact envelope fields. */
function json(value: unknown, maximum: number): unknown {
  if (typeof value !== 'string' || Buffer.byteLength(value) > maximum) return fail('JSON byte bound');
  try {
    return JSON.parse(value);
  } catch {
    return fail('JSON syntax');
  }
}
/** Freeze newly detached verification output, never caller-owned data. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
const ENTRIES = {
  dex: ['dexManager', 'dexInfos'],
  sources: ['dexapi', 'enabledSourceTypes'],
  locked: ['tradingPair', 'lockedLiquiditySources'],
  properties: ['poolXYK', 'properties'],
  poolXor: ['system', 'account'],
  poolKusd: ['tokens', 'accounts'],
  multiplier: ['xorFee', 'multiplier'],
  xst: ['xstPool', 'enabledSynthetics'],
} as const;
type Label = keyof typeof ENTRIES;

/** Resolve portable type references, comparing semantic layouts rather than coincidentally equal lookup IDs. */
function typeShape(registry: TypeRegistry, id: number, depth = 0): unknown {
  if (depth > 24) return fail('recursive storage type');
  const si = registry.lookup.getSiType(id);
  const def = si.def.toJSON() as Record<string, unknown>;
  const [kind] = Object.keys(def);
  const child = (n: unknown) => {
    if (!Number.isSafeInteger(n)) return fail('portable type');
    return typeShape(registry, n as number, depth + 1);
  };
  const fields = (raw: unknown) =>
    (raw as Record<string, unknown>[]).map((f) => ({
      name: f.name,
      typeName: f.typeName,
      type: child(f.type),
    }));
  let shape: unknown;
  const d = def[kind] as Record<string, unknown>;
  if (kind === 'primitive') shape = def[kind];
  else if (kind === 'tuple') shape = (def[kind] as number[]).map(child);
  else if (kind === 'array') shape = { len: d.len, type: child(d.type) };
  else if (kind === 'sequence' || kind === 'compact') shape = { type: child(d.type) };
  else if (kind === 'composite') shape = fields(d.fields);
  else if (kind === 'variant')
    shape = (d.variants as Record<string, unknown>[]).map((v) => ({
      name: v.name,
      index: v.index,
      fields: fields(v.fields),
    }));
  else return fail('unsupported storage type');
  return { path: si.path.toJSON(), [kind]: shape };
}

/** Pin the complete original metadata bytes and expose its storage keys, shapes and exact decoders. */
function metadataCodec(raw: unknown, expected: string) {
  const metadataHex = hex(raw, 2 * 1024 * 1024);
  const bytes = Buffer.from(metadataHex.slice(2), 'hex');
  if (sha(bytes) !== expected) return fail('metadata pin');
  const registry = new TypeRegistry();
  const metadata = new Metadata(registry, bytes);
  if (metadata.version !== 14 || encode(metadata.toU8a()) !== metadataHex) return fail('metadata SCALE');
  registry.setMetadata(metadata);
  const query = expandMetadata(registry, metadata).query;
  const entry = (label: Label) => {
    const [pallet, item] = ENTRIES[label];
    const found = query[pallet]?.[item];
    if (!found) return fail('storage entry');
    return found;
  };
  const key = (label: Label, args: unknown[] = []) => encode(compactStripLength(entry(label)(...args))[1]);
  const layout = (label: Label) => {
    const e = entry(label).meta;
    const t = e.type;
    return {
      modifier: e.modifier.toString(),
      fallback: e.fallback.toHex(),
      type: t.isMap
        ? {
            hashers: t.asMap.hashers.toJSON(),
            key: typeShape(registry, t.asMap.key.toNumber()),
            value: typeShape(registry, t.asMap.value.toNumber()),
          }
        : { value: typeShape(registry, t.asPlain.toNumber()) },
    };
  };
  const decode = (label: Label, rawValue: unknown) => {
    const value = hex(rawValue, GOAL_TARGET_STATE_LIMITS.valueBytes);
    const t = entry(label).meta.type;
    const type = registry.createLookupType(t.isMap ? t.asMap.value : t.asPlain);
    const decoded = registry.createType(type, Buffer.from(value.slice(2), 'hex'));
    if (encode(decoded.toU8a()) !== value) return fail('storage SCALE roundtrip');
    return value;
  };
  const xstPrefix = key('xst', [{ code: XOR }]).slice(0, 66);
  return { key, layout, decode, xstPrefix };
}

/** Create the original pinned130 dual-metadata codec; profile/finality authentication remains upstream. */
export function createGoalTargetRuntimeStateCodec(raw: unknown) {
  const input = own(raw, ['sourceMetadataHex', 'targetMetadataHex']);
  return createStateCodec(input.sourceMetadataHex, input.targetMetadataHex, {
    kind: 'verified-source130-target131-storage-v1',
    profiles: GOAL_TARGET_STATE_PROFILES,
    provenance: 'rpc-storage-claims-only',
  });
}

/**
 * Select exact128/129/130 metadata using an observed code hash and a privately owned catalog.
 * The caller must authenticate that hash at the source block; storage receipts cannot establish it.
 * Unknown code, target-role entries, forged catalogs and input accessors fail before receipt parsing.
 */
export function createGoalCatalogTargetRuntimeStateCodec(raw: unknown) {
  const input = own(raw, ['catalog', 'sourceCodeHash']);
  assertGoalRuntimeCatalog(input.catalog);
  const catalog = input.catalog;
  const source = lookupGoalRuntimeCatalogEntry(catalog, hex(input.sourceCodeHash, 32, 32));
  if (source.role !== 'historical-source' || ![128, 129, 130].includes(source.profile.specVersion))
    return fail('historical catalog source');
  const profiles = Object.freeze({ source: source.profile, target: GOAL_TARGET_STATE_PROFILES.target });
  if (Object.entries(profiles.target).some(([key, value]) => Reflect.get(catalog.target.profile, key) !== value))
    return fail('catalog target pin');
  return createStateCodec(source.metadataHex, catalog.target.metadataHex, {
    kind: 'verified-catalog-source-target131-storage-v1',
    profiles,
    provenance: 'catalog-bound-rpc-storage-claims-only',
    catalogSha256: catalog.catalogSha256,
  });
}

/** Shared finite layout, exact SCALE, point-key and complete-prefix verification for both fixed constructors. */
function createStateCodec<T extends StateBinding>(sourceMetadataHex: unknown, targetMetadataHex: unknown, binding: T) {
  const source = metadataCodec(sourceMetadataHex, binding.profiles.source.metadataSha256);
  const target = metadataCodec(targetMetadataHex, binding.profiles.target.metadataSha256);
  for (const label of Object.keys(ENTRIES) as Label[]) {
    if (JSON.stringify(source.layout(label)) !== JSON.stringify(target.layout(label)))
      return fail(`layout disagreement:${label}`);
  }
  const key = (label: Label, args: unknown[] = []) => {
    const result = source.key(label, args);
    if (result !== target.key(label, args)) return fail('key disagreement');
    return result;
  };
  const decode = (label: Label, value: unknown) => {
    source.decode(label, value);
    return target.decode(label, value);
  };
  const fixedKeys = Object.freeze({
    dex: key('dex', [0]),
    sources: key('sources'),
    locked: key('locked'),
    properties: key('properties', [{ code: XOR }, { code: KUSD }]),
    multiplier: key('multiplier'),
  });
  const xstPrefix = source.xstPrefix;
  if (xstPrefix !== target.xstPrefix || xstPrefix.length !== 66) return fail('prefix disagreement');
  /** Pool account keys are derived from the original Properties bytes, never invented balances or cached Reserves. */
  const derivePoolKeys = (properties: unknown) => {
    const value = decode('properties', properties);
    if (value.length !== 130) return fail('Properties tuple');
    const poolAccount = value.slice(0, 66);
    return Object.freeze({
      poolAccount,
      poolXor: key('poolXor', [poolAccount]),
      poolKusd: key('poolKusd', [poolAccount, { code: KUSD }]),
    });
  };

  /** Verify every exact RPC envelope, prefix page, global successor and source value without any I/O. */
  const verify = (
    rawEvidence: unknown
  ): T extends { kind: 'verified-catalog-source-target131-storage-v1' }
    ? GoalCatalogTargetRuntimeState
    : GoalSource130TargetRuntimeState => {
    const evidence = own(rawEvidence, ['sourceBlock', 'receipts']);
    const b = own(evidence.sourceBlock, ['hash', 'height']);
    const blockHash = hex(b.hash, 32, 32);
    if (!Number.isSafeInteger(b.height) || (b.height as number) < 0) return fail('block height');
    const inputs = array(evidence.receipts, GOAL_TARGET_STATE_LIMITS.receipts);
    const ids = new Set<number>();
    const storage = new Map<string, string | null>();
    const pages: { params: unknown[]; result: unknown }[] = [];
    const receipts: Record<string, unknown>[] = [];
    let aggregate = 0;
    let receiptBytes = 0;
    for (const rawReceipt of inputs) {
      const r = own(rawReceipt, [
        'id',
        'method',
        'params',
        'requestBody',
        'requestedAt',
        'completedAt',
        'httpStatus',
        'responseBody',
        'responseSha256',
      ]);
      if (!Number.isSafeInteger(r.id) || (r.id as number) < 0 || ids.has(r.id as number) || r.httpStatus !== 200)
        return fail('RPC identity/status');
      ids.add(r.id as number);
      const params = array(r.params, 4);
      if (params.some((p) => p !== null && typeof p !== 'string' && !Number.isSafeInteger(p)))
        return fail('RPC params');
      if (typeof r.requestBody !== 'string' || typeof r.responseBody !== 'string') return fail('RPC body');
      receiptBytes += Buffer.byteLength(r.requestBody) + Buffer.byteLength(r.responseBody);
      if (receiptBytes > GOAL_TARGET_STATE_LIMITS.receiptBytes) return fail('receipt byte bound');
      const request = own(json(r.requestBody, 4096), ['jsonrpc', 'id', 'method', 'params']);
      if (
        request.jsonrpc !== '2.0' ||
        request.id !== r.id ||
        request.method !== r.method ||
        JSON.stringify(request.params) !== JSON.stringify(params)
      )
        return fail('request binding');
      const response = own(json(r.responseBody, GOAL_TARGET_STATE_LIMITS.responseBytes), ['jsonrpc', 'id', 'result']);
      if (response.jsonrpc !== '2.0' || response.id !== r.id || sha(r.responseBody as string) !== r.responseSha256)
        return fail('response binding');
      const start = typeof r.requestedAt === 'string' ? Date.parse(r.requestedAt) : NaN;
      const end = typeof r.completedAt === 'string' ? Date.parse(r.completedAt) : NaN;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end < start) return fail('request timing');
      if (r.method === 'state_getStorage') {
        if (params.length !== 2 || params[1] !== blockHash) return fail('storage block');
        const k = hex(params[0], GOAL_TARGET_STATE_LIMITS.keyBytes);
        const value = response.result === null ? null : hex(response.result, GOAL_TARGET_STATE_LIMITS.valueBytes);
        if (storage.has(k)) return fail('duplicate storage');
        storage.set(k, value);
        aggregate += (k.length - 2 + (value?.length ?? 2) - 2) / 2;
      } else if (r.method === 'state_getKeysPaged') {
        if (params.length !== 4 || params[3] !== blockHash) return fail('prefix block');
        pages.push({ params, result: response.result });
      } else return fail('RPC method');
      if (aggregate > GOAL_TARGET_STATE_LIMITS.stateBytes) return fail('state byte bound');
      receipts.push({ ...r, params });
    }
    const properties = storage.get(fixedKeys.properties);
    if (properties === undefined) return fail('missing Properties receipt');
    if (properties === null) return fail('absent pool unsupported');
    const pool = derivePoolKeys(properties);
    const points = { ...fixedKeys, poolXor: pool.poolXor, poolKusd: pool.poolKusd };
    const entries: Record<string, string | null> = {};
    for (const [label, k] of Object.entries(points)) {
      if (!storage.has(k)) return fail('missing point receipt');
      const value = storage.get(k)!;
      if (value !== null) decode(label as Label, value);
      entries[k] = value;
    }
    const memberKeys: string[] = [];
    let cursor: string | null = null;
    let terminal = false;
    let prefixPages = 0;
    let after: string | null | undefined;
    for (const page of pages) {
      const [prefix, count, start] = page.params;
      if (prefix === xstPrefix) {
        if (
          ++prefixPages > GOAL_TARGET_STATE_LIMITS.prefixPages ||
          terminal ||
          count !== GOAL_TARGET_STATE_LIMITS.pageSize ||
          start !== cursor
        )
          return fail('prefix pagination');
        const keys = array(page.result, GOAL_TARGET_STATE_LIMITS.pageSize).map((k) =>
          hex(k, GOAL_TARGET_STATE_LIMITS.keyBytes)
        );
        for (const k of keys) {
          if (!k.startsWith(xstPrefix) || k.length !== 162 || k <= (cursor ?? xstPrefix))
            return fail('prefix order/member');
          const asset = `0x${k.slice(-64)}`;
          if (key('xst', [{ code: asset }]) !== k) return fail('prefix key hashing');
          memberKeys.push(k);
          cursor = k;
        }
        if (memberKeys.length > GOAL_TARGET_STATE_LIMITS.prefixKeys) return fail('prefix key bound');
        if (keys.length === 0) terminal = true;
      } else if (prefix === null) {
        if (!terminal || after !== undefined || count !== 1 || start !== (cursor ?? xstPrefix))
          return fail('global successor request');
        const keys = array(page.result, 1).map((k) => hex(k, GOAL_TARGET_STATE_LIMITS.keyBytes));
        after = keys.length ? keys[0] : null;
        if (after !== null && (after <= (cursor ?? xstPrefix) || after.startsWith(xstPrefix)))
          return fail('global successor');
      } else return fail('prefix identity');
    }
    if (!terminal || after === undefined) return fail('incomplete prefix traversal');
    const last = cursor ?? xstPrefix;
    for (const [k, value] of storage) {
      if (value !== null && k > last && (after === null || k < after)) return fail('contradictory global successor');
      if (k === after && value === null) return fail('absent global successor');
    }
    const members: Record<string, string> = {};
    for (const k of memberKeys) {
      const value = storage.get(k);
      if (value === undefined || value === null) return fail('missing/absent prefix member');
      members[k] = decode('xst', value);
    }
    if (storage.size !== Object.keys(entries).length + memberKeys.length) return fail('extra storage receipt');
    const hostState: GoalTargetRuntimeHostState = deepFreeze({
      entries: Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b, 'en'))),
      prefix: { prefix: xstPrefix, complete: true, entries: members, after },
    });
    const result: GoalTargetRuntimeState = deepFreeze({
      kind: binding.kind,
      sourceBlock: { hash: blockHash, height: b.height as number },
      profiles: binding.profiles,
      hostState,
      poolAccount: pool.poolAccount,
      receiptSha256: sha(JSON.stringify(receipts)),
      stateSha256: sha(JSON.stringify(hostState)),
      receiptCount: inputs.length,
      prefixKeys: memberKeys.length,
      provenance: binding.provenance,
      ...(binding.kind === 'verified-catalog-source-target131-storage-v1'
        ? {
            catalogSha256: binding.catalogSha256,
            sourceBindingSha256: sha(
              JSON.stringify({
                kind: binding.kind,
                catalogSha256: binding.catalogSha256,
                profiles: binding.profiles,
                sourceBlock: { hash: blockHash, height: b.height as number },
                receiptSha256: sha(JSON.stringify(receipts)),
                stateSha256: sha(JSON.stringify(hostState)),
                provenance: binding.provenance,
              })
            ),
          }
        : {}),
    }) as GoalTargetRuntimeState;
    owned.add(result);
    return result as T extends { kind: 'verified-catalog-source-target131-storage-v1' }
      ? GoalCatalogTargetRuntimeState
      : GoalSource130TargetRuntimeState;
  };
  return Object.freeze({ fixedKeys, xstPrefix, derivePoolKeys, verify });
}

/** Parser ownership cannot be restored from serialized JSON; callers must rerun verification after loading. */
export function assertGoalTargetRuntimeState(value: unknown): asserts value is GoalTargetRuntimeState {
  if (!value || typeof value !== 'object' || !owned.has(value)) return fail('unowned verified state');
}
