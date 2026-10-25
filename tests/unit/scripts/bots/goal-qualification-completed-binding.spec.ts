// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  openGoalQualificationStudyStore,
  openGoalQualificationStudyStoreV2,
  type GoalStudyEvidenceReceipt,
} from '../../../../scripts/bots/goal-qualification-study-store';
import {
  assertGoalQualificationOwnData,
  GOAL_QUALIFICATION_POLICY_V2,
  GOAL_QUALIFICATION_PROTOCOL_V2,
  goalQualificationDigest as digest,
  type GoalQualificationEpisodeEvidence,
  type GoalQualificationEvaluationRequest,
  type GoalQualificationPlan,
} from '../../../../src/features/bot-trading/goal-qualification';
import { syntheticQualificationPlan } from '../../features/bot-trading/goal-qualification-fixtures';
import { acquisitionCanonical } from './goal-acquisition-replay-fixture';

const directories: string[] = [];
const stores: Awaited<ReturnType<typeof openGoalQualificationStudyStore>>[] = [];
const independentSha = (value: unknown) => createHash('sha256').update(acquisitionCanonical(value)).digest('hex');
interface CompletionRecord {
  kind: string;
  accessSha256: string;
  evidenceSha256: string;
  evidence: GoalQualificationEpisodeEvidence;
  rawEvidence: GoalStudyEvidenceReceipt[];
  rawManifestSha256: string;
}

async function setup(version: 1 | 2 = 1) {
  const directory = await mkdtemp(join(tmpdir(), 'goal-completed-binding-'));
  directories.push(directory);
  const plan = syntheticQualificationPlan();
  if (version === 2) {
    plan.protocol = GOAL_QUALIFICATION_PROTOCOL_V2;
    plan.policy = GOAL_QUALIFICATION_POLICY_V2;
  }
  const options = { directory, sourceSha256: plan.source.evaluatorSha256 };
  const factory = version === 2 ? openGoalQualificationStudyStoreV2 : openGoalQualificationStudyStore;
  const store = await factory(options);
  stores.push(store);
  await store.register(plan);
  const input: GoalQualificationEvaluationRequest = {
    planSha256: digest(plan),
    candidate: plan.candidates[0],
    candidateSha256: digest(plan.candidates[0]),
    phase: 'training',
    partitionIdentitySha256: plan.training.identitySha256,
    startAtMs: plan.training.startAtMs,
    endAtMs: plan.training.startAtMs + 86_400_000,
    episodeIndex: 0,
  };
  const study = join(directory, 'studies', digest(plan));
  return { plan, store, input, study, options, factory };
}

/** Tiny own-data journal contract only; these invented marks never establish economic qualification. */
function evidence(
  input: GoalQualificationEvaluationRequest,
  plan: GoalQualificationPlan,
  mark: unknown = { value: [1, '雪\ud800'] }
): GoalQualificationEpisodeEvidence {
  return {
    protocol:
      plan.protocol === GOAL_QUALIFICATION_PROTOCOL_V2
        ? 'finalized-xyk-execution-validation-v2'
        : 'finalized-xyk-execution-validation-v1',
    requestSha256: digest(input),
    dataSha256: 'a'.repeat(64),
    opening: {
      fundedAtMs: input.startAtMs,
      receivedAtMs: input.startAtMs,
      mark: mark as never,
      evidenceSha256: 'b'.repeat(64),
    },
    clock: { protocol: 'finalized-goal-live-clock-v1', events: [] } as never,
    ...(plan.protocol === GOAL_QUALIFICATION_PROTOCOL_V2 ? { deadlineCancellation: null } : {}),
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

async function completed(version: 1 | 2 = 1, mark?: unknown) {
  const context = await setup(version);
  const result = await context.store.evaluate(context.input, undefined, async (_request, sink) => {
    await sink.retainEvidence('raw', { fixture: true, value: '111' });
    return evidence(context.input, context.plan, mark);
  });
  const id = digest(context.input);
  const completePath = join(context.study, `complete-${id}.json`);
  const rawPath = join(context.study, `raw-${id}`, 'raw.json');
  const record = JSON.parse(await readFile(completePath, 'utf8')) as CompletionRecord;
  return { ...context, result, completePath, rawPath, record };
}

async function rewrite(context: Awaited<ReturnType<typeof completed>>, rehash = true) {
  if (rehash) context.record.evidenceSha256 = independentSha(context.record.evidence);
  await writeFile(context.completePath, `${acquisitionCanonical(context.record)}\n`);
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

describe('completed evidence retains full private admission and exact semantic bindings', () => {
  it.each([1, 2] as const)('rereads equal, freshly frozen v%s evidence without changing bytes or invoking producers', async (version) => {
    const caller = Object.assign(Object.create(null), {
      nested: [-0, '雪\ud800'],
      ...Object.fromEntries([['__proto__', { value: 'safe' }]]),
    });
    const context = await completed(version, caller);
    const completeBytes = await readFile(context.completePath);
    const rawBytes = await readFile(context.rawPath);
    const originalDigest = independentSha(context.result);
    caller.nested[1] = 'later';
    await context.store.dispose();
    const reopened = await context.factory(context.options);
    stores.push(reopened);
    await reopened.register(context.plan);
    const producer = vi.fn();
    const first = await reopened.evaluate(context.input, undefined, producer);
    const second = await reopened.evaluate(context.input, undefined, producer);
    expect(first).toEqual(context.result);
    expect(second).toEqual(context.result);
    expect(first).not.toBe(context.result);
    expect(second).not.toBe(first);
    expect(first.opening.mark).not.toBe(context.result.opening.mark);
    expect(second.opening.mark).not.toBe(first.opening.mark);
    expectFrozen(first);
    expectFrozen(second);
    expect(independentSha(first)).toBe(originalDigest);
    expect(digest(first)).toBe(context.record.evidenceSha256);
    expect(await readFile(context.completePath)).toEqual(completeBytes);
    expect(await readFile(context.rawPath)).toEqual(rawBytes);
    expect(Object.getPrototypeOf(caller)).toBeNull();
    expect(Object.isFrozen(caller)).toBe(false);
    expect(Object.is(caller.nested[0], -0)).toBe(true);
    expect(({} as { value?: string }).value).toBeUndefined();
    expect(producer).not.toHaveBeenCalled();
  });

  it.each([
    ['extra field', 1, 'invalid-fields'],
    ['missing field', 1, 'invalid-fields'],
    ['v1 cancellation field', 1, 'invalid-fields'],
    ['missing v2 cancellation', 2, 'invalid-fields'],
    ['wrong protocol', 1, 'evidence-binding'],
    ['wrong protocol version', 2, 'evidence-binding'],
    ['wrong request digest', 1, 'evidence-binding'],
    ['invalid data digest', 1, 'evidence-binding'],
    ['wrong opening window', 1, 'evidence-window'],
    ['wrong terminal window', 2, 'evidence-window'],
  ] as const)('rejects independently rehashed %s before returning completed evidence', async (kind, version, reason) => {
    const context = await completed(version);
    const trace = context.record.evidence;
    if (kind === 'extra field') Object.assign(trace, { alternate: true });
    if (kind === 'missing field') Reflect.deleteProperty(trace, 'clock');
    if (kind === 'v1 cancellation field') trace.deadlineCancellation = null;
    if (kind === 'missing v2 cancellation') Reflect.deleteProperty(trace, 'deadlineCancellation');
    if (kind === 'wrong protocol') trace.protocol = 'finalized-xyk-execution-validation-v2';
    if (kind === 'wrong protocol version') trace.protocol = 'finalized-xyk-execution-validation-v1';
    if (kind === 'wrong request digest') trace.requestSha256 = 'f'.repeat(64);
    if (kind === 'invalid data digest') trace.dataSha256 = 'not-a-sha';
    if (kind === 'wrong opening window') trace.opening.fundedAtMs++;
    if (kind === 'wrong terminal window') trace.terminal.accountingAtMs--;
    await rewrite(context);
    expect(context.record.evidenceSha256).toBe(digest(trace));
    const producer = vi.fn();
    await expect(context.store.evaluate(context.input, undefined, producer)).rejects.toThrow(reason);
    expect(producer).not.toHaveBeenCalled();
  });

  it('keeps completion hash, raw corruption, then semantic window failures in their original order', async () => {
    const context = await completed();
    const rawBytes = await readFile(context.rawPath);
    context.record.evidence.opening.fundedAtMs++;
    await rewrite(context, false);
    await writeFile(context.rawPath, rawBytes.toString('utf8').replace('111', '222'));
    const producer = vi.fn();
    await expect(context.store.evaluate(context.input, undefined, producer)).rejects.toThrow('completion-corrupt');
    await rewrite(context);
    await expect(context.store.evaluate(context.input, undefined, producer)).rejects.toThrow('raw-evidence-corrupt');
    await writeFile(context.rawPath, rawBytes);
    await expect(context.store.evaluate(context.input, undefined, producer)).rejects.toThrow('evidence-window');
    context.record.evidence.opening.fundedAtMs--;
    await rewrite(context);
    expect(await context.store.evaluate(context.input, undefined, producer)).toEqual(context.result);
    expect(producer).not.toHaveBeenCalled();
  });

  it.each(['access hash', 'raw manifest hash', 'raw receipt bytes', 'raw file count'] as const)(
    'retains actual %s verification before semantic failures',
    async (kind) => {
      const context = await completed();
      context.record.evidence.dataSha256 = 'invalid';
      if (kind === 'access hash') context.record.accessSha256 = '0'.repeat(64);
      if (kind === 'raw manifest hash') context.record.rawManifestSha256 = '0'.repeat(64);
      if (kind === 'raw receipt bytes') {
        context.record.rawEvidence[0].bytes++;
        context.record.rawManifestSha256 = independentSha(context.record.rawEvidence);
      }
      if (kind === 'raw file count') await writeFile(join(context.study, `raw-${digest(context.input)}`, 'extra.json'), '{}\n');
      await rewrite(context);
      const reason = {
        'access hash': 'completion-corrupt',
        'raw manifest hash': 'raw-manifest',
        'raw receipt bytes': 'raw-evidence-corrupt',
        'raw file count': 'raw-file-count',
      }[kind];
      const producer = vi.fn();
      await expect(context.store.evaluate(context.input, undefined, producer)).rejects.toThrow(reason);
      expect(producer).not.toHaveBeenCalled();
    }
  );

  it('retains full parent depth admission even when the evidence subtree alone is within bounds', async () => {
    const context = await completed();
    let nested: unknown = 0;
    for (let i = 0; i < 22; i++) nested = { next: nested };
    context.record.evidence.opening.mark = nested as never;
    expect(assertGoalQualificationOwnData(context.record.evidence)).toBeUndefined();
    await rewrite(context);
    const producer = vi.fn();
    await expect(context.store.evaluate(context.input, undefined, producer)).rejects.toThrow('bots.errors.research');
    expect(producer).not.toHaveBeenCalled();
  });

  it.each(['unsafe number', 'oversized string', 'oversized object'] as const)(
    'rejects full parent %s admission before a rehashed semantic impostor',
    async (kind) => {
      const context = await completed();
      context.record.evidence.dataSha256 = 'invalid';
      context.record.evidence.opening.mark = (
        kind === 'unsafe number'
          ? { value: Number.MAX_SAFE_INTEGER + 1 }
          : kind === 'oversized string'
            ? { value: 'x'.repeat(100001) }
            : Object.fromEntries(Array.from({ length: 65 }, (_, i) => [String(i), i]))
      ) as never;
      await rewrite(context);
      const producer = vi.fn();
      await expect(context.store.evaluate(context.input, undefined, producer)).rejects.toThrow('bots.errors.research');
      expect(producer).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['negative zero', 0, '"mark":{"value":0}', '"mark":{"value":-0}'],
    ['exponent', 1000, '"mark":{"value":1000}', '"mark":{"value":1e3}'],
    ['Unicode escape', '雪', '"mark":{"value":"雪"}', '"mark":{"value":"\\u96ea"}'],
    ['duplicate key', 0, '"mark":{"value":0}', '"mark":{"value":0,"value":0}'],
  ] as const)('keeps completed-file noncanonical %s rejection ahead of binding checks', async (_name, value, from, to) => {
    const context = await completed();
    context.record.evidence.opening.mark = { value } as never;
    context.record.evidence.dataSha256 = 'invalid';
    await rewrite(context);
    const text = await readFile(context.completePath, 'utf8');
    expect(text.split(from)).toHaveLength(2);
    await writeFile(context.completePath, text.replace(from, to));
    const producer = vi.fn();
    await expect(context.store.evaluate(context.input, undefined, producer)).rejects.toThrow('noncanonical-record');
    expect(producer).not.toHaveBeenCalled();
  });
});

describe('ordinary producer snapshots remain separate from private completed bindings', () => {
  it('still rejects nested accessors without reading them and durably poisons the attempt', async () => {
    const context = await setup();
    const getter = vi.fn(() => 1);
    const mark = Object.defineProperty({}, 'value', { enumerable: true, get: getter });
    await expect(
      context.store.evaluate(context.input, undefined, async () => evidence(context.input, context.plan, mark))
    ).rejects.toThrow('evaluation-failed-no-retry');
    expect(getter).not.toHaveBeenCalled();
    const producer = vi.fn();
    await expect(context.store.evaluate(context.input, undefined, producer)).rejects.toThrow('failed-evaluation-no-retry');
    expect((await readdir(context.study)).some((name) => name.startsWith('complete-'))).toBe(false);
    expect(producer).not.toHaveBeenCalled();
  });

  it('retains valid transparent proxy traversal and caller signed-zero/null-prototype normalization', async () => {
    const context = await setup();
    const caller = Object.assign(Object.create(null), { values: [-0, '雪\ud800'] });
    let ownKeys = 0;
    const trace = new Proxy(evidence(context.input, context.plan, caller), {
      ownKeys: (target) => {
        ownKeys++;
        return Reflect.ownKeys(target);
      },
    });
    const result = await context.store.evaluate(context.input, undefined, async () => trace);
    expect(ownKeys).toBe(2);
    const mark = result.opening.mark as unknown as { values: unknown[] };
    expect(Object.getPrototypeOf(mark)).toBe(Object.prototype);
    expect(Object.is(mark.values[0], 0)).toBe(true);
    expect(mark.values).not.toBe(caller.values);
    expect(Object.getPrototypeOf(caller)).toBeNull();
    expect(Object.is(caller.values[0], -0)).toBe(true);
    expect(Object.isFrozen(caller)).toBe(false);
    expectFrozen(result);
  });

  it('still revisits raw caller data during canonicalization and rejects revocation after its validated copy', async () => {
    const context = await setup();
    let ownKeys = 0;
    const revocable = Proxy.revocable(evidence(context.input, context.plan), {
      ownKeys: (target) => {
        ownKeys++;
        if (ownKeys === 2) revocable.revoke();
        return Reflect.ownKeys(target);
      },
    });
    await expect(
      context.store.evaluate(context.input, undefined, async () => revocable.proxy)
    ).rejects.toThrow('evaluation-failed-no-retry');
    expect(ownKeys).toBe(2);
    const producer = vi.fn();
    await expect(context.store.evaluate(context.input, undefined, producer)).rejects.toThrow('failed-evaluation-no-retry');
    expect(producer).not.toHaveBeenCalled();
  });
});
