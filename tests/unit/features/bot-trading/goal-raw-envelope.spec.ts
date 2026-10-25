// @vitest-environment node
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  goalRawEvidenceDigest,
  goalRawBytesSha256,
  readGoalRawEnvelope,
} from '@/features/bot-trading/goal-raw-envelope';
vi.unmock('@polkadot/util-crypto');
const canonical = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(canonical).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
          .join(',')}}`
      : JSON.stringify(v);
const encode = (value: unknown) => new TextEncoder().encode(canonical(value) + '\n');
function fixture() {
  const value = { nested: { priceCodec: '7000000000000000001', values: [true, null, 42] } };
  const binding = { name: 'history-1.json', requestSha256: 'a'.repeat(64), valueSha256: goalRawEvidenceDigest(value) };
  const envelope = {
    kind: 'goal-study-raw-evidence-v1',
    requestSha256: binding.requestSha256,
    name: binding.name,
    sha256: binding.valueSha256,
    value,
  };
  return { value, binding, envelope, bytes: encode(envelope) };
}
describe('browser original raw envelope joins', () => {
  it('matches independent SHA256 for exact bytes and canonical value while returning deeply frozen data', () => {
    const f = fixture();
    expect(goalRawBytesSha256(f.bytes)).toBe(createHash('sha256').update(f.bytes).digest('hex'));
    expect(f.binding.valueSha256).toBe(createHash('sha256').update(canonical(f.value)).digest('hex'));
    const raw = readGoalRawEnvelope(f.bytes, f.binding);
    expect(raw).toEqual(f.value);
    expect(Object.isFrozen(raw.nested)).toBe(true);
    expect(Object.isFrozen((raw.nested as { values: unknown[] }).values)).toBe(true);
    expect(f.binding.valueSha256).not.toBe(goalRawBytesSha256(f.bytes));
  });
  it.each(['kind', 'name', 'requestSha256', 'sha256'])('rejects changed wrapper %s even with valid JSON', (key) => {
    const f = fixture();
    (f.envelope as Record<string, unknown>)[key] = 'wrong';
    expect(() => readGoalRawEnvelope(encode(f.envelope), f.binding)).toThrow();
  });
  it('rejects changed original value and noncanonical/trailing/BOM wrapper encodings', () => {
    const f = fixture();
    f.envelope.value.nested.priceCodec = '1';
    expect(() => readGoalRawEnvelope(encode(f.envelope), f.binding)).toThrow('value-hash');
    const g = fixture();
    for (const text of [
      JSON.stringify(g.envelope) + '\n',
      canonical(g.envelope),
      canonical(g.envelope) + '\n\n',
      '\uFEFF' + canonical(g.envelope) + '\n',
    ])
      expect(() => readGoalRawEnvelope(new TextEncoder().encode(text), g.binding)).toThrow();
    expect(() => readGoalRawEnvelope(new Uint8Array([0xff]), g.binding)).toThrow('json');
  });
  it('accepts large bounded raw schema strings without the small qualification JSON limit', () => {
    const value = { metadata: '0x' + 'a'.repeat(1000000) };
    expect(goalRawEvidenceDigest(value)).toBe(createHash('sha256').update(canonical(value)).digest('hex'));
  });
  it('rejects accessors without invoking them, unsafe values, custom prototypes and oversized inputs', () => {
    const getter = vi.fn();
    expect(() =>
      goalRawEvidenceDigest(Object.defineProperty({}, 'value', { enumerable: true, get: getter }))
    ).toThrow();
    expect(getter).not.toHaveBeenCalled();
    for (const value of [
      undefined,
      NaN,
      Infinity,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
      { x: undefined },
      new Date(),
      new Array(2),
      new Array(30001).fill(0),
      { [Symbol('x')]: 0 },
    ])
      expect(() => goalRawEvidenceDigest(value)).toThrow();
    expect(() => goalRawBytesSha256(new Uint8Array(32 * 1024 * 1024 + 1))).toThrow('bytes');
    expect(() => goalRawEvidenceDigest('a'.repeat(32 * 1024 * 1024))).toThrow('size');
  });
  it('enforces depth, object and total-node bounds', () => {
    let deep: unknown = 0;
    for (let i = 0; i < 26; i++) deep = [deep];
    expect(() => goalRawEvidenceDigest(deep)).toThrow('complexity');
    expect(() =>
      goalRawEvidenceDigest(Object.fromEntries(Array.from({ length: 65 }, (_, i) => [String(i), i])))
    ).toThrow('object');
    const many = Array.from({ length: 28 }, () => new Array(30000).fill(null));
    expect(() => goalRawEvidenceDigest(many)).toThrow('complexity');
  });
});
