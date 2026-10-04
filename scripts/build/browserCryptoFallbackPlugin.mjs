import { createRequire } from 'node:module';

/**
 * CommonJS packages whose only `require('crypto')` is a Node.js fallback for
 * runtimes without the Web Crypto API. Each one checks `crypto.getRandomValues`
 * on `window`/`self`/`globalThis` first, so a browser never reaches the require.
 *
 * - `crypto-js/core.js`: only when no global `crypto`/`msCrypto` exists.
 * - `tweetnacl/nacl-fast.js`: only when `self.crypto` is missing.
 * - `brorand/index.js`: only when `self` is not an object (Node.js).
 */
export const BROWSER_CRYPTO_FALLBACK_PACKAGES = Object.freeze(['crypto-js', 'tweetnacl', 'brorand']);

/** Virtual module that stands in for Node's `crypto` inside the audited packages. */
export const EMPTY_CRYPTO_MODULE_ID = '\0polkaswap:browser-crypto-fallback';

const require = createRequire(import.meta.url);

const normalizePath = (value = '') => value.replaceAll('\\', '/').replace(/[?#].*$/, '');

/**
 * Resolves the directory that `vite-plugin-node-polyfills` aliases `crypto` to.
 *
 * @returns {string | null}
 */
const resolveCryptoPolyfillDir = () => {
  try {
    const polyfills = require('node-stdlib-browser');
    return typeof polyfills.crypto === 'string' ? normalizePath(polyfills.crypto) : null;
  } catch {
    return null;
  }
};

/**
 * Returns whether a module id belongs to one of the audited fallback packages.
 *
 * @param {string | undefined} importer
 * @param {readonly string[]} [packages]
 * @returns {boolean}
 */
export const isBrowserCryptoFallbackImporter = (importer, packages = BROWSER_CRYPTO_FALLBACK_PACKAGES) => {
  if (!importer) return false;
  const id = normalizePath(importer);
  return packages.some((name) => id.includes(`/node_modules/${name}/`));
};

/**
 * Returns whether an import specifier means Node's `crypto`, either before the
 * node-polyfill alias (`crypto`, `node:crypto`) or after it (the polyfill path).
 *
 * @param {string} source
 * @param {string | null} cryptoPolyfillDir
 * @returns {boolean}
 */
export const isNodeCryptoSpecifier = (source, cryptoPolyfillDir) => {
  const specifier = normalizePath(source);
  if (specifier === 'crypto' || specifier === 'node:crypto' || specifier === 'crypto-browserify') return true;
  if (!cryptoPolyfillDir) return false;
  return specifier === cryptoPolyfillDir || specifier.startsWith(`${cryptoPolyfillDir}/`);
};

/**
 * Keeps the `crypto-browserify` tree (browserify-sign, elliptic, asn1.js,
 * pbkdf2, readable-stream, ...) out of the browser bundle when the only
 * importers are the audited Node.js fallbacks above. Any other importer still
 * receives the regular polyfill from `vite-plugin-node-polyfills`.
 *
 * Applies to production builds only; dev pre-bundling and Vitest are unchanged.
 *
 * @param {{ packages?: readonly string[], cryptoPolyfillDir?: string | null }} [options]
 * @returns {import('vite').Plugin}
 */
export function browserCryptoFallbackPlugin(options = {}) {
  const packages = options.packages ?? BROWSER_CRYPTO_FALLBACK_PACKAGES;
  const cryptoPolyfillDir =
    options.cryptoPolyfillDir === undefined ? resolveCryptoPolyfillDir() : options.cryptoPolyfillDir;

  return {
    name: 'polkaswap:browser-crypto-fallback',
    apply: 'build',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!isBrowserCryptoFallbackImporter(importer, packages)) return null;
      if (!isNodeCryptoSpecifier(source, cryptoPolyfillDir)) return null;
      return EMPTY_CRYPTO_MODULE_ID;
    },
    load(id) {
      if (id !== EMPTY_CRYPTO_MODULE_ID) return null;
      // Same shape as a runtime without Node's crypto: no randomBytes/getRandomValues.
      return 'export default {};\n';
    },
  };
}
