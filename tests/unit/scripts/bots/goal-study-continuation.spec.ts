import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  openGoalQualificationStudyStoreV2,
  openGoalQualificationStudyContinuationV2,
} from '../../../../scripts/bots/goal-qualification-study-store';
import {
  prepareGoalAcquisitionReplay,
  createGoalAcquisitionReplay,
  type GoalAcquisitionReplayCompletion,
} from '../../../../scripts/bots/goal-acquisition-replay';
import {
  goalQualificationDigest as digest,
  type GoalQualificationPlan,
  type GoalQualificationEvaluationRequest,
  type GoalQualificationEpisodeEvidence,
} from '@/features/bot-trading/goal-qualification';
import { acquisitionCanonical, goalAcquisitionReplayFixture } from './goal-acquisition-replay-fixture';

const directories: string[] = [];
const stores: Array<{ dispose(): Promise<void> }> = [];
const childSource = 'e'.repeat(64);
function request(plan: GoalQualificationPlan, episodeIndex = 0, phase: 'training' | 'validation' = 'training') {
  return {
    planSha256: digest(plan),
    candidate: plan.candidates[0],
    candidateSha256: digest(plan.candidates[0]),
    phase,
    partitionIdentitySha256: plan[phase].identitySha256,
    episodeIndex,
    startAtMs: plan[phase].startAtMs + episodeIndex * 86400000,
    endAtMs: plan[phase].startAtMs + (episodeIndex + 1) * 86400000,
  } satisfies GoalQualificationEvaluationRequest;
}
/** Journal fixture only: causal/economic qualification is independently enforced by the real boundary. */
function evidence(r: GoalQualificationEvaluationRequest): GoalQualificationEpisodeEvidence {
  return {
    protocol: 'finalized-xyk-execution-validation-v2',
    requestSha256: digest(r),
    dataSha256: 'a'.repeat(64),
    opening: { fundedAtMs: r.startAtMs, receivedAtMs: r.startAtMs, mark: {} as never, evidenceSha256: 'b'.repeat(64) },
    clock: { protocol: 'finalized-goal-live-clock-v2', events: [] } as never,
    terminal: { accountingAtMs: r.endAtMs, mark: {} as never, successor: {} as never, evidenceSha256: 'c'.repeat(64) },
    signals: [],
    events: [],
    deadlineCancellation: null,
  };
}
async function setup() {
  const initial = goalAcquisitionReplayFixture();
  const parentPlan = initial.registration.plan as GoalQualificationPlan;
  const directory = await mkdtemp(join(tmpdir(), 'goal-study-continuation-'));
  directories.push(directory);
  const parentDirectory = join(directory, 'studies', digest(parentPlan));
  const parent = await openGoalQualificationStudyStoreV2({
    directory,
    sourceSha256: parentPlan.source.evaluatorSha256,
  });
  stores.push(parent);
  await parent.register(parentPlan);
  const oldRequest = request(parentPlan);
  let fixture!: ReturnType<typeof goalAcquisitionReplayFixture>;
  await expect(
    parent.evaluate(oldRequest, undefined, async (_request, sink) => {
      const registration = JSON.parse(await readFile(join(parentDirectory, 'registration.json'), 'utf8'));
      const access = JSON.parse(await readFile(join(parentDirectory, `access-${digest(oldRequest)}.json`), 'utf8'));
      const failed = {
        kind: 'goal-study-evaluation-failed-v1',
        requestSha256: digest(oldRequest),
        accessSha256: digest(access),
      };
      fixture = goalAcquisitionReplayFixture({ registration, access, failed });
      for (const [name, value] of fixture.raw) await sink.retainEvidence(name, value);
      throw Error('synthetic deployment outage');
    })
  ).rejects.toThrow('evaluation-failed-no-retry');
  await parent.dispose();
  // The real store's files, including canonical newlines, are precisely the fixture's declared prefix.
  for (const [name, body] of fixture.artifacts) {
    if (name === 'manifest') continue;
    const file =
      name === 'registration'
        ? 'registration.json'
        : name === 'access'
          ? `access-${digest(oldRequest)}.json`
          : name === 'failed'
            ? `failed-${digest(oldRequest)}.json`
            : `raw-${digest(oldRequest)}/${name.slice(4)}.json`;
    expect(await readFile(join(parentDirectory, file), 'utf8')).toBe(body);
  }
  const preparation = await prepareGoalAcquisitionReplay(fixture.input, { readArtifact: fixture.readArtifact });
  const replay = createGoalAcquisitionReplay(preparation, {
    retainEvidence: async () => undefined,
    acquireFailedRequest: async () => new Response(fixture.historyCalls[0].response, { status: 200 }),
  });
  const plan = { ...parentPlan, source: { ...parentPlan.source, evaluatorSha256: childSource } };
  const options = { directory, sourceSha256: childSource };
  const dependencies = { preparation, completedReplay: () => replay.completion() };
  const open = async () => {
    const store = await openGoalQualificationStudyContinuationV2(options, dependencies);
    stores.push(store);
    return store;
  };
  const finishReplay = async () => {
    const init = (body: string): RequestInit => ({
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
      credentials: 'omit',
      redirect: 'error',
    });
    for (const call of fixture.marketCalls) await (await replay.marketFetch(call.url, init(call.body))).text();
    for (const call of fixture.historyCalls) await (await replay.fetch(call.url, init(call.body))).text();
    await (await replay.fetch(fixture.failedCall.url, init(fixture.failedCall.body))).text();
    return replay.completion();
  };
  return {
    directory,
    parentDirectory,
    parentPlan,
    oldRequest,
    plan,
    fixture,
    preparation,
    dependencies,
    options,
    open,
    finishReplay,
  };
}
afterEach(async () => {
  for (const store of stores.splice(0)) await store.dispose().catch(() => undefined);
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

/** A later unrelated study shares the authoritative registry, never the parent's market evidence. */
async function unrelatedStore(f: Awaited<ReturnType<typeof setup>>) {
  const plan = structuredClone(f.parentPlan);
  plan.studyId = 'unrelated-later-study';
  plan.source.evaluatorSha256 = 'f'.repeat(64);
  plan.source.sourceId = 'unrelated-source';
  plan.training.identitySha256 = '8'.repeat(64);
  plan.validation.identitySha256 = '9'.repeat(64);
  for (const partition of [plan.training, plan.validation]) {
    partition.startAtMs += 30 * 86400000;
    partition.endAtMs += 30 * 86400000;
  }
  const store = await openGoalQualificationStudyStoreV2({
    directory: f.directory,
    sourceSha256: plan.source.evaluatorSha256,
  });
  stores.push(store);
  return { plan, store };
}

describe('prior claim metadata with a recorded continuation', () => {
  it('rejects a changed child strategy even when every altered metadata digest is resealed consistently', async () => {
    const f = await setup(),
      child = await f.open();
    await child.register(f.plan);
    await child.dispose();
    const oldChildPath = join(f.directory, 'studies', digest(f.plan));
    const registration = JSON.parse(await readFile(join(oldChildPath, 'registration.json'), 'utf8'));
    const lineage = JSON.parse(await readFile(join(oldChildPath, 'continuation.json'), 'utf8'));
    registration.plan.candidates[0].strategy.intervalMs *= 2;
    const changedPlanSha256 = digest(registration.plan);
    lineage.childPlanSha256 = changedPlanSha256;
    registration.registration = {
      kind: 'preregistered-unopened-validation',
      planSha256: changedPlanSha256,
      registrationSha256: digest({
        kind: registration.kind,
        sourceSha256: registration.sourceSha256,
        registeredAt: registration.registeredAt,
        continuationSha256: digest(lineage),
        planSha256: changedPlanSha256,
        trainingIdentitySha256: registration.plan.training.identitySha256,
        validationIdentitySha256: registration.plan.validation.identitySha256,
      }),
      trainingIdentitySha256: registration.plan.training.identitySha256,
      validationIdentitySha256: registration.plan.validation.identitySha256,
    };
    await writeFile(join(oldChildPath, 'registration.json'), acquisitionCanonical(registration) + '\n');
    await writeFile(join(oldChildPath, 'continuation.json'), acquisitionCanonical(lineage) + '\n');
    await writeFile(join(f.parentDirectory, 'continuation-child.json'), acquisitionCanonical(lineage) + '\n');
    await rename(oldChildPath, join(f.directory, 'studies', changedPlanSha256));
    const next = await unrelatedStore(f);
    await expect(next.store.register(next.plan)).rejects.toThrow('prior-continuation-lineage');
  });
  it('honors the original claim and reciprocal child lineage without opening raw evidence', async () => {
    const f = await setup(),
      child = await f.open();
    await child.register(f.plan);
    await child.dispose();
    const claimPath = join(f.directory, 'validation-partitions', `${f.parentPlan.validation.identitySha256}.json`);
    const claim = await readFile(claimPath, 'utf8');
    // The prior-claim reader must not parse raw training values to preserve interval ownership.
    const rawPath = join(f.parentDirectory, `raw-${digest(f.oldRequest)}`, 'source.json.json');
    await writeFile(rawPath, 'unreadable raw evidence for this metadata-only test');
    const next = await unrelatedStore(f);
    expect((await next.store.register(next.plan)).planSha256).toBe(digest(next.plan));
    expect(await readFile(claimPath, 'utf8')).toBe(claim);
    expect(await readFile(rawPath, 'utf8')).toBe('unreadable raw evidence for this metadata-only test');
  });
  it.each([
    'forward',
    'backward',
    'child-registration',
    'child-source',
    'parent-access',
    'parent-failure',
    'child-plan',
  ] as const)('rejects corrupted prior continuation %s metadata', async (kind) => {
    const f = await setup(),
      child = await f.open();
    await child.register(f.plan);
    await child.dispose();
    const childPath = join(f.directory, 'studies', digest(f.plan));
    const path =
      kind === 'forward'
        ? join(f.parentDirectory, 'continuation-child.json')
        : kind === 'backward'
          ? join(childPath, 'continuation.json')
          : kind === 'parent-access'
            ? join(f.parentDirectory, `access-${digest(f.oldRequest)}.json`)
            : kind === 'parent-failure'
              ? join(f.parentDirectory, `failed-${digest(f.oldRequest)}.json`)
              : join(childPath, 'registration.json');
    const value = JSON.parse(await readFile(path, 'utf8'));
    if (kind === 'forward') value.parentRawManifestSha256 = '0'.repeat(64);
    if (kind === 'backward') value.childSourceSha256 = '0'.repeat(64);
    if (kind === 'child-registration') value.registration.registrationSha256 = '0'.repeat(64);
    if (kind === 'child-source') value.sourceSha256 = '0'.repeat(64);
    if (kind === 'parent-access') value.selectionSha256 = '0'.repeat(64);
    if (kind === 'parent-failure') value.accessSha256 = '0'.repeat(64);
    if (kind === 'child-plan') value.plan.candidates[0].initialKusdCodec = '1';
    await writeFile(path, acquisitionCanonical(value) + '\n');
    const next = await unrelatedStore(f);
    await expect(next.store.register(next.plan)).rejects.toThrow();
    expect(await readdir(join(f.directory, 'studies'))).not.toContain(digest(next.plan));
  });
});

describe('source-bound first-training acquisition continuation', () => {
  it('appends one child under the unchanged original claim and preserves the failed parent byte for byte', async () => {
    const f = await setup();
    const names = (await readdir(f.parentDirectory)).filter((name) => !name.startsWith('raw-'));
    const originals = await Promise.all(
      names.map(async (name) => [name, await readFile(join(f.parentDirectory, name), 'utf8')] as const)
    );
    const claimPath = join(f.directory, 'validation-partitions', `${f.plan.validation.identitySha256}.json`);
    const originalClaim = await readFile(claimPath, 'utf8');
    const store = await f.open();
    const registration = await store.register(f.plan);
    expect(registration.planSha256).toBe(digest(f.plan));
    expect(registration.planSha256).not.toBe(digest(f.parentPlan));
    expect(await readFile(claimPath, 'utf8')).toBe(originalClaim);
    for (const [name, bytes] of originals) expect(await readFile(join(f.parentDirectory, name), 'utf8')).toBe(bytes);
    const childPath = join(f.directory, 'studies', digest(f.plan));
    const lineage = JSON.parse(await readFile(join(childPath, 'continuation.json'), 'utf8'));
    expect(lineage).toMatchObject({
      parentPlanSha256: digest(f.parentPlan),
      childPlanSha256: digest(f.plan),
      parentRequestSha256: digest(f.oldRequest),
    });
    expect(JSON.parse(await readFile(join(f.parentDirectory, 'continuation-child.json'), 'utf8'))).toEqual(lineage);
    expect(await store.register(f.plan)).toEqual(registration);
  });

  it('requires actual owned replay completion and retains a failed child when the producer bypasses replay', async () => {
    const f = await setup(),
      store = await f.open();
    await store.register(f.plan);
    const r = request(f.plan);
    await expect(store.evaluate(r, undefined, async () => evidence(r))).rejects.toThrow('evaluation-failed-no-retry');
    expect(await readdir(join(f.directory, 'studies', digest(f.plan)))).toContain(`failed-${digest(r)}.json`);
    await expect(store.evaluate(r, undefined, async () => evidence(r))).rejects.toThrow('failed-evaluation-no-retry');
  });

  it('rejects serialized preparation and completion lookalikes', async () => {
    const f = await setup();
    expect(() =>
      openGoalQualificationStudyContinuationV2(f.options, {
        preparation: structuredClone(f.preparation),
        completedReplay: () => ({}) as GoalAcquisitionReplayCompletion,
      })
    ).toThrow('unowned-preparation');
    const store = await openGoalQualificationStudyContinuationV2(f.options, {
      preparation: f.preparation,
      completedReplay: () => ({ kind: 'goal-acquisition-replay-completion-v1', bindings: f.preparation.bindings }),
    });
    stores.push(store);
    await store.register(f.plan);
    await f.finishReplay();
    await expect(store.evaluate(request(f.plan), undefined, async (r) => evidence(r))).rejects.toThrow(
      'evaluation-failed-no-retry'
    );
  });

  it('keeps validation closed until complete child training and seals it under the same original claim', async () => {
    const f = await setup(),
      store = await f.open();
    const registration = await store.register(f.plan),
      unopened = vi.fn();
    await expect(store.evaluate(request(f.plan, 0, 'validation'), undefined, unopened)).rejects.toThrow(
      'unsealed-validation'
    );
    await expect(store.evaluate(request(f.plan, 1), undefined, unopened)).rejects.toThrow('training-order');
    expect(unopened).not.toHaveBeenCalled();
    for (let index = 0; index < 4; index++)
      await store.evaluate(request(f.plan, index), undefined, async (r) => {
        if (index === 0) await f.finishReplay();
        return evidence(r);
      });
    const selection = await store.sealSelection({
      registrationSha256: registration.registrationSha256,
      candidateSha256: digest(f.plan.candidates[0]),
      trainingSha256: 'c'.repeat(64),
      validationIdentitySha256: f.plan.validation.identitySha256,
    });
    const validation = request(f.plan, 0, 'validation');
    expect(await store.evaluate(validation, selection, async (r) => evidence(r))).toEqual(evidence(validation));
    const again = vi.fn();
    await store.dispose();
    const reopened = await f.open();
    expect(await reopened.register(f.plan)).toEqual(registration);
    expect(await reopened.evaluate(request(f.plan), undefined, again)).toEqual(evidence(request(f.plan)));
    expect(again).not.toHaveBeenCalled();
  });

  it.each(['candidate', 'dates', 'arrival', 'profile', 'manifest', 'id'] as const)(
    'rejects changed %s before claiming a child',
    async (field) => {
      const f = await setup(),
        store = await f.open(),
        plan = structuredClone(f.plan);
      if (field === 'candidate') plan.candidates[0].strategy.slowWindow++;
      if (field === 'dates') {
        plan.training.startAtMs += 86400000;
        plan.training.endAtMs += 86400000;
        plan.validation.startAtMs += 86400000;
        plan.validation.endAtMs += 86400000;
      }
      if (field === 'arrival') {
        if (plan.arrivalModel.kind !== 'modeled-finalized-callbacks') throw Error('fixture arrival model');
        plan.arrivalModel.finalityDelayMs++;
      }
      if (field === 'profile') plan.runtimeProfiles = [{ ...plan.runtimeProfiles[0], metadataSha256: '1'.repeat(64) }];
      if (field === 'manifest') plan.source.manifestSha256 = '2'.repeat(64);
      if (field === 'id') plan.studyId += '-alternate';
      await expect(Promise.resolve().then(() => store.register(plan))).rejects.toThrow();
      expect(await readdir(f.parentDirectory)).not.toContain('continuation-child.json');
    }
  );

  it.each(['selection.json', 'complete-foreign.json', 'access-foreign.json'])(
    'rejects parent %s rather than continuing an exposed or completed study',
    async (name) => {
      const f = await setup();
      await writeFile(join(f.parentDirectory, name), '{}\n');
      const store = await f.open();
      await expect(store.register(f.plan)).rejects.toThrow('continuation-parent-exposed-or-completed');
    }
  );

  it('rejects a competing child and incomplete lineage rather than resetting the claim', async () => {
    const f = await setup(),
      store = await f.open();
    await store.register(f.plan);
    await store.dispose();
    const sourceSha256 = 'd'.repeat(64);
    const alternate = await openGoalQualificationStudyContinuationV2({ ...f.options, sourceSha256 }, f.dependencies);
    stores.push(alternate);
    await expect(
      alternate.register({ ...f.plan, source: { ...f.plan.source, evaluatorSha256: sourceSha256 } })
    ).rejects.toThrow('continuation-already-claimed');
    await alternate.dispose();
    await rm(join(f.directory, 'studies', digest(f.plan), 'registration.json'));
    const reopened = await f.open();
    await expect(reopened.register(f.plan)).rejects.toThrow('continuation-already-claimed');
  });

  it('does not make the original default store retry its failed parent', async () => {
    const f = await setup(),
      child = await f.open();
    await child.register(f.plan);
    await child.dispose();
    const original = await openGoalQualificationStudyStoreV2({
      directory: f.directory,
      sourceSha256: f.parentPlan.source.evaluatorSha256,
    });
    stores.push(original);
    await expect(original.evaluate(f.oldRequest, undefined, vi.fn())).rejects.toThrow('failed-evaluation-no-retry');
  });
});
