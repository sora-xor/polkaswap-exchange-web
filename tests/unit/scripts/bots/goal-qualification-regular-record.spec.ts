// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openGoalQualificationStudyStore } from '../../../../scripts/bots/goal-qualification-study-store';
import {
  assertGoalQualificationOwnData,
  copyGoalQualificationOwnData,
  goalQualificationDigest as digest,
  type GoalQualificationEpisodeEvidence,
  type GoalQualificationEvaluationRequest,
} from '../../../../src/features/bot-trading/goal-qualification';
import { syntheticQualificationPlan } from '../../features/bot-trading/goal-qualification-fixtures';
import { acquisitionCanonical } from './goal-acquisition-replay-fixture';

const SMALL_BYTES = 1024 * 1024;
const directories: string[] = [];
const stores: Awaited<ReturnType<typeof openGoalQualificationStudyStore>>[] = [];

async function setup() {
  const directory = await mkdtemp(join(tmpdir(), 'goal-regular-record-'));
  directories.push(directory);
  const plan = syntheticQualificationPlan();
  const store = await openGoalQualificationStudyStore({ directory, sourceSha256: plan.source.evaluatorSha256 });
  stores.push(store);
  await store.register(plan);
  const study = join(directory, 'studies', digest(plan));
  return { plan, store, study, registration: join(study, 'registration.json') };
}

function request(plan: ReturnType<typeof syntheticQualificationPlan>): GoalQualificationEvaluationRequest {
  return {
    planSha256: digest(plan),
    candidate: plan.candidates[0],
    candidateSha256: digest(plan.candidates[0]),
    phase: 'training',
    partitionIdentitySha256: plan.training.identitySha256,
    startAtMs: plan.training.startAtMs,
    endAtMs: plan.training.startAtMs + 86_400_000,
    episodeIndex: 0,
  };
}

/** Tiny journal evidence exercises persistence only; it does not claim economic qualification. */
function evidence(input: GoalQualificationEvaluationRequest, mark: unknown = {}): GoalQualificationEpisodeEvidence {
  return {
    protocol: 'finalized-xyk-execution-validation-v1',
    requestSha256: digest(input),
    dataSha256: 'a'.repeat(64),
    opening: {
      fundedAtMs: input.startAtMs,
      receivedAtMs: input.startAtMs,
      mark: mark as never,
      evidenceSha256: 'b'.repeat(64),
    },
    clock: { protocol: 'finalized-goal-live-clock-v1', events: [] } as never,
    terminal: {
      accountingAtMs: input.endAtMs,
      mark: {} as never,
      successor: {} as never,
      evidenceSha256: 'c'.repeat(64),
    },
    signals: [],
    events: [],
  };
}

function expectFrozen(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectFrozen(child);
}

afterEach(async () => {
  for (const store of stores.splice(0)) await store.dispose();
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('fresh checked qualification copies', () => {
  it('returns detached frozen descendants without normalizing caller data or transferring authority', () => {
    const nullPrototype = Object.assign(Object.create(null), { nested: [1, -0, '雪\ud800'] });
    const input = { child: nullPrototype };
    const first = copyGoalQualificationOwnData(input);
    const second = copyGoalQualificationOwnData(input);
    expect(first).toEqual(input);
    expect(first).not.toBe(input);
    expect(first.child).not.toBe(input.child);
    expect(first.child.nested).not.toBe(input.child.nested);
    expect(second.child).not.toBe(first.child);
    expect(second.child.nested).not.toBe(first.child.nested);
    expect(Object.getPrototypeOf(first.child)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(input.child)).toBeNull();
    expect(Object.is(first.child.nested[1], -0)).toBe(true);
    expectFrozen(first);
    expectFrozen(second);
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(input.child)).toBe(false);
    input.child.nested[0] = 2;
    expect(first.child.nested[0]).toBe(1);
    expect(copyGoalQualificationOwnData(input).child.nested[0]).toBe(2);
    input.child.nested[2] = 'x'.repeat(100001);
    expect(() => copyGoalQualificationOwnData(input)).toThrow('bots.errors.research');
  });

  it('runs the original raw descriptor checks on every call, including external freeze and revocation', () => {
    const getter = vi.fn(() => 1);
    const accessor = Object.defineProperty({}, 'value', { enumerable: true, get: getter });
    expect(() => copyGoalQualificationOwnData(accessor)).toThrow('bots.errors.research');
    expect(getter).not.toHaveBeenCalled();
    const inputs = [
      Object.assign([1], { extra: 2 }),
      Array(2),
      Object.defineProperty({}, 'value', { value: 1 }),
      { [Symbol('value')]: 1 },
      Object.create({ value: 1 }),
      new Date(0),
      undefined,
      NaN,
      Infinity,
      0.5,
      Number.MAX_SAFE_INTEGER + 1,
    ];
    for (const input of inputs) {
      expect(() => copyGoalQualificationOwnData(input)).toThrow('bots.errors.research');
      expect(() => assertGoalQualificationOwnData(input)).toThrow('bots.errors.research');
    }
    const external = Object.freeze({ child: { value: 'valid' } });
    expect(copyGoalQualificationOwnData(external)).toEqual(external);
    external.child.value = 'x'.repeat(100001);
    expect(() => copyGoalQualificationOwnData(external)).toThrow('bots.errors.research');
    const revoked = Proxy.revocable({ child: [1] }, {});
    expect(copyGoalQualificationOwnData(revoked.proxy)).toEqual({ child: [1] });
    revoked.revoke();
    expect(() => copyGoalQualificationOwnData(revoked.proxy)).toThrow();
  });
});

describe('regular records through real public journal operations', () => {
  it('rereads canonical nested evidence into fresh frozen identities with reserved and Unicode keys', async () => {
    const context = await setup();
    const input = request(context.plan);
    const nullPrototype = Object.assign(Object.create(null), { values: [null, true, -0] });
    const mark = Object.fromEntries([
      ['2', [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]],
      ['10', ['😀', '雪\ud800']],
      ['__proto__', { polluted: true }],
      ['constructor', { value: 1 }],
      ['雪\ud800', 'value\udfff'],
      ['nested', nullPrototype],
    ]);
    const first = await context.store.evaluate(input, undefined, async () => evidence(input, mark));
    nullPrototype.values[1] = false;
    const producer = vi.fn();
    const second = await context.store.evaluate(input, undefined, producer);
    const third = await context.store.evaluate(input, undefined, producer);
    expect(second).toEqual(first);
    expect(third).toEqual(first);
    expect(second).not.toBe(first);
    expect(third).not.toBe(second);
    expect(second.opening).not.toBe(first.opening);
    expect(second.opening.mark).not.toBe(first.opening.mark);
    expect(third.opening.mark).not.toBe(second.opening.mark);
    expectFrozen(second);
    expectFrozen(third);
    const restoredMark = second.opening.mark as unknown as Record<string, unknown>;
    const nested = restoredMark.nested as { values: unknown[] };
    expect(Object.getPrototypeOf(restoredMark)).toBe(Object.prototype);
    expect(Object.hasOwn(restoredMark, '__proto__')).toBe(true);
    expect(Object.hasOwn(restoredMark, 'constructor')).toBe(true);
    expect(Object.is(nested.values[2], 0)).toBe(true);
    expect(nested.values[1]).toBe(true);
    expect(Object.getPrototypeOf(nullPrototype)).toBeNull();
    expect(Object.is(nullPrototype.values[2], -0)).toBe(true);
    expect(Object.isFrozen(nullPrototype)).toBe(false);
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
    expect(producer).not.toHaveBeenCalled();
  });

  it.each([
    ['negative zero', '-0\n'],
    ['exponent', '1e3\n'],
    ['signed exponent', '1e+3\n'],
    ['decimal integer', '1.0\n'],
    ['rounded safe integer', '9007199254740990.1\n'],
    ['escaped Unicode', '{"value":"\\u96ea"}\n'],
    ['escaped slash', '{"value":"\\/"}\n'],
    ['duplicate field', '{"value":1,"value":2}\n'],
    ['duplicate reserved field', '{"__proto__":1,"__proto__":2}\n'],
    ['unsorted fields', '{"z":1,"a":2}\n'],
    ['numeric field order', '{"2":2,"10":10}\n'],
    ['leading whitespace', ' {}\n'],
    ['trailing whitespace', '{} \n'],
    ['extra newline', '{}\n\n'],
  ])('rejects noncanonical %s before later registration checks', async (_name, text) => {
    const context = await setup();
    await writeFile(context.registration, text);
    await expect(context.store.register(context.plan)).rejects.toThrow('noncanonical-record');
  });

  it('preserves fatal UTF-8, JSON, newline and file-size rejection before any format comparison', async () => {
    const context = await setup();
    await writeFile(context.registration, Buffer.from([0xc3, 0x28, 0x0a]));
    await expect(context.store.register(context.plan)).rejects.toBeInstanceOf(TypeError);
    await writeFile(context.registration, '{"value":}\n');
    await expect(context.store.register(context.plan)).rejects.toBeInstanceOf(SyntaxError);
    await writeFile(context.registration, '{}');
    await expect(context.store.register(context.plan)).rejects.toThrow('incomplete-record');
    await writeFile(context.registration, '');
    await expect(context.store.register(context.plan)).rejects.toThrow('invalid-record-size');
  });

  it.each([
    ['unsafe rounded integer', '9007199254740993\n'],
    ['noninteger', '0.5\n'],
    ['infinity from exponent', '1e309\n'],
    ['long string', `${JSON.stringify({ value: 'x'.repeat(100001) })}\n`],
    ['too many fields', `${JSON.stringify(Object.fromEntries(Array.from({ length: 65 }, (_, i) => [String(i), i])))}\n`],
    ['too many array elements', `${JSON.stringify(Array(30001).fill(0))}\n`],
    ['depth beyond 24', `${'{"next":'.repeat(25)}0${'}'.repeat(25)}\n`],
  ])('retains full qualification rejection for %s before format/schema checks', async (_name, text) => {
    const context = await setup();
    await writeFile(context.registration, text);
    await expect(context.store.register(context.plan)).rejects.toThrow('bots.errors.research');
  });

  it('accepts exactly the UTF-8 canonical cap plus newline and rejects one more byte at stat', async () => {
    const context = await setup();
    const values = Array.from({ length: 12 }, () => '雪'.repeat(27000));
    values.push('');
    values[12] = 'x'.repeat(SMALL_BYTES - Buffer.byteLength(JSON.stringify(values)));
    const text = JSON.stringify(values);
    expect(text.length).toBeLessThan(SMALL_BYTES);
    expect(Buffer.byteLength(text)).toBe(SMALL_BYTES);
    await writeFile(context.registration, `${text}\n`);
    // The reader accepted the exact cap; this intentionally is not a valid registration schema.
    await expect(context.store.register(context.plan)).rejects.toThrow('unregistered-study');
    values[12] += 'x';
    await writeFile(context.registration, `${JSON.stringify(values)}\n`);
    await expect(context.store.register(context.plan)).rejects.toThrow('invalid-record-size');
  });

  it('checks expanded canonical bytes before rejecting a shorter noncanonical numeric spelling', async () => {
    const context = await setup();
    const row = `[${Array(21000).fill('9e15').join(',')}]`;
    const text = `[${row},${row},${row}]\n`;
    const parsed = JSON.parse(text);
    expect(Buffer.byteLength(text)).toBeLessThan(SMALL_BYTES);
    expect(Number.isSafeInteger(parsed[0][0])).toBe(true);
    expect(Buffer.byteLength(JSON.stringify(parsed))).toBeGreaterThan(SMALL_BYTES);
    await writeFile(context.registration, text);
    await expect(context.store.register(context.plan)).rejects.toThrow('record-too-large');
  });

  it('still opens records without following a symlink', async () => {
    const context = await setup();
    const original = await readFile(context.registration);
    const target = join(context.study, 'retained-registration.json');
    await writeFile(target, original);
    await rm(context.registration);
    await symlink(target, context.registration);
    await expect(context.store.register(context.plan)).rejects.toMatchObject({ code: 'ELOOP' });
  });

  it('keeps large raw metadata and every fresh raw byte/hash verification outside the regular seam', async () => {
    const context = await setup();
    const input = request(context.plan);
    const metadata = `0x${'ab'.repeat(100001)}`;
    const raw = { a: [1, '2'], z: metadata };
    const serialized = acquisitionCanonical(raw);
    const first = await context.store.evaluate(input, undefined, async (_request, sink) => {
      expect(await sink.retainEvidence('metadata', raw)).toEqual({
        name: 'metadata',
        sha256: createHash('sha256').update(serialized).digest('hex'),
        bytes: Buffer.byteLength(serialized),
      });
      return evidence(input);
    });
    const path = join(context.study, `raw-${digest(input)}`, 'metadata.json');
    const before = await readFile(path);
    const producer = vi.fn();
    expect(await context.store.evaluate(input, undefined, producer)).toEqual(first);
    expect(await readFile(path)).toEqual(before);
    const wrapper = JSON.parse(before.toString('utf8'));
    wrapper.value.z = `0x${'ac'.repeat(100001)}`;
    await writeFile(path, `${acquisitionCanonical(wrapper)}\n`);
    await expect(context.store.evaluate(input, undefined, producer)).rejects.toThrow('raw-evidence-corrupt');
    expect(producer).not.toHaveBeenCalled();
  });

  it('retains ordinary untrusted snapshot rejection before awaits and never invokes a getter', async () => {
    const context = await setup();
    const getter = vi.fn(() => 'a'.repeat(64));
    const options = Object.defineProperty({ directory: context.study }, 'sourceSha256', {
      enumerable: true,
      get: getter,
    });
    await expect(openGoalQualificationStudyStore(options as never)).rejects.toThrow('bots.errors.research');
    expect(getter).not.toHaveBeenCalled();
    const input = request(context.plan);
    const pending = context.store.evaluate(input, undefined, async (checked) => evidence(checked));
    input.candidate.maxTradeKusdCodec = '1';
    const result = await pending;
    expect(result.requestSha256).not.toBe(digest(input));
    expect((await readFile(join(context.study, `access-${result.requestSha256}.json`), 'utf8'))).toContain(
      '2000000000000000000'
    );
  });
});
