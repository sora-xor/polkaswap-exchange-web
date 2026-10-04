import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

import {
  BROWSER_CRYPTO_FALLBACK_PACKAGES,
  EMPTY_CRYPTO_MODULE_ID,
  browserCryptoFallbackPlugin,
  isBrowserCryptoFallbackImporter,
  isNodeCryptoSpecifier,
} from '@/../scripts/build/browserCryptoFallbackPlugin.mjs';

const POLYFILL_DIR = '/repo/node_modules/crypto-browserify';
const CRYPTO_JS_CORE = '/repo/node_modules/crypto-js/core.js';

type ResolveHook = (source: string, importer?: string) => string | null;
type LoadHook = (id: string) => string | null;

const createPlugin = (options?: Parameters<typeof browserCryptoFallbackPlugin>[0]) => {
  const plugin = browserCryptoFallbackPlugin({ cryptoPolyfillDir: POLYFILL_DIR, ...options });
  return {
    plugin,
    resolveId: plugin.resolveId as unknown as ResolveHook,
    load: plugin.load as unknown as LoadHook,
  };
};

describe('scripts/build/browserCryptoFallbackPlugin', () => {
  it('only covers the audited Node.js fallbacks', () => {
    expect(BROWSER_CRYPTO_FALLBACK_PACKAGES).toEqual(['crypto-js', 'tweetnacl', 'brorand']);
  });

  it('matches importers inside the audited packages on any platform', () => {
    expect(isBrowserCryptoFallbackImporter(CRYPTO_JS_CORE)).toBe(true);
    expect(isBrowserCryptoFallbackImporter('C:\\repo\\node_modules\\tweetnacl\\nacl-fast.js')).toBe(true);
    expect(isBrowserCryptoFallbackImporter('/repo/node_modules/brorand/index.js?commonjs-proxy')).toBe(true);
  });

  it('does not match other packages, look-alike names or app code', () => {
    expect(isBrowserCryptoFallbackImporter(undefined)).toBe(false);
    expect(isBrowserCryptoFallbackImporter('/repo/node_modules/@walletconnect/core/dist/index.js')).toBe(false);
    expect(isBrowserCryptoFallbackImporter('/repo/node_modules/crypto-js-extra/index.js')).toBe(false);
    expect(isBrowserCryptoFallbackImporter('/repo/src/lib/substrate/sdk/crypto.ts')).toBe(false);
  });

  it('recognises Node crypto before and after the polyfill alias', () => {
    expect(isNodeCryptoSpecifier('crypto', POLYFILL_DIR)).toBe(true);
    expect(isNodeCryptoSpecifier('node:crypto', POLYFILL_DIR)).toBe(true);
    expect(isNodeCryptoSpecifier('crypto-browserify', POLYFILL_DIR)).toBe(true);
    expect(isNodeCryptoSpecifier(POLYFILL_DIR, POLYFILL_DIR)).toBe(true);
    expect(isNodeCryptoSpecifier(`${POLYFILL_DIR}/index.js`, POLYFILL_DIR)).toBe(true);
  });

  it('ignores other specifiers', () => {
    expect(isNodeCryptoSpecifier('./core', POLYFILL_DIR)).toBe(false);
    expect(isNodeCryptoSpecifier('crypto-js', POLYFILL_DIR)).toBe(false);
    expect(isNodeCryptoSpecifier('/repo/node_modules/crypto-browserify-extra/index.js', POLYFILL_DIR)).toBe(false);
    expect(isNodeCryptoSpecifier('/repo/node_modules/crypto-browserify/index.js', null)).toBe(false);
  });

  it('resolves crypto to an empty module only for the audited importers', () => {
    const { resolveId } = createPlugin();

    expect(resolveId('crypto', CRYPTO_JS_CORE)).toBe(EMPTY_CRYPTO_MODULE_ID);
    expect(resolveId(`${POLYFILL_DIR}/index.js`, '/repo/node_modules/tweetnacl/nacl-fast.js')).toBe(
      EMPTY_CRYPTO_MODULE_ID
    );
    expect(resolveId('crypto', '/repo/node_modules/@walletconnect/core/dist/index.js')).toBeNull();
    expect(resolveId('./enc-base64', CRYPTO_JS_CORE)).toBeNull();
    expect(resolveId('crypto', undefined)).toBeNull();
  });

  it('serves an object without random sources, like a runtime without Node crypto', () => {
    const { load } = createPlugin();

    expect(load(EMPTY_CRYPTO_MODULE_ID)).toBe('export default {};\n');
    expect(load('/repo/node_modules/crypto-js/core.js')).toBeNull();
  });

  it('runs before the polyfill resolver in production builds only', () => {
    const { plugin } = createPlugin();

    expect(plugin.name).toBe('polkaswap:browser-crypto-fallback');
    expect(plugin.apply).toBe('build');
    expect(plugin.enforce).toBe('pre');
  });

  it('defaults to the directory that vite-plugin-node-polyfills aliases crypto to', () => {
    const require = createRequire(import.meta.url);
    const polyfillDir = String(require('node-stdlib-browser').crypto).replaceAll('\\', '/');
    const plugin = browserCryptoFallbackPlugin();
    const resolveId = plugin.resolveId as unknown as ResolveHook;

    expect(resolveId(polyfillDir, CRYPTO_JS_CORE)).toBe(EMPTY_CRYPTO_MODULE_ID);
  });
});
