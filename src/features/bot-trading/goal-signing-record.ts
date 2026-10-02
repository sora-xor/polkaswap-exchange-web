/** Bounded plain signing records. Parsing alone never verifies a signature or grants recovery authority. */
import type { SignerPayloadJSON } from '@polkadot/types/types';
/** Reloadable signed bytes and their actual additional signed data; persisted claims grant no authority. */
export interface GoalPersistedSigning {
  readonly protocol: 'goal-persisted-signing-v1';
  readonly payload: Readonly<SignerPayloadJSON>;
  readonly metadataHexChunks: readonly string[];
  readonly signedEnvelopeHex: string;
}
const fail = (): never => {
  throw Error('bots.errors.intent');
};
function check(value: unknown): asserts value {
  if (!value) fail();
}
const hex = (value: unknown, maximum: number): string => {
  check(typeof value === 'string' && value.length <= 2 + maximum * 2 && /^0x(?:[0-9a-fA-F]{2})+$/.test(value));
  return value.toLowerCase();
};
/** Copy the SDK's own JSON fields before handing a detached copy to an external signer. */
export function copyGoalSigningPayload(value: SignerPayloadJSON): SignerPayloadJSON {
  check(value && Object.getPrototypeOf(value) === Object.prototype);
  const fields = Object.getOwnPropertyDescriptors(value);
  const required = [
    'address',
    'blockHash',
    'blockNumber',
    'era',
    'genesisHash',
    'method',
    'nonce',
    'specVersion',
    'tip',
    'transactionVersion',
    'signedExtensions',
    'version',
  ];
  const allowed = [...required, 'assetId', 'metadataHash', 'mode', 'withSignedTransaction'];
  check(required.every((key) => Object.hasOwn(fields, key)) && Reflect.ownKeys(fields).length <= allowed.length);
  const copy: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(fields)) {
    check(typeof key === 'string' && allowed.includes(key) && fields[key].enumerable && 'value' in fields[key]);
    const item = fields[key].value as unknown;
    if (key === 'signedExtensions') {
      check(Array.isArray(item) && Object.getPrototypeOf(item) === Array.prototype && item.length <= 16);
      const members = Object.getOwnPropertyDescriptors(item);
      check(Reflect.ownKeys(members).length === item.length + 1);
      copy[key] = Object.freeze(
        Array.from({ length: item.length }, (_, index) => {
          const member = members[index];
          check(member?.enumerable && 'value' in member);
          check(typeof member.value === 'string' && member.value.length <= 64);
          return member.value;
        })
      );
    } else {
      check(
        item === null ||
          typeof item === 'boolean' ||
          (typeof item === 'number' && Number.isSafeInteger(item)) ||
          (typeof item === 'string' && item.length <= 8194)
      );
      copy[key] = item;
    }
  }
  return Object.freeze(copy) as unknown as SignerPayloadJSON;
}

/** Parse bounded plain persisted data without invoking getters; this grants no authority. */
export function readGoalPersistedSigning(raw: unknown): GoalPersistedSigning {
  check(raw && typeof raw === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(raw)));
  const own = Object.getOwnPropertyDescriptors(raw);
  const keys = ['protocol', 'payload', 'metadataHexChunks', 'signedEnvelopeHex'];
  check(Reflect.ownKeys(own).length === keys.length && keys.every((k) => own[k]?.enumerable && 'value' in own[k]));
  check(own.protocol.value === 'goal-persisted-signing-v1');
  const chunks = own.metadataHexChunks.value;
  check(
    Array.isArray(chunks) &&
      Object.getPrototypeOf(chunks) === Array.prototype &&
      chunks.length > 0 &&
      chunks.length <= 67
  );
  const descriptors = Object.getOwnPropertyDescriptors(chunks);
  check(Reflect.ownKeys(descriptors).length === chunks.length + 1);
  const copied = Array.from({ length: chunks.length }, (_, i) => {
    const item = descriptors[i];
    check(
      item?.enumerable &&
        'value' in item &&
        typeof item.value === 'string' &&
        item.value.length > 0 &&
        item.value.length <= 60000
    );
    return item.value as string;
  });
  hex(copied.join(''), 2_000_000);
  return Object.freeze({
    protocol: 'goal-persisted-signing-v1',
    payload: copyGoalSigningPayload(own.payload.value),
    metadataHexChunks: Object.freeze(copied),
    signedEnvelopeHex: hex(own.signedEnvelopeHex.value, 4096),
  });
}
