import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const rejected = 'Repeated extglobs require unambiguous literal alternatives';
let cwd: string;

/** Exercise the actual standalone parser without a registry, watcher daemon or user workspace. */
function runNode(args: string[]) {
  const child = spawnSync(process.execPath, args, {
    cwd,
    env: { ...process.env, YARN_ENABLE_NETWORK: 'false', YARN_IGNORE_PATH: '1', YARN_ENABLE_TELEMETRY: '0' },
    encoding: 'utf8',
    timeout: 5000,
  });
  if (child.error) throw child.error;
  return { code: child.status, output: child.stdout + child.stderr };
}

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), 'embedded-glob-cli-'));
  writeFileSync(join(cwd, 'package.json'), '{"name":"safe-fixture","private":true}');
});

afterEach(() => rmSync(cwd, { recursive: true, force: true }));

describe('embedded CLI glob parsers', () => {
  it.each([
    ['4.10.3', 8],
    ['4.18.1', 10],
  ] as const)('keeps literal repeats and refuses overlapping alternatives in standalone Yarn %s', (version, format) => {
    writeFileSync(
      join(cwd, 'yarn.lock'),
      `__metadata:
  version: ${format}
  cacheKey: 10c0

"safe-fixture@workspace:.":
  version: 0.0.0-use.local
  resolution: "safe-fixture@workspace:."
  languageName: unknown
  linkType: soft
`
    );
    const yarn = join(root, '.yarn', 'releases', `yarn-${version}.cjs`);
    const select = (pattern: string) =>
      runNode([yarn, 'workspaces', 'foreach', '-A', '--include', pattern, '--dry-run', 'exec', 'node', '--version']);

    expect(select('+(safe-fixture|other)').code).toBe(0);
    expect(select('+(app|apple)')).toEqual({ code: 1, output: expect.stringContaining(rejected) });
  });

  it('runs TypeScript and enforces the guard on the tsx watch exclusion path', () => {
    const tsx = join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
    const target = join(cwd, 'fixture.ts');
    writeFileSync(target, 'const value: number = 17; console.log(value);');
    expect(runNode([tsx, target])).toEqual({ code: 0, output: '17\n' });
    expect(runNode([tsx, 'watch', '--exclude', '+(app|apple)', target])).toEqual({
      code: 1,
      output: expect.stringContaining(rejected),
    });
  });

  it('reconstructs the exact pinned bundles from their reviewed source bytes and refuses unknown digests', () => {
    // Use native ESM so Function#toString is identical to the release generator, independent of Vite instrumentation.
    const probe = `
      import assert from 'node:assert/strict';
      import { readFileSync } from 'node:fs';
      import { join } from 'node:path';
      import { pathToFileURL } from 'node:url';
      const root = process.argv[1];
      const { checkRepeatedExtglob, hardenGlobCli } = await import(pathToFileURL(join(root, 'scripts/security/harden-glob-cli.mjs')));
      for (const [file, call] of [
        ['.yarn/releases/yarn-4.10.3.cjs', 't,g.index,w'],
        ['.yarn/releases/yarn-4.18.1.cjs', 't,d.index,C'],
        ['node_modules/tsx/dist/cli.mjs', 'f,R.index,ae'],
      ]) {
        const patched = readFileSync(join(root, file), 'utf8');
        const guard = '(\\n' + checkRepeatedExtglob.toString() + '\\n)(' + call + ');';
        const original = patched.replace(guard, '');
        assert.notEqual(original.length, patched.length);
        assert.equal(hardenGlobCli(original), patched);
      }
      assert.throws(() => hardenGlobCli('unknown upstream package'), /Unreviewed CLI digest/);
    `;
    expect(runNode(['--input-type=module', '-e', probe, root])).toEqual({ code: 0, output: '' });
  });
});
