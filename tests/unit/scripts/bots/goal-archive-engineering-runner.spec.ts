import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { bytes, save } from '../../../../output/go-history/goal-archive-engineering-20260920/run-engineering.mts';
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
  vi.unstubAllGlobals();
});
async function directory() {
  const value = await mkdtemp(join(tmpdir(), 'goal-engineering-runner-'));
  directories.push(value);
  return value;
}
describe('exposed engineering runner persistence', () => {
  it('retains exact sorted-key bytes and matching digest before exposing the final name', async () => {
    const dir = await directory(),
      path = join(dir, 'raw', 'receipt.json');
    const receipt = await save(path, { z: 2, a: { b: [2, 1], a: 'x' } });
    const body = await bytes(path);
    expect(body.toString()).toBe('{"a":{"a":"x","b":[2,1]},"z":2}');
    expect(receipt).toEqual({ sha256: createHash('sha256').update(body).digest('hex'), bytes: body.length });
    expect(await readdir(join(dir, 'raw'))).toEqual(['receipt.json']);
  });
  it('never replaces an existing access marker or raw receipt', async () => {
    const dir = await directory(),
      path = join(dir, 'access.json');
    await save(path, { attempt: 1 });
    await expect(save(path, { attempt: 2 })).rejects.toMatchObject({ code: 'EEXIST' });
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({ attempt: 1 });
    expect(await readdir(dir)).toEqual(['access.json']);
  });
  it('allows only one concurrent publisher of an immutable artifact', async () => {
    const dir = await directory(),
      path = join(dir, 'access.json');
    const result = await Promise.allSettled([save(path, { attempt: 1 }), save(path, { attempt: 2 })]);
    expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(result.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect([1, 2]).toContain(JSON.parse(await readFile(path, 'utf8')).attempt);
    expect(await readdir(dir)).toEqual(['access.json']);
  });
  it('rejects leaf symlinks, directories, empty files and oversized artifacts', async () => {
    const dir = await directory(),
      path = join(dir, 'a.json');
    await writeFile(path, '1234');
    await symlink(path, join(dir, 'link'));
    await expect(bytes(join(dir, 'link'))).rejects.toBeTruthy();
    await expect(bytes(dir)).rejects.toThrow('artifact-size');
    await expect(bytes(path, 3)).rejects.toThrow('artifact-size');
    await writeFile(join(dir, 'empty'), '');
    await expect(bytes(join(dir, 'empty'))).rejects.toThrow('artifact-size');
  });
  it('persisting evidence does not invoke network or start an episode', async () => {
    const fetch = vi.fn(() => {
      throw Error('network forbidden');
    });
    vi.stubGlobal('fetch', fetch);
    const dir = await directory();
    await save(join(dir, 'result.json'), { qualificationEligible: false });
    expect(fetch).not.toHaveBeenCalled();
  });
});
