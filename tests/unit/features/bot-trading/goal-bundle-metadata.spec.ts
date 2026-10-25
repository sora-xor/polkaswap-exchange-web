// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { assertGoalBundleMetadata, verifyGoalBundleMetadata } from '@/features/bot-trading/goal-bundle-metadata';
import { buildGoalMetadataReplayRawManifest } from '../../../../scripts/bots/goal-qualification-metadata-replay';
import {
  createGoalBundleMetadataFixture,
  metadataFixtureDigest as digest,
  metadataFixtureSha as sha,
} from '../../../fixtures/bots/goal-bundle-metadata';
vi.unmock('@polkadot/util-crypto');
const hash = (height: number) => `0x${height.toString(16).padStart(64, '0')}`;
let base: Awaited<ReturnType<typeof createGoalBundleMetadataFixture>>;
beforeAll(async () => {
  base = await createGoalBundleMetadataFixture();
}, 30000);
function fixture() {
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
    verify: () => verifyGoalBundleMetadata(binding, { readArtifact }),
  };
}
describe('browser raw callback metadata reconstruction', () => {
  it('reconstructs original collector blocks, joins every original wire and preserves exact provenance', async () => {
    const f = fixture(),
      network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(Error('no network'));
    try {
      const verified = await f.verify();
      expect(verified.blocks).toEqual(base.blocks);
      expect(verified.blocks).not.toBe(base.blocks);
      expect(verified.firstHeight).toBe(100);
      expect(verified.lastHeight).toBe(165);
      expect(verified.provenance.source).toEqual(base.protocol.source);
      expect(verified.provenance.schema).toEqual(base.protocol.schema);
      expect(verified.provenance.arrivalTimeKnown).toBe(false);
      expect(verified.provenance.marketDataRead).toBe(false);
      expect(verified.provenance.attestation).toBe('rpc-canonical-finalized');
      expect(verified.provenance.shards).toHaveLength(2);
      expect(verified.provenance.groups).toHaveLength(1);
      expect(verified.provenance.shards.reduce((n, s) => n + s.logicalReceipts, 0)).toBe(base.protocol.budget.rpcCalls);
      expect(new Set(f.readArtifact.mock.calls.map(([n]) => n)).size).toBe(f.readArtifact.mock.calls.length);
      expect(verified.provenance.artifactReads).toBe(f.readArtifact.mock.calls.length);
      expect(Object.isFrozen(verified.blocks[0])).toBe(true);
      expect(Object.isFrozen(verified.provenance.source.finalizedSource)).toBe(true);
      expect(() => assertGoalBundleMetadata(verified, f.binding)).not.toThrow();
      expect(() => assertGoalBundleMetadata({ ...verified }, f.binding)).toThrow('unowned');
      expect(() => assertGoalBundleMetadata(verified, { ...f.binding, blocksSha256: 'f'.repeat(64) })).toThrow(
        'unowned'
      );
      expect(f.binding.blocksFileSha256).not.toBe(f.binding.blocksSha256);
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });
  it('rejects validation admission and malformed caller pins before reading anything', async () => {
    const f = fixture();
    Object.assign(f.binding, { partition: 'validation' });
    await expect(f.verify()).rejects.toThrow('validation-unsupported');
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
  ])('rejects changed exact file bytes for %s', async (name) => {
    const f = fixture();
    f.files.set(name, f.files.get(name)! + ' ');
    await expect(f.verify()).rejects.toThrow();
  });
  it('rejects a missing original batch rather than trusting complete shard projections', async () => {
    const f = fixture();
    f.files.delete('group-00000.batch-00000');
    await expect(f.verify()).rejects.toThrow('missing fixture');
  });
  it.each(['partial', 'status', 'digest', 'bytes', 'time', 'mapping', 'logical-duplicate', 'extra-result', 'method'])(
    'rejects rehashed wire %s',
    async (kind) => {
      const f = fixture();
      f.batch((b) => {
        if (kind === 'partial') b.complete = false;
        if (kind === 'status') b.httpStatus = 502;
        if (kind === 'digest') b.responseSha256 = 'f'.repeat(64);
        if (kind === 'bytes') b.bytes++;
        if (kind === 'time') b.completedAtMs = b.startedAtMs - 1;
        if (kind === 'mapping') b.mapping[0].wireId = 99;
        if (kind === 'logical-duplicate') b.mapping[0].requests.push(b.mapping[0].requests[0]);
        if (kind === 'extra-result') {
          b.responseBody = JSON.stringify([...JSON.parse(b.responseBody), { jsonrpc: '2.0', id: 99, result: null }]);
          b.bytes = Buffer.byteLength(b.responseBody);
          b.responseSha256 = sha(b.responseBody);
        }
        if (kind === 'method') b.request[0].method = 'system_health';
      });
      await expect(f.verify()).rejects.toThrow();
    }
  );
  it.each(['projection', 'logical-body', 'acquisition', 'logical-order', 'counts'])(
    'rejects rehashed shard %s',
    async (kind) => {
      const f = fixture();
      f.shard((s) => {
        if (kind === 'projection') s.blocks[0].timestampMs++;
        if (kind === 'logical-body') {
          const r = s.rpcEvidence[0];
          r.responseBody += ' ';
          r.responseSha256 = sha(r.responseBody);
          s.counts.responseBytes++;
        }
        if (kind === 'acquisition') s.rpcEvidence[0].completedAt = '2000-01-01T00:00:00.000Z';
        if (kind === 'logical-order') s.rpcEvidence.reverse();
        if (kind === 'counts') s.counts.responseBytes++;
      });
      await expect(f.verify()).rejects.toThrow();
    }
  );
  it.each(['genesis', 'finality', 'runtime', 'code', 'timestamp', 'parent', 'height', 'metadata'])(
    'rechecks raw %s semantics even after all byte, value and wire projections are rebound',
    async (kind) => {
      const f = fixture();
      if (kind === 'genesis') f.reply('chain_getBlockHash', [0], () => hash(1));
      if (kind === 'finality') f.reply('chain_getHeader', [hash(1265)], (h) => ({ ...h, number: '0x1' }));
      if (kind === 'runtime') f.reply('state_getRuntimeVersion', [hash(100)], (v) => ({ ...v, specVersion: 131 }));
      if (kind === 'code') f.reply('state_getStorageHash', ['0x3a636f6465', hash(101)], () => hash(901));
      if (kind === 'timestamp')
        f.reply(
          'state_getStorage',
          ['0xf0c365c3cf59d671eb72da0e7a4113c49f1f0515f462cdcf84e0f1d6045dfcbb', hash(101)],
          () => null
        );
      if (kind === 'parent') f.reply('chain_getHeader', [hash(101)], (h) => ({ ...h, parentHash: hash(99) }));
      if (kind === 'height') f.reply('chain_getHeader', [hash(101)], (h) => ({ ...h, number: '0x66' }));
      if (kind === 'metadata') f.reply('state_getMetadata', [hash(100)], () => '0x00');
      await expect(f.verify()).rejects.toThrow();
    }
  );
  it('preserves acquisition epochs without treating them as block times or modeled arrival', async () => {
    const f = fixture(),
      original = await f.verify();
    for (let index = 0; index < 2; index++)
      f.shard((s) => {
        s.rpcEvidence.forEach((r: any, i: number) => {
          r.requestedAt = new Date(1000 + i * 2).toISOString();
          r.completedAt = new Date(1001 + i * 2).toISOString();
        });
      }, index);
    const shifted = await f.verify();
    expect(shifted.blocks).toEqual(original.blocks);
    expect(shifted.provenance.binding.rawManifestSha256).not.toBe(original.provenance.binding.rawManifestSha256);
    expect(shifted.provenance.shards[0].firstRequestedAt).toBe('1970-01-01T00:00:01.000Z');
    expect(shifted.provenance.arrivalTimeKnown).toBe(false);
  });
  it('verifies separately resumed groups and enforces pacing across group boundaries', async () => {
    const f = await createGoalBundleMetadataFixture({ maximumNewShards: 1 });
    const verified = await verifyGoalBundleMetadata(f.binding, { readArtifact: f.readArtifact });
    expect(verified.provenance.groups).toHaveLength(2);
    expect(verified.blocks).toEqual(base.blocks);
    const name = 'group-00001.batch-00000',
      batch = JSON.parse(f.files.get(name)!);
    batch.startedAtMs = verified.provenance.groups[0].batches.at(-1)!.startedAtMs;
    batch.completedAtMs = batch.startedAtMs;
    f.files.set(name, JSON.stringify(batch) + '\n');
    const group = JSON.parse(f.files.get('group-00001.complete')!);
    group.batches[0].sha256 = digest(batch);
    const { sha256: _sha, ...body } = group;
    group.sha256 = digest(body);
    f.files.set('group-00001.complete', JSON.stringify(group) + '\n');
    f.reseal();
    await expect(verifyGoalBundleMetadata(f.binding, { readArtifact: f.readArtifact })).rejects.toThrow('batch');
  });
  it.each(['budget', 'coverage', 'source', 'schema', 'verification'])(
    'rejects rehashed pinned %s inconsistencies',
    async (kind) => {
      const f = fixture(),
        wrapper = f.get('run-protocol'),
        verification = f.get('verification');
      if (kind === 'budget') wrapper.protocol.budget.rpcCalls++;
      if (kind === 'coverage') wrapper.protocol.ranges[0].first.height++;
      if (kind === 'source')
        wrapper.protocol.source.schemaAnchor.height = wrapper.protocol.source.finalizedSource.height + 1;
      if (kind === 'schema') wrapper.protocol.schema.type = 'u128';
      if (kind === 'verification') verification.networkAttempts = 1;
      wrapper.protocolSha256 = digest(wrapper.protocol);
      f.put('run-protocol', wrapper);
      f.binding.manifestSha256 = sha(f.files.get('run-protocol')!);
      verification.protocolSha256 = wrapper.protocolSha256;
      verification.preparedManifestSha256 = f.binding.manifestSha256;
      f.put('verification', verification);
      f.binding.verificationSha256 = sha(f.files.get('verification')!);
      f.reseal();
      await expect(f.verify()).rejects.toThrow();
    }
  );
  it('aborts a blocked artifact read and rejects pre-aborted dependency', async () => {
    const controller = new AbortController(),
      readArtifact = vi.fn(() => new Promise<Uint8Array>(() => {}));
    const pending = verifyGoalBundleMetadata(base.binding, { readArtifact, signal: controller.signal });
    await Promise.resolve();
    controller.abort();
    await expect(pending).rejects.toThrow('aborted');
    const unopened = vi.fn();
    await expect(
      verifyGoalBundleMetadata(base.binding, { readArtifact: unopened, signal: controller.signal })
    ).rejects.toThrow('aborted');
    expect(unopened).not.toHaveBeenCalled();
  });
  it('requires callback byte identity distinct from normalized block digest', async () => {
    const f = fixture();
    f.binding.blocksSha256 = f.binding.blocksFileSha256;
    await expect(f.verify()).rejects.toThrow('blocks-digest');
  });
});
