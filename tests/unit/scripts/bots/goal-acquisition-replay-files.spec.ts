// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { prepareGoalAcquisitionReplayFiles } from '../../../../scripts/bots/goal-acquisition-replay-files';
import { assertGoalAcquisitionReplayPreparation } from '../../../../scripts/bots/goal-acquisition-replay';
import { goalAcquisitionReplayFixture, acquisitionDigest, acquisitionSha } from './goal-acquisition-replay-fixture';
vi.unmock('@polkadot/util-crypto');
vi.mock('node:fs/promises', async (original) => {
  const actual = await original<typeof fs>();
  return { ...actual, open: vi.fn(actual.open) };
});
const directories: string[] = [];
afterEach(async () => {
  vi.clearAllMocks();
  vi.mocked(fs.open).mockImplementation((await vi.importActual<typeof fs>('node:fs/promises')).open);
  await Promise.all(directories.splice(0).map((path) => fs.rm(path, { recursive: true, force: true })));
});
/** Materialize only invented fixture data in the real store's exact on-disk naming layout. */
async function fixture() {
  const root = await fs.mkdtemp(join(await fs.realpath(tmpdir()), 'goal-replay-files-'));
  directories.push(root);
  const data = goalAcquisitionReplayFixture();
  const studyRoot = join(root, 'store');
  const parentPlanSha256 = acquisitionDigest(data.registration.plan);
  const parent = join(studyRoot, 'studies', parentPlanSha256);
  const rawDirectory = join(parent, `raw-${data.input.requestSha256}`);
  await fs.mkdir(rawDirectory, { recursive: true });
  const paths = new Map<string, string>();
  for (const [name, text] of data.artifacts) {
    if (name === 'manifest') continue;
    const path = name.startsWith('raw/')
      ? join(rawDirectory, `${name.slice(4)}.json`)
      : join(parent, name === 'registration' ? 'registration.json' : `${name}-${data.input.requestSha256}.json`);
    await fs.writeFile(path, text, { flag: 'wx' });
    paths.set(name, path);
  }
  const manifestPath = join(root, 'manifest.json');
  return {
    data,
    root,
    parent,
    rawDirectory,
    paths,
    input: { studyRoot, parentPlanSha256, requestSha256: data.input.requestSha256, manifestPath },
  };
}

describe('trusted complete training-prefix filesystem adapter', () => {
  it('owns a preparation from every exact original file without changing parent bytes or exposing raw bodies', async () => {
    const f = await fixture();
    const before = await Promise.all([...f.paths.values()].map((path) => fs.readFile(path, 'utf8')));
    const result = await prepareGoalAcquisitionReplayFiles(f.input);
    expect(() => assertGoalAcquisitionReplayPreparation(result.preparation)).not.toThrow();
    const text = await fs.readFile(f.input.manifestPath, 'utf8');
    const manifest = JSON.parse(text);
    expect(result.manifest.sha256).toBe(acquisitionSha(text));
    expect(result.manifest.files).toBe(f.paths.size);
    expect(result.manifest.rawFiles).toBe(f.data.raw.size);
    expect(manifest.files.map((r: { name: string }) => r.name).sort()).toEqual([...f.paths.keys()].sort());
    expect(result.preparation.bindings.parentPlanSha256).toBe(f.input.parentPlanSha256);
    expect(Object.keys(result).sort()).toEqual(['manifest', 'preparation']);
    expect(JSON.stringify(result)).not.toContain('upstream unavailable');
    expect(await Promise.all([...f.paths.values()].map((path) => fs.readFile(path, 'utf8')))).toEqual(before);
    await expect(prepareGoalAcquisitionReplayFiles(f.input)).rejects.toThrow('manifest-exists');
    expect(await fs.readFile(f.input.manifestPath, 'utf8')).toBe(text);
  });
  it.each(['raw-leaf', 'raw-directory', 'ancestor', 'output-parent'] as const)(
    'rejects a symlink at %s',
    async (kind) => {
      const f = await fixture();
      if (kind === 'raw-leaf') {
        const path = f.paths.get('raw/failure.json')!;
        const destination = join(f.root, 'outside.json');
        await fs.rename(path, destination);
        await fs.symlink(destination, path);
      } else if (kind === 'raw-directory') {
        const destination = join(f.root, 'outside-raw');
        await fs.rename(f.rawDirectory, destination);
        await fs.symlink(destination, f.rawDirectory);
      } else if (kind === 'ancestor') {
        const link = join(f.root, 'alias');
        await fs.symlink(f.input.studyRoot, link);
        f.input.studyRoot = link;
      } else {
        const link = join(f.root, 'output-alias');
        await fs.symlink(f.root, link);
        f.input.manifestPath = join(link, 'manifest.json');
      }
      await expect(prepareGoalAcquisitionReplayFiles(f.input)).rejects.toThrow();
    }
  );
  it('rejects directory/special entries and unexpected parent or raw files rather than omitting them', async () => {
    const f = await fixture();
    const path = join(f.rawDirectory, 'extra.json');
    await fs.mkdir(path);
    await expect(prepareGoalAcquisitionReplayFiles(f.input)).rejects.toThrow('file-type-or-size');
    await fs.rm(path, { recursive: true });
    await fs.writeFile(join(f.rawDirectory, 'ignored.txt'), 'x');
    await expect(prepareGoalAcquisitionReplayFiles(f.input)).rejects.toThrow('raw-file-name');
    await fs.unlink(join(f.rawDirectory, 'ignored.txt'));
    await fs.writeFile(join(f.parent, 'selection.json'), '{}');
    await expect(prepareGoalAcquisitionReplayFiles(f.input)).rejects.toThrow('parent-layout');
  });
  it('bounds individual and aggregate bytes before reading sparse oversized files', async () => {
    const f = await fixture();
    const path = join(f.rawDirectory, 'oversized.json');
    let handle = await fs.open(path, 'wx');
    await handle.truncate(32 * 1024 * 1024 + 1);
    await handle.close();
    await expect(prepareGoalAcquisitionReplayFiles(f.input)).rejects.toThrow('file-type-or-size');
    await fs.unlink(path);
    for (let i = 0; i < 17; i++) {
      handle = await fs.open(join(f.rawDirectory, `large-${i}.json`), 'wx');
      await handle.truncate(32 * 1024 * 1024);
      await handle.close();
    }
    await expect(prepareGoalAcquisitionReplayFiles(f.input)).rejects.toThrow('source-size');
  });
  it.each(['change-file', 'add-file'] as const)('rejects %s between inventory and owned verification', async (kind) => {
    const f = await fixture();
    const actual = await vi.importActual<typeof fs>('node:fs/promises');
    let changed = false;
    vi.mocked(fs.open).mockImplementation(async (path, flags, mode) => {
      if (path === f.input.manifestPath && !changed) {
        changed = true;
        if (kind === 'change-file') await fs.appendFile(f.paths.get('raw/failure.json')!, ' ');
        else await fs.writeFile(join(f.rawDirectory, 'extra.json'), '{}');
      }
      return actual.open(path, flags, mode);
    });
    await expect(prepareGoalAcquisitionReplayFiles(f.input)).rejects.toThrow(/file-changed|inventory-changed/);
    expect(changed).toBe(true);
  });
  it('rejects a wrong parent schema/hash and never returns its owned preparation', async () => {
    const f = await fixture();
    const fake = 'f'.repeat(64);
    await fs.rename(f.parent, join(f.input.studyRoot, 'studies', fake));
    await expect(prepareGoalAcquisitionReplayFiles({ ...f.input, parentPlanSha256: fake })).rejects.toThrow(
      'parent-binding'
    );
  });
  it('detects an inode replacement after opening and reading the original file descriptor', async () => {
    const f = await fixture();
    const actual = await vi.importActual<typeof fs>('node:fs/promises');
    const target = f.paths.get('raw/failure.json')!;
    let changed = false;
    vi.mocked(fs.open).mockImplementation(async (path, flags, mode) => {
      const handle = await actual.open(path, flags, mode);
      if (path === target && !changed) {
        const original = handle.read.bind(handle);
        Object.defineProperty(handle, 'read', {
          value: async (...args: unknown[]) => {
            const result = await Reflect.apply(original, handle, args);
            if (!changed) {
              changed = true;
              const body = await fs.readFile(target);
              await fs.rename(target, join(f.root, 'retained-original'));
              await fs.writeFile(target, body, { flag: 'wx' });
            }
            return result;
          },
        });
      }
      return handle;
    });
    await expect(prepareGoalAcquisitionReplayFiles(f.input)).rejects.toThrow('file-changed');
    expect(changed).toBe(true);
  });
  it('rejects path traversal, in-study output, accessors and already-aborted work', async () => {
    const f = await fixture();
    await expect(
      prepareGoalAcquisitionReplayFiles({ ...f.input, manifestPath: join(f.root, 'out') + '/../manifest.json' })
    ).rejects.toThrow('path');
    await expect(
      prepareGoalAcquisitionReplayFiles({ ...f.input, manifestPath: join(f.input.studyRoot, 'manifest.json') })
    ).rejects.toThrow('manifest-inside-study');
    const getter = vi.fn();
    const input = Object.defineProperty({ ...f.input }, 'studyRoot', { enumerable: true, get: getter });
    await expect(prepareGoalAcquisitionReplayFiles(input)).rejects.toThrow('input');
    expect(getter).not.toHaveBeenCalled();
    const controller = new AbortController();
    controller.abort();
    await expect(prepareGoalAcquisitionReplayFiles({ ...f.input, signal: controller.signal })).rejects.toThrow(
      'aborted'
    );
  });
});
