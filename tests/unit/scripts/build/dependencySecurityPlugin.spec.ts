import { describe, expect, it, vi } from 'vitest';

import {
  dependencySecurityPlugin,
  unsafeDependencyImplementation,
} from '@/../scripts/build/dependencySecurityPlugin.mjs';

import type { OutputBundle, OutputChunk, PluginContext } from 'rollup';

/** Run the actual emitted-chunk check without writing a build to disk. */
function checkBundle(moduleIds: string[], fileName = 'assets/lazy.js') {
  const plugin = dependencySecurityPlugin();
  const hook = plugin.generateBundle;
  const generate = typeof hook === 'function' ? hook : hook!.handler;
  const error = vi.fn((message: string) => {
    throw new Error(message);
  });
  const bundle = {
    [fileName]: {
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
    ['/app/node_modules/picomatch/index.js', 'picomatch'],
    ['/app/node_modules/tool/node_modules/picomatch/lib/parse.js?commonjs-proxy', 'picomatch'],
    ['C:\\app\\node_modules\\picomatch\\lib\\picomatch.js', 'picomatch'],
    ['/app/vendor/picomatch/lib/scan.js#module', 'picomatch'],
    ['/app/node_modules/@ryotsu/picomatch/lib/parse.js', '@ryotsu/picomatch'],
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
        '/app/src/picomatch-preview.ts',
        '/app/node_modules/not-picomatch/index.js',
        '/app/node_modules/picomatch-helper/index.js',
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

  it.each([
    ['assets/index.js', '/app/node_modules/picomatch/index.js'],
    ['assets/lazy.js', '/app/node_modules/tool/node_modules/picomatch/lib/parse.js'],
    ['assets/index.js', '/app/vendor/picomatch/index.js'],
    ['assets/lazy.js', '/app/vendor/picomatch/lib/picomatch.js'],
  ])('rejects Picomatch in emitted chunk %s from %s', (fileName, moduleId) => {
    expect(() => checkBundle([moduleId], fileName)).toThrow(
      'Unsafe dependency implementation in browser bundle: picomatch'
    );
  });
});
