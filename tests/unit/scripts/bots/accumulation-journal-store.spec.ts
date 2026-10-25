// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import {
  canonicalAccumulationJournalJson as canonical,
  openAccumulationJournalStore as openStore,
  openAccumulationJournalStoreForTesting,
  type AccumulationEvidenceReference,
  type AccumulationJournalHead,
  type AccumulationJournalStore,
} from '../../../../scripts/bots/accumulation-journal-store';

const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const registrationBytes = Buffer.from('invented-registration-only');
const registration = { episodeId: 'synthetic-001', sha256: sha(registrationBytes), bytes: registrationBytes };
const directories: string[] = [];
const owners: AccumulationJournalStore[] = [];
afterEach(async () => {
  for (const owner of owners.splice(0)) await owner.close().catch(() => {});
  for (const directory of directories.splice(0)) await fs.rm(directory, { recursive: true, force: true });
});
async function location() {
  const directory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'accumulation-journal-test-')));
  directories.push(directory);
  return path.join(directory, 'journal');
}
function record(head: AccumulationJournalHead, evidence: AccumulationEvidenceReference[], kind = 'opening') {
  // Storage fixtures deliberately claim no authenticated source/reducer outcome.
  return (
    canonical({
      kind,
      episodeId: head.episodeId,
      registrationSha256: head.registrationSha256,
      sequence: head.recordCount + 1,
      previousRecordSha256: head.headSha256,
      expectedReducerRevision: head.recordCount,
      input: { fixture: 'synthetic' },
      evidence,
      result: { status: 'recorded', stateSha256: 'a'.repeat(64), reason: null, details: [] },
    }) + '\n'
  );
}
async function create() {
  const directory = await location();
  const owner = await openStore(directory, registration, null);
  owners.push(owner);
  const ref = await owner.retainEvidence('synthetic-mark', 'mark-1', Buffer.from('invented bytes'));
  return { directory, owner, ref, empty: (await owner.snapshot()).head };
}

describe('cooperative accumulation journal storage', () => {
  it('creates, appends and reopens the exact prefix without claiming source authority', async () => {
    const { directory, owner, ref, empty } = await create();
    const line = record(empty, [ref]);
    const first = await owner.append(empty, line);
    expect(first.head).toMatchObject({ recordCount: 1, headSha256: sha(line), prefixSha256: sha(line) });
    expect(first.evidenceAuthentication).toBe('registered-bytes-only');
    expect(first.financialActions).toBe(false);
    first.head.recordCount = 100; // returned state cannot mutate the owner.
    const held = await owner.snapshot();
    await owner.close();
    const reopened = await openStore(directory, registration, held.head);
    owners.push(reopened);
    expect(await reopened.snapshot()).toEqual(held);
    await expect(openStore(directory, registration, null)).rejects.toThrow();
  });
  it('rejects a second writer and never steals an existing lock', async () => {
    const { directory, owner } = await create();
    await expect(openStore(directory, registration, (await owner.snapshot()).head)).rejects.toThrow();
    expect((await owner.snapshot()).head.recordCount).toBe(0);
  });
  it('does not accept creation before the new root entry is durably synced', async () => {
    const directory = await location();
    await expect(
      openAccumulationJournalStoreForTesting(directory, registration, null, {
        ...fs,
        open: (async (...args: Parameters<typeof fs.open>) => {
          const handle = await fs.open(...args);
          if (String(args[0]) === path.dirname(directory))
            handle.sync = async () => {
              throw new Error('parent sync');
            };
          return handle;
        }) as typeof fs.open,
      })
    ).rejects.toMatchObject({ recoveryRequired: true });
    expect(await fs.readdir(directory)).toContain('LOCK');
  });
  it('snapshots the independently supplied expected head before asynchronous I/O', async () => {
    const { directory, owner, empty } = await create();
    await owner.close();
    const expected = { ...empty };
    let release!: () => void;
    const delay = new Promise<void>((resolve) => {
      release = resolve;
    });
    const opening = openAccumulationJournalStoreForTesting(directory, registration, expected, {
      ...fs,
      realpath: (async (file: Parameters<typeof fs.realpath>[0]) => {
        await delay;
        return fs.realpath(file);
      }) as typeof fs.realpath,
    });
    expected.recordCount = 99;
    expected.prefixSha256 = 'a'.repeat(64);
    release();
    const reopened = await opening;
    owners.push(reopened);
    expect((await reopened.snapshot()).head).toEqual(empty);
  });
  it('requires reopened lock directory durability before returning ownership', async () => {
    const { directory, owner, empty } = await create();
    await owner.close();
    await expect(
      openAccumulationJournalStoreForTesting(directory, registration, empty, {
        ...fs,
        open: (async (...args: Parameters<typeof fs.open>) => {
          const handle = await fs.open(...args);
          if (String(args[0]) === directory)
            handle.sync = async () => {
              throw new Error('lock directory sync');
            };
          return handle;
        }) as typeof fs.open,
      })
    ).rejects.toMatchObject({ recoveryRequired: true });
    expect(await fs.readdir(directory)).toContain('LOCK');
  });
  it('latches quarantine even while another operation is waiting for I/O', async () => {
    const directory = await location();
    let armed = false,
      reached!: () => void,
      release!: () => void;
    const entered = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const owner = await openAccumulationJournalStoreForTesting(directory, registration, null, {
      ...fs,
      lstat: (async (...args: Parameters<typeof fs.lstat>) => {
        if (armed && String(args[0]) === path.join(directory, 'HEAD.json')) {
          reached();
          await blocked;
        }
        return fs.lstat(...args);
      }) as typeof fs.lstat,
    });
    owners.push(owner);
    armed = true;
    const pending = owner.snapshot();
    await entered;
    await expect(owner.quarantine('concurrent-operation-failed')).rejects.toThrow(/unavailable/);
    release();
    await expect(pending).rejects.toMatchObject({ recoveryRequired: true });
    await expect(owner.snapshot()).rejects.toThrow(/unavailable/);
    await owner.close();
    expect(await fs.readdir(directory)).toContain('LOCK');
  });
  it('rejects stale heads, duplicate openings and noncanonical duplicate-key records before writing', async () => {
    const { owner, ref, empty } = await create();
    const first = await owner.append(empty, record(empty, [ref]));
    await expect(owner.append(empty, record(empty, [ref]))).rejects.toThrow(/stale/);
    await expect(owner.append(first.head, record(first.head, [ref]))).rejects.toThrow(/opening/);
    const next = record(first.head, [ref], 'valuation');
    await expect(owner.append(first.head, next.replace('"kind":', '"kind":"bad","kind":'))).rejects.toThrow(
      /canonical/
    );
    const second = await owner.append(first.head, next);
    expect(second.head.recordCount).toBe(2);
  });
  it('detects missing first, middle or tail records against the retained expected head', async () => {
    for (const missing of ['000001.json', '000002.json', '000003.json']) {
      const { directory, owner, ref, empty } = await create();
      let current = await owner.append(empty, record(empty, [ref]));
      for (let i = 0; i < 2; i++) current = await owner.append(current.head, record(current.head, [ref], 'valuation'));
      await owner.close();
      await fs.unlink(path.join(directory, 'records', missing));
      await expect(openStore(directory, registration, current.head)).rejects.toMatchObject({ recoveryRequired: true });
      expect((await fs.lstat(path.join(directory, 'LOCK'))).isFile()).toBe(true);
    }
  });
  it('detects changed registration and evidence instead of adopting a self-reported hash', async () => {
    const { directory, owner, ref, empty } = await create();
    await owner.append(empty, record(empty, [ref]));
    await fs.writeFile(path.join(directory, 'evidence', 'mark-1.bytes'), 'changed');
    await expect(owner.snapshot()).rejects.toMatchObject({ recoveryRequired: true });
    await expect(owner.retainEvidence('synthetic', 'new', Buffer.from('x'))).rejects.toThrow(/unavailable/);
    const other = await create();
    await fs.writeFile(path.join(other.directory, 'registration.bytes'), 'replacement');
    await expect(other.owner.snapshot()).rejects.toMatchObject({ recoveryRequired: true });
  });
  it('rejects symlinked roots and owned records, head, evidence or lock files', async () => {
    const first = await create();
    const link = path.join(path.dirname(first.directory), 'link');
    await fs.symlink(first.directory, link);
    await expect(openStore(link, registration, first.empty)).rejects.toThrow();
    for (const relative of ['HEAD.json', 'evidence/mark-1.bytes', 'LOCK', 'records/000001.json']) {
      const { directory, owner, ref, empty } = await create();
      await owner.append(empty, record(empty, [ref]));
      const target = path.join(directory, relative),
        copy = path.join(path.dirname(directory), 'outside');
      await fs.copyFile(target, copy);
      await fs.unlink(target);
      await fs.symlink(copy, target);
      await expect(owner.snapshot()).rejects.toMatchObject({ recoveryRequired: true });
    }
  });
  it('keeps an orphan record and pending head after a simulated crash before head replacement', async () => {
    const directory = await location();
    const owner = await openAccumulationJournalStoreForTesting(directory, registration, null, {
      ...fs,
      rename: async () => {
        throw new Error('injected rename crash');
      },
    });
    owners.push(owner);
    const ref = await owner.retainEvidence('synthetic', 'mark', Buffer.from('x'));
    const empty = (await owner.snapshot()).head;
    await expect(owner.append(empty, record(empty, [ref]))).rejects.toMatchObject({ recoveryRequired: true });
    expect(await fs.readdir(path.join(directory, 'records'))).toEqual(['000001.json']);
    expect(JSON.parse(await fs.readFile(path.join(directory, 'HEAD.json'), 'utf8')).recordCount).toBe(0);
    expect(await fs.readdir(directory)).toContain('HEAD.pending');
    await owner.close();
    await expect(openStore(directory, registration, empty)).rejects.toThrow();
  });
  it('returns no success when directory durability fails after the head has been replaced', async () => {
    const directory = await location();
    let armed = false;
    const owner = await openAccumulationJournalStoreForTesting(directory, registration, null, {
      ...fs,
      open: (async (...args: Parameters<typeof fs.open>) => {
        const handle = await fs.open(...args);
        if (armed && String(args[0]) === directory)
          handle.sync = async () => {
            throw new Error('injected sync crash');
          };
        return handle;
      }) as typeof fs.open,
    });
    owners.push(owner);
    const ref = await owner.retainEvidence('synthetic', 'mark', Buffer.from('x'));
    const empty = (await owner.snapshot()).head;
    armed = true;
    await expect(owner.append(empty, record(empty, [ref]))).rejects.toMatchObject({ recoveryRequired: true });
    expect(JSON.parse(await fs.readFile(path.join(directory, 'HEAD.json'), 'utf8')).recordCount).toBe(1);
    await expect(owner.snapshot()).rejects.toThrow(/unavailable/);
    await owner.close();
    expect(await fs.readdir(directory)).toContain('LOCK');
  });
  it('matches Python ASCII encoding and refuses unsafe, sparse or executable values', () => {
    expect(canonical({ z: '🦊é\u007f', a: 1 })).toBe('{"a":1,"z":"\\ud83e\\udd8a\\u00e9\\u007f"}');
    for (const value of [
      NaN,
      1.5,
      2 ** 53,
      new Array(2),
      {
        get x() {
          throw new Error('must not run');
        },
      },
      { nonAsciiKeyé: 1 },
      { x: 'x'.repeat(400000) },
    ])
      expect(() => canonical(value)).toThrow();
  });
});
