import { describe, expect, it, vi } from 'vitest';

import {
  dependencySecurityPlugin,
  unsafeDependencyImplementation,
} from '@/../scripts/build/dependencySecurityPlugin.mjs';

import type { OutputBundle, OutputChunk, PluginContext } from 'rollup';

/** Run the actual emitted-chunk check without writing a build to disk. */
function checkBundle(moduleIds: string[]) {
  const plugin = dependencySecurityPlugin();
  const hook = plugin.generateBundle;
  const generate = typeof hook === 'function' ? hook : hook!.handler;
  const error = vi.fn((message: string) => {
    throw new Error(message);
  });
  const bundle = {
    'assets/lazy.js': {
      type: 'chunk',
      modules: Object.fromEntries(moduleIds.map((id) => [id, {}])),
    } as OutputChunk,
    'assets/logo.svg': { type: 'asset', fileName: 'assets/logo.svg', source: '<svg />' },
  } as OutputBundle;
  generate.call({ error } as unknown as PluginContext, {} as never, bundle, false);
  return error;
}

describe('browser dependency security boundary', () => {
  it.each([
    ['/app/node_modules/elliptic/lib/elliptic.js', 'elliptic'],
    ['/app/node_modules/parent/node_modules/crypto-browserify/index.js?commonjs-proxy', 'crypto-browserify'],
    ['C:\\app\\node_modules\\zod\\v3\\types.cjs', 'Zod legacy v3'],
    ['/app/node_modules/wallet/node_modules/zod/lib/index.mjs', 'Zod legacy v3'],
    ['/app/vendor/zod/v3/external.js', 'Zod legacy v3'],
    ['/app/node_modules/zod/src/v3/types.ts', 'Zod legacy v3'],
  ])('identifies unsafe implementation %s', (moduleId, implementation) => {
    expect(unsafeDependencyImplementation(moduleId)).toBe(implementation);
  });

  it('allows patched Zod v4 and unrelated paths without suppressing runtime validation', () => {
    expect(
      checkBundle([
        '/app/node_modules/zod/index.js',
        '/app/node_modules/zod/v4/core/schemas.js',
        '/app/node_modules/@noble/curves/secp256k1.js',
        '/app/src/elliptic-chart.ts',
        '/app/node_modules/not-elliptic/index.js',
      ])
    ).not.toHaveBeenCalled();
  });

  it('rejects a legacy validator hidden in a lazy output chunk', () => {
    expect(() => checkBundle(['/app/node_modules/zod/v3/types.js'])).toThrow('Zod legacy v3');
  });

  it('rejects the unsafe crypto stack rather than shipping a fallback', () => {
    expect(() =>
      checkBundle(['/app/node_modules/elliptic/lib/elliptic.js', '/app/node_modules/crypto-browserify/index.js'])
    ).toThrow('crypto-browserify, elliptic');
  });
});
