/** Offline catalog-bound pool observations only. No provider, extrinsic, fee, signer or admission API. */
import { Metadata, TypeRegistry } from '@polkadot/types';
import { expandMetadata } from '@polkadot/types/metadata';
import { compactStripLength, hexToU8a, u8aToHex } from '@polkadot/util';
import { sha256AsU8a } from '@polkadot/util-crypto';
import { types } from '@/lib/substrate/type-definitions';
import { HISTORICAL_EXECUTION_KUSD as KUSD, HISTORICAL_EXECUTION_XOR as XOR } from './execution';
import {
  assertGoalRuntimeCatalog,
  lookupGoalRuntimeCatalogEntry,
  type GoalRuntimeCatalogProfile,
  type GoalRuntimeCatalogEntry,
} from './runtime-catalog';

export type CatalogHistoricalRuntimeProfile = Pick<
  GoalRuntimeCatalogProfile,
  'specVersion' | 'transactionVersion' | 'metadataSha256' | 'codeHash'
>;
export interface CatalogHistoricalPoolBinding {
  readonly catalogSha256: string;
  readonly profileSha256: string;
}
const LABELS = ['timestamp', 'denominator', 'kusd', 'xor', 'dex0', 'properties', 'reserves'] as const;
type Label = (typeof LABELS)[number];
const MAX_U128 = (1n << 128n) - 1n;
const fail = (): never => {
  throw Error('Invalid catalog pool evidence');
};
/** Read exact plain data fields, rejecting accessors before evaluating input. */
function data(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
    return fail();
  const fields = Object.getOwnPropertyDescriptors(value);
  if (
    Reflect.ownKeys(fields).length !== keys.length ||
    keys.some((key) => !fields[key]?.enumerable || !('value' in fields[key]))
  )
    return fail();
  return Object.fromEntries(keys.map((key) => [key, fields[key].value]));
}
function hex(value: unknown, maximum: number, exact?: number): string {
  if (
    typeof value !== 'string' ||
    !/^0x(?:[0-9a-fA-F]{2})+$/.test(value) ||
    value.length > maximum * 2 + 2 ||
    (exact !== undefined && value.length !== exact * 2 + 2)
  )
    return fail();
  return value.toLowerCase();
}
function positive(value: string): bigint {
  if (!/^[1-9][0-9]{0,38}$/.test(value)) return fail();
  const n = BigInt(value);
  return n <= MAX_U128 ? n : fail();
}
const digest = (value: unknown) => u8aToHex(sha256AsU8a(new TextEncoder().encode(JSON.stringify(value)))).slice(2);
/** Cache only schema-derived internals by the genuine owned entry; no state or block values are cached. */
function poolLayout(selected: GoalRuntimeCatalogEntry) {
  const registry = new TypeRegistry();
  registry.register(types);
  const metadata = new Metadata(registry, hexToU8a(selected.metadataHex));
  registry.setMetadata(metadata, undefined, undefined, true);
  const query = expandMetadata(registry, metadata).query;
  const entries = {
    timestamp: query.timestamp.now,
    denominator: query.denomination.denominator,
    kusd: query.assets.assetInfosV2,
    xor: query.assets.assetInfosV2,
    dex0: query.dexManager.dexInfos,
    properties: query.poolXYK.properties,
    reserves: query.poolXYK.reserves,
  };
  const args: Record<Label, unknown[]> = {
    timestamp: [],
    denominator: [],
    kusd: [{ code: KUSD }],
    xor: [{ code: XOR }],
    dex0: [0],
    properties: [{ code: XOR }, { code: KUSD }],
    reserves: [{ code: XOR }, { code: KUSD }],
  };
  const keys = Object.freeze(
    Object.fromEntries(
      LABELS.map((label) => {
        const key = u8aToHex(compactStripLength(entries[label](...args[label]))[1]);
        if (key !== selected.storage[label === 'dex0' ? 'dex' : label].keyHex) return fail();
        return [label, key];
      })
    ) as Record<Label, string>
  );
  if (new Set(Object.values(keys)).size !== 7) return fail();
  /** Decode the raw storage value itself with exact byte roundtrip; null never invokes a fallback. */
  const decode = (label: Label, value: unknown) => {
    const bytes = hex(value, 16 * 1024),
      type = entries[label].meta.type;
    const decoded = registry.createType(
      registry.createLookupType(type.isPlain ? type.asPlain : type.asMap.value),
      hexToU8a(bytes)
    );
    if (u8aToHex(decoded.toU8a()) !== bytes) return fail();
    return decoded;
  };
  return Object.freeze({ keys, decode });
}
const layouts = new WeakMap<GoalRuntimeCatalogEntry, ReturnType<typeof poolLayout>>();

/**
 * Select a privately owned historical decoder by observed code hash. Callers authenticate that hash,
 * finality and the seven values at blockHash. No signing layout or execution authority is exposed.
 */
export function createCatalogHistoricalExecutionPoolCodec(raw: unknown) {
  const input = data(raw, ['catalog', 'sourceCodeHash', 'blockHash']);
  assertGoalRuntimeCatalog(input.catalog);
  const catalog = input.catalog,
    selected = lookupGoalRuntimeCatalogEntry(catalog, hex(input.sourceCodeHash, 32, 32));
  if (selected.role !== 'historical-source' || ![128, 129, 130].includes(selected.profile.specVersion)) return fail();
  const blockHash = hex(input.blockHash, 32, 32);
  const profileSha256 = digest(
    Object.fromEntries(Object.entries(selected.profile).sort(([a], [b]) => a.localeCompare(b, 'en')))
  );
  const catalogBinding = Object.freeze({ catalogSha256: catalog.catalogSha256, profileSha256 });
  const { specVersion, transactionVersion, metadataSha256, codeHash } = selected.profile;
  const runtimeProfile: Readonly<CatalogHistoricalRuntimeProfile> = Object.freeze({
    specVersion,
    transactionVersion,
    metadataSha256,
    codeHash,
  });
  const binding = Object.freeze({
    kind: 'catalog-pool-state-v1' as const,
    genesisHash: selected.profile.genesisHash,
    blockHash,
    runtimeVersion: Object.freeze({ specVersion, transactionVersion }),
    metadataSha256,
    metadataVersion: 14 as const,
    codeHash,
    ...catalogBinding,
  });
  let layout = layouts.get(selected);
  if (!layout) {
    layout = poolLayout(selected);
    layouts.set(selected, layout);
  }
  const { keys, decode } = layout;
  const pair = Object.freeze({
    baseAssetId: XOR,
    targetAssetId: KUSD,
    baseDecimals: 18 as const,
    targetDecimals: 18 as const,
  });
  /** Same-state exact ratios preserve absent, missing-reserve and zero-reserve states explicitly. */
  const decodeStorage = (value: unknown) => {
    const proof = data(value, LABELS);
    const timestamp = positive(decode('timestamp', proof.timestamp).toString());
    if (timestamp > BigInt(Number.MAX_SAFE_INTEGER)) return fail();
    const denominator = positive(decode('denominator', proof.denominator).toString()).toString();
    const token = (label: 'kusd' | 'xor', assetId: string, symbol: string) => {
      const value = decode(label, proof[label]).toJSON() as { symbol?: unknown; precision?: unknown } | null;
      if (!value || value.precision !== 18 || typeof value.symbol !== 'string') return fail();
      const text = /^0x(?:[0-9a-fA-F]{2})+$/.test(value.symbol)
        ? new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(hexToU8a(value.symbol))
        : value.symbol;
      if (text !== symbol) return fail();
      return Object.freeze({ assetId, symbol, decimals: 18 as const });
    };
    const dex = decode('dex0', proof.dex0).toJSON() as { baseAssetId?: unknown } | null;
    const dexAsset = dex?.baseAssetId;
    if ((typeof dexAsset === 'string' ? dexAsset : (dexAsset as { code?: unknown } | undefined)?.code) !== XOR)
      return fail();
    const state = Object.freeze({
      timestampMs: Number(timestamp),
      denominator,
      assets: Object.freeze({ kusd: token('kusd', KUSD, 'KUSD'), xor: token('xor', XOR, 'XOR') }),
      dex: Object.freeze({ id: 0 as const, baseAssetId: XOR }),
    });
    const context = {
      binding,
      state,
      pair,
      basis: 'direct-pool-reserve-ratio' as const,
      observedFill: false as const,
      transactionSubmitted: false as const,
    };
    if (proof.properties === null) {
      if (proof.reserves !== null) return fail();
      return Object.freeze({ ...context, status: 'absent' as const, accounts: null, reserves: null, marks: null });
    }
    const properties = hex(proof.properties, 64, 64);
    decode('properties', properties);
    const accounts = Object.freeze({
      reservesAccountId: properties.slice(0, 66),
      feesAccountId: `0x${properties.slice(66)}`,
    });
    if (proof.reserves === null)
      return Object.freeze({ ...context, status: 'missing-reserves' as const, accounts, reserves: null, marks: null });
    const reserveHex = hex(proof.reserves, 32, 32);
    decode('reserves', reserveHex);
    const bytes = hexToU8a(reserveHex),
      read = (offset: number) =>
        BigInt(u8aToHex(Uint8Array.from(bytes.subarray(offset, offset + 16)).reverse())).toString();
    const reserves = Object.freeze({ xorCodec: read(0), kusdCodec: read(16) });
    if (reserves.xorCodec === '0' || reserves.kusdCodec === '0')
      return Object.freeze({ ...context, status: 'zero-reserves' as const, accounts, reserves, marks: null });
    const marks = Object.freeze({
      xorPerKusd: Object.freeze({ numeratorCodec: reserves.xorCodec, denominatorCodec: reserves.kusdCodec }),
      kusdPerXor: Object.freeze({ numeratorCodec: reserves.kusdCodec, denominatorCodec: reserves.xorCodec }),
    });
    return Object.freeze({ ...context, status: 'present' as const, accounts, reserves, marks });
  };
  return Object.freeze({ binding, runtimeProfile, catalogBinding, storageKeys: () => keys, decodeStorage });
}
