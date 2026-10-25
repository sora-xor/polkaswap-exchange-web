import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonicalEvidenceJson } from '../../../../scripts/bots/execution-evidence';
import { createExecutionManifest } from '../../../../scripts/bots/execution-store';
import {
  parseEpisodeReplayArguments,
  executionEpisodeSourceHashes,
  runEpisodeReplay,
  EXECUTION_EPISODE_CONTROLS,
} from '../../../../scripts/bots/replay-execution-episode';

const dirs: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(dirs.splice(0).map((p) => rm(p, { recursive: true, force: true })));
});

describe('offline immutable episode reports', () => {
  it('requires explicit source and new output, and exposes no parameter search', () => {
    expect(parseEpisodeReplayArguments(['--dataset', 'output/a', '--out', 'output/report.json'])).toMatchObject({
      directory: expect.stringContaining('/output/a'),
      output: expect.stringContaining('/output/report.json'),
    });
    for (const args of [
      [],
      ['--dataset', 'a'],
      ['--dataset', 'a', '--out'],
      ['--dataset', 'a', '--out', 'a/manifest.json'],
      ['--dataset', 'a', '--out', 'a/observations.jsonl'],
      ['--dataset', 'a', '--out', 'a'],
      ['--dataset', 'a', '--dataset', 'b'],
      ['--dataset', 'a', '--out', 'b', '--policy', 'best'],
      ['--network', 'remote', '--out', 'b'],
    ])
      expect(() => parseEpisodeReplayArguments(args)).toThrow();
    expect(EXECUTION_EPISODE_CONTROLS).toHaveLength(5);
  });
  it('fingerprints the runtime fee, reserve and goal dependencies deterministically', async () => {
    const hashes = await executionEpisodeSourceHashes();
    for (const path of [
      'src/features/bot-trading/goalAdmission.ts',
      'src/features/bot-trading/allocation.ts',
      'src/lib/substrate/math/index.ts',
      'scripts/bots/execution-replay.ts',
    ])
      expect(hashes[path]).toMatch(/^[a-f0-9]{64}$/);
    expect(await executionEpisodeSourceHashes()).toEqual(hashes);
  });
  it('reports an unavailable opening without fabricated performance and never overwrites evidence or a report', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const root = await mkdtemp(join(tmpdir(), 'episode-offline-'));
    dirs.push(root);
    const source = join(root, 'source');
    await mkdir(source);
    const manifest = createExecutionManifest(
      { startAt: 2000000, slots: 3, cadenceMs: 60000 },
      { fixture: 'a'.repeat(64) },
      { nonce: 0 },
      1999000
    );
    const manifestText = canonicalEvidenceJson(manifest) + '\n';
    await writeFile(join(source, 'manifest.json'), manifestText);
    await writeFile(join(source, 'observations.jsonl'), '');
    const output = join(root, 'report.json');
    await runEpisodeReplay(['--dataset', source, '--out', output]);
    const before = await readFile(output, 'utf8');
    const report = JSON.parse(before);
    expect(report.runs).toHaveLength(5);
    expect(
      report.runs.every(
        (r: { status: string; performance?: unknown }) => r.status === 'opening-unavailable' && !r.performance
      )
    ).toBe(true);
    expect(report.comparisons).toEqual([]);
    expect(report).toMatchObject({ qualifiedStrategy: false, actualTransactions: 0 });
    await expect(runEpisodeReplay(['--dataset', source, '--out', output])).rejects.toMatchObject({ code: 'EEXIST' });
    expect(await readFile(output, 'utf8')).toBe(before);
    expect(await readFile(join(source, 'manifest.json'), 'utf8')).toBe(manifestText);
    await writeFile(join(source, 'observations.jsonl'), '{');
    await expect(runEpisodeReplay(['--dataset', source, '--out', join(root, 'other.json')])).rejects.toThrow(
      'Incomplete journal tail'
    );
  });
});
