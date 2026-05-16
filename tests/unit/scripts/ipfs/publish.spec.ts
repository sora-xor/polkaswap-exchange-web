import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  announceIpfsCidRecursively,
  collectMissingOutputs,
  createDwebGatewayUrl,
  createLocalGatewayUrl,
  hasVueMajorVersion,
  isNoSpaceLeftError,
  isPermissionError,
  multiaddrToGatewayBaseUrl,
  pinIpfsCidRecursively,
  publishDirectoryToIpfs,
  resolveGatewayBaseUrlFromRepo,
  resolveLocalGatewayBaseUrl,
  resolveVue3BuildArgs,
  swapEnvConfigForProduction,
  swapEnvConfigForTestnet,
  verifyRecursiveIpfsPin,
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

describe('isNoSpaceLeftError', () => {
  it('detects datastore exhaustion from captured output', () => {
    const error = new Error('Command `ipfs add -Qr /dist` exited with code 1', {
      cause: { stdout: 'QmPartialCid', stderr: 'Error: write repo.log: no space left on device' },
    });

    expect(isNoSpaceLeftError(error)).toBe(true);
  });

  it('ignores unrelated failures', () => {
    expect(isNoSpaceLeftError(new Error('ipfs add failed'))).toBe(false);
  });
});

describe('publishDirectoryToIpfs', () => {
  it('adds the directory with explicit pinning, verifies the pin, and announces providers', () => {
    const calls: string[] = [];

    const cid = publishDirectoryToIpfs('/dist', {
      resolveRepoPath: () => '/home/user/.ipfs',
      runCommand: (command, args) => {
        calls.push([command, ...args].join(' '));

        if (command === 'ipfs' && args[0] === 'add') {
          return { stdout: 'QmPublishedCid\n', stderr: '' };
        }

        if (command === 'ipfs' && args[0] === 'pin' && args[1] === 'add') {
          return { stdout: 'pinned QmPublishedCid recursively\n', stderr: '' };
        }

        if (command === 'ipfs' && args[0] === 'pin' && args[1] === 'ls') {
          return { stdout: 'QmPublishedCid\n', stderr: '' };
        }

        if (command === 'ipfs' && args[0] === 'routing' && args[1] === 'provide') {
          return { stdout: '', stderr: '' };
        }

        throw new Error(`Unexpected command: ${[command, ...args].join(' ')}`);
      },
    });

    expect(cid).toBe('QmPublishedCid');
    expect(calls).toEqual([
      'ipfs add -Qr --pin=false /dist',
      'ipfs pin add --recursive=true QmPublishedCid',
      'ipfs pin ls --type=recursive --quiet QmPublishedCid',
      'ipfs routing provide --recursive QmPublishedCid',
    ]);
  });

  it('throws when the returned CID is not recorded as a recursive pin', () => {
    expect(() =>
      publishDirectoryToIpfs('/dist', {
        resolveRepoPath: () => '/home/user/.ipfs',
        runCommand: (command, args) => {
          if (command === 'ipfs' && args[0] === 'add') {
            return { stdout: 'QmUnpinnedCid\n', stderr: '' };
          }

          if (command === 'ipfs' && args[0] === 'pin' && args[1] === 'add') {
            return { stdout: 'pinned QmUnpinnedCid recursively\n', stderr: '' };
          }

          if (command === 'ipfs' && args[0] === 'pin' && args[1] === 'ls') {
            return { stdout: '', stderr: '' };
          }

          throw new Error(`Unexpected command: ${[command, ...args].join(' ')}`);
        },
      })
    ).toThrowError(/QmUnpinnedCid was added, but it is not recorded as a recursive local pin/);
  });

  it('runs ipfs repo gc and retries once after a no-space error', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const calls: string[] = [];
    let addAttempts = 0;

    const cid = publishDirectoryToIpfs('/dist', {
      resolveRepoPath: () => '/home/user/.ipfs',
      runCommand: (command, args) => {
        calls.push([command, ...args].join(' '));

        if (command === 'ipfs' && args[0] === 'add') {
          addAttempts += 1;

          if (addAttempts === 1) {
            throw new Error('Command `ipfs add -Qr /dist` exited with code 1', {
              cause: { stdout: 'QmPartialCid\n', stderr: 'Error: no space left on device\n' },
            });
          }

          return { stdout: 'QmRecoveredCid\n', stderr: '' };
        }

        if (command === 'ipfs' && args[0] === 'repo' && args[1] === 'gc') {
          return { stdout: '', stderr: '' };
        }

        if (command === 'ipfs' && args[0] === 'pin' && args[1] === 'add') {
          return { stdout: 'pinned QmRecoveredCid recursively\n', stderr: '' };
        }

        if (command === 'ipfs' && args[0] === 'pin' && args[1] === 'ls') {
          return { stdout: 'QmRecoveredCid\n', stderr: '' };
        }

        if (command === 'ipfs' && args[0] === 'routing' && args[1] === 'provide') {
          return { stdout: '', stderr: '' };
        }

        throw new Error(`Unexpected command: ${[command, ...args].join(' ')}`);
      },
    });

    expect(cid).toBe('QmRecoveredCid');
    expect(calls).toEqual([
      'ipfs add -Qr --pin=false /dist',
      'ipfs repo gc',
      'ipfs add -Qr --pin=false /dist',
      'ipfs pin add --recursive=true QmRecoveredCid',
      'ipfs pin ls --type=recursive --quiet QmRecoveredCid',
      'ipfs routing provide --recursive QmRecoveredCid',
    ]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('IPFS reported no space left on device while publishing /dist.')
    );
    expect(warnSpy).toHaveBeenCalledWith('IPFS publish recovered after `ipfs repo gc`.');

    warnSpy.mockRestore();
  });

  it('throws a focused recovery message when retrying still fails', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() =>
      publishDirectoryToIpfs('/dist', {
        resolveRepoPath: () => '/home/user/.ipfs',
        runCommand: (command, args) => {
          if (command === 'ipfs' && args[0] === 'repo' && args[1] === 'gc') {
            return { stdout: '', stderr: '' };
          }

          throw new Error('Command `ipfs add -Qr /dist` exited with code 1', {
            cause: { stdout: '', stderr: 'Error: no space left on device\n' },
          });
        },
      })
    ).toThrowError(/Local IPFS repository ran out of space while publishing \/dist\./);

    warnSpy.mockRestore();
  });
});

describe('pinIpfsCidRecursively', () => {
  it('runs an explicit recursive pin command for a CID', () => {
    const calls: string[] = [];

    pinIpfsCidRecursively('QmPinnedCid', (command, args) => {
      calls.push([command, ...args].join(' '));
      return { stdout: 'pinned QmPinnedCid recursively\n', stderr: '' };
    });

    expect(calls).toEqual(['ipfs pin add --recursive=true QmPinnedCid']);
  });
});

describe('verifyRecursiveIpfsPin', () => {
  it('accepts a matching recursive pin result', () => {
    expect(() =>
      verifyRecursiveIpfsPin('QmPinnedCid', () => ({ stdout: 'QmPinnedCid\n', stderr: '' }))
    ).not.toThrow();
  });
});

describe('announceIpfsCidRecursively', () => {
  it('announces a recursive provider record for a CID', () => {
    const calls: string[] = [];

    announceIpfsCidRecursively('QmAnnouncedCid', (command, args) => {
      calls.push([command, ...args].join(' '));
      return { stdout: '', stderr: '' };
    });

    expect(calls).toEqual(['ipfs routing provide --recursive QmAnnouncedCid']);
  });

  it('throws a focused error when provider announcement fails', () => {
    expect(() =>
      announceIpfsCidRecursively('QmUnavailableCid', () => {
        throw new Error('routing unavailable');
      })
    ).toThrowError(/provider announcement failed/);
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

describe('swapEnvConfigForProduction', () => {
  it('replaces dist env config with the provided production settings file', () => {
    const writes: Record<string, string> = {};
    const distPath = '/dist';
    const sourceConfigPath = '/workspace/env.json';
    const prodConfig = '{"NETWORK_TYPE":"Prod"}';
    const fsDeps = {
      existsSync: (target: string) => target === sourceConfigPath,
      readFileSync: (target: string) => {
        if (target === sourceConfigPath) {
          return prodConfig;
        }

        throw new Error(`Unexpected read for ${target}`);
      },
      writeFileSync: (target: string, data: string | NodeJS.ArrayBufferView) => {
        writes[target] = data.toString();
      },
    };

    swapEnvConfigForProduction(distPath, sourceConfigPath, fsDeps);

    expect(writes[join(distPath, 'env.json')]).toBe(prodConfig);
  });

  it('throws when the production config source is missing', () => {
    const distPath = '/dist';
    const sourceConfigPath = '/workspace/env.json';
    const fsDeps = {
      existsSync: () => false,
      readFileSync: () => '',
      writeFileSync: () => {},
    };

    expect(() => swapEnvConfigForProduction(distPath, sourceConfigPath, fsDeps)).toThrowError(
      /Missing production environment configuration/
    );
  });
});

describe('createDwebGatewayUrl', () => {
  it('builds a public dweb link for the provided CID', () => {
    expect(createDwebGatewayUrl('QmExampleCid')).toBe('https://dweb.link/ipfs/QmExampleCid/index.html');
  });
});

describe('multiaddrToGatewayBaseUrl', () => {
  it('converts a TCP multiaddr into an HTTP gateway URL', () => {
    expect(multiaddrToGatewayBaseUrl('/ip4/127.0.0.1/tcp/61543')).toBe('http://127.0.0.1:61543');
  });

  it('returns null for dynamic port placeholders', () => {
    expect(multiaddrToGatewayBaseUrl('/ip4/127.0.0.1/tcp/0')).toBeNull();
  });
});

describe('resolveGatewayBaseUrlFromRepo', () => {
  it('reads runtime gateway address from the repository gateway file', () => {
    const repoPath = '/home/user/.ipfs';
    const fsDeps = createFsDeps({
      [join(repoPath, 'gateway')]: 'http://127.0.0.1:61543\n',
    });

    expect(resolveGatewayBaseUrlFromRepo(repoPath, fsDeps)).toBe('http://127.0.0.1:61543');
  });
});

describe('resolveLocalGatewayBaseUrl', () => {
  it('prefers active runtime gateway files over config defaults', () => {
    const fsDeps = createFsDeps({
      '/home/user/.ipfs/gateway': 'http://127.0.0.1:61543\n',
    });

    const baseUrl = resolveLocalGatewayBaseUrl({
      cwd: '/workspace',
      env: { HOME: '/home/user' } as NodeJS.ProcessEnv,
      fsDeps,
      readGatewayAddress: () => '/ip4/127.0.0.1/tcp/8080',
    });

    expect(baseUrl).toBe('http://127.0.0.1:61543');
  });

  it('falls back to configured multiaddr when no runtime gateway file exists', () => {
    const baseUrl = resolveLocalGatewayBaseUrl({
      cwd: '/workspace',
      env: {} as NodeJS.ProcessEnv,
      fsDeps: createFsDeps({}),
      readGatewayAddress: () => '/ip4/127.0.0.1/tcp/61777',
    });

    expect(baseUrl).toBe('http://127.0.0.1:61777');
  });

  it('uses the legacy default when no gateway address can be resolved', () => {
    const baseUrl = resolveLocalGatewayBaseUrl({
      cwd: '/workspace',
      env: {} as NodeJS.ProcessEnv,
      fsDeps: createFsDeps({}),
      readGatewayAddress: () => null,
    });

    expect(baseUrl).toBe('http://127.0.0.1:8080');
  });
});

describe('createLocalGatewayUrl', () => {
  it('builds local gateway links without double slashes', () => {
    expect(createLocalGatewayUrl('QmExampleCid', 'http://127.0.0.1:61543/')).toBe(
      'http://127.0.0.1:61543/ipfs/QmExampleCid/index.html'
    );
  });
});
