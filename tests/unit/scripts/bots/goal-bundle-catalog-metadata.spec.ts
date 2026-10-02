import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import {
  createGoalBundleCatalogMetadataFixture,
  catalogMetadataFixtureHash as hash,
  catalogMetadataFixtureVersion as versionAt,
} from '../../../fixtures/bots/goal-bundle-catalog-metadata';
import {
  metadataFixtureDigest as digest,
  metadataFixtureSha as sha,
} from '../../../fixtures/bots/goal-bundle-metadata';
import { createGoalBundleStudyFixture } from '../../../fixtures/bots/goal-bundle-study';
import { buildGoalMetadataReplayRawManifest } from '../../../../scripts/bots/goal-qualification-metadata-replay';
import { goalQualificationDigest } from '@/features/bot-trading/goal-qualification';
import {
  verifyGoalBundleMetadata,
  verifyGoalBundleCatalogMetadata,
  verifyGoalBundleCatalogValidationMetadata,
  assertGoalBundleMetadata,
  assertGoalBundleCatalogMetadata,
  getGoalBundleVerifiedMetadataCatalog,
  assertGoalBundleCatalogValidationMetadata,
  type GoalBundleMetadataValidationAdmission,
  type GoalBundleCatalogMetadataVerification,
} from '@/features/bot-trading/goal-bundle-metadata';
vi.unmock('@polkadot/util-crypto');
let training: Awaited<ReturnType<typeof createGoalBundleCatalogMetadataFixture>>, validation: typeof training;
const network = vi.fn(() => {
  throw Error('Network forbidden');
});
beforeAll(async () => {
  vi.stubGlobal('fetch', network);
  training = await createGoalBundleCatalogMetadataFixture();
  validation = await createGoalBundleCatalogMetadataFixture('validation');
}, 30000);
afterAll(() => {
  expect(network).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
function fixture(base = training) {
  const files = new Map(base.files),
    binding = { ...base.binding };
  const get = (name: string) => JSON.parse(files.get(name)!);
  const put = (name: string, value: unknown) => files.set(name, JSON.stringify(value) + '\n');
  const reseal = () => {
    const entries = [...files]
      .filter(([n]) => /^(?:shard-\d+\.complete|group-\d+\.(?:complete|batch-\d+))$/.test(n))
      .map(([name, raw]) => ({ name, sha256: sha(raw), bytes: Buffer.byteLength(raw) }));
    put(
      'raw-manifest',
      buildGoalMetadataReplayRawManifest(
        { manifestSha256: binding.manifestSha256, verificationSha256: binding.verificationSha256 },
        entries
      )
    );
    binding.rawManifestSha256 = sha(files.get('raw-manifest')!);
  };
  const readArtifact = vi.fn(async (name: string) => {
    const raw = files.get(name);
    if (raw === undefined) throw Error('missing fixture');
    return new TextEncoder().encode(raw);
  });
  const group = (edit: (g: any) => void) => {
    const g = get('group-00000.complete');
    edit(g);
    const { sha256: _sha, ...body } = g;
    g.sha256 = digest(body);
    put('group-00000.complete', g);
    reseal();
  };
  const batch = (edit: (b: any) => void, index = 0) => {
    const name = `group-00000.batch-${String(index).padStart(5, '0')}`,
      b = get(name);
    edit(b);
    put(name, b);
    group((g) => {
      g.batches[index].sha256 = digest(b);
    });
  };
  const shard = (edit: (s: any) => void, index = 0) => {
    const name = `shard-${String(index).padStart(5, '0')}.complete`,
      s = get(name);
    edit(s);
    const { sha256: _sha, ...body } = s;
    s.sha256 = digest(body);
    put(name, s);
    reseal();
  };
  // Rebind both immutable wire receipts and projected logical receipts, so semantic failures are independently tested.
  const reply = (method: string, params: unknown[], edit: (result: any) => any) => {
    let delta = 0;
    for (const [name] of files)
      if (/^group-\d+\.batch-\d+$/.test(name)) {
        const b = get(name),
          r = b.request.find((r: any) => r.method === method && JSON.stringify(r.params) === JSON.stringify(params));
        if (!r) continue;
        const responses = JSON.parse(b.responseBody),
          response = responses.find((v: any) => v.id === r.id);
        response.result = edit(response.result);
        const old = b.bytes;
        b.responseBody = JSON.stringify(responses);
        b.bytes = Buffer.byteLength(b.responseBody);
        b.responseSha256 = sha(b.responseBody);
        delta += b.bytes - old;
        put(name, b);
      }
    for (const [name] of files)
      if (/^shard-\d+\.complete$/.test(name)) {
        const s = get(name);
        let bytesDelta = 0;
        for (const r of s.rpcEvidence)
          if (r.method === method && JSON.stringify(r.params) === JSON.stringify(params)) {
            const response = JSON.parse(r.responseBody),
              old = Buffer.byteLength(r.responseBody);
            response.result = edit(response.result);
            r.responseBody = JSON.stringify(response);
            r.responseSha256 = sha(r.responseBody);
            bytesDelta += Buffer.byteLength(r.responseBody) - old;
          }
        s.counts.responseBytes += bytesDelta;
        const { sha256: _sha, ...body } = s;
        s.sha256 = digest(body);
        put(name, s);
      }
    group((g) => {
      g.stats.responseBytes += delta;
      for (const b of g.batches) b.sha256 = digest(get(`group-00000.batch-${String(b.index).padStart(5, '0')}`));
    });
  };
  return {
    files,
    binding,
    get,
    put,
    reseal,
    readArtifact,
    group,
    batch,
    shard,
    reply,
    verify: () => verifyGoalBundleCatalogMetadata(binding, { readArtifact, catalog: base.catalog }),
  };
}

describe('browser catalog metadata raw reconstruction', () => {
  it('verifies unchanged raw evidence under a separately pinned outer recovery disclosure', async () => {
    const f = fixture();
    const manifest = f.get('run-protocol');
    const originalManifestSha256 = f.binding.manifestSha256;
    manifest.recovery = {
      kind: 'explicit-metadata-only-recovery-v1',
      originalManifestSha256,
      controllerSha256: 'c'.repeat(64),
      maximumUncertainHttpStarts: 1,
      maximumUncertainLogicalCalls: 32,
      originalInvocationComplete: false,
      receiptTiming: 'replayed-metadata-read-timing-not-original-browser-arrival',
    };
    f.put('run-protocol', manifest);
    f.binding.manifestSha256 = sha(f.files.get('run-protocol')!);
    const verification = f.get('verification');
    verification.preparedManifestSha256 = f.binding.manifestSha256;
    f.put('verification', verification);
    f.binding.verificationSha256 = sha(f.files.get('verification')!);
    f.reseal();
    const result = await f.verify();
    expect(result.blocks).toEqual(training.blocks);
    expect(result.blockProfiles).toHaveLength(66);
    expect(result.provenance.source).toEqual(training.protocol.source);
    expect(result.provenance.arrivalTimeKnown).toBe(false);
    expect(result.provenance.marketDataRead).toBe(false);
    expect(f.binding.manifestSha256).not.toBe(originalManifestSha256);
    expect(f.get('run-protocol').protocol).toEqual(training.protocol);
  });
  it('reconstructs all original20+4 RPCs and actual per-block128→129→130→128 associations', async () => {
    const f = fixture(),
      result = await f.verify();
    expect(result.kind).toBe('goal-bundle-catalog-metadata-v2');
    expect(result.provenance.kind).toBe('raw-verified-training-callback-metadata-catalog-v2');
    expect(result.provenance.source).toEqual(training.protocol.source);
    expect(result.provenance.schema).toEqual(training.protocol.schema);
    expect(result.blocks).toEqual(training.blocks);
    expect(Object.keys(result.blocks[0]).sort()).toEqual(['hash', 'height', 'parentHash', 'timestampMs']);
    expect(result.blockProfiles).toHaveLength(66);
    for (const height of [100, 125, 155, 164, 165]) {
      const profile = result.profileForBlock(hash(height), height);
      expect(profile.profile.specVersion).toBe(versionAt(height));
      expect(profile.profile.genesisHash).toBe(training.catalog.target.profile.genesisHash);
      expect(profile.profileSha256).toBe(digest(profile.profile));
      expect(profile).toBe(result.blockProfiles[height - 100]);
      expect(Object.isFrozen(profile)).toBe(true);
    }
    expect(result.provenance.shards.reduce((n, s) => n + s.logicalReceipts, 0)).toBe(training.protocol.budget.rpcCalls);
    expect(result.provenance.shards).toHaveLength(2);
    expect(result.provenance.groups).toHaveLength(1);
    expect(result.provenance.artifactBytes).toBeGreaterThan(6 * 1024 * 1024);
    expect(result.provenance.arrivalTimeKnown).toBe(false);
    expect(result.provenance.marketDataRead).toBe(false);
    expect(getGoalBundleVerifiedMetadataCatalog(result)).toBe(training.catalog);
    expect(() => getGoalBundleVerifiedMetadataCatalog({ ...result })).toThrow('unowned');
    expect(() => assertGoalBundleMetadata(result, f.binding)).not.toThrow();
    expect(() => assertGoalBundleCatalogMetadata(result, f.binding, training.catalog)).not.toThrow();
    expect(() => assertGoalBundleCatalogMetadata({ ...result }, f.binding)).toThrow('unowned');
    expect(() => assertGoalBundleCatalogMetadata(result, f.binding, validation.catalog)).toThrow('catalog-ownership');
    expect(() => result.profileForBlock(hash(100), 101)).toThrow('profile-block');
    expect(() => result.profileForBlock(hash(99), 99)).toThrow('profile-block');
  });
  it('requires genuine catalog before reads and never admits v2 through old constructor', async () => {
    const f = fixture();
    await expect(
      verifyGoalBundleCatalogMetadata(f.binding, { catalog: { ...training.catalog }, readArtifact: f.readArtifact })
    ).rejects.toThrow('catalog ownership');
    expect(f.readArtifact).not.toHaveBeenCalled();
    await expect(verifyGoalBundleMetadata(f.binding, { readArtifact: f.readArtifact })).rejects.toThrow('protocol');
  });
  it('refuses validation at the training entrypoint and forged validation ownership before reads', async () => {
    const f = fixture(validation);
    await expect(f.verify()).rejects.toThrow('validation-unsupported');
    await expect(
      verifyGoalBundleCatalogValidationMetadata(
        f.binding,
        { catalog: validation.catalog, readArtifact: f.readArtifact },
        { selection: {} as never, binding: {} as never }
      )
    ).rejects.toThrow();
    expect(f.readArtifact).not.toHaveBeenCalled();
  });
  it.each([
    'run-protocol',
    'verification',
    'raw-manifest',
    'blocks-training',
    'shard-00000.complete',
    'group-00000.complete',
    'group-00000.batch-00000',
  ])('rejects changed original %s bytes', async (name) => {
    const f = fixture();
    f.files.set(name, f.files.get(name)! + ' ');
    await expect(f.verify()).rejects.toThrow();
  });
  it.each(['codeHash', 'profileSha256', 'height', 'hash', 'missing', 'duplicate'])(
    'rejects rehashed blockProfiles %s',
    async (field) => {
      const f = fixture();
      f.shard((s) => {
        if (field === 'missing') s.blockProfiles.pop();
        else if (field === 'duplicate') s.blockProfiles.push(s.blockProfiles[0]);
        else
          s.blockProfiles[0][field] = field === 'height' ? 101 : field === 'profileSha256' ? '0'.repeat(64) : hash(999);
      });
      await expect(f.verify()).rejects.toThrow(/block-profile/);
    }
  );
  it('joins sidecar and projected receipt to original wire rather than trusting a rehashed known profile', async () => {
    const f = fixture(),
      replacement = training.catalog.entries[1].profile;
    f.shard((s) => {
      s.blockProfiles[1].codeHash = replacement.codeHash;
      s.blockProfiles[1].profileSha256 = digest(replacement);
      const r = s.rpcEvidence[20 + 4 + 2],
        v = JSON.parse(r.responseBody);
      v.result = replacement.codeHash;
      r.responseBody = JSON.stringify(v);
      r.responseSha256 = sha(r.responseBody);
    });
    await expect(f.verify()).rejects.toThrow('wire-join');
  });
  it.each(['unknown-code', 'wrong-runtime', 'wrong-metadata', 'wrong-header', 'wrong-time'])(
    'rejects fully rehashed semantic %s',
    async (kind) => {
      const f = fixture();
      if (kind === 'unknown-code') f.reply('state_getStorageHash', ['0x3a636f6465', hash(125)], () => hash(987));
      if (kind === 'wrong-runtime')
        f.reply('state_getRuntimeVersion', [hash(130)], (r) => ({ ...r, specVersion: 128, transactionVersion: 128 }));
      if (kind === 'wrong-metadata')
        f.reply('state_getMetadata', [hash(130)], () => training.catalog.entries[0].metadataHex);
      if (kind === 'wrong-header') f.reply('chain_getHeader', [hash(125)], (r) => ({ ...r, parentHash: hash(122) }));
      if (kind === 'wrong-time')
        f.reply(
          'state_getStorage',
          ['0xf0c365c3cf59d671eb72da0e7a4113c49f1f0515f462cdcf84e0f1d6045dfcbb', hash(125)],
          () => '0x0000000000000000'
        );
      await expect(f.verify()).rejects.toThrow();
    }
  );
  it('rejects a same-block known-code contradiction even when both wire and association are rehashed', async () => {
    const f = fixture(),
      replacement = training.catalog.entries[1].profile;
    // Alter only the later block100 read. Its initial anchor observation remains source128.
    let batchIndex = -1;
    for (const [name] of f.files)
      if (/^group-00000\.batch-/.test(name)) {
        const b = f.get(name);
        if (b.request.some((r: any) => r.method === 'state_getStorageHash' && r.params[1] === hash(100)))
          batchIndex = b.index;
      }
    f.batch((b) => {
      const r = b.request.find((r: any) => r.method === 'state_getStorageHash' && r.params[1] === hash(100));
      const replies = JSON.parse(b.responseBody);
      replies.find((v: any) => v.id === r.id).result = replacement.codeHash;
      b.responseBody = JSON.stringify(replies);
      b.bytes = Buffer.byteLength(b.responseBody);
      b.responseSha256 = sha(b.responseBody);
    }, batchIndex);
    f.shard((s) => {
      s.blockProfiles[0].codeHash = replacement.codeHash;
      s.blockProfiles[0].profileSha256 = digest(replacement);
      const r = s.rpcEvidence[22],
        body = JSON.parse(r.responseBody);
      body.result = replacement.codeHash;
      r.responseBody = JSON.stringify(body);
      r.responseSha256 = sha(r.responseBody);
    });
    await expect(f.verify()).rejects.toThrow('block-profile-conflict');
  });
  it('preserves uppercase original metadata response bytes while comparing their exact decoded identity', async () => {
    const f = fixture();
    f.reply('state_getMetadata', [hash(130)], (v: string) => '0x' + v.slice(2).toUpperCase());
    const result = await f.verify();
    expect(result.profileForBlock(hash(125), 125).profile.specVersion).toBe(129);
  });
  it('detaches bindings/dependencies before awaited reads and rejects accessors without executing them', async () => {
    const f = fixture(),
      binding = { ...f.binding },
      deps = { catalog: training.catalog, readArtifact: f.readArtifact };
    const pending = verifyGoalBundleCatalogMetadata(binding, deps);
    binding.blocksSha256 = '0'.repeat(64);
    deps.catalog = {} as never;
    expect((await pending).blocks).toEqual(training.blocks);
    const getter = vi.fn(() => training.catalog),
      bad = { catalog: training.catalog, readArtifact: f.readArtifact };
    Object.defineProperty(bad, 'catalog', { enumerable: true, get: getter });
    await expect(verifyGoalBundleCatalogMetadata(f.binding, bad)).rejects.toThrow('own-data');
    expect(getter).not.toHaveBeenCalled();
  });
  it('revokes returned catalog ownership and profile access after parent abort', async () => {
    const f = fixture(),
      controller = new AbortController(),
      result = await verifyGoalBundleCatalogMetadata(f.binding, {
        catalog: training.catalog,
        readArtifact: f.readArtifact,
        signal: controller.signal,
      });
    controller.abort();
    expect(() => getGoalBundleVerifiedMetadataCatalog(result)).toThrow('aborted');
    expect(() => assertGoalBundleCatalogMetadata(result, f.binding)).toThrow('aborted');
    expect(() => result.profileForBlock(hash(100), 100)).toThrow('aborted');
  });
  it('aborts an uncooperative pending artifact without further reads', async () => {
    const f = fixture(),
      controller = new AbortController(),
      read = vi.fn(() => new Promise<Uint8Array>(() => undefined));
    const pending = verifyGoalBundleCatalogMetadata(f.binding, {
      catalog: training.catalog,
      readArtifact: read,
      signal: controller.signal,
    });
    await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    controller.abort();
    await expect(pending).rejects.toThrow('aborted');
    expect(read).toHaveBeenCalledTimes(1);
  });
  it('uses a real sealed selection for validation and revokes both assertion and profile access on disposal', async () => {
    const harness = await createGoalBundleStudyFixture(),
      fork = harness.fork();
    let verified: GoalBundleCatalogMetadataVerification | undefined,
      admission: GoalBundleMetadataValidationAdmission | undefined;
    const { study } = await fork.create(async (context) => {
      if (context.request.phase === 'validation' && context.request.episodeIndex === 0) {
        admission = {
          selection: context.selection!,
          binding: {
            indexSha256: context.selection!.indexSha256,
            planSha256: context.request.planSha256,
            sourceSha256: context.plan.source.evaluatorSha256,
            candidateSha256: context.request.candidateSha256,
            requestSha256: goalQualificationDigest(context.request),
          },
        };
        const f = fixture(validation);
        verified = await verifyGoalBundleCatalogValidationMetadata(
          f.binding,
          { catalog: validation.catalog, readArtifact: f.readArtifact },
          admission
        );
        expect(verified.provenance.kind).toBe('raw-verified-validation-callback-metadata-catalog-v2');
        expect(() =>
          assertGoalBundleCatalogValidationMetadata(verified, f.binding, admission!, validation.catalog)
        ).not.toThrow();
        await expect(
          verifyGoalBundleCatalogValidationMetadata(
            f.binding,
            { catalog: validation.catalog, readArtifact: f.readArtifact },
            { ...admission, selection: { ...admission.selection } }
          )
        ).rejects.toThrow('unowned-selection');
      }
      return fork.evidence(context);
    });
    try {
      await study.reverify();
      expect(verified).toBeDefined();
    } finally {
      study.dispose();
    }
    expect(() => assertGoalBundleCatalogValidationMetadata(verified, validation.binding, admission!)).toThrow();
    expect(() => verified!.profileForBlock(hash(100), 100)).toThrow();
  }, 90000);
});
