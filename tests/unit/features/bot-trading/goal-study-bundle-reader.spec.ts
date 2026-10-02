// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createGoalStudyBundleReader } from '@/features/bot-trading/goal-study-bundle-reader';
import { createGoalBundleTransport } from '@/features/bot-trading/goal-bundle-transport';
import { goalRawBytesSha256 as sha } from '@/features/bot-trading/goal-raw-envelope';
import type { GoalBundleManifest } from '@/features/bot-trading/goal-bundle-reader';
import type { GoalStudyBundleIndex } from '../../../../scripts/bots/goal-study-bundle-export';
vi.unmock('@polkadot/util-crypto');
const ROOT = 'https://evidence.example.org/study/';
const hash = (n: number) => n.toString(16).padStart(64, '0');
const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value) + '\n');
/** Invented distribution bytes. These are deliberately not a qualification or chain-evidence fixture. */
function fixture(change?: (index: GoalStudyBundleIndex) => void) {
  const objects = new Map<string, Uint8Array>();
  const artifact = (name: string) => {
    const bytes = encode({ invented: name });
    const descriptor = { name, sha256: sha(bytes), bytes: bytes.length };
    objects.set(`${ROOT}objects/${descriptor.sha256}.bin`, bytes);
    return descriptor;
  };
  const rootArtifacts = [
    'certificate',
    'protocol',
    'registration',
    'selection',
    'study-claim',
    'validation-claim',
    'metadata-training',
    'metadata-validation',
  ].map(artifact);
  const episodes: GoalStudyBundleIndex['episodes'][number][] = [];
  for (let i = 0; i < 6; i++) {
    const id = hash(10 + i),
      phase = i < 4 ? ('training' as const) : ('validation' as const);
    rootArtifacts.push(artifact(`access-${id}`), artifact(`complete-${id}`));
    const raw = encode({ invented: 'source' });
    const manifest: GoalBundleManifest = {
      kind: 'goal-episode-evidence-bundle-v1',
      version: 1,
      phase,
      planSha256: hash(1),
      sourceSha256: hash(2),
      requestSha256: id,
      artifacts: [{ name: 'source.json', sha256: sha(raw), bytes: raw.length }],
    };
    const bytes = encode(manifest);
    objects.set(`${ROOT}episodes/${id}/manifest.json`, bytes);
    objects.set(`${ROOT}episodes/${id}/objects/${sha(raw)}.bin`, raw);
    episodes.push({
      phase,
      candidateSha256: hash(3),
      episodeIndex: i < 4 ? i : i - 4,
      requestSha256: id,
      manifestSha256: sha(bytes),
    });
  }
  const metadataArtifacts = [
    'run-protocol',
    'verification',
    'raw-manifest',
    'blocks-training',
    'blocks-validation',
    'group-00000.batch-00000',
  ].map(artifact);
  const cache = (partition: 'training' | 'validation') => ({
    policy: 'verified-canonical-metadata-cache-v1' as const,
    partition,
    manifestSha256: metadataArtifacts[0].sha256,
    verificationSha256: metadataArtifacts[1].sha256,
    rawManifestSha256: metadataArtifacts[2].sha256,
    blocksSha256: hash(partition === 'training' ? 6 : 7),
    initShardIndex: 0,
  });
  const index: GoalStudyBundleIndex = {
    kind: 'goal-study-evidence-bundle-v1',
    version: 1,
    planSha256: hash(1),
    sourceSha256: hash(2),
    protocolSha256: hash(4),
    certificateSha256: hash(5),
    artifacts: rootArtifacts,
    episodes,
    parent: null,
    metadata: {
      artifacts: metadataArtifacts,
      bindings: { training: cache('training'), validation: cache('validation') },
    },
  };
  change?.(index);
  const bytes = encode(index);
  objects.set(ROOT + 'index.json', bytes);
  const fetcher = vi.fn(async (url: RequestInfo | URL, _init?: RequestInit) => {
    const body = objects.get(String(url));
    if (!body) throw Error('unexpected URL');
    const response = new Response(new Uint8Array(body));
    Object.defineProperty(response, 'url', { value: String(url) });
    return response;
  });
  return { index, objects, fetcher, input: { rootUrl: ROOT, indexSha256: sha(bytes) } };
}
describe('browser completed-study index reader', () => {
  it('accepts only matching catalog policies without granting any metadata or validation capability', async () => {
    const f = fixture((index) => {
      for (const phase of ['training', 'validation'] as const)
        index.metadata!.bindings[phase].policy = 'verified-canonical-catalog-metadata-cache-v2';
    });
    const reader = await createGoalStudyBundleReader(f.input, { fetch: f.fetcher });
    expect(reader.index.metadata!.bindings.training.policy).toBe('verified-canonical-catalog-metadata-cache-v2');
    expect(reader).not.toHaveProperty('catalog');
    await expect(reader.openTrainingEpisode(f.index.episodes[4].requestSha256)).rejects.toThrow(
      'validation-unsupported'
    );
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it.each(['mixed', 'unknown'])('rejects %s metadata policies before artifact access', async (kind) => {
    const f = fixture((index) => {
      index.metadata!.bindings.training.policy =
        kind === 'mixed' ? 'verified-canonical-catalog-metadata-cache-v2' : ('invented-policy' as never);
    });
    await expect(createGoalStudyBundleReader(f.input, { fetch: f.fetcher })).rejects.toThrow();
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it.each(['record', 'episode'])('rejects a serialized selection before validation %s access', async (kind) => {
    const f = fixture(),
      reader = await createGoalStudyBundleReader(f.input, { fetch: f.fetcher });
    const request = f.index.episodes[4].requestSha256;
    const selection = { kind: 'selection-sealed-before-validation', candidateSha256: hash(3) } as never;
    const attempt =
      kind === 'record'
        ? reader.readValidationRoot(`complete-${request}`, selection)
        : reader.openValidationEpisode(request, selection);
    await expect(attempt).rejects.toThrow();
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    await expect(reader.readRoot('certificate')).rejects.toThrow('study-closed');
  });
  it('opens pinned metadata and training raw bytes without granting certificate authority', async () => {
    const f = fixture(),
      reader = await createGoalStudyBundleReader(f.input, { fetch: f.fetcher });
    expect(Object.isFrozen(reader.index.metadata!.bindings.training)).toBe(true);
    expect(reader).not.toHaveProperty('verification');
    expect(reader).not.toHaveProperty('qualify');
    expect(JSON.parse(new TextDecoder().decode(await reader.readRoot('certificate')))).toEqual({
      invented: 'certificate',
    });
    expect(JSON.parse(new TextDecoder().decode(await reader.readMetadata('group-00000.batch-00000')))).toEqual({
      invented: 'group-00000.batch-00000',
    });
    const episode = await reader.openTrainingEpisode(f.index.episodes[0].requestSha256);
    expect(JSON.parse(new TextDecoder().decode(await episode.read('source.json')))).toEqual({ invented: 'source' });
    for (const [, init] of f.fetcher.mock.calls)
      expect(init).toMatchObject({ method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store' });
    reader.dispose();
    await expect(episode.read('source.json')).rejects.toThrow('closed');
    await expect(reader.readRoot('protocol')).rejects.toThrow('closed');
  });
  it.each(['complete', 'episode'] as const)('keeps validation %s closed before any extra request', async (kind) => {
    const f = fixture(),
      reader = await createGoalStudyBundleReader(f.input, { fetch: f.fetcher });
    const id = f.index.episodes[4].requestSha256;
    await expect(
      kind === 'complete' ? reader.readRoot(`complete-${id}`) : reader.openTrainingEpisode(id)
    ).rejects.toThrow('validation-unsupported');
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it('does not reopen a consumed training episode', async () => {
    const f = fixture(),
      reader = await createGoalStudyBundleReader(f.input, { fetch: f.fetcher });
    const id = f.index.episodes[0].requestSha256;
    await reader.openTrainingEpisode(id);
    await expect(reader.openTrainingEpisode(id)).rejects.toThrow('episode-read-once');
    expect(f.fetcher).toHaveBeenCalledTimes(2);
  });
  it('rejects a mismatched independently pinned index', async () => {
    const f = fixture();
    await expect(
      createGoalStudyBundleReader({ ...f.input, indexSha256: hash(999) }, { fetch: f.fetcher })
    ).rejects.toThrow('hash');
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([
    'order',
    'candidate',
    'duplicate',
    'missing-record',
    'extra-field',
    'extra-root',
    'duplicate-root',
    'size',
    'metadata-pin',
    'metadata-name',
    'metadata-partition',
  ] as const)('rejects %s before reading objects', async (kind) => {
    const f = fixture((index) => {
      if (kind === 'order') index.episodes[0].episodeIndex = 2;
      if (kind === 'candidate') index.episodes[1].candidateSha256 = hash(99);
      if (kind === 'duplicate') index.episodes[1].requestSha256 = index.episodes[0].requestSha256;
      if (kind === 'missing-record')
        index.artifacts = index.artifacts.filter((row) => !row.name.startsWith('complete-'));
      if (kind === 'extra-field') Object.assign(index, { trusted: true });
      if (kind === 'extra-root')
        index.artifacts = [...index.artifacts, { name: 'arbitrary', sha256: hash(8), bytes: 10 }];
      if (kind === 'duplicate-root') index.artifacts = [...index.artifacts, index.artifacts[0]];
      if (kind === 'size') index.artifacts[0].bytes = 32 * 1024 * 1024 + 1;
      if (kind === 'metadata-pin') index.metadata!.bindings.training.rawManifestSha256 = hash(88);
      if (kind === 'metadata-name') index.metadata!.artifacts[0].name = '../secrets';
      if (kind === 'metadata-partition') index.metadata!.bindings.training.partition = 'validation';
    });
    await expect(createGoalStudyBundleReader(f.input, { fetch: f.fetcher })).rejects.toThrow();
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it('checks each training manifest against its study identity', async () => {
    const f = fixture(),
      episode = f.index.episodes[0],
      url = `${ROOT}episodes/${episode.requestSha256}/manifest.json`;
    const manifest = JSON.parse(new TextDecoder().decode(f.objects.get(url)!));
    manifest.planSha256 = hash(98);
    const bytes = encode(manifest);
    f.objects.set(url, bytes);
    episode.manifestSha256 = sha(bytes);
    const indexBytes = encode(f.index);
    f.objects.set(ROOT + 'index.json', indexBytes);
    f.input.indexSha256 = sha(indexBytes);
    const reader = await createGoalStudyBundleReader(f.input, { fetch: f.fetcher });
    await expect(reader.openTrainingEpisode(episode.requestSha256)).rejects.toThrow('episode-binding');
    await expect(reader.readRoot('protocol')).rejects.toThrow('closed');
  });
  it('rejects unknown metadata and cannot traverse to other files', async () => {
    const f = fixture(),
      reader = await createGoalStudyBundleReader(f.input, { fetch: f.fetcher });
    await expect(reader.readMetadata('../../private')).rejects.toThrow('unknown-artifact');
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it('cancels all work with its caller signal', async () => {
    const f = fixture(),
      controller = new AbortController();
    const reader = await createGoalStudyBundleReader(f.input, { fetch: f.fetcher, signal: controller.signal });
    const child = await reader.openTrainingEpisode(f.index.episodes[0].requestSha256);
    controller.abort();
    await expect(child.read('source.json')).rejects.toThrow('closed');
    await expect(reader.readMetadata('run-protocol')).rejects.toThrow('closed');
  });
  it.each(['../index.json', 'https://evil.example/index.json', 'objects/../../secret.bin', 'index.json?secret=x'])(
    'transport rejects noncanonical path %s before fetch',
    async (path) => {
      const f = fixture(),
        transport = createGoalBundleTransport(ROOT, { fetch: f.fetcher });
      await expect(transport.read(path, hash(1), 10)).rejects.toThrow('path');
      expect(f.fetcher).not.toHaveBeenCalled();
    }
  );
  it.each([0, -1, Number.MAX_SAFE_INTEGER, 32 * 1024 * 1024 + 1])(
    'transport rejects allocation size %s before fetch',
    async (maximum) => {
      const f = fixture(),
        transport = createGoalBundleTransport(ROOT, { fetch: f.fetcher });
      await expect(transport.read('index.json', hash(1), maximum)).rejects.toThrow('limit');
      expect(f.fetcher).not.toHaveBeenCalled();
    }
  );
});
