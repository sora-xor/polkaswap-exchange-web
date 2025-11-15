import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  collectMissingOutputs,
  hasVueMajorVersion,
  isPermissionError,
  resolveVue3BuildArgs,
  swapEnvConfigForTestnet,
} from '../../../../scripts/ipfs/publish';

function createFsDeps(files: Record<string, string>) {
  return {
    existsSync: (target: string) => target in files,
    readFileSync: (target: string) => {
      if (!(target in files)) {
        throw new Error(`Unexpected read for ${target}`);
      }

      return files[target];
    },
  };
}

describe('resolveVue3BuildArgs', () => {
  it('prefers explicit Vue 3 build scripts when present', () => {
    const repoPath = '/repo';
    const packageJsonPath = join(repoPath, 'package.json');
    const fsDeps = createFsDeps({
      [packageJsonPath]: JSON.stringify({
        scripts: {
          'build:vue3': 'vite build --mode vue3',
          build: 'vite build',
        },
      }),
    });

    expect(resolveVue3BuildArgs(repoPath, fsDeps)).toEqual(['build:vue3']);
  });

  it('falls back to the default build script when no Vue 3 script exists', () => {
    const repoPath = '/repo';
    const packageJsonPath = join(repoPath, 'package.json');
    const fsDeps = createFsDeps({
      [packageJsonPath]: JSON.stringify({
        scripts: {
          build: 'vite build',
        },
      }),
    });

    expect(resolveVue3BuildArgs(repoPath, fsDeps)).toEqual(['build']);
  });

  it('returns the fallback when package.json cannot be found', () => {
    const repoPath = '/missing';
    const fsDeps = createFsDeps({});

    expect(resolveVue3BuildArgs(repoPath, fsDeps)).toEqual(['build']);
  });
});

describe('hasVueMajorVersion', () => {
  it('confirms Vue 3 dependencies', () => {
    const packageJsonPath = '/repo/package.json';
    const fsDeps = createFsDeps({
      [packageJsonPath]: JSON.stringify({
        dependencies: {
          vue: '^3.5.0',
        },
      }),
    });

    expect(hasVueMajorVersion(packageJsonPath, 3, fsDeps)).toBe(true);
  });

  it('rejects non-matching major versions', () => {
    const packageJsonPath = '/repo/package.json';
    const fsDeps = createFsDeps({
      [packageJsonPath]: JSON.stringify({
        peerDependencies: {
          vue: '^2.7.14',
        },
      }),
    });

    expect(hasVueMajorVersion(packageJsonPath, 3, fsDeps)).toBe(false);
  });

  it('handles missing Vue declarations', () => {
    const packageJsonPath = '/repo/package.json';
    const fsDeps = createFsDeps({
      [packageJsonPath]: JSON.stringify({ name: 'no-vue' }),
    });

    expect(hasVueMajorVersion(packageJsonPath, 3, fsDeps)).toBe(false);
  });
});

describe('collectMissingOutputs', () => {
  it('identifies missing generated assets', () => {
    const packageJsonPath = '/repo/package.json';
    const fsDeps = createFsDeps({
      [packageJsonPath]: JSON.stringify({
        main: './dist/index.cjs',
        module: './dist/index.mjs',
        files: ['dist'],
      }),
      '/repo/dist/index.cjs': 'compiled',
      '/repo/dist': '__dir__',
    });

    expect(collectMissingOutputs(packageJsonPath, fsDeps)).toEqual(['/repo/dist/index.mjs']);
  });

  it('ignores glob patterns in files entries', () => {
    const packageJsonPath = '/repo/package.json';
    const fsDeps = createFsDeps({
      [packageJsonPath]: JSON.stringify({
        files: ['dist/*.js'],
      }),
    });

    expect(collectMissingOutputs(packageJsonPath, fsDeps)).toEqual([]);
  });
});

describe('isPermissionError', () => {
  it('detects permission issues from captured output', () => {
    const error = new Error('Command `yarn build` exited with code 1', {
      cause: { stdout: 'EPERM: operation not permitted', stderr: '' },
    });

    expect(isPermissionError(error)).toBe(true);
  });

  it('ignores other failures', () => {
    expect(isPermissionError(new Error('Process exited with code 1'))).toBe(false);
  });
});

describe('swapEnvConfigForTestnet', () => {
  it('replaces the production env config with the testnet settings', () => {
    const writes: Record<string, string> = {};
    const distPath = '/dist';
    const testnetConfig = '{"NETWORK_TYPE":"Test"}';
    const fsDeps = {
      existsSync: (target: string) => target === join(distPath, 'env.dev.json'),
      readFileSync: (target: string) => {
        if (target === join(distPath, 'env.dev.json')) {
          return testnetConfig;
        }

        throw new Error(`Unexpected read for ${target}`);
      },
      writeFileSync: (target: string, data: string | NodeJS.ArrayBufferView) => {
        writes[target] = data.toString();
      },
    };

    swapEnvConfigForTestnet(distPath, fsDeps);

    expect(writes[join(distPath, 'env.json')]).toBe(testnetConfig);
  });

  it('throws when the testnet config is missing', () => {
    const distPath = '/dist';
    const fsDeps = {
      existsSync: () => false,
      readFileSync: () => '',
      writeFileSync: () => {},
    };

    expect(() => swapEnvConfigForTestnet(distPath, fsDeps)).toThrowError(/Missing testnet environment configuration/);
  });
});
