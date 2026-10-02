import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  exportGoalStudyBundle,
  exportGoalStudyBundleV3,
  type GoalStudyBundleIndex,
} from '../../../../scripts/bots/goal-study-bundle-export';
import { goalQualificationDigest as digest } from '@/features/bot-trading/goal-qualification';
import { bundleCanonical, bundleFixtureFiles, bundleSha, completeBundleFixture } from './goal-study-bundle-fixtures';
import {
  buildGoalMetadataReplayRawManifest,
  type GoalMetadataReplayInput,
} from '../../../../scripts/bots/goal-qualification-metadata-replay';

let seed: Awaited<ReturnType<typeof bundleFixtureFiles>>, catalogSeed: typeof seed;
const homes: string[] = [];
// Full publication hashes a six-episode journal; these integration cases exceed the 15-second unit default.
const SINGLE_EXPORT_TIMEOUT_MS = 60_000;
const DOUBLE_EXPORT_TIMEOUT_MS = 90_000;
beforeAll(async () => {
  const base = await realpath(await mkdtemp(join(tmpdir(), 'goal-export-v3-seed-')));
  seed = await bundleFixtureFiles(base, 'synthetic source\n', join(base, 'study'), 3);
  const collection = join(seed.base, 'collection');
  await mkdir(collection);
  const artifacts = [
    { name: 'group-00000.complete', value: { invented: 'group', noChainEvidence: true } },
    { name: 'group-00000.batch-00000', value: { invented: 'batch', noChainEvidence: true } },
    { name: 'shard-00000.complete', value: { invented: 'shard', noChainEvidence: true } },
  ];
  const entries: { name: string; sha256: string; bytes: number }[] = [];
  for (const artifact of artifacts) {
    const bytes = Buffer.from(bundleCanonical(artifact.value) + '\n');
    await writeFile(join(collection, artifact.name + '.json'), bytes);
    entries.push({ name: artifact.name, sha256: bundleSha(bytes), bytes: bytes.length });
  }
  for (const [name, value] of Object.entries({
    'run-protocol': { invented: 'collector' },
    verification: { invented: 'verification' },
  })) {
    const bytes = Buffer.from(bundleCanonical(value) + '\n'),
      path = join(collection, name + '.json');
    await writeFile(path, bytes);
    seed.protocol.files[name] = { path, sha256: bundleSha(bytes) };
  }
  const raw = buildGoalMetadataReplayRawManifest(
    {
      manifestSha256: seed.protocol.files['run-protocol'].sha256,
      verificationSha256: seed.protocol.files.verification.sha256,
    },
    entries
  );
  const rawBytes = Buffer.from(bundleCanonical(raw) + '\n'),
    rawPath = join(collection, 'raw-manifest.json');
  await writeFile(rawPath, rawBytes);
  seed.protocol.files['raw-manifest'] = { path: rawPath, sha256: bundleSha(rawBytes) };
  seed.plan.source.collectorSha256 = seed.protocol.files['run-protocol'].sha256;
  const cache = (partition: 'training' | 'validation'): GoalMetadataReplayInput => ({
    policy: 'verified-canonical-metadata-cache-v1',
    partition,
    manifestSha256: seed.protocol.files['run-protocol'].sha256,
    verificationSha256: seed.protocol.files.verification.sha256,
    rawManifestSha256: seed.protocol.files['raw-manifest'].sha256,
    blocksSha256: seed.protocol.manifest.partitions[partition].blocksSha256,
    initShardIndex: 0,
  });
  Object.assign(seed.protocol, { caches: { training: cache('training'), validation: cache('validation') } });
  seed.protocolSha256 = bundleSha(bundleCanonical(seed.protocol));
  await writeFile(join(seed.runDirectory, 'protocol.json'), JSON.stringify(seed.protocol));
  await completeBundleFixture(seed);
  const catalogBase = await realpath(await mkdtemp(join(tmpdir(), 'goal-export-catalog-seed-')));
  catalogSeed = await bundleFixtureFiles(
    catalogBase,
    'synthetic catalog source\n',
    join(catalogBase, 'study'),
    3,
    true
  );
  const catalogCollection = join(catalogBase, 'collection');
  await cp(collection, catalogCollection, { recursive: true });
  for (const name of ['run-protocol', 'verification', 'raw-manifest'])
    catalogSeed.protocol.files[name] = {
      ...seed.protocol.files[name],
      path: seed.protocol.files[name].path.replace(seed.base, catalogBase),
    };
  catalogSeed.plan.source.collectorSha256 = seed.plan.source.collectorSha256;
  Object.assign(catalogSeed.protocol, {
    caches: {
      training: { ...cache('training'), policy: 'verified-canonical-catalog-metadata-cache-v2' },
      validation: { ...cache('validation'), policy: 'verified-canonical-catalog-metadata-cache-v2' },
    },
  });
  catalogSeed.protocolSha256 = bundleSha(bundleCanonical(catalogSeed.protocol));
  await writeFile(join(catalogSeed.runDirectory, 'protocol.json'), JSON.stringify(catalogSeed.protocol));
  await completeBundleFixture(catalogSeed);
}, 120000);
afterAll(async () => {
  if (seed) await rm(seed.base, { recursive: true, force: true });
  if (catalogSeed) await rm(catalogSeed.base, { recursive: true, force: true });
});
afterEach(async () => {
  for (const path of homes.splice(0)) await rm(path, { recursive: true, force: true });
});
async function fixture(selectedSeed = seed) {
  const base = await realpath(await mkdtemp(join(tmpdir(), 'goal-export-case-')));
  homes.push(base);
  await cp(selectedSeed.base, base, { recursive: true });
  const protocol = structuredClone(selectedSeed.protocol);
  for (const file of Object.values(protocol.files)) file.path = file.path.replace(selectedSeed.base, base);
  const runDirectory = join(base, 'run'),
    studyRoot = join(base, 'study'),
    outputDirectory = join(base, 'export');
  await writeFile(join(runDirectory, 'protocol.json'), JSON.stringify(protocol));
  return {
    base,
    protocol,
    study: join(studyRoot, 'studies', digest(protocol.plan)),
    input: {
      studyRoot,
      runDirectory,
      outputDirectory,
      protocolSha256: bundleSha(bundleCanonical(protocol)),
    },
  };
}
async function absent(path: string) {
  await expect(readFile(path)).rejects.toMatchObject({ code: 'ENOENT' });
}
async function journal(path: string) {
  const entries = await readdir(path, { recursive: true, withFileTypes: true });
  return Object.fromEntries(
    await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const file = join(entry.parentPath, entry.name);
          return [file.slice(path.length), bundleSha(await readFile(file))];
        })
    )
  );
}
describe('explicit v3 completed-study evidence publication', () => {
  it(
    'copies the actual synthetic V3 journal with exact raw bytes and no local paths or mutation',
    async () => {
      const f = await fixture();
      const before = await journal(f.input.studyRoot);
      const result = await exportGoalStudyBundleV3(f.input);
      expect(await journal(f.input.studyRoot)).toEqual(before);
      const bytes = await readFile(result.indexPath);
      const index = JSON.parse(bytes.toString()) as GoalStudyBundleIndex;
      expect(bundleSha(bytes)).toBe(result.indexSha256);
      expect(index.parent).toBeNull();
      expect(index.episodes).toHaveLength(6);
      expect(index.metadata?.artifacts).toHaveLength(8);
      expect(bytes.toString()).not.toContain(f.base);
      const protocol = index.artifacts.find((row) => row.name === 'protocol')!;
      const published = JSON.parse(
        await readFile(join(f.input.outputDirectory, 'objects', protocol.sha256 + '.bin'), 'utf8')
      );
      expect(published.plan.protocol).toBe('finalized-xyk-qualification-v3');
      expect(published.plan.executionModel).toEqual(f.protocol.plan.executionModel);
      expect(published.plan.runtimeProfiles[0].specVersion).toBe(130);
      expect(published.plan.executionModel.targetRuntimeProfile.specVersion).toBe(131);
      expect(JSON.stringify(published)).not.toContain(f.base);
    },
    SINGLE_EXPORT_TIMEOUT_MS
  );
  it(
    'publishes a catalog-model synthetic journal with matching v2 metadata policy and no admission change',
    async () => {
      const f = await fixture(catalogSeed),
        before = await journal(f.input.studyRoot);
      const result = await exportGoalStudyBundleV3(f.input);
      expect(await journal(f.input.studyRoot)).toEqual(before);
      const index = JSON.parse(await readFile(result.indexPath, 'utf8')) as GoalStudyBundleIndex;
      expect(index.metadata!.bindings.training.policy).toBe('verified-canonical-catalog-metadata-cache-v2');
      expect(index.metadata!.bindings.validation.policy).toBe('verified-canonical-catalog-metadata-cache-v2');
      const protocolFile = index.artifacts.find((r) => r.name === 'protocol')!;
      const protocol = JSON.parse(
        await readFile(join(f.input.outputDirectory, 'objects', protocolFile.sha256 + '.bin'), 'utf8')
      );
      expect(protocol.plan.executionModel.protocol).toBe('source128-129-130-target131-readonly-counterfactual-v1');
      expect(protocol.plan.runtimeProfiles.map((r: { specVersion: number }) => r.specVersion)).toEqual([128, 129, 130]);
      expect(JSON.stringify(index)).not.toContain(f.base);
    },
    SINGLE_EXPORT_TIMEOUT_MS
  );
  it('refuses old metadata policy on the explicit catalog model', async () => {
    const f = await fixture(catalogSeed);
    const protocol = f.protocol as typeof f.protocol & { caches: Record<string, { policy: string }> };
    for (const phase of ['training', 'validation'])
      protocol.caches[phase].policy = 'verified-canonical-metadata-cache-v1';
    await writeFile(join(f.input.runDirectory, 'protocol.json'), JSON.stringify(protocol));
    f.input.protocolSha256 = bundleSha(bundleCanonical(protocol));
    await expect(exportGoalStudyBundleV3(f.input)).rejects.toThrow('metadata-cache-binding');
    await absent(f.input.outputDirectory);
  });
  it('refuses catalog cache policy on the original source130 model before publication', async () => {
    const f = await fixture();
    const protocol = f.protocol as typeof f.protocol & { caches: Record<string, { policy: string }> };
    for (const phase of ['training', 'validation'])
      protocol.caches[phase].policy = 'verified-canonical-catalog-metadata-cache-v2';
    await writeFile(join(f.input.runDirectory, 'protocol.json'), JSON.stringify(protocol));
    f.input.protocolSha256 = bundleSha(bundleCanonical(protocol));
    await expect(exportGoalStudyBundleV3(f.input)).rejects.toThrow('metadata-cache-binding');
    await absent(f.input.outputDirectory);
  });
  it('keeps the old publisher unable to accept V3 evidence', async () => {
    const f = await fixture();
    await expect(exportGoalStudyBundle(f.input)).rejects.toThrow('protocol-version');
    await absent(f.input.outputDirectory);
  });
  it.each(['parent', 'rawManifestSha256', 'missing-metadata'])('rejects %s before output creation', async (kind) => {
    const f = await fixture();
    const protocol = { ...f.protocol } as Record<string, unknown>;
    if (kind === 'missing-metadata') delete protocol.caches;
    else protocol[kind] = kind === 'parent' ? null : 'a'.repeat(64);
    await writeFile(join(f.input.runDirectory, 'protocol.json'), JSON.stringify(protocol));
    f.input.protocolSha256 = bundleSha(bundleCanonical(protocol));
    await expect(exportGoalStudyBundleV3(f.input)).rejects.toThrow(
      kind === 'missing-metadata' ? 'metadata-required' : 'continuation-unsupported'
    );
    await absent(f.input.outputDirectory);
  });
  it.each(['missing-completion', 'changed-raw'])('will not publish %s evidence', async (kind) => {
    const f = await fixture();
    const completed = (await readdir(f.study)).find((name) => name.startsWith('complete-'))!;
    if (kind === 'missing-completion') await unlink(join(f.study, completed));
    else {
      const record = JSON.parse(await readFile(join(f.study, completed), 'utf8'));
      const requestHash = completed.slice('complete-'.length, -'.json'.length);
      const name = record.rawEvidence[0].name;
      await writeFile(join(f.study, `raw-${requestHash}`, `${name}.json`), '{}');
    }
    await expect(exportGoalStudyBundleV3(f.input)).rejects.toThrow();
    await absent(join(f.input.outputDirectory, 'index.json'));
  });
  it(
    'does not overwrite an existing publication',
    async () => {
      const f = await fixture();
      const first = await exportGoalStudyBundleV3(f.input);
      const bytes = await readFile(first.indexPath);
      await expect(exportGoalStudyBundleV3(f.input)).rejects.toThrow('must-be-absent');
      expect(await readFile(first.indexPath)).toEqual(bytes);
    },
    DOUBLE_EXPORT_TIMEOUT_MS
  );
});
