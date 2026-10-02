/** Browser port of scripts/bots/historical-execution-codec.ts, SHA-256 ebad0bdd8e970482810e95bc4768aca4c0fb965b788417da53cfd2d2f4ccc4c3. */
/** Offline archived-state codecs. No provider, wallet, key, current-chain registry or submission API. */
import { Metadata, TypeRegistry } from '@polkadot/types';
import { blake2AsU8a, sha256AsU8a, xxhashAsU8a } from '@polkadot/util-crypto';
import { expandMetadata } from '@polkadot/types/metadata';
import { compactStripLength, hexToU8a, u8aConcat, u8aToHex } from '@polkadot/util';
import type { Struct } from '@polkadot/types-codec';
import type { RuntimeVersion } from '@polkadot/types/interfaces';
import { types } from '@/lib/substrate/type-definitions';

export const HISTORICAL_EXECUTION_GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
export const HISTORICAL_EXECUTION_KUSD = '0x02000c0000000000000000000000000000000000000000000000000000000000';
export const HISTORICAL_EXECUTION_XOR = '0x0200000000000000000000000000000000000000000000000000000000000000';
const ESTIMATION_ADDRESS = 'cnRuw2R6EVgQW3e4h8XeiFym2iU17fNsms15zRGcg9YEJndAs';
const MAX = (1n << 128n) - 1n;
/** Observed SORA 130/131 V14 profile; SDK-recognized aliases are not supported evidence. */
const SIGNED_EXTENSION_PROFILE = [
  ['CheckSpecVersion', 'Null', 'u32'],
  ['CheckTxVersion', 'Null', 'u32'],
  ['CheckGenesis', 'Null', 'H256'],
  ['CheckMortality', 'Era', 'H256'],
  ['CheckNonce', 'Compact<u32>', 'Null'],
  ['CheckWeight', 'Null', 'Null'],
  ['ChargeTransactionPayment', '{"tip":"Compact<u128>"}', 'Null'],
] as const;
const fail = (): never => {
  throw new Error('Invalid historical execution codec evidence');
};
const sha = (bytes: Uint8Array) => u8aToHex(sha256AsU8a(bytes)).slice(2);
const encodedHex = (bytes: Uint8Array) => u8aToHex(bytes);
const validatedLayouts = new WeakMap<
  object,
  { registry: TypeRegistry; metadata: Metadata; metadataHex: string; expanded: ReturnType<typeof expandMetadata> }
>();

export interface HistoricalRuntimeVersion {
  specVersion: number;
  transactionVersion: number;
}
export interface HistoricalExecutionIdentity {
  genesisHash: string;
  blockHash: string;
  metadataHex: string;
  runtimeVersion: HistoricalRuntimeVersion;
}
export interface HistoricalSwapRequest {
  assetIn: string;
  assetOut: string;
  amountInCodec: string;
  quotedAmountOutCodec: string;
}
export interface HistoricalFeeDetails {
  inclusionFee: { baseFee: string; lenFee: string; adjustedWeightFee: string } | null;
  tip: string;
  inclusionFeeTotal: string;
  finalFee: string;
  encodedHex: string;
}
type StorageLabel = 'timestamp' | 'denominator' | 'kusd' | 'xor' | 'dex0';
export type HistoricalStorageProof = Record<StorageLabel, string | null>;

/** Allow only detached data properties; inspecting a rejected object never invokes a getter. */
function record(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return fail();
  const entries = Object.getOwnPropertyDescriptors(value);
  if (
    Reflect.ownKeys(entries).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(entries, key) || !('value' in entries[key]) || !entries[key].enumerable)
  )
    return fail();
  return Object.fromEntries(keys.map((key) => [key, entries[key].value]));
}
function hex(value: unknown, maxBytes: number): string {
  if (typeof value !== 'string' || value.length > 2 + maxBytes * 2 || !/^0x(?:[0-9a-fA-F]{2})+$/.test(value))
    return fail();
  return value.toLowerCase();
}
function hash(value: unknown): string {
  const result = hex(value, 32);
  if (result.length !== 66) return fail();
  return result;
}
function amount(value: unknown, positive = false): bigint {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,38})$/.test(value)) return fail();
  const n = BigInt(value);
  if (n > MAX || (positive && n === 0n)) return fail();
  return n;
}
function runtime(value: unknown): HistoricalRuntimeVersion {
  const r = record(value, ['specVersion', 'transactionVersion']);
  if (
    Object.values(r).some((n) => !Number.isSafeInteger(n) || (n as number) < 0 || (n as number) > 0xffffffff) ||
    !r.specVersion
  )
    return fail();
  return { specVersion: r.specVersion as number, transactionVersion: r.transactionVersion as number };
}
/** Exact 0.5% minimum. Allocation and partial-order limits belong to the caller, never inferred wallet authority. */
export function historicalMinimumCodec(value: unknown): string {
  const minimum = (amount(value, true) * 9950n) / 10000n;
  if (!minimum) return fail();
  return minimum.toString();
}
const saturatingAdd = (a: bigint, b: bigint) => (a + b > MAX ? MAX : a + b);

/** Rust SCALE FeeDetails includes its serde-skipped tip: Option<3 × u128> followed by mandatory u128. */
export function decodeHistoricalFeeDetailsScale(value: unknown): HistoricalFeeDetails {
  const raw = hex(value, 65);
  const bytes = hexToU8a(raw);
  if (!((bytes[0] === 0 && bytes.length === 17) || (bytes[0] === 1 && bytes.length === 65))) return fail();
  const read = (offset: number) => BigInt(u8aToHex(Uint8Array.from(bytes.subarray(offset, offset + 16)).reverse()));
  const parts = bytes[0] ? [read(1), read(17), read(33)] : [];
  const tip = read(bytes[0] ? 49 : 1);
  const total = parts.reduce(saturatingAdd, 0n);
  return {
    inclusionFee: parts.length
      ? { baseFee: String(parts[0]), lenFee: String(parts[1]), adjustedWeightFee: String(parts[2]) }
      : null,
    tip: String(tip),
    inclusionFeeTotal: String(total),
    finalFee: String(saturatingAdd(total, tip)),
    encodedHex: raw,
  };
}
/** query_info.partial_fee excludes tips. Paid native estimates require inclusion and the explicit expected tip. */
export function assertHistoricalFeeDetailsMatchesQueryInfo(
  raw: unknown,
  partialFeeCodec: unknown,
  expectedTipCodec: unknown = '0'
): HistoricalFeeDetails {
  const result = decodeHistoricalFeeDetailsScale(raw);
  if (
    !result.inclusionFee ||
    amount(partialFeeCodec, true) !== amount(result.inclusionFeeTotal) ||
    amount(expectedTipCodec) !== amount(result.tip)
  )
    return fail();
  return result;
}

/**
 * A detached registry bound to explicit archived metadata. The reader must prove parent/post-state
 * runtime and same-format metadata compatibility; this offline codec cannot attest RPC provenance.
 */
export function createHistoricalExecutionCodec(value: unknown) {
  return createExecutionCodec(value, true);
}

/** The pool preparation path owns an unbound registry; public execution codecs keep their block context. */
function createExecutionCodec(value: unknown, blockBound: boolean) {
  const input = record(value, ['genesisHash', 'blockHash', 'metadataHex', 'runtimeVersion']);
  const genesisHash = hash(input.genesisHash);
  if (genesisHash !== HISTORICAL_EXECUTION_GENESIS) return fail();
  const blockHash = hash(input.blockHash);
  const metadataHex = hex(input.metadataHex, 2 * 1024 * 1024);
  const runtimeVersion = Object.freeze(runtime(input.runtimeVersion));
  const registry = blockBound ? new TypeRegistry(blockHash) : new TypeRegistry();
  registry.register(types);
  const metadata = new Metadata(registry, hexToU8a(metadataHex));
  if (
    metadata.version !== 14 ||
    encodedHex(metadata.toU8a()) !== metadataHex ||
    ![130, 131].includes(runtimeVersion.specVersion) ||
    runtimeVersion.transactionVersion !== runtimeVersion.specVersion
  )
    return fail();
  registry.setMetadata(metadata, undefined, undefined, true);
  if (metadata.asV14.extrinsic.version.toNumber() !== 4) return fail();
  const signedExtensions = Object.freeze([...registry.signedExtensions]);
  const declarations = metadata.asV14.extrinsic.signedExtensions;
  if (
    declarations.length !== SIGNED_EXTENSION_PROFILE.length ||
    signedExtensions.length !== SIGNED_EXTENSION_PROFILE.length ||
    declarations.some((entry, index) => {
      const expected = SIGNED_EXTENSION_PROFILE[index];
      return (
        entry.identifier.toString() !== expected[0] ||
        signedExtensions[index] !== expected[0] ||
        registry.lookup.getTypeDef(entry.type).type !== expected[1] ||
        registry.lookup.getTypeDef(entry.additionalSigned).type !== expected[2]
      );
    }) ||
    registry.getSignedExtensionTypes().tip !== 'Compact<Balance>'
  )
    return fail();
  const expanded = expandMetadata(registry, metadata);
  const binding = Object.freeze({
    genesisHash,
    blockHash,
    runtimeVersion,
    metadataSha256: sha(metadata.toU8a()),
    metadataVersion: metadata.version,
    signedExtensions,
  });
  const decodedBalance = (v: unknown) =>
    typeof v === 'string' && /^(?:0x[0-9a-fA-F]+|\d+)$/.test(v)
      ? BigInt(v).toString()
      : typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
        ? String(v)
        : fail();
  const assetId = (v: unknown): unknown => (typeof v === 'string' ? v : (v as { code?: unknown })?.code);

  /** Build and roundtrip an unsigned-authority fake envelope for exact native-XOR fee estimation only. */
  const buildSwapEnvelope = (value: unknown) => {
    const request = record(value, ['assetIn', 'assetOut', 'amountInCodec', 'quotedAmountOutCodec']);
    const assetIn = hash(request.assetIn),
      assetOut = hash(request.assetOut);
    if (
      !(
        (assetIn === HISTORICAL_EXECUTION_KUSD && assetOut === HISTORICAL_EXECUTION_XOR) ||
        (assetIn === HISTORICAL_EXECUTION_XOR && assetOut === HISTORICAL_EXECUTION_KUSD)
      )
    )
      return fail();
    const amountInCodec = amount(request.amountInCodec, true).toString();
    const minimumCodec = historicalMinimumCodec(request.quotedAmountOutCodec);
    const swap = expanded.tx.liquidityProxy?.swap;
    if (!swap) return fail();
    const call = swap(
      0,
      assetIn,
      assetOut,
      { WithDesiredInput: { desiredAmountIn: amountInCodec, minAmountOut: minimumCodec } },
      ['XYKPool'],
      'AllowSelected'
    );
    const callHex = call.toHex();
    const decodedCall = registry.createType('Call', callHex);
    const args = decodedCall.args.map((a) => a.toJSON());
    const swapArg = args[3] as { withDesiredInput?: { desiredAmountIn?: unknown; minAmountOut?: unknown } };
    const desired = swapArg?.withDesiredInput;
    if (
      decodedCall.section !== 'liquidityProxy' ||
      decodedCall.method !== 'swap' ||
      args.length !== 6 ||
      args[0] !== 0 ||
      assetId(args[1]) !== assetIn ||
      assetId(args[2]) !== assetOut ||
      !desired ||
      Object.keys(swapArg).join() !== 'withDesiredInput' ||
      Object.keys(desired).sort().join() !== 'desiredAmountIn,minAmountOut' ||
      decodedBalance(desired.desiredAmountIn) !== amountInCodec ||
      decodedBalance(desired.minAmountOut) !== minimumCodec ||
      JSON.stringify(args[4]) !== '["XYKPool"]' ||
      args[5] !== 'AllowSelected' ||
      decodedCall.toHex() !== callHex
    )
      return fail();
    const options = {
      nonce: 0,
      tip: 0,
      era: registry.createType('ExtrinsicEra', 0),
      genesisHash,
      blockHash: genesisHash,
      runtimeVersion: registry.createType<RuntimeVersion>('RuntimeVersion', runtimeVersion),
    };
    const envelope = registry.createType('Extrinsic', call, { version: 4 });
    envelope.signFake(ESTIMATION_ADDRESS, options);
    const bytes = envelope.toU8a();
    const decoded = registry.createType('Extrinsic', bytes);
    if (
      !decoded.isSigned ||
      decoded.method.toHex() !== callHex ||
      decoded.toHex() !== envelope.toHex() ||
      !decoded.era.isImmortalEra ||
      decoded.nonce.toString() !== '0'
    )
      return fail();
    if (decoded.tip.toString() !== '0') return fail();
    const payload = registry.createType(
      'ExtrinsicPayload',
      { ...options, method: callHex, ...runtimeVersion },
      { version: 4 }
    );
    if (
      payload.specVersion.toNumber() !== runtimeVersion.specVersion ||
      payload.transactionVersion.toNumber() !== runtimeVersion.transactionVersion
    )
      return fail();
    return {
      ...binding,
      assetIn,
      assetOut,
      amountInCodec,
      minimumCodec,
      feeAssetAddress: HISTORICAL_EXECUTION_XOR,
      callHex,
      envelopeHex: envelope.toHex(),
      encodedLength: bytes.length,
      envelopeSha256: sha(bytes),
      feeQueryDataHex: `${envelope.toHex()}${u8aToHex(registry.createType('u32', bytes.length).toU8a()).slice(2)}`,
      estimation: {
        address: ESTIMATION_ADDRESS,
        signature: 'fake-placeholder-only' as const,
        nonce: '0',
        tip: '0',
        era: 'immortal' as const,
        feeExtension: 'ChargeTransactionPayment' as const,
        chargeFeeInfoHex: null,
      },
    };
  };

  /** Reject an unsupported historical dispatch layout rather than dropping trailing or missing bytes. */
  const decodeQueryInfo = (value: unknown) => {
    const raw = hex(value, 256);
    const info = registry.createType<Struct>('RuntimeDispatchInfo', hexToU8a(raw));
    if (encodedHex(info.toU8a()) !== raw) return fail();
    const partialFeeCodec = amount(info.get('partialFee')?.toString(), true).toString();
    return { partialFeeCodec, rawQueryInfo: JSON.parse(JSON.stringify(info.toJSON())) as unknown };
  };
  const storage = () => {
    const entries = {
      timestamp: expanded.query.timestamp?.now,
      denominator: expanded.query.denomination?.denominator,
      kusd: expanded.query.assets?.assetInfosV2,
      xor: expanded.query.assets?.assetInfosV2,
      dex0: expanded.query.dexManager?.dexInfos,
    };
    if (Object.values(entries).some((entry) => !entry)) return fail();
    return entries;
  };
  /** Derive five fixed storage keys from historical metadata; arbitrary queries are not exposed. */
  const storageKeys = (): Record<StorageLabel, string> => {
    const entries = storage();
    const args: Record<StorageLabel, unknown[]> = {
      timestamp: [],
      denominator: [],
      kusd: [{ code: HISTORICAL_EXECUTION_KUSD }],
      xor: [{ code: HISTORICAL_EXECUTION_XOR }],
      dex0: [0],
    };
    return Object.fromEntries(
      Object.entries(entries).map(([key, entry]) => [
        key,
        encodedHex(compactStripLength(entry(...args[key as StorageLabel]))[1]),
      ])
    ) as Record<StorageLabel, string>;
  };
  /** Decode same-state values without substituting storage defaults for absent proof. */
  const decodeStorage = (value: unknown) => {
    const entries = storage();
    const values = record(value, ['timestamp', 'denominator', 'kusd', 'xor', 'dex0']);
    const decoded = Object.fromEntries(
      Object.entries(entries).map(([label, entry]) => {
        const raw = hex(values[label], 16 * 1024);
        const type = entry.meta.type;
        const result = registry.createType(
          registry.createLookupType(type.isPlain ? type.asPlain : type.asMap.value),
          hexToU8a(raw)
        );
        if (encodedHex(result.toU8a()) !== raw) return fail();
        return [label, result];
      })
    );
    const timestamp = amount(decoded.timestamp.toString(), true);
    if (timestamp > BigInt(Number.MAX_SAFE_INTEGER)) return fail();
    const denominator = amount(decoded.denominator.toString(), true).toString();
    const token = (label: 'kusd' | 'xor', address: string, symbol: string) => {
      const asset = decoded[label].toJSON() as { symbol?: unknown; precision?: unknown } | null;
      if (!asset || asset.precision !== 18 || typeof asset.symbol !== 'string') return fail();
      const observed = /^0x(?:[0-9a-fA-F]{2})+$/.test(asset.symbol)
        ? new TextDecoder('utf-8', { ignoreBOM: true }).decode(hexToU8a(asset.symbol))
        : asset.symbol;
      if (observed !== symbol) return fail();
      return { assetId: address, symbol, decimals: 18 as const };
    };
    const dex = decoded.dex0.toJSON() as { baseAssetId?: unknown } | null;
    if (!dex || assetId(dex.baseAssetId) !== HISTORICAL_EXECUTION_XOR) return fail();
    return {
      timestampMs: Number(timestamp),
      denominator,
      assets: {
        kusd: token('kusd', HISTORICAL_EXECUTION_KUSD, 'KUSD'),
        xor: token('xor', HISTORICAL_EXECUTION_XOR, 'XOR'),
      },
      dex: { id: 0 as const, baseAssetId: HISTORICAL_EXECUTION_XOR },
    };
  };
  const codec = Object.freeze({ binding, buildSwapEnvelope, decodeQueryInfo, storageKeys, decodeStorage });
  validatedLayouts.set(codec, { registry, metadata, metadataHex, expanded });
  return codec;
}

/** Build the pool layout from this exact codec's already validated metadata, without another decode. */
export function createValidatedHistoricalPoolLayout(base: ReturnType<typeof createHistoricalExecutionCodec>) {
  const validated = validatedLayouts.get(base);
  if (!validated) return fail();
  const { registry, metadata, expanded } = validated;
  const poolPallets = metadata.asV14.pallets.filter((pallet) => pallet.name.toString() === 'PoolXYK');
  if (poolPallets.length !== 1 || !poolPallets[0].storage.isSome) return fail();
  const prefix = poolPallets[0].storage.unwrap().prefix.toString();
  const query = expanded.query.poolXYK;
  const properties = query?.properties;
  const reserves = query?.reserves;
  if (
    !properties ||
    !reserves ||
    !properties.meta.type.isMap ||
    !reserves.meta.type.isMap ||
    !properties.meta.modifier.isOptional ||
    !reserves.meta.modifier.isDefault
  )
    return fail();
  for (const entry of [properties, reserves]) {
    const mapping = entry.meta.type.asMap;
    if (
      mapping.hashers.length !== 2 ||
      mapping.hashers.some((hasher) => !hasher.isBlake2128Concat) ||
      !registry.lookup.getSiType(mapping.key).def.isTuple ||
      registry.lookup.getSiType(mapping.key).def.asTuple.length !== 2
    )
      return fail();
    const components = registry.lookup.getSiType(mapping.key).def.asTuple;
    for (const [index, asset] of [HISTORICAL_EXECUTION_XOR, HISTORICAL_EXECUTION_KUSD].entries()) {
      const type = registry.createLookupType(components[index]);
      const encoded = registry.createType(type, { code: asset }).toU8a();
      if (encodedHex(encoded) !== asset || encodedHex(registry.createType(type, encoded).toU8a()) !== asset)
        return fail();
    }
  }
  if (
    registry.lookup.getTypeDef(properties.meta.type.asMap.value).type !== '(AccountId32,AccountId32)' ||
    registry.lookup.getTypeDef(reserves.meta.type.asMap.value).type !== '(u128,u128)'
  )
    return fail();
  const args = [{ code: HISTORICAL_EXECUTION_XOR }, { code: HISTORICAL_EXECUTION_KUSD }];
  const keys = Object.freeze({
    properties: encodedHex(compactStripLength(properties(...args))[1]),
    reserves: encodedHex(compactStripLength(reserves(...args))[1]),
  });
  for (const [label, entry] of [
    ['properties', properties],
    ['reserves', reserves],
  ] as const) {
    const components = [HISTORICAL_EXECUTION_XOR, HISTORICAL_EXECUTION_KUSD].flatMap((asset) => {
      const bytes = hexToU8a(asset);
      return [blake2AsU8a(bytes, 128), bytes];
    });
    const expected = encodedHex(
      u8aConcat(xxhashAsU8a(prefix, 128), xxhashAsU8a(entry.meta.name.toString(), 128), ...components)
    );
    if (keys[label] !== expected) return fail();
  }
  const decodeExact = (value: unknown, entry: typeof reserves, bytes: number): Uint8Array => {
    if (typeof value !== 'string' || !new RegExp(`^0x[0-9a-fA-F]{${bytes * 2}}$`).test(value)) return fail();
    const raw = hexToU8a(value);
    const decoded = registry.createType(registry.createLookupType(entry.meta.type.asMap.value), raw);
    if (encodedHex(decoded.toU8a()) !== value.toLowerCase()) return fail();
    return raw;
  };
  return Object.freeze({
    keys,
    decodeProperties: (value: unknown) => decodeExact(value, properties, 64),
    decodeReserves: (value: unknown) => decodeExact(value, reserves, 32),
  });
}

/**
 * Prepare only fixed pool decoding operations from a genuine validated codec. The private registry is
 * unbound and never escapes; block bindings and every raw storage observation remain the pool caller's.
 */
export function createValidatedHistoricalPoolDecoderFactory(base: ReturnType<typeof createHistoricalExecutionCodec>) {
  const validated = validatedLayouts.get(base);
  if (!validated) return fail();
  const identity = Object.freeze({
    genesisHash: base.binding.genesisHash,
    blockHash: base.binding.blockHash,
    metadataHex: validated.metadataHex,
    runtimeVersion: Object.freeze({ ...base.binding.runtimeVersion }),
  });
  let decoder:
    | Readonly<{
        keys: Readonly<Record<StorageLabel | 'properties' | 'reserves', string>>;
        decodeStorage: typeof base.decodeStorage;
        decodeProperties: (value: unknown) => Uint8Array;
        decodeReserves: (value: unknown) => Uint8Array;
      }>
    | undefined;
  return () => {
    if (!decoder) {
      const schema = createExecutionCodec(identity, false);
      const layout = createValidatedHistoricalPoolLayout(schema);
      const keys = Object.freeze({ ...schema.storageKeys(), ...layout.keys });
      if (new Set(Object.values(keys)).size !== 7) return fail();
      decoder = Object.freeze({
        keys,
        decodeStorage: schema.decodeStorage,
        decodeProperties: layout.decodeProperties,
        decodeReserves: layout.decodeReserves,
      });
    }
    return decoder;
  };
}
