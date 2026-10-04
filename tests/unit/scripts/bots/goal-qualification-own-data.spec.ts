// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  assertGoalQualificationOwnData,
  copyGoalQualificationOwnData,
  goalQualificationDigest,
} from '../../../../src/features/bot-trading/goal-qualification';

/** The store needs the exact digest input validator, not a computed hash or an authority handle. */
describe('qualification own-data validation without an unused hash', () => {
  it('accepts the same plain, null-prototype, Unicode, dense-array and signed-zero data without altering callers', () => {
    const nullPrototype = Object.assign(Object.create(null), { name: '雪', values: [null, true, -0] });
    const values = [null, false, -0, 7, '雪\ud800', [], { nested: [1, 'two'] }, nullPrototype];
    for (const value of values) {
      expect(assertGoalQualificationOwnData(value)).toBeUndefined();
      expect(goalQualificationDigest(value)).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(Object.getPrototypeOf(nullPrototype)).toBeNull();
    expect(Object.isFrozen(nullPrototype)).toBe(false);
    expect(Object.isFrozen(nullPrototype.values)).toBe(false);
    expect(Object.is(nullPrototype.values[2], -0)).toBe(true);
  });

  it('retains every invalid input rejection used by the digest rather than adding a trusted shape shortcut', () => {
    const sparse = Array(2);
    const extraArray = Object.assign([1], { extra: 2 });
    const nonEnumerable = Object.defineProperty({}, 'field', { value: 1 });
    const symbol = { [Symbol('field')]: 1 };
    const longString = 'x'.repeat(100001);
    const longArray: unknown[] = [];
    longArray.length = 30001;
    let deep: unknown = 0;
    for (let depth = 0; depth < 25; depth++) deep = { next: deep };
    const values = [
      undefined,
      1n,
      () => undefined,
      NaN,
      Infinity,
      0.5,
      Number.MAX_SAFE_INTEGER + 1,
      new Date(0),
      Object.create({ inherited: 1 }),
      sparse,
      extraArray,
      nonEnumerable,
      symbol,
      longString,
      longArray,
      deep,
      { value: undefined },
      Object.fromEntries(Array.from({ length: 65 }, (_, i) => [String(i), i])),
    ];
    for (const value of values) {
      expect(() => assertGoalQualificationOwnData(value)).toThrow('bots.errors.research');
      expect(() => goalQualificationDigest(value)).toThrow('bots.errors.research');
    }
  });

  it('rejects accessors without invoking them and revalidates externally frozen and late-mutated values', () => {
    const getter = vi.fn(() => 1);
    const value = Object.defineProperty({}, 'field', { enumerable: true, get: getter });
    expect(() => assertGoalQualificationOwnData(value)).toThrow('bots.errors.research');
    expect(() => goalQualificationDigest(value)).toThrow('bots.errors.research');
    expect(getter).not.toHaveBeenCalled();
    const external = Object.freeze({ nested: { amount: '1' } });
    expect(assertGoalQualificationOwnData(external)).toBeUndefined();
    external.nested.amount = 'x'.repeat(100001);
    expect(() => assertGoalQualificationOwnData(external)).toThrow('bots.errors.research');
    expect(() => goalQualificationDigest(external)).toThrow('bots.errors.research');
  });

  it('performs identical raw proxy reflection and never admits a revoked proxy as a cached proof', () => {
    const make = () => {
      const calls: string[] = [];
      const proxy = new Proxy(
        { field: [1, 2] },
        {
          ownKeys: (target) => {
            calls.push('keys');
            return Reflect.ownKeys(target);
          },
          getOwnPropertyDescriptor: (target, key) => {
            calls.push(`descriptor:${String(key)}`);
            return Reflect.getOwnPropertyDescriptor(target, key);
          },
          getPrototypeOf: (target) => {
            calls.push('prototype');
            return Reflect.getPrototypeOf(target);
          },
        }
      );
      return { proxy, calls };
    };
    const validation = make();
    const hashing = make();
    expect(assertGoalQualificationOwnData(validation.proxy)).toBeUndefined();
    expect(goalQualificationDigest(hashing.proxy)).toMatch(/^[0-9a-f]{64}$/);
    expect(validation.calls).toEqual(hashing.calls);
    const revoked = Proxy.revocable({ field: 1 }, {});
    expect(assertGoalQualificationOwnData(revoked.proxy)).toBeUndefined();
    revoked.revoke();
    expect(() => assertGoalQualificationOwnData(revoked.proxy)).toThrow();
    expect(() => goalQualificationDigest(revoked.proxy)).toThrow();
  });
});

/** These fixtures exercise cumulative bounds without exceeding an individual field or depth bound. */
describe('qualification cumulative own-data bounds', () => {
  it('rejects object and array cycles with the research error without mutating caller graphs', () => {
    const object: { next?: unknown } = {};
    object.next = object;
    const array: unknown[] = [];
    array.push(array);
    for (const value of [object, array]) {
      expect(() => assertGoalQualificationOwnData(value)).toThrow('bots.errors.research');
      expect(() => copyGoalQualificationOwnData(value)).toThrow('bots.errors.research');
      expect(() => goalQualificationDigest(value)).toThrow('bots.errors.research');
      expect(Object.isFrozen(value)).toBe(false);
    }
    expect(object.next).toBe(object);
    expect(array).toHaveLength(1);
    expect(array[0]).toBe(array);
  });

  it('accepts exactly 800000 visited nodes and rejects one more while every array stays within its cap', () => {
    // One root + 27 child arrays + (26 * 30000 + 19972) scalar occurrences = 800000 nodes.
    const input = Array.from({ length: 27 }, (_, index) => Array<number>(index < 26 ? 30000 : 19972).fill(0));
    const count = 1 + input.length + input.reduce((sum, row) => sum + row.length, 0);
    expect(count).toBe(800000);
    expect(input.every((row) => row.length <= 30000)).toBe(true);
    expect(assertGoalQualificationOwnData(input)).toBeUndefined();
    const detached = copyGoalQualificationOwnData(input);
    expect(detached).not.toBe(input);
    expect(Object.isFrozen(detached)).toBe(true);
    expect(detached).toHaveLength(27);
    for (let index = 0; index < input.length; index++) {
      expect(detached[index]).not.toBe(input[index]);
      expect(Object.isFrozen(detached[index])).toBe(true);
      expect(detached[index]).toHaveLength(input[index].length);
      expect(detached[index][0]).toBe(0);
      expect(detached[index][detached[index].length - 1]).toBe(0);
      expect(Object.isFrozen(input[index])).toBe(false);
    }
    expect(Object.isFrozen(input)).toBe(false);
    input[26].push(0);
    expect(1 + input.length + input.reduce((sum, row) => sum + row.length, 0)).toBe(800001);
    expect(input.every((row) => row.length <= 30000)).toBe(true);
    expect(() => assertGoalQualificationOwnData(input)).toThrow('bots.errors.research');
    expect(() => copyGoalQualificationOwnData(input)).toThrow('bots.errors.research');
    expect(detached[26]).toHaveLength(19972);
  });

  it('counts repeated strings cumulatively at exactly 24000000 characters and rejects one more', () => {
    // Each occurrence contributes even when the same immutable string value is reused.
    const text = 'x'.repeat(100000);
    const input = Array<string>(240).fill(text);
    expect(input.length).toBeLessThan(30000);
    expect(input.every((value) => value.length <= 100000)).toBe(true);
    expect(input.reduce((sum, value) => sum + value.length, 0)).toBe(24000000);
    expect(assertGoalQualificationOwnData(input)).toBeUndefined();
    const detached = copyGoalQualificationOwnData(input);
    expect(detached).not.toBe(input);
    expect(Object.isFrozen(detached)).toBe(true);
    expect(detached).toHaveLength(240);
    expect(detached.every((value) => value === text)).toBe(true);
    expect(Object.isFrozen(input)).toBe(false);
    input.push('x');
    expect(input.length).toBeLessThan(30000);
    expect(input.every((value) => value.length <= 100000)).toBe(true);
    expect(input.reduce((sum, value) => sum + value.length, 0)).toBe(24000001);
    expect(() => assertGoalQualificationOwnData(input)).toThrow('bots.errors.research');
    expect(() => copyGoalQualificationOwnData(input)).toThrow('bots.errors.research');
    expect(detached).toHaveLength(240);
  });
});
