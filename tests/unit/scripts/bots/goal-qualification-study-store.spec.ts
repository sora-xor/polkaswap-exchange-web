import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  openGoalQualificationStudyStore,
  openGoalQualificationStudyStoreV2,
  openGoalQualificationStudyStoreV3,
  openGoalQualificationStudyReplayV3,
  type GoalStudyEvidenceSink,
} from '../../../../scripts/bots/goal-qualification-study-store';
import {
  goalQualificationDigest as digest,
  GOAL_QUALIFICATION_PROTOCOL_V2,
  GOAL_QUALIFICATION_POLICY_V2,
  GOAL_QUALIFICATION_PROTOCOL_V3,
  GOAL_QUALIFICATION_POLICY_V3,
  GOAL_QUALIFICATION_POLICY_CATALOG_V3,
  GOAL_EXECUTION_EVIDENCE_V3,
  GOAL_QUALIFICATION_PROTOCOL,
  GOAL_QUALIFICATION_POLICY,
  createGoalQualificationBoundary,
  type GoalQualificationEvaluationRequest,
  type GoalQualificationEpisodeEvidence,
  type GoalQualificationPlan,
  type GoalQualificationEvaluator,
} from '@/features/bot-trading/goal-qualification';
import {
  syntheticQualificationEpisode,
  syntheticQualificationPlan,
} from '../../features/bot-trading/goal-qualification-fixtures';
import { acquisitionCanonical } from './goal-acquisition-replay-fixture';
import {
  GOAL_TARGET_MODEL_PROTOCOL,
  GOAL_TARGET_COST_PROTOCOL,
  GOAL_TARGET_MODEL_PROFILES,
  GOAL_TARGET_COMPRESSED_SHA256,
  readGoalTargetExecutionModel,
  GOAL_CATALOG_TARGET_MODEL_PROTOCOL,
  GOAL_CATALOG_TARGET_SOURCE_PROFILES,
  GOAL_TARGET_RUNTIME_CATALOG_SHA256,
  goalTargetSourceRuntimeProfiles,
  isGoalCatalogTargetExecutionModel,
} from '@/features/bot-trading/goal-target-model';
const DAY = 86400000;
const directories: string[] = [];
const stores: Awaited<ReturnType<typeof openGoalQualificationStudyStore>>[] = [];
async function setup(plan = syntheticQualificationPlan()) {
  const directory = await mkdtemp(join(tmpdir(), 'goal-study-store-'));
  directories.push(directory);
  const options = { directory, sourceSha256: plan.source.evaluatorSha256 };
  const store = await openGoalQualificationStudyStore(options);
  stores.push(store);
  return { directory, options, store, plan, study: join(directory, 'studies', digest(plan)) };
}
function request(
  plan: GoalQualificationPlan,
  phase: 'training' | 'validation' = 'training',
  episodeIndex = 0,
  candidateIndex = 0
): GoalQualificationEvaluationRequest {
  const candidate = plan.candidates[candidateIndex];
  return {
    planSha256: digest(plan),
    candidate,
    candidateSha256: digest(candidate),
    phase,
    partitionIdentitySha256: plan[phase].identitySha256,
    startAtMs: plan[phase].startAtMs + episodeIndex * DAY,
    endAtMs: plan[phase].startAtMs + (episodeIndex + 1) * DAY,
    episodeIndex,
  };
}
// The journal deliberately does not claim full causal/economic validation of this tiny invented trace.
function evidence(input: GoalQualificationEvaluationRequest): GoalQualificationEpisodeEvidence {
  return {
    protocol: 'finalized-xyk-execution-validation-v1',
    requestSha256: digest(input),
    dataSha256: 'a'.repeat(64),
    opening: {
      fundedAtMs: input.startAtMs,
      receivedAtMs: input.startAtMs,
      mark: {} as never,
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
async function train(context: Awaited<ReturnType<typeof setup>>) {
  const registration = await context.store.register(context.plan);
  for (let candidate = 0; candidate < context.plan.candidates.length; candidate++)
    for (let episode = 0; episode < 4; episode++) {
      const input = request(context.plan, 'training', episode, candidate);
      await context.store.evaluate(input, undefined, async () => evidence(input));
    }
  const input = {
    registrationSha256: registration.registrationSha256,
    candidateSha256: digest(context.plan.candidates[0]),
    trainingSha256: 'd'.repeat(64),
    validationIdentitySha256: context.plan.validation.identitySha256,
  };
  const selection = await context.store.sealSelection(input);
  return { registration, input, selection };
}
afterEach(async () => {
  for (const store of stores.splice(0)) await store.dispose().catch(() => undefined);
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('durable qualification study access', () => {
  it('requires registration and publishes an access marker before invoking any producer', async () => {
    const context = await setup(),
      input = request(context.plan),
      producer = vi.fn(async () => evidence(input));
    await expect(context.store.evaluate(input, undefined, producer)).rejects.toThrow('unregistered');
    expect(producer).not.toHaveBeenCalled();
    const registration = await context.store.register(context.plan);
    const result = await context.store.evaluate(input, undefined, async () => {
      const access = JSON.parse(await readFile(join(context.study, `access-${digest(input)}.json`), 'utf8'));
      expect(access.registrationSha256).toBe(registration.registrationSha256);
      expect(access.request).toEqual(input);
      expect((await readdir(context.study)).some((file) => file.startsWith('complete-'))).toBe(false);
      return evidence(input);
    });
    expect(result).toEqual(evidence(input));
    expect(Object.isFrozen(result.opening)).toBe(true);
  });
  it('enforces one owner, leaves an existing lock intact and allows explicit clean reopen', async () => {
    const context = await setup();
    const before = await readFile(join(context.directory, 'owner.json'), 'utf8');
    await expect(openGoalQualificationStudyStore(context.options)).rejects.toMatchObject({ code: 'EEXIST' });
    expect(await readFile(join(context.directory, 'owner.json'), 'utf8')).toBe(before);
    await context.store.dispose();
    const reopened = await openGoalQualificationStudyStore(context.options);
    stores.push(reopened);
    expect((await reopened.register(context.plan)).planSha256).toBe(digest(context.plan));
  });
  it('does not auto-steal a stale-looking owner lock', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'goal-study-lock-'));
    directories.push(directory);
    await writeFile(join(directory, 'owner.json'), '{"pid":999999999}\n');
    await expect(openGoalQualificationStudyStore({ directory, sourceSha256: 'a'.repeat(64) })).rejects.toMatchObject({
      code: 'EEXIST',
    });
  });
  it('rejects changed plans and overlapping validation under new names, hashes and source aliases', async () => {
    const context = await setup();
    await context.store.register(context.plan);
    const changed = structuredClone(context.plan);
    changed.candidates[0].strategy.fastWindow = 1;
    await expect(context.store.register(changed)).rejects.toThrow();
    const alias = structuredClone(context.plan);
    alias.studyId = 'alternate-study';
    alias.source.sourceId = 'alternate-source';
    alias.validation.identitySha256 = 'e'.repeat(64);
    await expect(context.store.register(alias)).rejects.toThrow('overlapping-validation');
    const separate = structuredClone(alias);
    separate.studyId = 'nonoverlapping';
    separate.training.startAtMs += 30 * DAY;
    separate.training.endAtMs += 30 * DAY;
    separate.validation.startAtMs += 30 * DAY;
    separate.validation.endAtMs += 30 * DAY;
    expect((await context.store.register(separate)).planSha256).toBe(digest(separate));
  });
  it.each(['candidate', 'partition', 'time', 'episode', 'extra'] as const)(
    'rejects a changed %s request without opening the producer',
    async (field) => {
      const context = await setup();
      await context.store.register(context.plan);
      const input = structuredClone(request(context.plan));
      if (field === 'candidate') input.candidate.maxTradeXorCodec = '1';
      if (field === 'partition') input.partitionIdentitySha256 = 'f'.repeat(64);
      if (field === 'time') input.endAtMs++;
      if (field === 'episode') input.episodeIndex = 4;
      if (field === 'extra') Object.assign(input, { alternate: true });
      const producer = vi.fn();
      await expect(context.store.evaluate(input, undefined, producer)).rejects.toThrow();
      expect(producer).not.toHaveBeenCalled();
    }
  );
  it('requires ordered training, all training before seal and the exact selected candidate before validation', async () => {
    const context = await setup(),
      registration = await context.store.register(context.plan);
    const producer = vi.fn();
    await expect(context.store.evaluate(request(context.plan, 'training', 1), undefined, producer)).rejects.toThrow(
      'training-order'
    );
    await expect(context.store.evaluate(request(context.plan, 'validation'), undefined, producer)).rejects.toThrow(
      'unsealed-validation'
    );
    await expect(
      context.store.sealSelection({
        registrationSha256: registration.registrationSha256,
        candidateSha256: digest(context.plan.candidates[0]),
        trainingSha256: 'd'.repeat(64),
        validationIdentitySha256: context.plan.validation.identitySha256,
      })
    ).rejects.toThrow('training-incomplete');
    expect(producer).not.toHaveBeenCalled();
  });
  it('durably seals the exact selection once and refuses changed seals or forged restore records', async () => {
    const context = await setup(),
      { selection, input } = await train(context);
    expect(await context.store.sealSelection(input, selection)).toEqual(selection);
    await expect(context.store.sealSelection({ ...input, trainingSha256: 'e'.repeat(64) })).rejects.toThrow(
      'changed-selection'
    );
    await expect(context.store.sealSelection(input, { ...selection, sealSha256: 'e'.repeat(64) })).rejects.toThrow(
      'restored-selection'
    );
    const episode = request(context.plan, 'validation');
    await expect(
      context.store.evaluate(episode, { ...selection, candidateSha256: 'e'.repeat(64) }, vi.fn())
    ).rejects.toThrow('unsealed-validation');
    await context.store.evaluate(episode, selection, async () => {
      expect(JSON.parse(await readFile(join(context.study, 'selection.json'), 'utf8'))).toEqual(selection);
      const access = JSON.parse(await readFile(join(context.study, `access-${digest(episode)}.json`), 'utf8'));
      expect(access.selectionSha256).toBe(selection.sealSha256);
      return evidence(episode);
    });
  });
  it('replays completed evidence and receipts after reopen without calling the producer', async () => {
    const context = await setup(),
      { registration, selection } = await train(context),
      input = request(context.plan, 'validation');
    const original = await context.store.evaluate(input, selection, async (_, sink) => {
      const receipt = await sink.retainEvidence('exact-rpc-1', { method: 'synthetic', result: '1234567890123456789' });
      expect(receipt.sha256).toBe(digest({ method: 'synthetic', result: '1234567890123456789' }));
      return evidence(input);
    });
    await context.store.dispose();
    const reopened = await openGoalQualificationStudyStore(context.options);
    stores.push(reopened);
    expect(await reopened.register(context.plan)).toEqual(registration);
    const producer = vi.fn();
    expect(await reopened.evaluate(input, selection, producer)).toEqual(original);
    expect(producer).not.toHaveBeenCalled();
  });
  it('copies request and raw own-data before awaits and closes retained sinks after producer completion', async () => {
    const context = await setup();
    await context.store.register(context.plan);
    const input = request(context.plan),
      raw = { sequence: '123' };
    let retained: GoalStudyEvidenceSink | undefined;
    await context.store.evaluate(input, undefined, async (_, sink) => {
      retained = sink;
      const pending = sink.retainEvidence('snapshot', raw);
      raw.sequence = '456';
      const receipt = await pending;
      expect(receipt.sha256).toBe(digest({ sequence: '123' }));
      return evidence(input);
    });
    await expect(retained!.retainEvidence('late', {})).rejects.toThrow('sink-closed');
    const complete = JSON.parse(await readFile(join(context.study, `complete-${digest(input)}.json`), 'utf8'));
    expect(complete.rawEvidence).toHaveLength(1);
    expect(complete.rawManifestSha256).toBe(digest(complete.rawEvidence));
  });
  it('retains metadata larger than the qualification digest string limit with exact canonical bytes', async () => {
    const context = await setup();
    await context.store.register(context.plan);
    const input = request(context.plan);
    const metadata = `0x${'ab'.repeat(100001)}`;
    await context.store.evaluate(input, undefined, async (_, sink) => {
      const receipt = await sink.retainEvidence('metadata', { z: metadata, a: [1, '2'] });
      const encoded = JSON.stringify({ a: [1, '2'], z: metadata });
      expect(receipt).toEqual({
        name: 'metadata',
        sha256: createHash('sha256').update(encoded).digest('hex'),
        bytes: Buffer.byteLength(encoded),
      });
      return evidence(input);
    });
    expect(await context.store.evaluate(input, undefined, vi.fn())).toEqual(evidence(input));
  });
  it('rejects raw accessors without reading them and permanently records the failed attempt', async () => {
    const context = await setup();
    await context.store.register(context.plan);
    const input = request(context.plan);
    const getter = vi.fn(),
      raw = {};
    Object.defineProperty(raw, 'result', { enumerable: true, get: getter });
    await expect(
      context.store.evaluate(input, undefined, async (_, sink) => {
        await sink.retainEvidence('accessor', raw);
        return evidence(input);
      })
    ).rejects.toThrow('evaluation-failed-no-retry');
    expect(getter).not.toHaveBeenCalled();
    await expect(context.store.evaluate(input, undefined, vi.fn())).rejects.toThrow('failed-evaluation-no-retry');
  });
  it('records producer failure permanently and forbids retry after reopening', async () => {
    const context = await setup();
    await context.store.register(context.plan);
    const input = request(context.plan);
    await expect(
      context.store.evaluate(input, undefined, async () => {
        throw Error('synthetic read failure');
      })
    ).rejects.toThrow('evaluation-failed-no-retry');
    await context.store.dispose();
    const reopened = await openGoalQualificationStudyStore(context.options);
    stores.push(reopened);
    await reopened.register(context.plan);
    const producer = vi.fn();
    await expect(reopened.evaluate(input, undefined, producer)).rejects.toThrow('failed-evaluation-no-retry');
    expect(producer).not.toHaveBeenCalled();
  });
  it('rejects an access-without-completion crash state without repairing or reopening data', async () => {
    const context = await setup();
    await context.store.register(context.plan);
    const input = request(context.plan);
    await context.store.evaluate(input, undefined, async () => evidence(input));
    await context.store.dispose();
    await rm(join(context.study, `complete-${digest(input)}.json`)); // Synthetic process-crash state.
    const reopened = await openGoalQualificationStudyStore(context.options);
    stores.push(reopened);
    const producer = vi.fn();
    await expect(reopened.evaluate(input, undefined, producer)).rejects.toThrow('incomplete-evaluation-no-retry');
    expect(producer).not.toHaveBeenCalled();
  });
  it('detects altered raw retained evidence rather than trusting a completed marker', async () => {
    const context = await setup();
    await context.store.register(context.plan);
    const input = request(context.plan);
    await context.store.evaluate(input, undefined, async (_, sink) => {
      await sink.retainEvidence('raw', { value: '111' });
      return evidence(input);
    });
    const path = join(context.study, `raw-${digest(input)}`, 'raw.json');
    await writeFile(path, (await readFile(path, 'utf8')).replace('111', '222'));
    await expect(context.store.evaluate(input, undefined, vi.fn())).rejects.toThrow('raw-evidence-corrupt');
  });
  it('duplicate evidence names poison the attempt even if the producer catches the rejection', async () => {
    const context = await setup();
    await context.store.register(context.plan);
    const input = request(context.plan);
    await expect(
      context.store.evaluate(input, undefined, async (_, sink) => {
        await sink.retainEvidence('same', { value: '1' });
        await sink.retainEvidence('same', { value: '1' }).catch(() => undefined);
        return evidence(input);
      })
    ).rejects.toThrow('evaluation-failed-no-retry');
    await expect(context.store.evaluate(input, undefined, vi.fn())).rejects.toThrow('failed-evaluation-no-retry');
  });
  it('does not return evidence after disposal starts and waits for durable bookkeeping before releasing ownership', async () => {
    const context = await setup();
    await context.store.register(context.plan);
    const input = request(context.plan);
    let release!: () => void, entered!: () => void;
    const ready = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const operation = context.store.evaluate(input, undefined, async () => {
      entered();
      await blocked;
      return evidence(input);
    });
    await ready;
    const disposed = context.store.dispose();
    expect(context.store.dispose()).toBe(disposed);
    await expect(openGoalQualificationStudyStore(context.options)).rejects.toMatchObject({ code: 'EEXIST' });
    release();
    await expect(operation).rejects.toThrow('store-closed');
    await disposed;
    const reopened = await openGoalQualificationStudyStore(context.options);
    stores.push(reopened);
    expect(await reopened.evaluate(input, undefined, vi.fn())).toEqual(evidence(input));
  });
  it('rejects concurrent evaluation and accessor data without invoking getters', async () => {
    const context = await setup();
    await context.store.register(context.plan);
    const input = request(context.plan);
    const getter = vi.fn();
    const raw = { ...input };
    Object.defineProperty(raw, 'phase', { enumerable: true, get: getter });
    expect(() => context.store.evaluate(raw, undefined, vi.fn())).toThrow();
    expect(getter).not.toHaveBeenCalled();
    let release!: () => void, entered!: () => void;
    const ready = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const operation = context.store.evaluate(input, undefined, async () => {
      entered();
      await blocked;
      return evidence(input);
    });
    await ready;
    await expect(context.store.evaluate(input, undefined, vi.fn())).rejects.toThrow('concurrent-operation');
    release();
    await operation;
  });
  it('composes the actual qualification boundary and restores only identical completed synthetic evidence', async () => {
    const context = await setup();
    const producer = vi.fn(async (input: Readonly<GoalQualificationEvaluationRequest>, sink: GoalStudyEvidenceSink) => {
      await sink.retainEvidence('synthetic-provenance', { requestSha256: digest(input), invented: true });
      return syntheticQualificationEpisode(input, context.plan);
    });
    const evaluator = (store: typeof context.store): GoalQualificationEvaluator => ({
      protocol: 'finalized-xyk-execution-validation-v1',
      sourceSha256: context.options.sourceSha256,
      register: store.register,
      sealSelection: store.sealSelection,
      evaluate: (input, selection) => store.evaluate(input, selection, producer),
    });
    const first = createGoalQualificationBoundary(evaluator(context.store));
    const result = await first.qualify(context.plan);
    expect(producer).toHaveBeenCalledTimes(6);
    await context.store.dispose();
    const reopened = await openGoalQualificationStudyStore(context.options);
    stores.push(reopened);
    const restored = await createGoalQualificationBoundary(evaluator(reopened)).reverify(result.certificate);
    expect(restored.certificate).toEqual(result.certificate);
    expect(producer).toHaveBeenCalledTimes(6);
  }, 120000);
});

describe('explicit v2 study-store installation', () => {
  it('keeps v1 strict and persists only correctly versioned v2 evidence', async () => {
    const p = syntheticQualificationPlan();
    p.protocol = GOAL_QUALIFICATION_PROTOCOL_V2;
    p.policy = GOAL_QUALIFICATION_POLICY_V2;
    const f = await setup(p);
    expect(() => f.store.register(p)).toThrow('plan-policy');
    await f.store.dispose();
    const store = await openGoalQualificationStudyStoreV2(f.options);
    stores.push(store);
    await store.register(p);
    const q = request(p),
      result = {
        ...evidence(q),
        protocol: 'finalized-xyk-execution-validation-v2' as const,
        deadlineCancellation: null,
      };
    const producer = vi.fn(async () => result);
    expect(await store.evaluate(q, undefined, producer)).toEqual(result);
    expect(await store.evaluate(q, undefined, producer)).toEqual(result);
    expect(producer).toHaveBeenCalledTimes(1);
  });
  it('does not allow a v1 evidence trace to enter the v2 store', async () => {
    const p = syntheticQualificationPlan();
    p.protocol = GOAL_QUALIFICATION_PROTOCOL_V2;
    p.policy = GOAL_QUALIFICATION_POLICY_V2;
    const f = await setup(p);
    await f.store.dispose();
    const store = await openGoalQualificationStudyStoreV2(f.options);
    stores.push(store);
    await store.register(p);
    const q = request(p);
    await expect(store.evaluate(q, undefined, async () => evidence(q))).rejects.toThrow('evaluation-failed-no-retry');
  });
});

/** A separate-source plan uses fixed invented chronology; no observations or completed evidence are read. */
function nextStudy(prior: GoalQualificationPlan, version: 1 | 2 | 3, overlap = false) {
  const plan = structuredClone(prior);
  plan.studyId = 'separate-source-study';
  installVersion(plan, version);
  plan.source.evaluatorSha256 = '7'.repeat(64);
  plan.source.sourceId = 'separate-source';
  plan.training.identitySha256 = '8'.repeat(64);
  plan.validation.identitySha256 = '9'.repeat(64);
  if (!overlap)
    for (const partition of [plan.training, plan.validation]) {
      partition.startAtMs += 30 * DAY;
      partition.endAtMs += 30 * DAY;
    }
  return plan;
}
/** Open only the selected existing public protocol; this helper does not widen the store's dispatch. */
async function openForPlan(directory: string, plan: GoalQualificationPlan) {
  const factory =
    plan.protocol === GOAL_QUALIFICATION_PROTOCOL_V3
      ? openGoalQualificationStudyStoreV3
      : plan.protocol === GOAL_QUALIFICATION_PROTOCOL_V2
        ? openGoalQualificationStudyStoreV2
        : openGoalQualificationStudyStore;
  const store = await factory({ directory, sourceSha256: plan.source.evaluatorSha256 });
  stores.push(store);
  return store;
}

describe('read-only earlier claim validation across sources and supported versions', () => {
  it.each([
    [1, 1],
    [1, 2],
    [2, 1],
    [2, 2],
    [1, 3],
    [2, 3],
    [3, 1],
    [3, 2],
    [3, 3],
  ] as const)(
    'honors unchanged v%s claims while registering disjoint v%s under a new source',
    async (oldVersion, nextVersion) => {
      const f = await setup();
      await f.store.dispose();
      const prior = structuredClone(f.plan);
      installVersion(prior, oldVersion);
      const old = await openForPlan(f.directory, prior);
      const registration = await old.register(prior);
      await old.dispose();
      const oldPath = join(f.directory, 'studies', digest(prior), 'registration.json');
      const claimPath = join(f.directory, 'validation-partitions', `${prior.validation.identitySha256}.json`);
      const originalRegistration = await readFile(oldPath, 'utf8'),
        originalClaim = await readFile(claimPath, 'utf8');
      const plan = nextStudy(prior, nextVersion),
        current = await openForPlan(f.directory, plan);
      expect((await current.register(plan)).planSha256).toBe(digest(plan));
      expect(await readFile(oldPath, 'utf8')).toBe(originalRegistration);
      expect(await readFile(claimPath, 'utf8')).toBe(originalClaim);
      expect(registration.planSha256).toBe(digest(prior));
      const producer = vi.fn();
      await expect(current.evaluate(request(prior), undefined, producer)).rejects.toThrow();
      expect(producer).not.toHaveBeenCalled();
      expect(() => current.register(prior)).toThrow();
      expect(await readdir(join(f.directory, 'studies', digest(plan)))).toEqual(['registration.json']);
    }
  );
  it.each([1, 2, 3] as const)('rejects renamed overlapping validation across a new v%s source', async (version) => {
    const f = await setup();
    await f.store.register(f.plan);
    await f.store.dispose();
    const plan = nextStudy(f.plan, version, true),
      current = await openForPlan(f.directory, plan);
    await expect(current.register(plan)).rejects.toThrow('overlapping-validation');
    expect(await readdir(join(f.directory, 'studies'))).toEqual([digest(f.plan)]);
  });
  it.each(['registration', 'source', 'plan', 'protocol', 'mirrored-id', 'claim', 'filename', 'malformed'] as const)(
    'rejects damaged prior %s metadata without creating a new claim',
    async (kind) => {
      const f = await setup();
      await f.store.register(f.plan);
      await f.store.dispose();
      const registrationPath = join(f.study, 'registration.json');
      const partitionPath = join(f.directory, 'validation-partitions', `${f.plan.validation.identitySha256}.json`);
      const registration = JSON.parse(await readFile(registrationPath, 'utf8'));
      if (kind === 'registration') registration.registration.registrationSha256 = '0'.repeat(64);
      if (kind === 'source') registration.sourceSha256 = 'f'.repeat(64);
      if (kind === 'plan') registration.plan.studyId = 'renamed-prior';
      if (kind === 'protocol') registration.plan.protocol = 'unsupported-protocol';
      if (['registration', 'source', 'plan', 'protocol'].includes(kind))
        await writeFile(registrationPath, acquisitionCanonical(registration) + '\n');
      if (kind === 'mirrored-id') await writeFile(join(f.directory, 'study-ids', `${f.plan.studyId}.json`), '{}\n');
      if (kind === 'claim') {
        const claim = JSON.parse(await readFile(partitionPath, 'utf8'));
        claim.startAtMs--;
        await writeFile(partitionPath, acquisitionCanonical(claim) + '\n');
      }
      if (kind === 'filename')
        await rename(partitionPath, join(f.directory, 'validation-partitions', `${'a'.repeat(64)}.json`));
      if (kind === 'malformed') await writeFile(partitionPath, '{');
      const plan = nextStudy(f.plan, 2),
        current = await openForPlan(f.directory, plan);
      await expect(current.register(plan)).rejects.toThrow();
      expect(await readdir(join(f.directory, 'studies'))).toEqual([digest(f.plan)]);
    }
  );
});

/** Version fixtures use invented implementation pins and a test-only fee cap, never a registered research proposal. */
function installVersion(plan: GoalQualificationPlan, version: 1 | 2 | 3) {
  if (version === 3) {
    plan.protocol = GOAL_QUALIFICATION_PROTOCOL_V3;
    plan.policy = GOAL_QUALIFICATION_POLICY_V3;
    plan.executionModel = readGoalTargetExecutionModel({
      protocol: GOAL_TARGET_MODEL_PROTOCOL,
      sourceRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.source,
      targetRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.target,
      targetCompressedSha256: GOAL_TARGET_COMPRESSED_SHA256,
      implementation: {
        hostSha256: 'a'.repeat(64),
        stateCodecSha256: 'b'.repeat(64),
        quoteCodecSha256: 'c'.repeat(64),
      },
      stateModel: 'source130-exact-storage-complete-xst-v1',
      fillModel: 'minimum-output-hypothetical-no-market-feedback',
      costPolicy: { protocol: GOAL_TARGET_COST_PROTOCOL, maximumLiveFeeCodec: '2000000000000000' },
    });
    plan.runtimeProfiles = [...goalTargetSourceRuntimeProfiles(plan.executionModel)];
  } else {
    plan.protocol = version === 1 ? GOAL_QUALIFICATION_PROTOCOL : GOAL_QUALIFICATION_PROTOCOL_V2;
    plan.policy = version === 1 ? GOAL_QUALIFICATION_POLICY : GOAL_QUALIFICATION_POLICY_V2;
    delete plan.executionModel;
  }
  return plan;
}
/** Store-only invented trace; causal, target-WASM and economic verification belong to the actual v3 boundary. */
function evidenceV3(input: GoalQualificationEvaluationRequest): GoalQualificationEpisodeEvidence {
  return { ...evidence(input), protocol: GOAL_EXECUTION_EVIDENCE_V3, deadlineCancellation: null };
}

describe('V3 publication capacity at the common raw sink', () => {
  async function capacityFixture(maximumRawEvidenceBytesPerEpisode?: number) {
    const directory = await mkdtemp(join(tmpdir(), 'goal-study-capacity-'));
    directories.push(directory);
    const plan = installVersion(syntheticQualificationPlan(), 3);
    const options = {
      directory: join(directory, 'journal'),
      sourceSha256: plan.source.evaluatorSha256,
      ...(maximumRawEvidenceBytesPerEpisode === undefined ? {} : { maximumRawEvidenceBytesPerEpisode }),
    };
    return { directory, plan, options, study: join(options.directory, 'studies', digest(plan)) };
  }
  const value = { message: 'é\n"\\😀' };
  const wrapper = (q: GoalQualificationEvaluationRequest, name: string) =>
    JSON.stringify({
      kind: 'goal-study-raw-evidence-v1',
      name,
      requestSha256: digest(q),
      sha256: digest(value),
      value,
    }) + '\n';

  it.each([0, -1, 1.5, NaN, Infinity, 512 * 1024 * 1024 + 1, Number.MAX_SAFE_INTEGER])(
    'rejects an invalid capacity %s before opening journal files',
    async (limit) => {
      const f = await capacityFixture(limit);
      await expect(openGoalQualificationStudyStoreV3(f.options)).rejects.toThrow();
      expect(await readdir(f.directory)).toEqual([]);
    }
  );

  it.each([1, 2] as const)('does not add the V3 limit to the v%s constructor', async (version) => {
    const f = await capacityFixture(1024),
      open = version === 1 ? openGoalQualificationStudyStore : openGoalQualificationStudyStoreV2;
    await expect(open(f.options)).rejects.toThrow('invalid-fields');
    expect(await readdir(f.directory)).toEqual([]);
  });

  it('allows exactly the on-disk UTF8 wrapper size, including newline, and resets the allowance per episode', async () => {
    const f = await capacityFixture(),
      q = request(f.plan),
      first = wrapper(q, 'first'),
      second = wrapper(q, 'other'),
      maximumRawEvidenceBytesPerEpisode = Buffer.byteLength(first) + Buffer.byteLength(second);
    const store = await openGoalQualificationStudyStoreV3({ ...f.options, maximumRawEvidenceBytesPerEpisode });
    stores.push(store);
    await store.register(f.plan);
    for (let index = 0; index < 2; index++) {
      const item = request(f.plan, 'training', index);
      await store.evaluate(item, undefined, async (_, sink) => {
        await Promise.all([sink.retainEvidence('first', value), sink.retainEvidence('other', value)]);
        return evidenceV3(item);
      });
      const raw = join(f.study, `raw-${digest(item)}`);
      const files = await Promise.all(['first', 'other'].map((name) => readFile(join(raw, `${name}.json`))));
      expect(files.map((file) => file.toString('utf8'))).toEqual([wrapper(item, 'first'), wrapper(item, 'other')]);
      expect(files.reduce((sum, file) => sum + file.length, 0)).toBe(maximumRawEvidenceBytesPerEpisode);
    }
  });

  it('reserves concurrent writes synchronously and cannot complete after an ignored overflow rejection', async () => {
    const f = await capacityFixture(),
      q = request(f.plan),
      limit = Buffer.byteLength(wrapper(q, 'first')) + Buffer.byteLength(wrapper(q, 'other')) - 1;
    const store = await openGoalQualificationStudyStoreV3({ ...f.options, maximumRawEvidenceBytesPerEpisode: limit });
    stores.push(store);
    await store.register(f.plan);
    await expect(
      store.evaluate(q, undefined, async (_, sink) => {
        const results = await Promise.allSettled([
          sink.retainEvidence('first', value),
          sink.retainEvidence('other', value),
        ]);
        expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
        expect((results[1] as PromiseRejectedResult).reason.message).toContain('raw-file-byte-limit');
        return evidenceV3(q);
      })
    ).rejects.toThrow('evaluation-failed-no-retry');
    expect(await readdir(join(f.study, `raw-${digest(q)}`))).toEqual(['first.json']);
    expect(await readdir(f.study)).toContain(`failed-${digest(q)}.json`);
    expect(await readdir(f.study)).not.toContain(`complete-${digest(q)}.json`);
    const producer = vi.fn();
    await expect(store.evaluate(q, undefined, producer)).rejects.toThrow('failed-evaluation-no-retry');
    expect(producer).not.toHaveBeenCalled();
  });

  it('snapshots the ceiling before awaits and counts wrapper overhead rather than only value bytes', async () => {
    const f = await capacityFixture(),
      q = request(f.plan),
      options = { ...f.options, maximumRawEvidenceBytesPerEpisode: Buffer.byteLength(wrapper(q, 'first')) - 1 };
    expect(options.maximumRawEvidenceBytesPerEpisode).toBeGreaterThan(Buffer.byteLength(JSON.stringify(value)));
    const pending = openGoalQualificationStudyStoreV3(options);
    options.maximumRawEvidenceBytesPerEpisode = 512 * 1024 * 1024;
    const store = await pending;
    stores.push(store);
    await store.register(f.plan);
    await expect(
      store.evaluate(q, undefined, async (_, sink) => {
        await sink.retainEvidence('first', value);
        return evidenceV3(q);
      })
    ).rejects.toThrow('evaluation-failed-no-retry');
    expect(await readdir(join(f.study, `raw-${digest(q)}`))).toEqual([]);
    expect(await readdir(f.study)).toContain(`failed-${digest(q)}.json`);
  });

  it('keeps omitted limits unchanged and accepts the existing512MiB ceiling', async () => {
    for (const limit of [undefined, 512 * 1024 * 1024]) {
      const f = await capacityFixture(limit),
        store = await openGoalQualificationStudyStoreV3(f.options);
      stores.push(store);
      await store.register(f.plan);
      const q = request(f.plan);
      expect(
        await store.evaluate(q, undefined, async (_, sink) => {
          await sink.retainEvidence('first', value);
          return evidenceV3(q);
        })
      ).toEqual(evidenceV3(q));
    }
  });
});

/** Catalog journal fixture uses exact identities with invented implementation pins, never live evidence. */
function installCatalog(plan: GoalQualificationPlan) {
  installVersion(plan, 3);
  const original = plan.executionModel!;
  plan.executionModel = readGoalTargetExecutionModel({
    protocol: GOAL_CATALOG_TARGET_MODEL_PROTOCOL,
    sourceRuntimeProfiles: GOAL_CATALOG_TARGET_SOURCE_PROFILES,
    catalogSha256: GOAL_TARGET_RUNTIME_CATALOG_SHA256,
    targetRuntimeProfile: original.targetRuntimeProfile,
    targetCompressedSha256: original.targetCompressedSha256,
    implementation: { ...original.implementation, catalogCodecSha256: 'f'.repeat(64) },
    stateModel: 'catalog-source-exact-storage-complete-xst-v1',
    fillModel: original.fillModel,
    costPolicy: { protocol: GOAL_TARGET_COST_PROTOCOL, maximumLiveFeeCodec: '210000000000000000' },
  });
  plan.policy = GOAL_QUALIFICATION_POLICY_CATALOG_V3;
  plan.runtimeProfiles = [...goalTargetSourceRuntimeProfiles(plan.executionModel)];
  return plan;
}

describe('explicit catalog study journal', () => {
  it('persists the exact catalog plan and replays training without granting validation access', async () => {
    const f = await setup();
    await f.store.dispose();
    const plan = installCatalog(structuredClone(f.plan));
    const store = await openForPlan(f.directory, plan);
    const registration = await store.register(plan);
    const q = request(plan);
    await store.evaluate(q, undefined, async (q, sink) => {
      await sink.retainEvidence('invented-catalog-source', { catalog: GOAL_TARGET_RUNTIME_CATALOG_SHA256 });
      return evidenceV3(q);
    });
    await store.dispose();
    const before = await retainedFiles(f.directory);
    const replay = await openGoalQualificationStudyReplayV3(f.options);
    stores.push(replay);
    expect(await replay.register(plan)).toEqual(registration);
    const producer = vi.fn();
    expect(await replay.evaluate(q, undefined, producer)).toEqual(evidenceV3(q));
    await expect(replay.evaluate(request(plan, 'validation'), undefined, producer)).rejects.toThrow(
      'unsealed-validation'
    );
    expect(producer).not.toHaveBeenCalled();
    await replay.dispose();
    expect(await retainedFiles(f.directory)).toEqual(before);
  });

  it.each(['missing-profile', 'profile-order', 'legacy-policy', 'target-as-source'] as const)(
    'rejects %s before reserving a catalog study',
    async (kind) => {
      const f = await setup();
      await f.store.dispose();
      const plan = structuredClone(installCatalog(structuredClone(f.plan)));
      if (kind === 'missing-profile') plan.runtimeProfiles = plan.runtimeProfiles.slice(1);
      if (kind === 'profile-order') plan.runtimeProfiles = [...plan.runtimeProfiles].reverse();
      if (kind === 'legacy-policy') plan.policy = GOAL_QUALIFICATION_POLICY_V3;
      if (kind === 'target-as-source') plan.runtimeProfiles = [plan.executionModel!.targetRuntimeProfile];
      const store = await openGoalQualificationStudyStoreV3(f.options);
      stores.push(store);
      expect(() => store.register(plan)).toThrow();
      expect(await readdir(join(f.directory, 'studies'))).toEqual([]);
      expect(await readdir(join(f.directory, 'validation-partitions'))).toEqual([]);
    }
  );
});
/** Capture all managed files, excluding only the temporary owner lock, to prove replay writes no durable records. */
async function retainedFiles(directory: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'owner.json') continue;
    if (entry.isDirectory()) {
      const children = await retainedFiles(join(directory, entry.name));
      for (const [name, content] of Object.entries(children)) files[`${entry.name}/${name}`] = content;
    } else files[entry.name] = await readFile(join(directory, entry.name), 'utf8');
  }
  return files;
}

describe('explicit v3 source/target study journal', () => {
  it.each([1, 2] as const)('keeps the v%s installation strict against v3 plans and model fields', async (version) => {
    const f = await setup();
    await f.store.dispose();
    const old = installVersion(structuredClone(f.plan), version);
    const store = await openForPlan(f.directory, old);
    const v3 = installVersion(structuredClone(f.plan), 3);
    expect(() => store.register(v3)).toThrow();
    old.executionModel = v3.executionModel;
    expect(() => store.register(old)).toThrow('invalid-fields');
    expect(await readdir(join(f.directory, 'studies'))).toEqual([]);
  });

  it.each([
    'v1',
    'v2',
    'missing-model',
    'extra-model',
    'target-profile',
    'both-profiles',
    'wrong-source',
    'zero-cap',
    'artifact',
  ] as const)('rejects %s before reserving a study or exposing observations', async (kind) => {
    const f = await setup();
    await f.store.dispose();
    const plan = structuredClone(installVersion(structuredClone(f.plan), 3));
    if (kind === 'v1' || kind === 'v2') installVersion(plan, kind === 'v1' ? 1 : 2);
    if (kind === 'missing-model') delete plan.executionModel;
    if (kind === 'extra-model') Object.assign(plan.executionModel!, { accepted: true });
    if (kind === 'target-profile') plan.runtimeProfiles = [plan.executionModel!.targetRuntimeProfile];
    if (kind === 'both-profiles')
      plan.runtimeProfiles = [...plan.runtimeProfiles, plan.executionModel!.targetRuntimeProfile];
    if (kind === 'wrong-source' && plan.executionModel && !isGoalCatalogTargetExecutionModel(plan.executionModel))
      Object.assign(plan.executionModel.sourceRuntimeProfile, { metadataSha256: '0'.repeat(64) });
    if (kind === 'zero-cap') Object.assign(plan.executionModel!.costPolicy, { maximumLiveFeeCodec: '0' });
    if (kind === 'artifact') Object.assign(plan.executionModel!, { targetCompressedSha256: '0'.repeat(64) });
    const store = await openGoalQualificationStudyStoreV3(f.options);
    stores.push(store);
    expect(() => store.register(plan)).toThrow();
    expect(await readdir(join(f.directory, 'studies'))).toEqual([]);
    expect(await readdir(join(f.directory, 'validation-partitions'))).toEqual([]);
  });

  it('roundtrips ordered training, selection, validation and raw bytes using read-only v3 replay', async () => {
    const f = await setup();
    await f.store.dispose();
    const plan = installVersion(structuredClone(f.plan), 3),
      store = await openForPlan(f.directory, plan);
    const registration = await store.register(plan);
    const producer = vi.fn(async (q: Readonly<GoalQualificationEvaluationRequest>, sink: GoalStudyEvidenceSink) => {
      await sink.retainEvidence('invented-target-api-result', { requestSha256: digest(q), synthetic: true });
      return evidenceV3(q);
    });
    await expect(store.evaluate(request(plan, 'validation'), undefined, producer)).rejects.toThrow(
      'unsealed-validation'
    );
    expect(producer).not.toHaveBeenCalled();
    for (let c = 0; c < plan.candidates.length; c++)
      for (let i = 0; i < 4; i++) await store.evaluate(request(plan, 'training', i, c), undefined, producer);
    const selectionInput = {
      registrationSha256: registration.registrationSha256,
      candidateSha256: digest(plan.candidates[0]),
      trainingSha256: 'd'.repeat(64),
      validationIdentitySha256: plan.validation.identitySha256,
    };
    const selection = await store.sealSelection(selectionInput);
    for (let i = 0; i < 2; i++) await store.evaluate(request(plan, 'validation', i), selection, producer);
    await store.dispose();
    const before = await retainedFiles(f.directory);
    const replay = await openGoalQualificationStudyReplayV3(f.options);
    stores.push(replay);
    const forbidden = vi.fn(async () => {
      throw Error('replay must never invoke a producer');
    });
    expect(await replay.register(plan)).toEqual(registration);
    expect(await replay.sealSelection(selectionInput)).toEqual(selection);
    for (let c = 0; c < plan.candidates.length; c++)
      for (let i = 0; i < 4; i++) {
        const q = request(plan, 'training', i, c);
        expect(await replay.evaluate(q, undefined, forbidden)).toEqual(evidenceV3(q));
      }
    for (let i = 0; i < 2; i++) {
      const q = request(plan, 'validation', i);
      expect(await replay.evaluate(q, selection, forbidden)).toEqual(evidenceV3(q));
    }
    expect(forbidden).not.toHaveBeenCalled();
    expect(producer).toHaveBeenCalledTimes(4 * plan.candidates.length + 2);
    await replay.dispose();
    expect(await retainedFiles(f.directory)).toEqual(before);
  });

  it('read-only v3 refuses missing registration/completion without calling producers or creating records', async () => {
    const f = await setup();
    await f.store.dispose();
    const plan = installVersion(structuredClone(f.plan), 3),
      store = await openForPlan(f.directory, plan);
    await store.register(plan);
    await store.dispose();
    const before = await retainedFiles(f.directory),
      replay = await openGoalQualificationStudyReplayV3(f.options);
    stores.push(replay);
    const missing = structuredClone(plan);
    missing.studyId = 'unregistered-v3';
    await expect(replay.register(missing)).rejects.toThrow('replay-registration-missing');
    const producer = vi.fn();
    await expect(replay.evaluate(request(plan), undefined, producer)).rejects.toThrow('replay-completion-missing');
    expect(producer).not.toHaveBeenCalled();
    await replay.dispose();
    expect(await retainedFiles(f.directory)).toEqual(before);
    const missingRoot = join(f.directory, 'missing-root');
    await expect(openGoalQualificationStudyReplayV3({ ...f.options, directory: missingRoot })).rejects.toMatchObject({
      code: 'ENOENT',
    });
    expect(await readdir(f.directory)).not.toContain('missing-root');
  });

  it.each(['v1', 'v2', 'missing-cancellation'] as const)(
    'refuses a %s trace and preserves the failed attempt',
    async (kind) => {
      const f = await setup();
      await f.store.dispose();
      const plan = installVersion(structuredClone(f.plan), 3),
        store = await openForPlan(f.directory, plan);
      await store.register(plan);
      const q = request(plan),
        trace = evidenceV3(q);
      if (kind === 'v1') trace.protocol = 'finalized-xyk-execution-validation-v1';
      if (kind === 'v2') trace.protocol = 'finalized-xyk-execution-validation-v2';
      if (kind === 'missing-cancellation') delete trace.deadlineCancellation;
      await expect(store.evaluate(q, undefined, async () => trace)).rejects.toThrow('evaluation-failed-no-retry');
      const retry = vi.fn(async () => evidenceV3(q));
      await expect(store.evaluate(q, undefined, retry)).rejects.toThrow('failed-evaluation-no-retry');
      expect(retry).not.toHaveBeenCalled();
    }
  );

  it.each(['invalid-model', 'continuation'] as const)(
    'rejects prior v3 %s metadata before reserving a new interval',
    async (kind) => {
      const f = await setup();
      await f.store.dispose();
      const plan = installVersion(structuredClone(f.plan), 3),
        store = await openForPlan(f.directory, plan);
      await store.register(plan);
      await store.dispose();
      const study = join(f.directory, 'studies', digest(plan));
      if (kind === 'invalid-model') {
        const path = join(study, 'registration.json');
        const record = JSON.parse(await readFile(path, 'utf8'));
        record.plan.executionModel.costPolicy.maximumLiveFeeCodec = '0';
        await writeFile(path, acquisitionCanonical(record) + '\n');
      } else await writeFile(join(study, 'continuation-child.json'), '{}\n');
      const next = nextStudy(plan, 3),
        current = await openForPlan(f.directory, next);
      await expect(current.register(next)).rejects.toThrow();
      expect(await readdir(join(f.directory, 'studies'))).toEqual([digest(plan)]);
    }
  );

  it('replay checks retained raw evidence instead of trusting the v3 completion JSON', async () => {
    const f = await setup();
    await f.store.dispose();
    const plan = installVersion(structuredClone(f.plan), 3),
      store = await openForPlan(f.directory, plan);
    await store.register(plan);
    const q = request(plan);
    await store.evaluate(q, undefined, async (_request, sink) => {
      await sink.retainEvidence('synthetic', { invented: true });
      return evidenceV3(q);
    });
    await store.dispose();
    await writeFile(join(f.directory, 'studies', digest(plan), `raw-${digest(q)}`, 'synthetic.json'), '{}\n');
    const replay = await openGoalQualificationStudyReplayV3(f.options);
    stores.push(replay);
    const producer = vi.fn();
    await expect(replay.evaluate(q, undefined, producer)).rejects.toThrow();
    expect(producer).not.toHaveBeenCalled();
  });
});
