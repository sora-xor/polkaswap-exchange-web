import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const rpc = vi.hoisted(() => ({ connect: vi.fn() }));
vi.mock('../../../../scripts/bots/execution-rpc', () => ({
  EXECUTION_ESTIMATION_ASSUMPTIONS: { nonce: 0, signature: 'public fake' },
  openExecutionReader: rpc.connect,
}));
import {
  executionSourceHashes,
  parseExecutionArguments,
  runExecutionCollector,
} from '../../../../scripts/bots/collect-execution-quotes';

const directories: string[] = [];
afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  rpc.connect.mockReset();
  await Promise.all(directories.splice(0).map((p) => rm(p, { recursive: true, force: true })));
});

describe('explicit execution collection CLI', () => {
  it('requires an exact UTC schedule or an unchanged resume', () => {
    expect(
      parseExecutionArguments([
        '--out',
        'output/example',
        '--start',
        '2026-09-20T00:00:00.000Z',
        '--slots',
        '5',
        '--cadence-ms',
        '60000',
      ])
    ).toMatchObject({
      resume: false,
      startAt: Date.parse('2026-09-20T00:00:00.000Z'),
      slots: 5,
      cadenceMs: 60000,
    });
    expect(parseExecutionArguments(['--out', 'output/example', '--resume'])).toMatchObject({ resume: true });
  });
  it.each([
    [],
    ['--out'],
    ['--out', 'x', '--resume', '--resume'],
    ['--out', 'x', '--resume', '--slots', '5'],
    ['--endpoint', 'other'],
    ['--out', 'x', '--out', 'y'],
    ['--out', 'x', '--start', '2026-09-20', '--slots', '5', '--cadence-ms', '60000'],
    ['--out', 'x', '--start', '2026-02-30T00:00:00.000Z', '--slots', '5', '--cadence-ms', '60000'],
    ['--out', 'x', '--start', '2026-09-20T00:00:00.000Z', '--slots', '1.5', '--cadence-ms', '60000'],
  ])('rejects ambiguous arguments %j', (args) => expect(() => parseExecutionArguments(args)).toThrow());
  it('requires an explicit distinct prior dataset and exact zero-based lot index', () => {
    const base = [
      '--out',
      'output/new',
      '--start',
      '2026-09-20T00:00:00.000Z',
      '--slots',
      '5',
      '--cadence-ms',
      '30000',
    ];
    expect(parseExecutionArguments([...base, '--lot-from', 'output/prior', '--lot-slot', '1'])).toMatchObject({
      lotSource: { directory: expect.stringContaining('/output/prior'), slot: 1 },
    });
    for (const extra of [
      ['--lot-from', 'output/prior'],
      ['--lot-slot', '1'],
      ['--lot-from', 'output/new', '--lot-slot', '1'],
      ['--lot-from', 'output/prior', '--lot-slot', '-1'],
      ['--lot-from', 'output/prior', '--lot-slot', '01'],
      ['--lot-from', 'output/prior', '--lot-slot', '1.5'],
      ['--lot-from', 'output/prior', '--lot-slot', '1440'],
      ['--lot-from', 'output/prior', '--lot-slot', '9007199254740992'],
    ])
      expect(() => parseExecutionArguments([...base, ...extra])).toThrow();
    expect(() =>
      parseExecutionArguments(['--out', 'x', '--resume', '--lot-from', 'output/prior', '--lot-slot', '0'])
    ).toThrow();
  });
  it('fingerprints all collector, custom-type and lock sources deterministically', async () => {
    const hashes = await executionSourceHashes();
    expect(hashes['scripts/bots/execution-evidence.ts']).toMatch(/^[a-f0-9]{64}$/);
    expect(hashes['src/lib/substrate/type-definitions/liquidityProxy.ts']).toMatch(/^[a-f0-9]{64}$/);
    expect(hashes['yarn.lock']).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.keys(hashes)).toEqual(Object.keys(hashes).sort());
    expect(await executionSourceHashes()).toEqual(hashes);
  });
  it('writes the manifest before connecting, retains errors, deduplicates resume, and rejects changed sources', async () => {
    vi.useFakeTimers();
    const now = Date.parse('2026-09-20T00:00:00.000Z');
    vi.setSystemTime(now);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const path = await mkdtemp(join(tmpdir(), 'execution-cli-'));
    directories.push(path);
    rpc.connect.mockImplementation(async () => {
      const manifest = JSON.parse(await readFile(join(path, 'manifest.json'), 'utf8'));
      expect(manifest.purpose).toBe('development');
      expect(manifest.startAt).toBe(now);
      throw new Error('offline fixture');
    });
    await runExecutionCollector([
      '--out',
      path,
      '--start',
      new Date(now).toISOString(),
      '--slots',
      '1',
      '--cadence-ms',
      '60000',
    ]);
    const journal = await readFile(join(path, 'observations.jsonl'), 'utf8');
    expect(JSON.parse(journal)).toMatchObject({
      status: 'error',
      message: 'offline fixture',
      progress: { stage: 'connect' },
    });
    await runExecutionCollector(['--out', path, '--resume']);
    expect(rpc.connect).toHaveBeenCalledTimes(1);
    expect(await readFile(join(path, 'observations.jsonl'), 'utf8')).toBe(journal);
    const manifestPath = join(path, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.sourceHashes['yarn.lock'] = 'f'.repeat(64);
    await writeFile(manifestPath, JSON.stringify(manifest));
    await expect(runExecutionCollector(['--out', path, '--resume'])).rejects.toThrow(
      'Source or fee assumptions changed'
    );
    expect(rpc.connect).toHaveBeenCalledTimes(1);
  });
});
