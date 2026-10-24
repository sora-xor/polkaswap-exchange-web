import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import inject from '@rollup/plugin-inject';
import { EMPTY_CRYPTO_MODULE_ID, isBrowserCryptoFallbackImporter } from './browserCryptoFallbackPlugin.mjs';

const require = createRequire(import.meta.url);
const globalsPath = fileURLToPath(new URL('../../src/shims/node-globals.mjs', import.meta.url));
const globalsDevUrl = `/@fs/${globalsPath.replaceAll('\\', '/')}`;
const bufferPath = fileURLToPath(new URL('../../src/shims/buffer.ts', import.meta.url));
const cryptoSpecifier = /^(?:node:)?crypto$/;

/** Resolve only browser implementations used by the application, without a blanket Node crypto dependency. */
export function browserNodePolyfillAliases() {
  const modules = {
    assert: require.resolve('assert/'),
    buffer: bufferPath,
    events: require.resolve('events/'),
    process: require.resolve('process/browser.js'),
    util: require.resolve('util/'),
  };
  return Object.entries(modules).flatMap(([name, replacement]) => [
    { find: new RegExp(`^${name}$`), replacement },
    { find: new RegExp(`^node:${name}$`), replacement },
  ]);
}

/** Preserve the same aliases and audited crypto fallbacks during Vite dependency pre-bundling. */
export function browserNodeOptimizerPlugin() {
  const aliases = browserNodePolyfillAliases();
  return {
    name: 'polkaswap:browser-node-optimizer',
    setup(build) {
      build.onResolve({ filter: /^(?:node:)?(?:assert|buffer|events|process|util)$/ }, ({ path }) => ({
        path: aliases.find(({ find }) => find.test(path)).replacement,
      }));
      build.onResolve({ filter: cryptoSpecifier }, ({ path, importer }) => {
        if (isBrowserCryptoFallbackImporter(importer)) {
          return { path: EMPTY_CRYPTO_MODULE_ID, namespace: 'polkaswap-crypto-fallback' };
        }
        return { errors: [{ text: `Unsupported browser Node crypto import: ${path}. Use the browser crypto API.` }] };
      });
      build.onLoad({ filter: /.*/, namespace: 'polkaswap-crypto-fallback' }, () => ({
        contents: 'export default {};',
        loader: 'js',
      }));
    },
  };
}

/**
 * Supply Buffer/process/global plus the small set of Node APIs actually used in
 * browser code. Unknown crypto imports fail instead of acquiring an unsafe
 * signing implementation or silently receiving an empty crypto object.
 * @returns {import('vite').Plugin}
 */
export function browserNodePolyfillsPlugin() {
  let isServe = false;
  return {
    name: 'polkaswap:browser-node-polyfills',
    enforce: 'pre',
    config(_config, environment) {
      isServe = environment.command === 'serve';
      return {
        resolve: { alias: browserNodePolyfillAliases() },
        build: {
          rollupOptions: {
            plugins: [
              inject({
                exclude: [globalsPath, bufferPath],
                Buffer: [globalsPath, 'Buffer'],
                process: [globalsPath, 'process'],
                global: [globalsPath, 'global'],
              }),
            ],
          },
        },
        optimizeDeps: {
          esbuildOptions: {
            // Application modules initialize these globals before importing dependencies.
            // Injecting the initializer into Buffer itself causes a circular initialization.
            define: { Buffer: 'globalThis.Buffer', process: 'globalThis.process', global: 'globalThis' },
            plugins: [browserNodeOptimizerPlugin()],
          },
        },
      };
    },
    resolveId(source, importer, options) {
      if (options?.ssr || !cryptoSpecifier.test(source)) return null;
      if (isBrowserCryptoFallbackImporter(importer)) return EMPTY_CRYPTO_MODULE_ID;
      this.error(`Unsupported browser Node crypto import: ${source}. Use the browser crypto API.`);
    },
    load(id) {
      return id === EMPTY_CRYPTO_MODULE_ID ? 'export default {};\n' : null;
    },
    transform: {
      order: 'post',
      handler(code, id, options) {
        if (
          !isServe ||
          options?.ssr ||
          id.includes('/node_modules/') ||
          id.includes('/src/shims/') ||
          !/\.(?:[cm]?[jt]sx?|vue)$/.test(id)
        ) {
          return null;
        }
        // Post hooks run after import analysis, so use Vite's browser-resolvable filesystem URL.
        return { code: `import ${JSON.stringify(globalsDevUrl)};\n${code}`, map: null };
      },
    },
  };
}
