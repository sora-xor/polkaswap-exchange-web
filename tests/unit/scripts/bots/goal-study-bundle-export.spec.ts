import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportGoalStudyBundle, type GoalStudyBundleIndex } from '../../../../scripts/bots/goal-study-bundle-export';
import { createGoalBundleReader, type GoalBundleManifest } from '@/features/bot-trading/goal-bundle-reader';
import { createGoalStudyBundleReader } from '@/features/bot-trading/goal-study-bundle-reader';
import { goalQualificationDigest as digest } from '@/features/bot-trading/goal-qualification';
import { bundleCanonical, bundleFixtureFiles, bundleSha, completeBundleFixture } from './goal-study-bundle-fixtures';
import {
  buildGoalMetadataReplayRawManifest,
  type GoalMetadataReplayInput,
} from '../../../../scripts/bots/goal-qualification-metadata-replay';

let seed: Awaited<ReturnType<typeof bundleFixtureFiles>>;
const homes: string[] = [];
beforeAll(async () => {
  seed = await bundleFixtureFiles(await realpath(await mkdtemp(join(tmpdir(), 'goal-export-seed-'))));
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
}, 120000);
afterAll(async () => {
  if (seed) await rm(seed.base, { recursive: true, force: true });
});
afterEach(async () => {
  for (const path of homes.splice(0)) await rm(path, { recursive: true, force: true });
});
async function fixture() {
  const base = await realpath(await mkdtemp(join(tmpdir(), 'goal-export-case-')));
  homes.push(base);
  await cp(seed.base, base, { recursive: true });
  const protocol = structuredClone(seed.protocol);
  for (const file of Object.values(protocol.files)) file.path = file.path.replace(seed.base, base);
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
describe('completed study evidence export', () => {
  it('reverifies the real synthetic journal and serves exact training bytes to the actual browser reader', async () => {
    const f = await fixture(),
      before = await journal(f.input.studyRoot);
    const result = await exportGoalStudyBundle(f.input);
    expect(await journal(f.input.studyRoot)).toEqual(before);
    const bytes = await readFile(result.indexPath),
      index = JSON.parse(bytes.toString()) as GoalStudyBundleIndex;
    expect(result.indexSha256).toBe(bundleSha(bytes));
    expect(index.episodes.map((episode) => episode.phase)).toEqual([
      'training',
      'training',
      'training',
      'training',
      'validation',
      'validation',
    ]);
    expect(index.parent).toBeNull();
    expect(index.metadata?.artifacts).toHaveLength(8);
    const archivedMetadata = index.metadata!.artifacts.find((entry) => entry.name === 'group-00000.batch-00000')!;
    expect(await readFile(join(f.input.outputDirectory, 'objects', archivedMetadata.sha256 + '.bin'))).toEqual(
      await readFile(join(f.base, 'collection', 'group-00000.batch-00000.json'))
    );
    expect(bytes.toString()).not.toContain(f.base);
    const protocolBinding = index.artifacts.find((artifact) => artifact.name === 'protocol')!;
    const publishedProtocol = (
      await readFile(join(f.input.outputDirectory, 'objects', protocolBinding.sha256 + '.bin'))
    ).toString();
    expect(publishedProtocol).not.toContain(f.base);
    expect(publishedProtocol).not.toContain('synthetic source');
    const episode = index.episodes[0];
    const rootUrl = `https://evidence.example.org/study/episodes/${episode.requestSha256}/`;
    const fetcher = async (url: RequestInfo | URL) => {
      const path = new URL(String(url)).pathname.replace('/study/', '');
      const response = new Response(await readFile(join(f.input.outputDirectory, path)), { status: 200 });
      Object.defineProperty(response, 'url', { value: String(url) });
      return response;
    };
    const reader = await createGoalBundleReader(
      { rootUrl, manifestSha256: episode.manifestSha256 },
      { fetch: fetcher }
    );
    try {
      const raw = await reader.read('invented-raw');
      expect(Buffer.from(raw)).toEqual(
        await readFile(join(f.study, `raw-${episode.requestSha256}`, 'invented-raw.json'))
      );
      const manifest = JSON.parse(
        await readFile(join(f.input.outputDirectory, 'episodes', episode.requestSha256, 'manifest.json'), 'utf8')
      ) as GoalBundleManifest;
      expect(manifest.artifacts[0].sha256).toBe(bundleSha(raw));
      expect(JSON.parse(Buffer.from(raw).toString()).sha256).not.toBe(bundleSha(raw));
    } finally {
      reader.dispose();
    }
    const studyReader = await createGoalStudyBundleReader(
      { rootUrl: 'https://evidence.example.org/study/', indexSha256: result.indexSha256 },
      { fetch: fetcher }
    );
    try {
      expect(Buffer.from(await studyReader.readMetadata('run-protocol'))).toEqual(
        await readFile(f.protocol.files['run-protocol'].path)
      );
      const trainingReader = await studyReader.openTrainingEpisode(episode.requestSha256);
      expect(Buffer.from(await trainingReader.read('invented-raw'))).toEqual(
        await readFile(join(f.study, `raw-${episode.requestSha256}`, 'invented-raw.json'))
      );
      expect(studyReader).not.toHaveProperty('verification');
    } finally {
      studyReader.dispose();
    }
    await expect(exportGoalStudyBundle(f.input)).rejects.toThrow('must-be-absent');
    expect(await readFile(result.indexPath)).toEqual(bytes);
    expect(await journal(f.input.studyRoot)).toEqual(before);
  }, 120000);
  it('rejects a modified frozen source before any output or study mutation', async () => {
    const f = await fixture(),
      before = await journal(f.input.studyRoot);
    await writeFile(join(f.input.runDirectory, 'fixture.ts'), 'changed source');
    await expect(exportGoalStudyBundle(f.input)).rejects.toThrow('source-changed');
    await absent(join(f.input.outputDirectory, 'index.json'));
    expect(await journal(f.input.studyRoot)).toEqual(before);
  });
  it('rejects a changed metadata file without substituting new blocks', async () => {
    const f = await fixture();
    await writeFile(f.protocol.files['blocks-training'].path, '[{"height":9}]');
    await expect(exportGoalStudyBundle(f.input)).rejects.toThrow('metadata-changed');
    await absent(join(f.input.outputDirectory, 'index.json'));
  });
  it('refuses changed original collector responses rather than publishing a metadata digest without its source', async () => {
    const f = await fixture();
    await writeFile(join(f.base, 'collection', 'group-00000.batch-00000.json'), '{"changed":true}\n');
    await expect(exportGoalStudyBundle(f.input)).rejects.toThrow('metadata-cache-raw-changed');
    await absent(join(f.input.outputDirectory, 'index.json'));
  }, 120000);
  it('requires original collector inputs when the sealed study used a metadata cache', async () => {
    const f = await fixture();
    await unlink(f.protocol.files['raw-manifest'].path);
    await expect(exportGoalStudyBundle(f.input)).rejects.toMatchObject({ code: 'ENOENT' });
    await absent(join(f.input.outputDirectory, 'index.json'));
  });
  it('rejects an incorrect independent protocol pin', async () => {
    const f = await fixture();
    await expect(exportGoalStudyBundle({ ...f.input, protocolSha256: 'f'.repeat(64) })).rejects.toThrow('protocol-pin');
    await absent(join(f.input.outputDirectory, 'index.json'));
  });
  it('does not take an active owner lock or change its contents', async () => {
    const f = await fixture(),
      lock = join(f.input.studyRoot, 'owner.json');
    await writeFile(lock, '{"kind":"operator-owned"}\n');
    const before = await journal(f.input.studyRoot);
    await expect(exportGoalStudyBundle(f.input)).rejects.toMatchObject({ code: 'EEXIST' });
    expect(await journal(f.input.studyRoot)).toEqual(before);
    await absent(join(f.input.outputDirectory, 'index.json'));
  });
  it('refuses incomplete validation without creating another access or failure', async () => {
    const f = await fixture();
    const names = (await readdir(f.study)).filter((name) => name.startsWith('complete-'));
    const missing = names.at(-1)!;
    await unlink(join(f.study, missing));
    const before = await journal(f.input.studyRoot);
    await expect(exportGoalStudyBundle(f.input)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await journal(f.input.studyRoot)).toEqual(before);
    await absent(join(f.input.outputDirectory, 'index.json'));
  });
  it('rejects changed raw evidence even if the outer wrapper is valid JSON', async () => {
    const f = await fixture();
    const rawDirectory = (await readdir(f.study)).find((name) => name.startsWith('raw-'))!;
    const path = join(f.study, rawDirectory, 'invented-raw.json');
    const raw = JSON.parse(await readFile(path, 'utf8'));
    raw.value.label = 'changed';
    await writeFile(path, bundleCanonical(raw) + '\n');
    const before = await journal(f.input.studyRoot);
    await expect(exportGoalStudyBundle(f.input)).rejects.toThrow();
    expect(await journal(f.input.studyRoot)).toEqual(before);
    await absent(join(f.input.outputDirectory, 'index.json'));
  });
  it('does not trust a self-consistent forged certificate summary', async () => {
    const f = await fixture(),
      path = join(f.input.runDirectory, 'certificate.json');
    const certificate = JSON.parse(await readFile(path, 'utf8'));
    certificate.validation[0].fills++;
    const { certificateSha256: ignored, ...body } = certificate;
    void ignored;
    certificate.certificateSha256 = digest(body);
    await writeFile(path, bundleCanonical(certificate) + '\n');
    await expect(exportGoalStudyBundle(f.input)).rejects.toThrow();
    await absent(join(f.input.outputDirectory, 'index.json'));
  }, 120000);
  it('rejects a symlink to a source even when its bytes match', async () => {
    const f = await fixture(),
      path = join(f.input.runDirectory, 'fixture.ts');
    await unlink(path);
    await symlink(join(seed.runDirectory, 'fixture.ts'), path);
    await expect(exportGoalStudyBundle(f.input)).rejects.toThrow('symlink');
  });
  it('rejects output nested inside the authoritative study', async () => {
    const f = await fixture();
    await expect(exportGoalStudyBundle({ ...f.input, outputDirectory: join(f.study, 'export') })).rejects.toThrow(
      'output-overlap'
    );
  });
  it('honors cancellation without output', async () => {
    const f = await fixture(),
      controller = new AbortController();
    controller.abort();
    await expect(exportGoalStudyBundle({ ...f.input, signal: controller.signal })).rejects.toThrow('aborted');
    await absent(join(f.input.outputDirectory, 'index.json'));
  });
});
