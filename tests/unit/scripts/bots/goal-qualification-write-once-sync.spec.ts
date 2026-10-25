/** Fault-injected publication tests; all journal values and market evidence are invented. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openGoalQualificationStudyStore } from '../../../../scripts/bots/goal-qualification-study-store';
import {
  goalQualificationDigest as digest,
  type GoalQualificationEvaluationRequest,
  type GoalQualificationEpisodeEvidence,
} from '@/features/bot-trading/goal-qualification';
import { syntheticQualificationPlan } from '../../features/bot-trading/goal-qualification-fixtures';

const publication = vi.hoisted(() => ({
  enabled: false,
  directory: '',
  final: '',
  temporary: '',
  failures: [] as string[],
  trace: [] as string[],
  firstDirectorySyncGate: null as Promise<void> | null,
  onFirstDirectorySync: null as (() => void) | null,
}));
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    open: async (...args: Parameters<typeof actual.open>) => {
      const path = String(args[0]);
      const handle = await actual.open(...args);
      if (publication.enabled && path.startsWith(`${publication.directory}/.pending-`)) {
        publication.temporary = path;
        publication.trace.push('temporary-open');
      }
      return new Proxy(handle, {
        get(target, key) {
          if (key === 'sync')
            return async () => {
              if (publication.enabled && path === publication.temporary) {
                publication.trace.push('file-sync');
                if (publication.failures.includes('file-sync')) throw Error('injected-file-sync');
              }
              if (publication.enabled && path === publication.directory && publication.temporary) {
                publication.trace.push('directory-sync');
                if (publication.trace.filter((step) => step === 'directory-sync').length === 1) {
                  publication.onFirstDirectorySync?.();
                  if (publication.firstDirectorySyncGate) await publication.firstDirectorySyncGate;
                }
                if (
                  publication.failures.includes('directory-sync') &&
                  publication.trace.filter((step) => step === 'directory-sync').length === 1
                )
                  throw Error('injected-directory-sync');
              }
              return target.sync();
            };
          const value = Reflect.get(target, key, target);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
    },
    link: async (...args: Parameters<typeof actual.link>) => {
      if (publication.enabled && String(args[1]) === publication.final) {
        publication.trace.push('link');
        if (publication.failures.includes('link')) throw Error('injected-link');
      }
      return actual.link(...args);
    },
    unlink: async (...args: Parameters<typeof actual.unlink>) => {
      if (publication.enabled && String(args[0]) === publication.temporary) {
        publication.trace.push('unlink');
        if (publication.failures.includes('unlink')) throw Error('injected-unlink');
      }
      return actual.unlink(...args);
    },
  };
});

const directories: string[] = [];
const stores: Awaited<ReturnType<typeof openGoalQualificationStudyStore>>[] = [];
async function directory() {
  const result = await mkdtemp(join(tmpdir(), 'goal-write-once-sync-'));
  directories.push(result);
  return result;
}
function traceOwner(path: string, failures: string[] = []) {
  publication.enabled = true;
  publication.directory = path;
  publication.final = join(path, 'owner.json');
  publication.temporary = '';
  publication.failures = failures;
  publication.trace = [];
  publication.firstDirectorySyncGate = null;
  publication.onFirstDirectorySync = null;
}
const ownerOptions = (path: string) => ({ directory: path, sourceSha256: 'a'.repeat(64) });
const publicationOrder = ['temporary-open', 'file-sync', 'link', 'unlink', 'directory-sync'];
afterEach(async () => {
  publication.enabled = false;
  publication.failures = [];
  publication.firstDirectorySyncGate = null;
  publication.onFirstDirectorySync = null;
  for (const store of stores.splice(0)) await store.dispose().catch(() => undefined);
  await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe('write-once qualification journal publication', () => {
  it('fully syncs an exclusive temp, links without replacement, then syncs both directory mutations before returning', async () => {
    const path = await directory();
    traceOwner(path);
    const store = await openGoalQualificationStudyStore(ownerOptions(path));
    stores.push(store);
    expect(publication.trace.slice(0, publicationOrder.length)).toEqual(publicationOrder);
    expect(publication.trace.filter((step) => step === 'directory-sync')).toHaveLength(2); // Constructor's later sync.
    expect(await readdir(path)).not.toContain(publication.temporary.split('/').at(-1));
    expect((await readFile(publication.final, 'utf8')).endsWith('\n')).toBe(true);
  });

  it('holds the constructor unresolved while the final name waits on its first directory sync', async () => {
    const path = await directory();
    traceOwner(path);
    let release!: () => void;
    let entered!: () => void;
    const atFirstDirectorySync = new Promise<void>((resolve) => {
      entered = resolve;
    });
    publication.firstDirectorySyncGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    publication.onFirstDirectorySync = entered;
    let settled = false;
    const opening = openGoalQualificationStudyStore(ownerOptions(path)).finally(() => {
      settled = true;
    });
    try {
      await Promise.race([
        atFirstDirectorySync,
        opening.then(() => {
          throw Error('returned-before-directory-sync');
        }),
      ]);
      expect(publication.trace).toEqual(publicationOrder);
      expect(await readFile(publication.final, 'utf8')).toContain('goal-study-owner-v1');
      await expect(stat(publication.temporary)).rejects.toMatchObject({ code: 'ENOENT' });
      expect(settled).toBe(false);
    } finally {
      release();
      stores.push(await opening);
    }
    expect(settled).toBe(true);
  });

  it('never replaces an existing owner, and cleans and syncs the losing temporary name', async () => {
    const path = await directory();
    const store = await openGoalQualificationStudyStore(ownerOptions(path));
    stores.push(store);
    const original = await readFile(join(path, 'owner.json'));
    traceOwner(path);
    await expect(openGoalQualificationStudyStore(ownerOptions(path))).rejects.toMatchObject({ code: 'EEXIST' });
    expect(publication.trace).toEqual(publicationOrder);
    expect(await readFile(publication.final)).toEqual(original);
    await expect(stat(publication.temporary)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it.each([
    {
      failures: ['file-sync'],
      reason: 'injected-file-sync',
      expected: publicationOrder.slice(0, 2),
      finalExists: false,
    },
    { failures: ['link'], reason: 'injected-link', expected: publicationOrder, finalExists: false },
    { failures: ['unlink'], reason: 'injected-unlink', expected: publicationOrder, finalExists: true },
    { failures: ['directory-sync'], reason: 'injected-directory-sync', expected: publicationOrder, finalExists: true },
    {
      failures: ['unlink', 'directory-sync'],
      reason: 'injected-unlink',
      expected: publicationOrder,
      finalExists: true,
    },
    {
      failures: ['link', 'directory-sync'],
      reason: 'injected-directory-sync',
      expected: publicationOrder,
      finalExists: false,
    },
    {
      failures: ['link', 'unlink', 'directory-sync'],
      reason: 'injected-unlink',
      expected: publicationOrder,
      finalExists: false,
    },
  ])('fails closed on $failures in its original error order', async ({ failures, reason, expected, finalExists }) => {
    const path = await directory();
    traceOwner(path, failures);
    await expect(openGoalQualificationStudyStore(ownerOptions(path))).rejects.toThrow(reason);
    expect(publication.trace).toEqual(expected);
    expect(
      await stat(publication.final).then(
        () => true,
        () => false
      )
    ).toBe(finalExists);
    if (failures.includes('unlink')) expect(publication.trace).toContain('directory-sync');
    if (finalExists) {
      publication.enabled = false;
      await expect(openGoalQualificationStudyStore(ownerOptions(path))).rejects.toMatchObject({ code: 'EEXIST' });
    }
  });

  it('keeps completed replay a fresh checked read and refuses changed raw evidence', async () => {
    const path = await directory();
    const plan = syntheticQualificationPlan();
    const options = { directory: path, sourceSha256: plan.source.evaluatorSha256 };
    const store = await openGoalQualificationStudyStore(options);
    stores.push(store);
    await store.register(plan);
    const candidate = plan.candidates[0];
    const input: GoalQualificationEvaluationRequest = {
      planSha256: digest(plan),
      candidate,
      candidateSha256: digest(candidate),
      phase: 'training',
      partitionIdentitySha256: plan.training.identitySha256,
      startAtMs: plan.training.startAtMs,
      endAtMs: plan.training.startAtMs + 86_400_000,
      episodeIndex: 0,
    };
    const result = await store.evaluate(input, undefined, async (_request, sink) => {
      await sink.retainEvidence('raw', { value: '111' });
      return tinyEvidence(input);
    });
    await store.dispose();
    const reopened = await openGoalQualificationStudyStore(options);
    stores.push(reopened);
    await reopened.register(plan);
    const producer = vi.fn();
    const replay = await reopened.evaluate(input, undefined, producer);
    expect(replay).toEqual(result);
    expect(replay).not.toBe(result);
    expect(Object.isFrozen(replay.opening)).toBe(true);
    expect(producer).not.toHaveBeenCalled();
    const raw = join(path, 'studies', digest(plan), `raw-${digest(input)}`, 'raw.json');
    await writeFile(raw, (await readFile(raw, 'utf8')).replace('111', '222'));
    await expect(reopened.evaluate(input, undefined, producer)).rejects.toThrow('raw-evidence-corrupt');
    expect(producer).not.toHaveBeenCalled();
  });
});

/** Minimal synthetic record for testing durable publication, not economic qualification. */
function tinyEvidence(input: GoalQualificationEvaluationRequest): GoalQualificationEpisodeEvidence {
  return {
    protocol: 'finalized-xyk-execution-validation-v1',
    requestSha256: digest(input),
    dataSha256: 'a'.repeat(64),
    opening: {
      fundedAtMs: input.startAtMs,
      receivedAtMs: input.startAtMs,
      mark: {} as never,
      evidenceSha256: 'b'.repeat(64),
    },
    clock: { protocol: 'finalized-goal-live-clock-v1', events: [] } as never,
    terminal: {
      accountingAtMs: input.endAtMs,
      mark: {} as never,
      successor: {} as never,
      evidenceSha256: 'c'.repeat(64),
    },
    signals: [],
    events: [],
  };
}
