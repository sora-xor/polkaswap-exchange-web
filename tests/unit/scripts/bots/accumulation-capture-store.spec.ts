// @vitest-environment node
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAccumulationCaptureStore,
  AccumulationCaptureStoreError,
} from '../../../../scripts/bots/accumulation-capture-store';

const probe = vi.hoisted(() => ({ failSync: '', events: [] as string[] }));
vi.mock('node:fs/promises', async (original) => {
  const actual = await original<typeof import('node:fs/promises')>();
  return {
    ...actual,
    open: async (...args: Parameters<typeof actual.open>) => {
      const h = await actual.open(...args),
        filename = String(args[0]);
      return new Proxy(h, {
        get(target, key) {
          if (key === 'sync')
            return async () => {
              probe.events.push(filename);
              if (probe.failSync === filename) throw Error('synthetic sync failure');
              return target.sync();
            };
          const v = Reflect.get(target, key, target);
          return typeof v === 'function' ? v.bind(target) : v;
        },
      });
    },
  };
});
const sha = (v: Uint8Array | string) => createHash('sha256').update(v).digest('hex');
const registration = Buffer.from('{"kind":"invented-registration"}\n');
const roots: string[] = [];
async function setup(extra: Record<string, unknown> = {}) {
  const base = await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()), 'capture-store-test-'));
  roots.push(base);
  const input = {
    baseDirectory: base,
    attemptName: 'attempt-one',
    registrationBytes: registration,
    expectedRegistrationSha256: sha(registration),
    maximumBytes: 16 * 1024 * 1024,
    ...extra,
  };
  return { base, input, create: () => createAccumulationCaptureStore(input) };
}
afterEach(async () => {
  probe.failSync = '';
  probe.events.length = 0;
  await Promise.all(roots.splice(0).map((p) => fs.rm(p, { recursive: true, force: true })));
});
describe('fresh prospective capture filesystem retainer', () => {
  it('copies registration before async work and acknowledges file then directory and base sync', async () => {
    const source = Buffer.from(registration),
      s = await setup({ registrationBytes: source });
    const pending = s.create();
    source.fill(0);
    const store = await pending;
    expect(await fs.readFile(path.join(store.directory, 'registration.json'))).toEqual(registration);
    expect(probe.events).toEqual([path.join(store.directory, 'registration.json'), store.directory, s.base]);
    expect((await fs.stat(store.directory)).mode & 0o777).toBe(0o700);
    expect((await fs.stat(path.join(store.directory, 'registration.json'))).mode & 0o777).toBe(0o600);
  });
  it('serializes three concurrent prefixed writes and binds exact full inventory in a terminal seal', async () => {
    const s = await setup(),
      store = await s.create();
    probe.events.length = 0;
    const values = [
      ['source-rpc-1-outcome.json', '{"metadata":"invented"}\n'],
      ['bootstrap-rpc-1-start.json', '{}\n'],
      ['quote-rpc-1-outcome.json', '{"result":null}\n'],
    ];
    const acks = await Promise.all(values.map(([name, bytes]) => store.retain(name, bytes)));
    for (let i = 0; i < values.length; i++) {
      expect(acks[i]).toEqual({ sha256: sha(values[i][1]), bytes: Buffer.byteLength(values[i][1]) });
      expect(probe.events.slice(2 * i, 2 * i + 2)).toEqual([path.join(store.directory, values[i][0]), store.directory]);
    }
    const sealed = await store.seal({ status: 'complete', reason: null });
    const bytes = await fs.readFile(sealed.path),
      body = JSON.parse(bytes.toString());
    expect(sealed).toMatchObject({ sha256: sha(bytes), bytes: bytes.length });
    expect(body.terminal).toEqual({ status: 'complete', reason: null });
    expect(body.files).toHaveLength(4);
    expect(body.registrationSha256).toBe(sha(registration));
    for (const entry of body.files) {
      const content = await fs.readFile(path.join(store.directory, entry.name));
      expect(entry).toEqual({ name: entry.name, sha256: sha(content), bytes: content.length });
    }
    expect(store.inspection()).toMatchObject({ state: 'sealed', retainedRecords: 5 });
    await expect(store.retain('late.json', '{}')).rejects.toThrow('owner-unavailable');
    await expect(store.seal({ status: 'failed', reason: 'late' })).rejects.toThrow('owner-unavailable');
  });
  it('seals genuine partial failures while preserving their original bytes', async () => {
    const s = await setup(),
      store = await s.create();
    await store.retain('quote-rpc-1-start.json', '{"request":"invented"}');
    await store.retain('quote-rpc-1-outcome.json', '{"failure":"timeout","responseBodyBase64":"ew=="}');
    const out = await store.seal({ status: 'failed', reason: 'rpc-timeout' });
    expect(JSON.parse(await fs.readFile(out.path, 'utf8')).terminal).toEqual({
      status: 'failed',
      reason: 'rpc-timeout',
    });
  });
  it('supports a metadata-sized outcome and rejects records above eight MiB without writing', async () => {
    const s = await setup(),
      store = await s.create();
    const bytes = 'x'.repeat(6 * 1024 * 1024);
    expect(await store.retain('bootstrap-rpc-4-outcome.json', bytes)).toEqual({
      sha256: sha(bytes),
      bytes: bytes.length,
    });
    await expect(store.retain('too-large.json', 'x'.repeat(8 * 1024 * 1024 + 1))).rejects.toThrow('record-text');
    expect(await fs.readdir(store.directory)).not.toContain('too-large.json');
    await store.seal({ status: 'complete', reason: null });
  });
  it('reserves a terminal slot and bytes so budget rejection still permits a failed seal', async () => {
    const s = await setup({ maximumRecords: 3, maximumBytes: registration.length + 65536 + 3 }),
      store = await s.create();
    await store.retain('quote-rpc-1-start.json', '{}\n');
    await expect(store.retain('quote-rpc-1-outcome.json', '{}')).rejects.toThrow('capture-budget');
    const result = await store.seal({ status: 'failed', reason: 'record-limit' });
    expect(JSON.parse(await fs.readFile(result.path, 'utf8')).inventoriedRecords).toBe(2);
    expect(store.inspection().retainedBytes).toBeLessThanOrEqual(s.input.maximumBytes);
  });
  it('reserves aggregate bytes before concurrent writes are queued', async () => {
    const s = await setup({ maximumBytes: registration.length + 65536 + 3 }),
      store = await s.create();
    const a = store.retain('one.json', 'abc');
    await expect(store.retain('two.json', 'd')).rejects.toThrow('capture-budget');
    await a;
    await store.seal({ status: 'failed', reason: 'byte-limit' });
  });
  it('rejects reused directories and basenames, traversal, reserved files and unpaired Unicode', async () => {
    const s = await setup(),
      store = await s.create();
    await expect(s.create()).rejects.toThrow('create-failed');
    for (const name of [
      '../outside.json',
      'sub/file.json',
      '/absolute.json',
      'registration.json',
      'seal.json',
      'UPPER.json',
      'dots..json',
    ])
      await expect(store.retain(name, '{}')).rejects.toThrow('record-name-or-reuse');
    await expect(store.retain('unicode.json', '\ud800')).rejects.toThrow('record-byte-bound');
    const a = store.retain('same.json', 'original');
    await expect(store.retain('same.json', 'replacement')).rejects.toThrow('record-name-or-reuse');
    await a;
    expect(await fs.readFile(path.join(store.directory, 'same.json'), 'utf8')).toBe('original');
  });
  it('rejects bad registration, noncanonical or symlink bases and unsafe attempt names before creation', async () => {
    const s = await setup();
    await expect(
      createAccumulationCaptureStore({ ...s.input, expectedRegistrationSha256: '0'.repeat(64) })
    ).rejects.toThrow('registration-binding');
    await expect(createAccumulationCaptureStore({ ...s.input, baseDirectory: s.base + '/.' })).rejects.toThrow(
      'base-directory'
    );
    await expect(createAccumulationCaptureStore({ ...s.input, attemptName: '../bad' })).rejects.toThrow('attempt-name');
    await expect(createAccumulationCaptureStore({ ...s.input, maximumRecords: null } as never)).rejects.toThrow(
      'limits'
    );
    const link = path.join(s.base, 'link');
    await fs.symlink(s.base, link);
    await expect(createAccumulationCaptureStore({ ...s.input, baseDirectory: link })).rejects.toThrow(
      'unsafe-directory'
    );
    expect(await fs.readdir(s.base)).toEqual(['link']);
  });
  it('retains a partial file and poisons permanently after file sync failure', async () => {
    const s = await setup(),
      store = await s.create();
    probe.failSync = path.join(store.directory, 'failed.json');
    const error = await store.retain('failed.json', 'partial').catch((e) => e);
    expect(error).toBeInstanceOf(AccumulationCaptureStoreError);
    expect(error.recoveryRequired).toBe(true);
    expect(await fs.readFile(probe.failSync, 'utf8')).toBe('partial');
    expect(store.inspection().state).toBe('poisoned');
    probe.failSync = '';
    await expect(store.seal({ status: 'failed', reason: 'io' })).rejects.toThrow('owner-poisoned');
    await expect(store.retain('another.json', '{}')).rejects.toThrow('owner-poisoned');
    await expect(s.create()).rejects.toThrow();
  });
  it('rejects directory-sync uncertainty and all already queued followers', async () => {
    const s = await setup(),
      store = await s.create();
    probe.failSync = store.directory;
    const outcomes = await Promise.allSettled([store.retain('first.json', 'a'), store.retain('second.json', 'b')]);
    expect(outcomes.map((r) => r.status)).toEqual(['rejected', 'rejected']);
    expect(await fs.readdir(store.directory)).toEqual(['first.json', 'registration.json']);
    expect(store.inspection().state).toBe('poisoned');
  });
  it.each(['extra', 'missing', 'changed', 'symlink'] as const)(
    'refuses a terminal seal for %s inventory',
    async (issue) => {
      const s = await setup(),
        store = await s.create();
      await store.retain('original.json', 'original');
      const p = path.join(store.directory, 'original.json');
      if (issue === 'extra') await fs.writeFile(path.join(store.directory, 'unexpected.json'), 'extra');
      if (issue === 'missing') await fs.unlink(p);
      if (issue === 'changed') await fs.writeFile(p, 'mutated!');
      if (issue === 'symlink') {
        await fs.unlink(p);
        await fs.symlink(path.join(store.directory, 'registration.json'), p);
      }
      await expect(store.seal({ status: 'complete', reason: null })).rejects.toThrow('io-or-inventory-uncertain');
      expect(store.inspection().state).toBe('poisoned');
      expect(await fs.readdir(store.directory)).not.toContain('seal.json');
    }
  );
  it('blocks new writes as soon as seal is queued but includes earlier queued records', async () => {
    const s = await setup(),
      store = await s.create();
    const write = store.retain('first.json', 'a'),
      seal = store.seal({ status: 'failed', reason: 'stopped' });
    await expect(store.retain('late.json', 'b')).rejects.toThrow('seal-started');
    await write;
    expect(JSON.parse(await fs.readFile((await seal).path, 'utf8')).files).toHaveLength(2);
  });
  it('preserves failed creation and terminal sync uncertainty rather than resetting', async () => {
    const s = await setup();
    probe.failSync = s.base;
    await expect(s.create()).rejects.toMatchObject({ recoveryRequired: true });
    expect(await fs.readFile(path.join(s.base, 'attempt-one', 'registration.json'))).toEqual(registration);
    probe.failSync = '';
    const t = await setup(),
      store = await t.create();
    probe.failSync = path.join(store.directory, 'seal.json');
    await expect(store.seal({ status: 'complete', reason: null })).rejects.toMatchObject({ recoveryRequired: true });
    expect(store.inspection().state).toBe('poisoned');
    expect(await fs.readdir(store.directory)).toContain('seal.json');
    probe.failSync = '';
    await expect(t.create()).rejects.toThrow();
  });
});
