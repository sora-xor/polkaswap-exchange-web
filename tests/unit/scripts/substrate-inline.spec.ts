import { spawnSync } from 'node:child_process';
import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const substrateRoot = join(root, 'src/lib/substrate');
const legacyDependency = /@sora-substrate\/|sora2?-substrate-js-library/;

/** Enumerate checked-in source without following symlinks into another checkout. */
function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    expect(entry.isSymbolicLink(), `Source must be copied into this repository: ${path}`).toBe(false);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  });
}

describe('self-contained Polkaswap substrate implementation', () => {
  it('does not install the retired SDK packages or reference the separate repository', () => {
    for (const name of ['package.json', 'yarn.lock']) {
      expect(readFileSync(join(root, name), 'utf8'), name).not.toMatch(legacyDependency);
    }
  });

  it('keeps every substrate module inside this repository as ordinary source files', () => {
    expect(lstatSync(substrateRoot).isSymbolicLink()).toBe(false);
    const localRoot = realpathSync(root);
    const files = sourceFiles(substrateRoot);
    expect(files.length).toBeGreaterThan(0);
    for (const path of files) {
      const localPath = relative(localRoot, realpathSync(path));
      expect(localPath.startsWith(`..${sep}`), path).toBe(false);
      expect(localPath, path).not.toBe('..');
    }
    for (const module of ['sdk', 'math', 'liquidity-proxy', 'api', 'connection', 'types', 'type-definitions']) {
      expect(files).toContain(join(substrateRoot, module, 'index.ts'));
    }
  });

  it('does not leave application imports depending on legacy package aliases', () => {
    const offenders = sourceFiles(join(root, 'src'))
      .filter((path) => /\.(?:[cm]?[jt]sx?|vue)$/.test(path))
      .filter((path) => legacyDependency.test(readFileSync(path, 'utf8')))
      .map((path) => relative(root, path));
    expect(offenders).toEqual([]);
  });

  it('loads the actual local modules with ordinary Node/tsx and no Vite or SDK aliases', () => {
    const result = spawnSync(
      process.execPath,
      [
        join(root, 'node_modules/tsx/dist/cli.mjs'),
        '--tsconfig',
        join(root, 'tsconfig.json'),
        join(root, 'tests/unit/scripts/fixtures/substrate-inline-runtime-child.ts'),
      ],
      {
        cwd: root,
        env: { LANG: 'C', LC_ALL: 'C', TZ: 'UTC' },
        encoding: 'utf8',
        shell: false,
        timeout: 15_000,
        maxBuffer: 64 * 1024,
      }
    );
    expect(result.error, result.stderr).toBeUndefined();
    expect(result.signal, result.stderr).toBeNull();
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      amountCodec: '1234567890123456789',
      sixDecimalCodec: '1234567',
      sharedMath: true,
      disconnected: true,
      modules: ['sdk', 'math', 'liquidity-proxy', 'api', 'connection', 'types', 'type-definitions'],
    });
  }, 20_000);
});
