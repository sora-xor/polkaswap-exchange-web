// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { u8aToHex } from '@polkadot/util';
import { cryptoWaitReady, sha256AsU8a } from '@polkadot/util-crypto';
import { isReady } from '@polkadot/wasm-crypto';
import {
  assertGoalQualificationOwnData,
  goalQualificationDigest,
} from '../../../../src/features/bot-trading/goal-qualification';

vi.unmock('@polkadot/util-crypto');

/** Independent canonical bytes bind the selected engine to real Node and initialized default SHA. */
function independentCanonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(independentCanonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const fields = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${independentCanonical((value as Record<string, unknown>)[key])}`);
    return `{${fields.join(',')}}`;
  }
  return JSON.stringify(value);
}

function expectRealShaEquivalence(value: unknown, expectedCanonical?: string): string {
  const text = independentCanonical(value);
  if (expectedCanonical !== undefined) expect(text).toBe(expectedCanonical);
  const bytes = new TextEncoder().encode(text);
  const independent = createHash('sha256').update(bytes).digest('hex');
  expect(u8aToHex(sha256AsU8a(bytes)).slice(2)).toBe(independent);
  expect(u8aToHex(sha256AsU8a(bytes, true)).slice(2)).toBe(independent);
  expect(goalQualificationDigest(value)).toBe(independent);
  return independent;
}

describe('qualification digest with the installed JavaScript SHA256 engine', () => {
  beforeAll(async () => {
    expect(await cryptoWaitReady()).toBe(true);
    expect(isReady()).toBe(true);
  });

  it('matches known canonical bytes, initialized default SHA and Node for nested, null-prototype and Unicode data', () => {
    expectRealShaEquivalence(null, 'null');
    expectRealShaEquivalence(-0, '0');
    expectRealShaEquivalence({ b: 2, a: 1 }, '{"a":1,"b":2}');
    const nullPrototype = Object.assign(Object.create(null), { z: [-0, { b: true, a: false }], a: '雪' });
    expectRealShaEquivalence(nullPrototype, '{"a":"雪","z":[0,{"a":false,"b":true}]}');
    expectRealShaEquivalence(
      ['日本語', 'e\u0301', '🧪', '\ud800', '\udfff'],
      '["日本語","é","🧪","\\ud800","\\udfff"]'
    );
    expectRealShaEquivalence(
      { '\ud800': '\udfff', 雪: '🧪', a: 'ascii', '\u0000': 'null character' },
      '{"\\u0000":"null character","a":"ascii","雪":"🧪","\\ud800":"\\udfff"}'
    );
    expect(Object.getPrototypeOf(nullPrototype)).toBeNull();
    expect(Object.isFrozen(nullPrototype)).toBe(false);
    expect(Object.isFrozen(nullPrototype.z)).toBe(false);
    expect(Object.is(nullPrototype.z[0], -0)).toBe(true);
  });

  it('matches real default WASM, JavaScript and Node SHA over bounded larger canonical UTF-8 bytes', () => {
    const payload = 'KUSD/XOR|日本語|e\u0301|🧪|\ud800|\udfff|\u0000\n'.repeat(512);
    const value = { version: 1, payload };
    const text = '{"payload":' + JSON.stringify(payload) + ',"version":1}';
    const bytes = new TextEncoder().encode(text);
    expect(payload.length).toBeLessThan(100000);
    expect(bytes.length).toBe(25626);
    expect(bytes.length).toBeGreaterThan(16 * 1024);
    expect(bytes.length).toBeLessThan(64 * 1024);
    expectRealShaEquivalence(value, text);
    expect(Object.isFrozen(value)).toBe(false);
  });

  it('retains the exact depth boundary and rejects invalid own data before selecting a SHA engine', () => {
    let accepted: unknown = 1;
    for (let depth = 0; depth < 24; depth++) accepted = { next: accepted };
    expectRealShaEquivalence(accepted);
    const rejectedDepth = { next: accepted };
    const nonEnumerable = Object.defineProperty({}, 'hidden', { value: 1 });
    const invalid = [
      rejectedDepth,
      undefined,
      1n,
      () => 1,
      NaN,
      Infinity,
      0.5,
      Number.MAX_SAFE_INTEGER + 1,
      new Date(0),
      Object.create({ inherited: 1 }),
      Array(2),
      Object.assign([1], { extra: 2 }),
      nonEnumerable,
      { [Symbol('hidden')]: 1 },
      'x'.repeat(100001),
      Object.fromEntries(Array.from({ length: 65 }, (_, index) => [String(index), index])),
    ];
    for (const value of invalid) {
      expect(() => goalQualificationDigest(value)).toThrow('bots.errors.research');
      expect(() => assertGoalQualificationOwnData(value)).toThrow('bots.errors.research');
    }
  });

  it('rehashes mutable descendants and rejects a subsequently installed getter without invoking it', () => {
    const nested = { text: 'initial', amount: 1 };
    const external = Object.freeze({ nested });
    const before = expectRealShaEquivalence(external);
    nested.text = 'changed 雪';
    const after = expectRealShaEquivalence(external);
    expect(after).not.toBe(before);
    expect(Object.isFrozen(nested)).toBe(false);
    const getter = vi.fn(() => 1);
    Object.defineProperty(nested, 'amount', { enumerable: true, get: getter });
    expect(() => goalQualificationDigest(external)).toThrow('bots.errors.research');
    expect(() => assertGoalQualificationOwnData(external)).toThrow('bots.errors.research');
    expect(getter).not.toHaveBeenCalled();
  });

  it('revalidates live proxy mutations and rejects revoked proxies without a cached acceptance', () => {
    const target: { field: unknown } = { field: [1, '雪'] };
    const proxy = new Proxy(target, {});
    const before = expectRealShaEquivalence(proxy);
    target.field = ['changed', -0];
    expect(expectRealShaEquivalence(proxy)).not.toBe(before);
    target.field = undefined;
    expect(() => goalQualificationDigest(proxy)).toThrow('bots.errors.research');
    expect(() => assertGoalQualificationOwnData(proxy)).toThrow('bots.errors.research');
    const revoked = Proxy.revocable({ field: [1, '雪'] }, {});
    expectRealShaEquivalence(revoked.proxy);
    revoked.revoke();
    expect(() => goalQualificationDigest(revoked.proxy)).toThrow();
    expect(() => assertGoalQualificationOwnData(revoked.proxy)).toThrow();
  });
});
