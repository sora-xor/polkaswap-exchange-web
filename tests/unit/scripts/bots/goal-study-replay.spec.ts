import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  openGoalQualificationStudyStoreV2,
  openGoalQualificationStudyContinuationV2,
  openGoalQualificationStudyReplayV2,
} from '../../../../scripts/bots/goal-qualification-study-store';
import { prepareGoalAcquisitionReplay } from '../../../../scripts/bots/goal-acquisition-replay';
import {
  GOAL_QUALIFICATION_PROTOCOL_V2,
  GOAL_QUALIFICATION_POLICY_V2,
  goalQualificationDigest as digest,
  type GoalQualificationPlan,
  type GoalQualificationEvaluationRequest,
  type GoalQualificationEpisodeEvidence,
} from '@/features/bot-trading/goal-qualification';
import { syntheticQualificationPlan } from '../../features/bot-trading/goal-qualification-fixtures';
import { goalAcquisitionReplayFixture } from './goal-acquisition-replay-fixture';

const roots: string[] = [];
const stores: Array<{ dispose(): Promise<void> }> = [];
const request = (plan: GoalQualificationPlan, phase: 'training' | 'validation' = 'training', episodeIndex = 0) => ({
  planSha256: digest(plan),
  candidate: plan.candidates[0],
  candidateSha256: digest(plan.candidates[0]),
  phase,
  partitionIdentitySha256: plan[phase].identitySha256,
  startAtMs: plan[phase].startAtMs + episodeIndex * 86400000,
  endAtMs: plan[phase].startAtMs + (episodeIndex + 1) * 86400000,
  episodeIndex,
});
/** Tiny journal-only fixture: the independent boundary owns causal and economic verification. */
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
async function tree(directory: string): Promise<Record<string, string>> {
  const entries: Record<string, string> = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'owner.json') continue; // The exclusive temporary lock is the only permitted write.
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      entries[entry.name + '/'] = '';
      for (const [name, value] of Object.entries(await tree(path))) entries[entry.name + '/' + name] = value;
    } else entries[entry.name] = (await readFile(path)).toString('base64');
  }
  return entries;
}
async function setup(input?: GoalQualificationPlan) {
  const plan = input ?? syntheticQualificationPlan();
  plan.protocol = GOAL_QUALIFICATION_PROTOCOL_V2;
  plan.policy = GOAL_QUALIFICATION_POLICY_V2;
  plan.candidates = [plan.candidates[0]];
  const directory = await mkdtemp(join(tmpdir(), 'goal-study-replay-'));
  roots.push(directory);
  const options = { directory, sourceSha256: plan.source.evaluatorSha256 };
  const writer = await openGoalQualificationStudyStoreV2(options);
  stores.push(writer);
  const replay = async () => {
    await writer.dispose();
    const reader = await openGoalQualificationStudyReplayV2(options);
    stores.push(reader);
    return reader;
  };
  return { plan, options, directory, writer, replay, study: join(directory, 'studies', digest(plan)) };
}
async function train(f: Awaited<ReturnType<typeof setup>>) {
  const registration = await f.writer.register(f.plan);
  for (let episode = 0; episode < 4; episode++) {
    const r = request(f.plan, 'training', episode);
    await f.writer.evaluate(r, undefined, async (_request, sink) => {
      await sink.retainEvidence('synthetic', { episode });
      return evidence(r);
    });
  }
  return {
    registrationSha256: registration.registrationSha256,
    candidateSha256: digest(f.plan.candidates[0]),
    trainingSha256: 'd'.repeat(64),
    validationIdentitySha256: f.plan.validation.identitySha256,
  };
}
afterEach(async () => {
  for (const store of stores.splice(0)) await store.dispose().catch(() => undefined);
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('completed-only v2 study replay', () => {
  it('requires existing store directories without creating a store or owner lock', async () => {
    const root = await mkdtemp(join(tmpdir(), 'goal-study-replay-empty-'));
    roots.push(root);
    for (const directory of [join(root, 'absent'), root]) {
      await expect(
        openGoalQualificationStudyReplayV2({ directory, sourceSha256: 'a'.repeat(64) })
      ).rejects.toMatchObject({
        code: 'ENOENT',
      });
      expect(await readdir(root)).toEqual([]);
    }
    await mkdir(join(root, 'studies'));
    await expect(
      openGoalQualificationStudyReplayV2({ directory: root, sourceSha256: 'a'.repeat(64) })
    ).rejects.toThrow();
    expect(await readdir(root)).toEqual(['studies']);
  });
  it('rejects a missing registration without writing claims or a study directory', async () => {
    const f = await setup(),
      reader = await f.replay(),
      before = await tree(f.directory);
    await expect(reader.register(f.plan)).rejects.toThrow('replay-registration-missing');
    expect(await tree(f.directory)).toEqual(before);
  });
  it('rejects a missing selection even when all training is complete', async () => {
    const f = await setup(),
      selection = await train(f),
      reader = await f.replay(),
      before = await tree(f.directory);
    await expect(reader.sealSelection(selection)).rejects.toThrow('replay-selection-missing');
    expect(await tree(f.directory)).toEqual(before);
  });
  it('rejects an unopened episode without an access marker, failure record, raw directory or producer call', async () => {
    const f = await setup();
    await f.writer.register(f.plan);
    const reader = await f.replay(),
      before = await tree(f.directory),
      producer = vi.fn();
    await expect(reader.evaluate(request(f.plan), undefined, producer)).rejects.toThrow('replay-completion-missing');
    expect(producer).not.toHaveBeenCalled();
    expect(await tree(f.directory)).toEqual(before);
  });
  it('replays verified registration, selection, raw receipts and completed evidence without journal changes', async () => {
    const f = await setup(),
      input = await train(f),
      selection = await f.writer.sealSelection(input);
    const r = request(f.plan, 'validation');
    await f.writer.evaluate(r, selection, async () => evidence(r));
    const reader = await f.replay(),
      before = await tree(f.directory),
      producer = vi.fn();
    expect((await reader.register(f.plan)).planSha256).toBe(digest(f.plan));
    expect(await reader.sealSelection(input, selection)).toEqual(selection);
    expect(await reader.evaluate(request(f.plan), undefined, producer)).toEqual(evidence(request(f.plan)));
    expect(await reader.evaluate(r, selection, producer)).toEqual(evidence(r));
    expect(producer).not.toHaveBeenCalled();
    expect(await tree(f.directory)).toEqual(before);
    await reader.dispose();
    expect(await readdir(f.directory)).not.toContain('owner.json');
  });
  it('cannot recreate validation access or mark failure when completion and access disappear after a successful read', async () => {
    const f = await setup(),
      input = await train(f),
      selection = await f.writer.sealSelection(input);
    const r = request(f.plan, 'validation'),
      producer = vi.fn();
    await f.writer.evaluate(r, selection, async () => evidence(r));
    const reader = await f.replay();
    expect(await reader.evaluate(r, selection, producer)).toEqual(evidence(r));
    await rm(join(f.study, `access-${digest(r)}.json`));
    await rm(join(f.study, `complete-${digest(r)}.json`));
    const before = await tree(f.directory);
    await expect(reader.evaluate(r, selection, producer)).rejects.toThrow('replay-completion-missing');
    expect(producer).not.toHaveBeenCalled();
    expect(await tree(f.directory)).toEqual(before);
  });
  it('rejects failed or incomplete episodes without repairing either', async () => {
    const f = await setup(),
      r = request(f.plan);
    await f.writer.register(f.plan);
    await expect(
      f.writer.evaluate(r, undefined, async () => {
        throw Error('synthetic outage');
      })
    ).rejects.toThrow();
    const reader = await f.replay(),
      producer = vi.fn();
    let before = await tree(f.directory);
    await expect(reader.evaluate(r, undefined, producer)).rejects.toThrow('failed-evaluation-no-retry');
    expect(await tree(f.directory)).toEqual(before);
    await rm(join(f.study, `failed-${digest(r)}.json`));
    before = await tree(f.directory);
    await expect(reader.evaluate(r, undefined, producer)).rejects.toThrow('incomplete-evaluation-no-retry');
    expect(await tree(f.directory)).toEqual(before);
    expect(producer).not.toHaveBeenCalled();
  });
  it('rejects forged and accessor continuation dependencies before acquiring the owner lock', async () => {
    const f = await setup();
    await f.writer.dispose();
    const fixture = goalAcquisitionReplayFixture();
    const preparation = await prepareGoalAcquisitionReplay(fixture.input, { readArtifact: fixture.readArtifact });
    const getter = vi.fn(() => preparation);
    expect(() =>
      openGoalQualificationStudyReplayV2(f.options, {
        get preparation() {
          return getter();
        },
        completedReplay: vi.fn(),
      })
    ).toThrow('continuation-dependency');
    expect(getter).not.toHaveBeenCalled();
    expect(() =>
      openGoalQualificationStudyReplayV2(f.options, {
        preparation: structuredClone(preparation),
        completedReplay: vi.fn(),
      })
    ).toThrow('unowned-preparation');
    expect(await readdir(f.directory)).not.toContain('owner.json');
  });
  it('accepts owned continuation lineage but never creates a missing child episode or calls completion', async () => {
    const initial = goalAcquisitionReplayFixture();
    const f = await setup(initial.registration.plan as GoalQualificationPlan);
    await f.writer.register(f.plan);
    const r = request(f.plan);
    let fixture!: ReturnType<typeof goalAcquisitionReplayFixture>;
    await expect(
      f.writer.evaluate(r, undefined, async (_request, sink) => {
        const registration = JSON.parse(await readFile(join(f.study, 'registration.json'), 'utf8'));
        const access = JSON.parse(await readFile(join(f.study, `access-${digest(r)}.json`), 'utf8'));
        const failed = {
          kind: 'goal-study-evaluation-failed-v1',
          requestSha256: digest(r),
          accessSha256: digest(access),
        };
        fixture = goalAcquisitionReplayFixture({ registration, access, failed });
        for (const [name, value] of fixture.raw) await sink.retainEvidence(name, value);
        throw Error('synthetic outage');
      })
    ).rejects.toThrow('evaluation-failed-no-retry');
    await f.writer.dispose();
    const preparation = await prepareGoalAcquisitionReplay(fixture.input, { readArtifact: fixture.readArtifact });
    const child = { ...f.plan, source: { ...f.plan.source, evaluatorSha256: 'e'.repeat(64) } };
    const options = { directory: f.directory, sourceSha256: child.source.evaluatorSha256 };
    const completedReplay = vi.fn(),
      dependency = { preparation, completedReplay };
    const writer = await openGoalQualificationStudyContinuationV2(options, dependency);
    stores.push(writer);
    const registration = await writer.register(child);
    await writer.dispose();
    const reader = await openGoalQualificationStudyReplayV2(options, dependency);
    stores.push(reader);
    const before = await tree(f.directory);
    expect(await reader.register(child)).toEqual(registration);
    await expect(reader.evaluate(request(child), undefined, vi.fn())).rejects.toThrow('replay-completion-missing');
    expect(completedReplay).not.toHaveBeenCalled();
    expect(await tree(f.directory)).toEqual(before);
  });
});
