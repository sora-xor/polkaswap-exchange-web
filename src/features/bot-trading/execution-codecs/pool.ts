/** Browser port of scripts/bots/historical-execution-pool-codec.ts, SHA-256 4706316a43d652687cf952c8a1a367f10e260206608552096d8aa6f515637b68. */
/** Offline same-state KUSD/XOR pool marks. Cached reserves are observations, never executable quotes or fills. */
import { u8aToHex } from '@polkadot/util';
import {
  createHistoricalExecutionCodec,
  createValidatedHistoricalPoolDecoderFactory,
  createValidatedHistoricalPoolLayout,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from './execution';

type PoolBinding = ReturnType<typeof createHistoricalExecutionCodec>['binding'];
type PoolKeys = ReturnType<ReturnType<typeof createValidatedHistoricalPoolDecoderFactory>>['keys'];
type PoolDecoderFactory = ReturnType<typeof createValidatedHistoricalPoolDecoderFactory>;
type PoolOwner = Readonly<{ binding: PoolBinding; metadataHex: string; prepare: PoolDecoderFactory }>;
const poolOwners = new WeakMap<object, PoolOwner>();
const preparedIdentities = new WeakMap<object, PoolOwner>();

const MAX_U128 = (1n << 128n) - 1n;
const SCALE = 10n ** 18n;
const hex = (bytes: Uint8Array): string => u8aToHex(bytes);
const fail = (): never => {
  throw new Error('Invalid historical pool codec evidence');
};

/** Exact ratio of same-decimal reserves; it is not a rounded price or a stable-token peg. */
export interface HistoricalPoolRatio {
  readonly numeratorCodec: string;
  readonly denominatorCodec: string;
}

/** Snapshot exact own data fields without evaluating rejected getters. */
function data(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return fail();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Reflect.ownKeys(descriptors).length !== keys.length ||
    keys.some(
      (key) => !Object.hasOwn(descriptors, key) || !('value' in descriptors[key]) || !descriptors[key].enumerable
    )
  )
    return fail();
  return Object.fromEntries(keys.map((key) => [key, descriptors[key].value]));
}

/** Positive canonical u128 scalars only; intermediate ratio arithmetic remains arbitrary-precision. */
function positiveU128(value: unknown): bigint {
  if (typeof value !== 'string' || !/^[1-9]\d{0,38}$/.test(value)) return fail();
  const parsed = BigInt(value);
  return parsed <= MAX_U128 ? parsed : fail();
}

/** Optional display conversion. Callers must explicitly choose this floor rounding; valuation can retain the ratio. */
export function roundHistoricalPoolRatioTo18(value: unknown) {
  const ratio = data(value, ['numeratorCodec', 'denominatorCodec']);
  const numerator = positiveU128(ratio.numeratorCodec);
  const denominator = positiveU128(ratio.denominatorCodec);
  const scaled = (numerator * SCALE) / denominator;
  const fraction = (scaled % SCALE).toString().padStart(18, '0').replace(/0+$/, '');
  return Object.freeze({
    status: scaled === 0n ? ('below-18-decimal-resolution' as const) : ('available' as const),
    decimals: 18 as const,
    rounding: 'floor' as const,
    scaled: scaled.toString(),
    decimal: fraction ? `${scaled / SCALE}.${fraction}` : (scaled / SCALE).toString(),
  });
}

/**
 * Bind pool keys and decoders to validated historical metadata. The caller must obtain every raw value
 * at binding.blockHash and establish RPC provenance/finality; this offline codec cannot attest those.
 */
export function createHistoricalExecutionPoolCodec(value: unknown) {
  const identity = data(value, ['genesisHash', 'blockHash', 'metadataHex', 'runtimeVersion']);
  const owner = preparedIdentities.get(value as object);
  if (owner) {
    const detached = matchingIdentity(identity, owner);
    const decoder = owner.prepare();
    const binding = Object.freeze({ ...owner.binding, blockHash: detached.blockHash });
    return poolCodec(binding, decoder.keys, decoder.decodeStorage, decoder, owner);
  }
  const base = createHistoricalExecutionCodec(identity);
  const layout = createValidatedHistoricalPoolLayout(base);
  const keys = Object.freeze({ ...base.storageKeys(), ...layout.keys });
  const coldOwner = Object.freeze({
    binding: base.binding,
    metadataHex: (identity.metadataHex as string).toLowerCase(),
    prepare: createValidatedHistoricalPoolDecoderFactory(base),
  });
  return poolCodec(base.binding, keys, base.decodeStorage, layout, coldOwner);
}

/** Validate the complete identity against the capability's exact schema without invoking getters. */
function matchingIdentity(value: unknown, owner: PoolOwner) {
  const identity = data(value, ['genesisHash', 'blockHash', 'metadataHex', 'runtimeVersion']);
  const hash = (value: unknown): string => {
    if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(value)) return fail();
    return value.toLowerCase();
  };
  const genesisHash = hash(identity.genesisHash);
  const blockHash = hash(identity.blockHash);
  const metadataHex = identity.metadataHex;
  if (
    typeof metadataHex !== 'string' ||
    metadataHex.length > 2 + 2 * 1024 * 1024 * 2 ||
    !/^0x(?:[0-9a-fA-F]{2})+$/.test(metadataHex)
  )
    return fail();
  const runtime = data(identity.runtimeVersion, ['specVersion', 'transactionVersion']);
  if (
    genesisHash !== owner.binding.genesisHash ||
    metadataHex.toLowerCase() !== owner.metadataHex ||
    runtime.specVersion !== owner.binding.runtimeVersion.specVersion ||
    runtime.transactionVersion !== owner.binding.runtimeVersion.transactionVersion
  )
    return fail();
  return Object.freeze({
    genesisHash,
    blockHash,
    metadataHex: metadataHex.toLowerCase(),
    runtimeVersion: Object.freeze({
      specVersion: runtime.specVersion as number,
      transactionVersion: runtime.transactionVersion as number,
    }),
  });
}

/**
 * Detach a fresh block identity using only a genuine pool capability's validated schema. Copies remain
 * ordinary constructor inputs and never inherit this private decoder ownership or any retained state.
 */
export function prepareHistoricalExecutionPoolIdentity(anchor: unknown, value: unknown) {
  if (!anchor || typeof anchor !== 'object') return fail();
  const owner = poolOwners.get(anchor);
  if (!owner) return fail();
  const identity = matchingIdentity(value, owner);
  preparedIdentities.set(identity, owner);
  return identity;
}

/** Decode every raw proof afresh while retaining only the immutable schema operations and keys. */
function poolCodec(
  binding: PoolBinding,
  keys: PoolKeys,
  decodeState: ReturnType<typeof createHistoricalExecutionCodec>['decodeStorage'],
  layout: ReturnType<typeof createValidatedHistoricalPoolLayout>,
  owner: PoolOwner
) {
  if (new Set(Object.values(keys)).size !== 7) return fail();
  const readU128 = (bytes: Uint8Array) => BigInt(u8aToHex(Uint8Array.from(bytes).reverse())).toString();
  const pair = Object.freeze({
    baseAssetId: XOR,
    targetAssetId: KUSD,
    baseDecimals: 18 as const,
    targetDecimals: 18 as const,
  });

  /** Preserve absent, missing and zero states; positive observations expose exact reciprocal ratios. */
  const decodeStorage = (value: unknown) => {
    const proof = data(value, ['timestamp', 'denominator', 'kusd', 'xor', 'dex0', 'properties', 'reserves']);
    const decodedState = decodeState({
      timestamp: proof.timestamp,
      denominator: proof.denominator,
      kusd: proof.kusd,
      xor: proof.xor,
      dex0: proof.dex0,
    });
    const state = Object.freeze({
      ...decodedState,
      assets: Object.freeze({
        kusd: Object.freeze(decodedState.assets.kusd),
        xor: Object.freeze(decodedState.assets.xor),
      }),
      dex: Object.freeze(decodedState.dex),
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
    const rawProperties = layout.decodeProperties(proof.properties);
    const accounts = Object.freeze({
      reservesAccountId: hex(rawProperties.subarray(0, 32)),
      feesAccountId: hex(rawProperties.subarray(32)),
    });
    if (proof.reserves === null)
      return Object.freeze({ ...context, status: 'missing-reserves' as const, accounts, reserves: null, marks: null });
    const rawReserves = layout.decodeReserves(proof.reserves);
    const balances = Object.freeze({
      xorCodec: readU128(rawReserves.subarray(0, 16)),
      kusdCodec: readU128(rawReserves.subarray(16)),
    });
    if (balances.xorCodec === '0' || balances.kusdCodec === '0')
      return Object.freeze({ ...context, status: 'zero-reserves' as const, accounts, reserves: balances, marks: null });
    const marks = Object.freeze({
      xorPerKusd: Object.freeze({ numeratorCodec: balances.xorCodec, denominatorCodec: balances.kusdCodec }),
      kusdPerXor: Object.freeze({ numeratorCodec: balances.kusdCodec, denominatorCodec: balances.xorCodec }),
    });
    return Object.freeze({ ...context, status: 'present' as const, accounts, reserves: balances, marks });
  };
  const codec = Object.freeze({ binding, storageKeys: () => keys, decodeStorage });
  poolOwners.set(codec, owner);
  return codec;
}
