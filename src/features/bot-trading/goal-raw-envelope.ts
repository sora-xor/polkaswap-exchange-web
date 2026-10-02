/** Original retained evidence encoding. Integrity helpers grant no chain, clock or qualification authority. */
import { sha256AsU8a } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

const MAX_BYTES = 32 * 1024 * 1024;
const SHA = /^[0-9a-f]{64}$/;
export interface GoalRawEnvelopeBinding {
  name: string;
  requestSha256: string;
  /** Digest of the original canonical value, distinct from the enclosing file-byte digest. */
  valueSha256: string;
}
function check(value: unknown, reason: string): asserts value {
  if (!value) throw Error(`goal-raw-envelope:${reason}`);
}
function snapshot(value: unknown): unknown {
  let nodes = 0,
    characters = 0;
  const visit = (v: unknown, depth: number): unknown => {
    check(++nodes <= 800000 && depth <= 24, 'complexity');
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v === 'number') {
      check(Number.isSafeInteger(v), 'number');
      return v;
    }
    if (typeof v === 'string') {
      characters += v.length;
      check(characters <= MAX_BYTES, 'size');
      return v;
    }
    check(v && typeof v === 'object', 'own-data');
    const descriptors = Object.getOwnPropertyDescriptors(v),
      keys = Reflect.ownKeys(descriptors);
    if (Array.isArray(v)) {
      check(Object.getPrototypeOf(v) === Array.prototype && v.length <= 30000 && keys.length === v.length + 1, 'array');
      return Object.freeze(
        Array.from({ length: v.length }, (_, index) => {
          const d = descriptors[index];
          check(d?.enumerable && 'value' in d, 'own-data');
          return visit(d.value, depth + 1);
        })
      );
    }
    check([Object.prototype, null].includes(Object.getPrototypeOf(v)) && keys.length <= 64, 'object');
    return Object.freeze(
      Object.fromEntries(
        keys.map((key) => {
          check(typeof key === 'string' && descriptors[key].enumerable && 'value' in descriptors[key], 'own-data');
          return [key, visit(descriptors[key as string].value, depth + 1)];
        })
      )
    );
  };
  return visit(value, 0);
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
const bytesOf = (value: unknown): Uint8Array => {
  const bytes = new TextEncoder().encode(canonical(value));
  check(bytes.length <= MAX_BYTES, 'size');
  return bytes;
};
/** Browser SHA-256 of bounded exact bytes; no JSON normalization or origin claim. */
export function goalRawBytesSha256(value: Uint8Array): string {
  check(value instanceof Uint8Array && value.byteLength <= MAX_BYTES, 'bytes');
  return u8aToHex(sha256AsU8a(new Uint8Array(value))).slice(2);
}
/** Match the original store's sorted-key value digest while rejecting executable or unbounded inputs. */
export function goalRawEvidenceDigest(value: unknown): string {
  return goalRawBytesSha256(bytesOf(snapshot(value)));
}
/**
 * Decode one exact canonical store wrapper plus its final newline. The separately pinned file hash belongs
 * to the bundle reader; this joins its bytes to the expected request, logical name and original value SHA.
 */
export function readGoalRawEnvelope(
  bytes: Uint8Array,
  rawBinding: GoalRawEnvelopeBinding
): Readonly<Record<string, unknown>> {
  const binding = snapshot(rawBinding) as Record<string, unknown>;
  check(
    binding &&
      Object.keys(binding).length === 3 &&
      ['name', 'requestSha256', 'valueSha256'].every((k) => Object.hasOwn(binding, k)),
    'binding'
  );
  check(
    typeof binding.name === 'string' &&
      /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(binding.name) &&
      typeof binding.requestSha256 === 'string' &&
      SHA.test(binding.requestSha256) &&
      typeof binding.valueSha256 === 'string' &&
      SHA.test(binding.valueSha256),
    'binding'
  );
  check(bytes instanceof Uint8Array && bytes.length > 0 && bytes.length <= MAX_BYTES, 'bytes');
  let text: string, parsed: unknown;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(new Uint8Array(bytes));
    parsed = JSON.parse(text);
  } catch {
    throw Error('goal-raw-envelope:json');
  }
  const envelope = snapshot(parsed) as Record<string, unknown>;
  check(
    envelope &&
      !Array.isArray(envelope) &&
      Object.keys(envelope).length === 5 &&
      ['kind', 'requestSha256', 'name', 'sha256', 'value'].every((k) => Object.hasOwn(envelope, k)),
    'wrapper'
  );
  check(
    canonical(envelope) + '\n' === text &&
      envelope.kind === 'goal-study-raw-evidence-v1' &&
      envelope.name === binding.name &&
      envelope.requestSha256 === binding.requestSha256 &&
      envelope.sha256 === binding.valueSha256,
    'wrapper'
  );
  check(envelope.value && typeof envelope.value === 'object' && !Array.isArray(envelope.value), 'value');
  check(goalRawBytesSha256(bytesOf(envelope.value)) === binding.valueSha256, 'value-hash');
  return envelope.value as Readonly<Record<string, unknown>>;
}
