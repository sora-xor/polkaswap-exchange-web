// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportGoalStudyBundle } from '../../../../scripts/bots/goal-study-bundle-export';
import {
  openGoalQualificationStudyStoreV2,
  openGoalQualificationStudyContinuationV2,
  type GoalStudyEvidenceSink,
} from '../../../../scripts/bots/goal-qualification-study-store';
import { prepareGoalAcquisitionReplayFiles } from '../../../../scripts/bots/goal-acquisition-replay-files';
import {
  createGoalQualificationBoundaryV2,
  goalQualificationDigest as digest,
  type GoalQualificationPlan,
  type GoalQualificationEvaluationRequest,
} from '@/features/bot-trading/goal-qualification';
import { acquisitionCanonical, acquisitionSha, goalAcquisitionReplayFixture } from './goal-acquisition-replay-fixture';

import { createGoalAcquisitionReplay } from '../../../../scripts/bots/goal-acquisition-replay';
import { bundleFixtureFiles, bundleEpisode, bundleCanonical, bundleSha } from './goal-study-bundle-fixtures';

const directories: string[] = [],
  stores: Array<{ dispose(): Promise<void> }> = [];
/** Real failed parent and real prefix preparation. Certificate content is deliberately unused by these preflight failures. */
async function preflightFixture() {
  const home = await realpath(await mkdtemp(join(tmpdir(), 'goal-export-continuation-')));
  directories.push(home);
  const studyRoot = join(home, 'study'),
    runDirectory = join(home, 'run'),
    outputDirectory = join(home, 'published');
  await mkdir(studyRoot);
  await mkdir(runDirectory);
  await mkdir(join(runDirectory, 'source'));
  const blocks = [{ height: 1, hash: '0x' + '1'.repeat(64), parentHash: '0x' + '0'.repeat(64), timestampMs: 1 }];
  const metadataBody = JSON.stringify(blocks) + '\n';
  const blockPath = join(home, 'synthetic-blocks.json');
  await writeFile(blockPath, metadataBody);
  const partition = { blocksSha256: acquisitionSha(JSON.stringify(blocks)) };
  const manifest = { partitions: { training: partition, validation: partition } };
  const original = goalAcquisitionReplayFixture();
  const base = original.registration.plan as GoalQualificationPlan;
  const parentPlan = { ...base, source: { ...base.source, manifestSha256: digest(manifest) } };
  const parent = await openGoalQualificationStudyStoreV2({
    directory: studyRoot,
    sourceSha256: parentPlan.source.evaluatorSha256,
  });
  stores.push(parent);
  await parent.register(parentPlan);
  const oldRequest: GoalQualificationEvaluationRequest = {
    planSha256: digest(parentPlan),
    candidate: parentPlan.candidates[0],
    candidateSha256: digest(parentPlan.candidates[0]),
    phase: 'training',
    partitionIdentitySha256: parentPlan.training.identitySha256,
    episodeIndex: 0,
    startAtMs: parentPlan.training.startAtMs,
    endAtMs: parentPlan.training.startAtMs + 86400000,
  };
  const parentDirectory = join(studyRoot, 'studies', digest(parentPlan)),
    requestSha256 = digest(oldRequest);
  await expect(
    parent.evaluate(oldRequest, undefined, async (_request, sink) => {
      const registration = JSON.parse(await readFile(join(parentDirectory, 'registration.json'), 'utf8'));
      const access = JSON.parse(await readFile(join(parentDirectory, `access-${requestSha256}.json`), 'utf8'));
      const failed = { kind: 'goal-study-evaluation-failed-v1', requestSha256, accessSha256: digest(access) };
      const fixture = goalAcquisitionReplayFixture({ registration, access, failed });
      for (const [name, value] of fixture.raw) await sink.retainEvidence(name, value);
      throw Error('synthetic indexer outage');
    })
  ).rejects.toThrow('evaluation-failed-no-retry');
  await parent.dispose();
  const prepared = await prepareGoalAcquisitionReplayFiles({
    studyRoot,
    parentPlanSha256: digest(parentPlan),
    requestSha256,
    manifestPath: join(home, 'parent-manifest.json'),
  });
  const sourceBody = '// synthetic sealed exporter source identity\n';
  const sources = { 'source/reader.ts': acquisitionSha(sourceBody) };
  await writeFile(join(runDirectory, 'source/reader.ts'), sourceBody);
  const plan = { ...parentPlan, source: { ...parentPlan.source, evaluatorSha256: digest(sources) } };
  const protocol = {
    plan,
    manifest,
    sources,
    files: {
      'blocks-training': { path: blockPath, sha256: acquisitionSha(metadataBody) },
      'blocks-validation': { path: blockPath, sha256: acquisitionSha(metadataBody) },
    },
    parent: {
      planSha256: digest(parentPlan),
      requestSha256,
      sourceSha256: parentPlan.source.evaluatorSha256,
      protocolSha256: 'f'.repeat(64),
    },
    rawManifestSha256: prepared.manifest.sha256,
  };
  const saveProtocol = async () => {
    await writeFile(join(runDirectory, 'protocol.json'), acquisitionCanonical(protocol) + '\n');
    return digest(protocol);
  };
  await writeFile(join(runDirectory, 'certificate.json'), acquisitionCanonical({ plan }) + '\n');
  const input = { studyRoot, runDirectory, outputDirectory, protocolSha256: await saveProtocol() };
  const originalParentNames = await readdir(parentDirectory),
    claimPath = join(studyRoot, 'validation-partitions', `${plan.validation.identitySha256}.json`),
    claimBytes = await readFile(claimPath);
  const run = () => exportGoalStudyBundle(input);
  const unpublished = async () => {
    await expect(readFile(join(outputDirectory, 'index.json'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readdir(outputDirectory)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await readFile(claimPath)).toEqual(claimBytes);
    expect(await readdir(parentDirectory)).not.toContain('continuation-child.json');
  };
  return {
    home,
    studyRoot,
    parentPlan,
    parentDirectory,
    requestSha256,
    prepared,
    protocol,
    input,
    saveProtocol,
    run,
    unpublished,
    originalParentNames,
  };
}
/** Complete a synthetic child using the real store/boundary and a genuinely exhausted synthetic raw replay. */
async function completedContinuationFixture() {
  const home = await realpath(await mkdtemp(join(tmpdir(), 'goal-export-completed-continuation-')));
  directories.push(home);
  const parent = await bundleFixtureFiles(join(home, 'parent'), 'synthetic parent source\n');
  const child = await bundleFixtureFiles(join(home, 'child'), 'synthetic child source\n', parent.studyRoot);
  const oldRequest: GoalQualificationEvaluationRequest = {
    planSha256: digest(parent.plan),
    candidate: parent.plan.candidates[0],
    candidateSha256: digest(parent.plan.candidates[0]),
    phase: 'training',
    partitionIdentitySha256: parent.plan.training.identitySha256,
    episodeIndex: 0,
    startAtMs: parent.plan.training.startAtMs,
    endAtMs: parent.plan.training.startAtMs + 86400000,
  };
  const parentDirectory = join(parent.studyRoot, 'studies', digest(parent.plan)),
    requestSha256 = digest(oldRequest);
  const parentStore = await openGoalQualificationStudyStoreV2({
    directory: parent.studyRoot,
    sourceSha256: parent.plan.source.evaluatorSha256,
  });
  stores.push(parentStore);
  await parentStore.register(parent.plan);
  let fixture!: ReturnType<typeof goalAcquisitionReplayFixture>;
  await expect(
    parentStore.evaluate(oldRequest, undefined, async (_r, sink) => {
      const registration = JSON.parse(await readFile(join(parentDirectory, 'registration.json'), 'utf8'));
      const access = JSON.parse(await readFile(join(parentDirectory, `access-${requestSha256}.json`), 'utf8'));
      fixture = goalAcquisitionReplayFixture({
        registration,
        access,
        failed: { kind: 'goal-study-evaluation-failed-v1', requestSha256, accessSha256: digest(access) },
      });
      for (const [name, value] of fixture.raw) await sink.retainEvidence(name, value);
      throw Error('synthetic retained502');
    })
  ).rejects.toThrow('evaluation-failed-no-retry');
  await parentStore.dispose();
  const prepared = await prepareGoalAcquisitionReplayFiles({
    studyRoot: parent.studyRoot,
    parentPlanSha256: digest(parent.plan),
    requestSha256,
    manifestPath: join(home, 'parent-inventory.json'),
  });
  let replaySink: GoalStudyEvidenceSink | undefined;
  const replay = createGoalAcquisitionReplay(prepared.preparation, {
    retainEvidence: async (receipt) => {
      if (!replaySink) throw Error('Synthetic replay requires actual child sink');
      await replaySink.retainEvidence(`prefix-${receipt.lane}-${receipt.sequence}`, receipt);
    },
    acquireFailedRequest: async () => new Response(fixture.historyCalls[0].response),
  });
  const childStore = await openGoalQualificationStudyContinuationV2(
    { directory: parent.studyRoot, sourceSha256: child.plan.source.evaluatorSha256 },
    { preparation: prepared.preparation, completedReplay: () => replay.completion() }
  );
  stores.push(childStore);
  let replayed = false;
  const boundary = createGoalQualificationBoundaryV2({
    protocol: 'finalized-xyk-execution-validation-v2',
    sourceSha256: child.plan.source.evaluatorSha256,
    register: childStore.register,
    sealSelection: childStore.sealSelection,
    evaluate: (request, selection) =>
      childStore.evaluate(request, selection, async (_r, sink) => {
        if (!replayed) {
          replaySink = sink;
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
          replay.completion();
          replayed = true;
          replaySink = undefined;
        }
        await sink.retainEvidence('invented-raw', {
          fixture: true,
          requestSha256: digest(request),
          label: 'not-chain-evidence',
        });
        return bundleEpisode(request, child.plan);
      }),
  });
  try {
    const result = await boundary.qualify(child.plan);
    await writeFile(join(child.runDirectory, 'certificate.json'), bundleCanonical(result.certificate) + '\n');
  } finally {
    boundary.revoke();
    replay.dispose();
    await childStore.dispose();
  }
  const protocol = {
    ...child.protocol,
    parent: {
      planSha256: digest(parent.plan),
      requestSha256,
      sourceSha256: parent.plan.source.evaluatorSha256,
      protocolSha256: parent.protocolSha256,
    },
    rawManifestSha256: prepared.manifest.sha256,
  };
  await writeFile(join(child.runDirectory, 'protocol.json'), bundleCanonical(protocol) + '\n');
  const input = {
    studyRoot: child.studyRoot,
    runDirectory: child.runDirectory,
    outputDirectory: child.outputDirectory,
    protocolSha256: bundleSha(bundleCanonical(protocol)),
  };
  return { input, parentDirectory, requestSha256, fixture, replayed, inventorySha256: prepared.manifest.sha256 };
}
afterEach(async () => {
  for (const store of stores.splice(0)) await store.dispose().catch(() => undefined);
  await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe('continuation bundle export parent integrity', () => {
  it('exports every original failed-parent raw wrapper byte-for-byte after actual synthetic continuation completion', async () => {
    const f = await completedContinuationFixture();
    expect(f.replayed).toBe(true);
    const before = new Map<string, Buffer>();
    const rawDirectory = join(f.parentDirectory, `raw-${f.requestSha256}`);
    for (const name of await readdir(rawDirectory)) before.set(name, await readFile(join(rawDirectory, name)));
    const failure = await readFile(join(f.parentDirectory, `failed-${f.requestSha256}.json`));
    const result = await exportGoalStudyBundle(f.input);
    const index = JSON.parse(await readFile(result.indexPath, 'utf8'));
    expect(result.episodes).toBe(6);
    expect(index.parent.requestSha256).toBe(f.requestSha256);
    const artifacts = index.parent.artifacts as Array<{ name: string; sha256: string; bytes: number }>;
    expect(artifacts.filter((a) => f.fixture.raw.has(a.name))).toHaveLength(before.size);
    expect(artifacts.find((a) => a.name === 'acquisition-inventory')?.sha256).toBe(f.inventorySha256);
    for (const [file, original] of before) {
      const name = file.slice(0, -5);
      const artifact = artifacts.find((a) => a.name === name);
      expect(artifact).toBeDefined();
      expect(artifact!.sha256).toBe(bundleSha(original));
      expect(artifact!.bytes).toBe(original.length);
      expect(await readFile(join(f.input.outputDirectory, 'objects', artifact!.sha256 + '.bin'))).toEqual(original);
      expect(await readFile(join(rawDirectory, file))).toEqual(original);
    }
    const failed = artifacts.find((a) => a.name === `failed-${f.requestSha256}`)!;
    expect(await readFile(join(f.input.outputDirectory, 'objects', failed.sha256 + '.bin'))).toEqual(failure);
    expect(await readFile(join(f.parentDirectory, `failed-${f.requestSha256}.json`))).toEqual(failure);
  }, 60000);
  it('rejects an unpinned parent inventory without publication or a child claim', async () => {
    const f = await preflightFixture();
    f.protocol.rawManifestSha256 = '0'.repeat(64);
    f.input.protocolSha256 = await f.saveProtocol();
    await expect(f.run()).rejects.toThrow('parent-inventory');
    await f.unpublished();
  });
  it('binds exact parent raw bytes even when only canonical-file whitespace changes', async () => {
    const f = await preflightFixture(),
      path = join(f.parentDirectory, `raw-${f.requestSha256}`, 'cache-1.json');
    const prior = await readFile(path, 'utf8');
    await writeFile(path, prior + '\n');
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual(JSON.parse(prior));
    await expect(f.run()).rejects.toThrow('parent-inventory');
    await f.unpublished();
  });
  it('rejects a missing original raw receipt instead of exporting a shorter prefix', async () => {
    const f = await preflightFixture();
    await rm(join(f.parentDirectory, `raw-${f.requestSha256}`, 'cache-1.json'));
    await expect(f.run()).rejects.toThrow();
    await f.unpublished();
  });
  it('rejects a missing original failure record without publication', async () => {
    const f = await preflightFixture();
    await rm(join(f.parentDirectory, `failed-${f.requestSha256}.json`));
    await expect(f.run()).rejects.toThrow('parent-layout');
    await f.unpublished();
  });
  it('rejects extra parent raw files instead of omitting unbound evidence', async () => {
    const f = await preflightFixture();
    await writeFile(join(f.parentDirectory, `raw-${f.requestSha256}`, 'unbound.json'), '{}\n');
    await expect(f.run()).rejects.toThrow();
    await f.unpublished();
  });
  it('rejects an active real store owner before publication and leaves its lock usable', async () => {
    const f = await preflightFixture();
    const owner = await openGoalQualificationStudyStoreV2({
      directory: f.studyRoot,
      sourceSha256: f.parentPlan.source.evaluatorSha256,
    });
    stores.push(owner);
    await expect(f.run()).rejects.toMatchObject({ code: 'EEXIST' });
    await f.unpublished();
    expect((await owner.register(f.parentPlan)).planSha256).toBe(digest(f.parentPlan));
    expect(await readdir(f.parentDirectory)).toEqual(f.originalParentNames);
  });
});
