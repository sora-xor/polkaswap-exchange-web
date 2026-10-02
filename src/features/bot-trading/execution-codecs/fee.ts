/** Browser port of scripts/bots/historical-goal-fee-codec.ts, SHA-256 601a1a7fb3d23cdfd617a0e22f9c437360b9e263838db8c782f9e653fa358061. */
/** Offline native-fee envelope bounds. No keys, cryptographic signing, RPC, wallet or submission API. */
import { Metadata, TypeRegistry } from '@polkadot/types';
import { sha256AsU8a } from '@polkadot/util-crypto';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { GenericExtrinsicV4 } from '@polkadot/types/extrinsic/v4/Extrinsic';
import type { Extrinsic } from '@polkadot/types/interfaces';
import type { HexString } from '@polkadot/util/types';
import { types } from '@/lib/substrate/type-definitions';
import { createHistoricalExecutionCodec, HISTORICAL_EXECUTION_XOR } from './execution';

const MAX_NONCE = 0xffffffffn;
const PLACEHOLDER_ACCOUNT = `0x${'11'.repeat(32)}`;
const SIGNATURES = Object.freeze([
  Object.freeze({ name: 'Ed25519', index: 0, payloadBytes: 64 }),
  Object.freeze({ name: 'Sr25519', index: 1, payloadBytes: 64 }),
  Object.freeze({ name: 'Ecdsa', index: 2, payloadBytes: 65 }),
]);
const METADATA_SIGNATURES = [...SIGNATURES, { name: 'Eth', index: 3, payloadBytes: 65 }];

/** Fixed before fee queries; this bounds encoding length, not the future fee multiplier or settled fee. */
export const HISTORICAL_GOAL_FEE_POLICY = Object.freeze({
  version: 1,
  id: 'native-xor-mortal64-u32-multisignature-length-v1',
  purpose: 'fee-estimation-only',
  extrinsicVersion: 4,
  address: 'AccountId32',
  allowedSignatures: SIGNATURES,
  maximumSignature: 'Ecdsa',
  nonce: Object.freeze({ encoding: 'Compact<u32>', minimum: '0', maximum: '4294967295' }),
  era: Object.freeze({ kind: 'mortal', period: 64 }),
  tipCodec: '0',
  feeExtension: 'ChargeTransactionPayment',
  feeAssetAddress: HISTORICAL_EXECUTION_XOR,
  route: Object.freeze({ dexId: 0, source: 'XYKPool', filter: 'AllowSelected', slippageBasisPoints: 50 }),
});

const fail = (): never => {
  throw new Error('Invalid historical goal fee envelope');
};
const sha = (bytes: Uint8Array) => u8aToHex(sha256AsU8a(bytes)).slice(2);
const hex = (bytes: Uint8Array): HexString => u8aToHex(bytes);
const POLICY_SHA256 = sha(new TextEncoder().encode(JSON.stringify(HISTORICAL_GOAL_FEE_POLICY)));

/** Copy exact plain data descriptors before reading caller-controlled fields. */
function record(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  if (![Object.prototype, null].includes(Object.getPrototypeOf(value))) return fail();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Reflect.ownKeys(descriptors).length !== keys.length ||
    keys.some((key) => !descriptors[key]?.enumerable || !('value' in descriptors[key]))
  )
    return fail();
  return Object.fromEntries(keys.map((key) => [key, descriptors[key].value]));
}

function blockNumber(value: unknown): number {
  const context = record(value, ['blockNumber']);
  if (
    !Number.isSafeInteger(context.blockNumber) ||
    (context.blockNumber as number) < 1 ||
    (context.blockNumber as number) > Number(MAX_NONCE)
  )
    return fail();
  return context.blockNumber as number;
}

/**
 * Compose the existing metadata/call verifier, then check the actual address/signature layouts.
 * Supplied identity is a decoding context, not a canonicality, finality or signature attestation.
 */
export function createHistoricalGoalFeeCodec(value: unknown) {
  const input = record(value, ['genesisHash', 'blockHash', 'metadataHex', 'runtimeVersion']);
  const runtimeVersion = record(input.runtimeVersion, ['specVersion', 'transactionVersion']);
  const source = { ...input, runtimeVersion };
  const execution = createHistoricalExecutionCodec(source);
  const { binding } = execution;
  const registry = new TypeRegistry(binding.blockHash);
  registry.register(types);
  const metadata = new Metadata(registry, input.metadataHex as HexString);
  registry.setMetadata(metadata, undefined, undefined, true);
  const extrinsicType = registry.lookup.getSiType(metadata.asV14.extrinsic.type);
  const params = extrinsicType.params;
  if (
    params.length !== 4 ||
    params.some(
      (param, index) => param.name.toString() !== ['Address', 'Call', 'Signature', 'Extra'][index] || param.type.isNone
    )
  )
    return fail();

  const callType = registry.lookup.getSiType(params[1].type.unwrap());
  const pallet = metadata.asV14.pallets.find((entry) => entry.name.toString() === 'LiquidityProxy');
  if (!pallet?.calls.isSome || !callType.def.isVariant) return fail();
  const palletCall = callType.def.asVariant.variants.find((entry) => entry.index.eq(pallet.index));
  if (
    palletCall?.name.toString() !== 'LiquidityProxy' ||
    palletCall.fields.length !== 1 ||
    palletCall.fields[0].name.isSome ||
    !palletCall.fields[0].type.eq(pallet.calls.unwrap().type)
  )
    return fail();
  const extraType = registry.lookup.getSiType(params[3].type.unwrap());
  const extensions = metadata.asV14.extrinsic.signedExtensions;
  if (!extraType.def.isTuple || extraType.def.asTuple.length !== extensions.length) return fail();
  extraType.def.asTuple.forEach((id, index) => {
    let current = id;
    // SORA wraps ChargeTransactionPayment in AsTransactionExtension, which adds no bytes.
    for (let depth = 0; !current.eq(extensions[index].type); depth++) {
      if (depth >= 2) return fail();
      const type = registry.lookup.getSiType(current);
      if (!type.def.isComposite) return fail();
      const fields = type.def.asComposite.fields;
      if (fields.length !== 1 || fields[0].name.isSome) return fail();
      current = fields[0].type;
    }
  });

  const fixedBytes = (id: number, length: number, depth = 0): void => {
    if (depth > 2) return fail();
    const type = registry.lookup.getSiType(id);
    if (type.def.isComposite) {
      const fields = type.def.asComposite.fields;
      if (fields.length !== 1 || fields[0].name.isSome) return fail();
      return fixedBytes(fields[0].type.toNumber(), length, depth + 1);
    }
    if (!type.def.isArray || type.def.asArray.len.toNumber() !== length) return fail();
    const element = registry.lookup.getSiType(type.def.asArray.type);
    if (!element.def.isPrimitive || element.def.asPrimitive.toString() !== 'U8') return fail();
  };
  const addressId = params[0].type.unwrap().toNumber();
  const signatureId = params[2].type.unwrap().toNumber();
  fixedBytes(addressId, 32);
  const signatureType = registry.lookup.getSiType(signatureId);
  if (!signatureType.def.isVariant || signatureType.def.asVariant.variants.length !== METADATA_SIGNATURES.length)
    return fail();
  signatureType.def.asVariant.variants.forEach((variant, index) => {
    const expected = METADATA_SIGNATURES[index];
    if (
      variant.name.toString() !== expected.name ||
      variant.index.toNumber() !== expected.index ||
      variant.fields.length !== 1 ||
      variant.fields[0].name.isSome
    )
      return fail();
    fixedBytes(variant.fields[0].type.toNumber(), expected.payloadBytes);
  });
  // Runtime metadata also declares Eth. The current live SDK supports only these three variants.
  for (const signature of SIGNATURES) {
    const bytes = Uint8Array.from([signature.index, ...new Array(signature.payloadBytes).fill(1)]);
    const lookup = registry.createType(`Lookup${signatureId}`, bytes);
    const sdk = registry.createType('ExtrinsicSignature', bytes);
    if (hex(lookup.toU8a()) !== hex(bytes) || hex(sdk.toU8a()) !== hex(bytes)) return fail();
  }
  const accountBytes = hexToU8a(PLACEHOLDER_ACCOUNT);
  if (
    hex(registry.createType(`Lookup${addressId}`, accountBytes).toU8a()) !== PLACEHOLDER_ACCOUNT ||
    hex(registry.createType('Address', PLACEHOLDER_ACCOUNT).toU8a()) !== PLACEHOLDER_ACCOUNT
  )
    return fail();

  const signatureBytes = (envelope: Extrinsic): Uint8Array => {
    if (envelope.type !== 4 || !(envelope.inner instanceof GenericExtrinsicV4)) return fail();
    return envelope.inner.signature.multiSignature.toU8a();
  };
  const build = (request: unknown, context: unknown) => {
    const height = blockNumber(context);
    const call = execution.buildSwapEnvelope(request);
    const era = registry.createType('ExtrinsicEra', { current: height, period: 64 });
    const payload = registry.createType(
      'ExtrinsicPayload',
      {
        method: call.callHex,
        nonce: MAX_NONCE.toString(),
        tip: '0',
        era,
        genesisHash: binding.genesisHash,
        blockHash: binding.blockHash,
        ...binding.runtimeVersion,
      },
      { version: 4 }
    );
    const envelope = registry.createType<Extrinsic>('Extrinsic', registry.createType('Call', call.callHex), {
      version: 4,
    });
    const signature = Uint8Array.from([2, ...new Array(65).fill(1)]);
    envelope.addSignature(PLACEHOLDER_ACCOUNT, hex(signature), payload.toHex());
    const bytes = envelope.toU8a();
    const decoded = registry.createType<Extrinsic>('Extrinsic', bytes);
    if (
      !decoded.isSigned ||
      decoded.type !== 4 ||
      decoded.method.toHex() !== call.callHex ||
      decoded.toHex() !== envelope.toHex() ||
      decoded.nonce.toString() !== MAX_NONCE.toString() ||
      decoded.tip.toString() !== '0' ||
      !decoded.era.isMortalEra ||
      decoded.era.toHex() !== era.toHex() ||
      decoded.era.asMortalEra.period.toNumber() !== 64 ||
      decoded.signer.toHex() !== PLACEHOLDER_ACCOUNT ||
      hex(signatureBytes(decoded)) !== hex(signature)
    )
      return fail();
    return { call, height, payload, envelope, bytes, era };
  };

  /** Encode the maximum supported nonce/signature with the complete outer SCALE length prefix. */
  const buildBoundSwapEnvelope = (request: unknown, context: unknown) => {
    const { call, height, payload, envelope, bytes, era } = build(request, context);
    return Object.freeze({
      ...binding,
      policy: HISTORICAL_GOAL_FEE_POLICY,
      policySha256: POLICY_SHA256,
      policyHashEncoding: 'sha256-json-utf8' as const,
      assetIn: call.assetIn,
      assetOut: call.assetOut,
      amountInCodec: call.amountInCodec,
      minimumCodec: call.minimumCodec,
      feeAssetAddress: HISTORICAL_EXECUTION_XOR,
      callHex: call.callHex,
      envelopeHex: envelope.toHex(),
      encodedLength: bytes.length,
      envelopeSha256: sha(bytes),
      feeQueryDataHex: `${envelope.toHex()}${hex(registry.createType('u32', bytes.length).toU8a()).slice(2)}`,
      estimation: Object.freeze({
        signature: 'fake-placeholder-only' as const,
        signatureType: 'Ecdsa' as const,
        addressHex: PLACEHOLDER_ACCOUNT,
        nonce: MAX_NONCE.toString(),
        nonceEncodedLength: envelope.nonce.toU8a().length,
        signatureEncodedLength: signatureBytes(envelope).length,
        addressEncodedLength: envelope.signer.toU8a().length,
        tip: '0',
        era: 'mortal' as const,
        eraPeriod: 64,
        eraPhase: era.asMortalEra.phase.toNumber(),
        eraHex: era.toHex(),
        eraEncodedLength: era.toU8a().length,
        checkpointBlockNumber: height,
        checkpointBlockHash: binding.blockHash,
        payloadHex: payload.toHex(),
      }),
      signatureVerified: false as const,
      feeAdequacyVerified: false as const,
      transactionSubmitted: false as const,
    });
  };

  /**
   * Check only structural policy/length compatibility against the exact requested call. No signature,
   * account authority, nonce freshness, mortality checkpoint, RPC state or fee amount is verified.
   * Mortal64 phases may differ: all occupy two bytes, and checkpoint hashes are not in the extrinsic.
   */
  const inspectSwapEnvelope = (request: unknown, context: unknown, value: unknown) => {
    const bound = buildBoundSwapEnvelope(request, context);
    if (typeof value !== 'string' || value.length > 8194 || !/^0x(?:[0-9a-fA-F]{2})+$/.test(value)) return fail();
    const bytes = hexToU8a(value);
    const decoded = registry.createType<Extrinsic>('Extrinsic', bytes);
    const signature = signatureBytes(decoded);
    const supported = SIGNATURES.find((entry) => entry.index === signature[0]);
    if (
      decoded.toHex() !== hex(bytes) ||
      !decoded.isSigned ||
      decoded.type !== 4 ||
      decoded.method.toHex() !== bound.callHex ||
      !decoded.era.isMortalEra ||
      decoded.era.asMortalEra.period.toNumber() !== 64 ||
      decoded.era.toU8a().length !== 2 ||
      decoded.tip.toString() !== '0' ||
      BigInt(decoded.nonce.toString()) > MAX_NONCE ||
      !supported ||
      signature.length !== supported.payloadBytes + 1 ||
      decoded.signer.toU8a().length !== 32 ||
      bytes.length > bound.encodedLength
    )
      return fail();
    return Object.freeze({
      kind: 'structural-length-compatible' as const,
      ...binding,
      policySha256: POLICY_SHA256,
      callHex: bound.callHex,
      encodedLength: bytes.length,
      maximumEncodedLength: bound.encodedLength,
      signatureType: supported.name,
      nonce: decoded.nonce.toString(),
      eraPhase: decoded.era.asMortalEra.phase.toNumber(),
      signatureVerified: false as const,
      feeAdequacyVerified: false as const,
    });
  };
  return Object.freeze({
    binding,
    policy: HISTORICAL_GOAL_FEE_POLICY,
    policySha256: POLICY_SHA256,
    buildBoundSwapEnvelope,
    inspectSwapEnvelope,
  });
}
