import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { runPicomatchAudit } from '../../../../scripts/security/audit-picomatch.mjs';

const requireInstalled = createRequire(import.meta.url);
const addressed = { id: 1247710, severity: 'high', url: 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf' };

/** Supply a local copy of an npm bulk-advisory response without contacting the registry. */
function auditOptions(payload: unknown) {
  return {
    fetchImpl: vi.fn().mockResolvedValue(new Response(JSON.stringify(payload))),
    stdout: { write: vi.fn() },
    stderr: { write: vi.fn() },
  };
}

describe('Picomatch upstream advisory monitoring', () => {
  it('queries the original version and visibly records the reviewed fix for the verified fork', async () => {
    const options = auditOptions({ picomatch: [addressed] });
    expect(await runPicomatchAudit(options)).toBe(0);
    expect(options.fetchImpl).toHaveBeenCalledWith(
      'https://registry.npmjs.org/-/npm/v1/security/advisories/bulk',
      expect.objectContaining({ body: JSON.stringify({ picomatch: ['4.0.7'], '@ryotsu/picomatch': ['4.0.7-a'] }) })
    );
    expect(options.stdout.write).toHaveBeenCalledWith(expect.stringContaining(addressed.url));
  });

  it('fails on an additional upstream advisory, including one of lower severity', async () => {
    const additional = { id: 1, severity: 'low', url: 'https://github.com/advisories/GHSA-xxxx-yyyy-zzzz' };
    const options = auditOptions({ picomatch: [addressed, additional] });
    expect(await runPicomatchAudit(options)).toBe(1);
    expect(options.stderr.write).toHaveBeenCalledWith(expect.stringContaining(additional.url));
  });

  it('fails if the registry flags the scoped fork even under the same upstream advisory URL', async () => {
    const options = auditOptions({ picomatch: [addressed], '@ryotsu/picomatch': [addressed] });
    expect(await runPicomatchAudit(options)).toBe(1);
    expect(options.stderr.write).toHaveBeenCalledWith(`high: @ryotsu/picomatch@4.0.7-a ${addressed.url}\n`);
  });

  it('fails on malformed registry data or an unavailable registry', async () => {
    const options = auditOptions({ picomatch: [{}] });
    expect(await runPicomatchAudit(options)).toBe(1);
    options.fetchImpl.mockRejectedValueOnce(new Error('private transport detail'));
    expect(await runPicomatchAudit(options)).toBe(1);
    expect(options.stderr.write.mock.calls.flat().join('')).not.toContain('private');
  });

  it.each(['different package', 'different version', 'different parser', 'missing parser'])(
    'requires verified fork identity and code before accepting a fix (%s)',
    async (change) => {
      const installedPath = await mkdtemp(join(tmpdir(), 'polkaswap-fork-audit-'));
      try {
        const manifest = {
          name: change === 'different package' ? 'picomatch' : '@ryotsu/picomatch',
          version: change === 'different version' ? '4.0.7' : '4.0.7-a',
        };
        await mkdir(join(installedPath, 'lib'));
        await writeFile(join(installedPath, 'package.json'), JSON.stringify(manifest));
        if (change !== 'missing parser') {
          const parser = await readFile(requireInstalled.resolve('picomatch/lib/parse.js'));
          await writeFile(join(installedPath, 'lib/parse.js'), change === 'different parser' ? 'changed' : parser);
        }
        const options = auditOptions({ picomatch: [addressed] });
        expect(await runPicomatchAudit({ ...options, installedPath })).toBe(1);
        expect(options.fetchImpl).not.toHaveBeenCalled();
        expect(options.stderr.write).toHaveBeenCalledWith(expect.stringContaining('integrity'));
      } finally {
        await rm(installedPath, { recursive: true, force: true });
      }
    }
  );
});
