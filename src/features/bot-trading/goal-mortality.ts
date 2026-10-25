/** Exact signed-payload mortality evidence. This module makes no RPC or non-inclusion claim. */
import { Metadata, TypeRegistry } from '@polkadot/types';
import { GenericExtrinsicV4 } from '@polkadot/types/extrinsic/v4';
import {
  blake2AsHex,
  blake2AsU8a,
  decodeAddress,
  ed25519Verify,
  secp256k1Verify,
  sha256AsU8a,
  sr25519Verify,
} from '@polkadot/util-crypto';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import type { Extrinsic } from '@polkadot/types/interfaces';
import type { IKeyringPair, SignerPayloadJSON } from '@polkadot/types/types';
import { types } from '@/lib/substrate/type-definitions';
import { createHistoricalGoalFeeCodec } from './execution-codecs/fee';
import { GOAL_EXACT_POLICY } from './goal-exact-ledger';
import { goalSignedEnvelopeDigest } from './goal-receipt';
import {
  copyGoalSigningPayload as copyPayload,
  readGoalPersistedSigning,
  type GoalPersistedSigning,
} from './goal-signing-record';
export { readGoalPersistedSigning, type GoalPersistedSigning } from './goal-signing-record';

export interface GoalSigningPayloadCapture {
  readonly protocol: 'goal-signing-payload-v1';
  readonly payload: Readonly<SignerPayloadJSON>;
}
export interface GoalSignedMortality {
  readonly protocol: 'goal-signed-mortality-v1';
  readonly account: string;
  readonly network: string;
  readonly checkpoint: Readonly<{ height: number; hash: string }>;
  readonly eraHex: string;
  readonly birthBlockNumber: number;
  readonly deathBlockNumber: number;
  readonly nonceCodec: string;
  readonly callHex: string;
  readonly payloadSha256: string;
  readonly txHash: string;
  readonly signedEnvelopeDigest: string;
  readonly signatureType: 'ed25519' | 'sr25519' | 'ecdsa';
  readonly signatureVerified: true;
  readonly checkpointCanonicality: 'not-yet-checked';
}
interface Captured {
  registry: TypeRegistry;
  metadataHex: string;
  payloadBytes: Uint8Array;
  accountBytes: Uint8Array;
  context: Omit<GoalSignedMortality, 'txHash' | 'signedEnvelopeDigest' | 'signatureType' | 'signatureVerified'>;
}
const captures = new WeakMap<object, Captured>();
const signedFacts = new WeakMap<
  object,
  { bytes: string; fact: GoalSignedMortality; persisted: GoalPersistedSigning }
>();
const fail = (): never => {
  throw Error('bots.errors.intent');
};
function check(value: unknown): asserts value {
  if (!value) fail();
}
const sha = (bytes: Uint8Array) => u8aToHex(sha256AsU8a(bytes)).slice(2);
const hex = (value: unknown, maximum: number): string => {
  check(typeof value === 'string' && value.length <= 2 + maximum * 2 && /^0x(?:[0-9a-fA-F]{2})+$/.test(value));
  return value.toLowerCase();
};
const hash = (value: unknown): string => {
  const result = hex(value, 32);
  check(result.length === 66);
  return result;
};
const u32 = (value: unknown): bigint => {
  check(typeof value === 'string' && /^0x[0-9a-fA-F]{1,8}$/.test(value));
  const result = BigInt(value);
  check(result <= 0xffffffffn);
  return result;
};
/** Bind the actual SDK callback payload to the supported native-fee metadata profile before signing. */
export function captureGoalSigningPayload(input: {
  metadataHex: string;
  account: string;
  genesisHash: string;
  callHex: string;
  runtimeVersion: { specVersion: number; transactionVersion: number };
  payload: SignerPayloadJSON;
}): GoalSigningPayloadCapture {
  const payload = copyPayload(input.payload);
  const network = hash(input.genesisHash),
    checkpoint = hash(payload.blockHash),
    callHex = hex(input.callHex, 4096);
  check(network === GOAL_EXACT_POLICY.genesisHash && hash(payload.genesisHash) === network && checkpoint !== network);
  check(typeof payload.address === 'string' && payload.address.length <= 128 && input.account.length <= 128);
  const accountBytes = decodeAddress(input.account);
  check(accountBytes.length === 32 && u8aToHex(decodeAddress(payload.address)) === u8aToHex(accountBytes));
  check(payload.version === 4 && hex(payload.method, 4096) === callHex && BigInt(payload.tip) === 0n);
  check(
    payload.assetId == null &&
      payload.metadataHash == null &&
      (payload.mode === undefined || payload.mode === 0) &&
      (payload.withSignedTransaction === undefined || payload.withSignedTransaction === false)
  );
  const height = Number(u32(payload.blockNumber)),
    nonce = u32(payload.nonce);
  const runtimeVersion = {
    specVersion: Number(u32(payload.specVersion)),
    transactionVersion: Number(u32(payload.transactionVersion)),
  };
  check(
    height > 0 &&
      runtimeVersion.specVersion === input.runtimeVersion.specVersion &&
      runtimeVersion.transactionVersion === input.runtimeVersion.transactionVersion
  );
  const identity = { genesisHash: network, blockHash: checkpoint, metadataHex: input.metadataHex, runtimeVersion };
  // Reuse the actual supported SORA extension/address/signature layout validation.
  createHistoricalGoalFeeCodec(identity);
  const registry = new TypeRegistry(checkpoint);
  registry.register(types);
  registry.setMetadata(new Metadata(registry, input.metadataHex as `0x${string}`), undefined, undefined, true);
  check(JSON.stringify(registry.signedExtensions) === JSON.stringify(payload.signedExtensions));
  const era = registry.createType('ExtrinsicEra', payload.era);
  check(
    era.isMortalEra &&
      era.asMortalEra.period.toNumber() === 64 &&
      era.toU8a().length === 2 &&
      era.toHex() === hex(payload.era, 2)
  );
  const birth = era.asMortalEra.birth(height),
    death = era.asMortalEra.death(height);
  check(birth === height && death === birth + 64 && death <= 0xffffffff);
  const payloadBytes = registry.createType('ExtrinsicPayload', payload, { version: 4 }).toU8a({ method: true });
  check(payloadBytes.length > 0 && payloadBytes.length <= 8192);
  const capture = Object.freeze({ protocol: 'goal-signing-payload-v1' as const, payload });
  captures.set(capture, {
    registry,
    metadataHex: hex(input.metadataHex, 2_000_000),
    payloadBytes,
    accountBytes,
    context: Object.freeze({
      protocol: 'goal-signed-mortality-v1',
      account: u8aToHex(accountBytes),
      network,
      checkpoint: Object.freeze({ height, hash: checkpoint }),
      eraHex: era.toHex(),
      birthBlockNumber: birth,
      deathBlockNumber: death,
      nonceCodec: nonce.toString(),
      callHex,
      payloadSha256: sha(payloadBytes),
      checkpointCanonicality: 'not-yet-checked',
    }),
  });
  return capture;
}
/** Exact SDK raw-signing payload, before its greater-than-256-byte hashing rule. */
export function goalRawSigningPayload(capture: GoalSigningPayloadCapture): string {
  const owned = captures.get(capture);
  check(owned);
  return u8aToHex(owned.payloadBytes);
}
/** Internal cloned keys sign the same captured payload used by the SDK external-signer path. */
export function signCapturedGoalPayload(capture: GoalSigningPayloadCapture, pair: IKeyringPair) {
  const owned = captures.get(capture);
  check(owned);
  check(u8aToHex(decodeAddress(pair.address)) === u8aToHex(owned.accountBytes));
  return owned.registry.createType('ExtrinsicPayload', capture.payload, { version: 4 }).sign(pair);
}
/**
 * Grant owned mortality evidence only for an exact cryptographically bound returned envelope.
 * Invalid returned signatures still remain signed facts for the executor to persist; no evidence
 * is granted and this function deliberately does not discard or throw away that returned object.
 */
export function retainGoalSignedMortality(capture: GoalSigningPayloadCapture, signed: { toHex(): string }): boolean {
  try {
    const owned = captures.get(capture);
    check(owned);
    const bytes = hex(signed.toHex(), 4096),
      context = owned.context;
    const decoded = owned.registry.createType<Extrinsic>('Extrinsic', bytes);
    check(
      decoded.toHex() === bytes && decoded.type === 4 && decoded.inner instanceof GenericExtrinsicV4 && decoded.isSigned
    );
    check(
      decoded.method.toHex() === context.callHex &&
        decoded.era.toHex() === context.eraHex &&
        decoded.nonce.toString() === context.nonceCodec &&
        decoded.tip.toString() === '0' &&
        u8aToHex(decodeAddress(decoded.signer.toString())) === context.account
    );
    const signature = decoded.inner.signature.multiSignature.toU8a();
    const message = owned.payloadBytes.length > 256 ? blake2AsU8a(owned.payloadBytes) : owned.payloadBytes;
    const body = signature.subarray(1);
    let signatureType: GoalSignedMortality['signatureType'];
    if (signature[0] === 0 && signature.length === 65) {
      check(ed25519Verify(message, body, owned.accountBytes, true));
      signatureType = 'ed25519';
    } else if (signature[0] === 1 && signature.length === 65) {
      check(sr25519Verify(message, body, owned.accountBytes));
      signatureType = 'sr25519';
    } else if (signature[0] === 2 && signature.length === 66) {
      check(secp256k1Verify(message, body, owned.accountBytes, 'blake2', true));
      signatureType = 'ecdsa';
    } else return false;
    const fact = Object.freeze({
      ...context,
      txHash: blake2AsHex(hexToU8a(bytes), 256),
      signedEnvelopeDigest: goalSignedEnvelopeDigest(bytes),
      signatureType,
      signatureVerified: true as const,
    });
    const persisted = Object.freeze({
      protocol: 'goal-persisted-signing-v1' as const,
      payload: capture.payload,
      metadataHexChunks: Object.freeze(owned.metadataHex.match(/.{1,60000}/g)!),
      signedEnvelopeHex: bytes,
    });
    signedFacts.set(signed, { bytes, fact, persisted });
    return true;
  } catch {
    return false;
  }
}
/** Export only an already verified captured signature, preserving the exact SDK additional signed data. */
export function exportGoalPersistedSigning(signed: { toHex(): string }): GoalPersistedSigning | undefined {
  return readGoalSignedMortality(signed) ? signedFacts.get(signed)!.persisted : undefined;
}
/** Reconstruct the supported codec and verify the original signature after reload; never trust serialized mortality. */
export function verifyGoalPersistedSigning(
  raw: unknown,
  expected: {
    account: string;
    network: string;
    txHash: string;
    signedEnvelopeDigest: string;
  }
): GoalSignedMortality {
  const record = readGoalPersistedSigning(raw),
    payload = record.payload;
  const capture = captureGoalSigningPayload({
    metadataHex: record.metadataHexChunks.join(''),
    account: expected.account,
    genesisHash: expected.network,
    callHex: payload.method,
    runtimeVersion: {
      specVersion: Number(u32(payload.specVersion)),
      transactionVersion: Number(u32(payload.transactionVersion)),
    },
    payload,
  });
  const signed = { toHex: () => record.signedEnvelopeHex };
  check(retainGoalSignedMortality(capture, signed));
  const fact = readGoalSignedMortality(signed)!;
  check(fact.txHash === expected.txHash && fact.signedEnvelopeDigest === expected.signedEnvelopeDigest);
  return fact;
}
/** Detached copies or changed signed bytes cannot recover a privately owned mortality fact. */
export function readGoalSignedMortality(signed: { toHex(): string }): GoalSignedMortality | undefined {
  const owned = signedFacts.get(signed);
  if (!owned) return undefined;
  try {
    return hex(signed.toHex(), 4096) === owned.bytes ? owned.fact : undefined;
  } catch {
    return undefined;
  }
}
