import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { build as esbuild } from 'esbuild';
import { build as viteBuild, createLogger, createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { describe, expect, it, vi } from 'vitest';

import {
  browserNodeOptimizerPlugin,
  browserNodePolyfillAliases,
  browserNodePolyfillsPlugin,
} from '../../../../scripts/build/browserNodePolyfillsPlugin.mjs';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const globalsPath = fileURLToPath(new URL('../../../../src/shims/node-globals.mjs', import.meta.url));
const optimizerGlobals = { Buffer: 'globalThis.Buffer', process: 'globalThis.process', global: 'globalThis' };
const fixtureId = '\0polyfill-security-fixture';

/** Build the same static browser probe through production Rollup or the dev optimizer, without network access. */
async function bundleProbe(source: string, optimizer: boolean) {
  if (optimizer) {
    const result = await esbuild({
      stdin: { contents: source, resolveDir: root, sourcefile: 'polyfill-fixture.js' },
      bundle: true,
      write: false,
      format: 'iife',
      platform: 'browser',
      logLevel: 'silent',
      define: optimizerGlobals,
      plugins: [browserNodeOptimizerPlugin()],
    });
    return result.outputFiles[0].text;
  }
  const result = await viteBuild({
    configFile: false,
    root,
    logLevel: 'silent',
    plugins: [
      {
        name: 'polyfill-security-fixture',
        resolveId: (id) => (id === fixtureId ? id : null),
        load: (id) => (id === fixtureId ? source : null),
      },
      browserNodePolyfillsPlugin(),
    ],
    build: { write: false, minify: false, rollupOptions: { input: fixtureId, output: { format: 'iife' } } },
  });
  if (Array.isArray(result) || !('output' in result)) throw new Error('Expected one browser output');
  const chunk = result.output.find((item) => item.type === 'chunk');
  if (!chunk || chunk.type !== 'chunk') throw new Error('Expected a browser chunk');
  return chunk.code;
}

/** Evaluate a fixed test bundle with browser globals and no Node Buffer/process/crypto. */
function browserProbe(code: string, withCrypto = true) {
  const getRandomValues = vi.fn((bytes: Uint8Array) => {
    bytes.fill(9);
    return bytes;
  });
  const browser: Record<string, unknown> = { console, setTimeout, clearTimeout, TextEncoder, TextDecoder };
  browser.window = browser;
  browser.self = browser;
  if (withCrypto) browser.crypto = { getRandomValues };
  runInNewContext(code, browser, { timeout: 5000 });
  return { result: browser.result, getRandomValues };
}

describe('browser Node polyfills', () => {
  it('aliases only the browser APIs used by the application, with explicit node: equivalents', () => {
    const aliases = browserNodePolyfillAliases();
    for (const name of ['assert', 'buffer', 'events', 'process', 'util']) {
      expect(aliases.find(({ find }) => find.test(name))?.replacement).toBeTruthy();
      expect(aliases.find(({ find }) => find.test(`node:${name}`))?.replacement).toBeTruthy();
    }
    expect(aliases).toHaveLength(10);
    expect(aliases.some(({ find }) => find.test('crypto') || find.test('node:crypto'))).toBe(false);
  });

  it.each([false, true])('preserves Buffer/globals/assert/events/util in optimizer=%s', async (optimizer) => {
    const code = await bundleProbe(
      `import ${JSON.stringify(globalsPath)};
       import { Buffer as importedBuffer, kMaxLength, Blob, File, transcode } from 'node:buffer';
       import assert from 'assert';
       import { EventEmitter } from 'node:events';
       import { format } from 'util';
       const emitter = new EventEmitter();
       let event;
       emitter.on('value', value => { event = value; });
       emitter.emit('value', 'received');
       assert.strictEqual(Buffer, importedBuffer);
       globalThis.result = {
         encoded: Buffer.from('Polkaswap').toString('base64'), event,
         formatted: format('%s:%d', 'value', 7), browser: process.browser,
         globalIdentity: global === globalThis,
         installedGlobals: globalThis.Buffer === Buffer && globalThis.process === process,
         maxLength: kMaxLength, legacyNodeExportsAbsent: Blob === undefined && File === undefined && transcode === undefined,
       };`,
      optimizer
    );
    expect(browserProbe(code).result).toEqual({
      encoded: 'UG9sa2Fzd2Fw',
      event: 'received',
      formatted: 'value:7',
      browser: true,
      globalIdentity: true,
      installedGlobals: true,
      maxLength: 0x7fffffff,
      legacyNodeExportsAbsent: true,
    });
  });

  it.each([false, true])(
    'keeps hashing and randomness on the real browser implementations in optimizer=%s',
    async (optimizer) => {
      const code = await bundleProbe(
        `import cryptoJs from 'crypto-js';
       globalThis.result = {
         sha256: cryptoJs.SHA256('abc').toString(),
         randomBytes: cryptoJs.lib.WordArray.random(32).sigBytes,
       };`,
        optimizer
      );
      const { result, getRandomValues } = browserProbe(code);
      expect(result).toEqual({
        sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        randomBytes: 32,
      });
      expect(getRandomValues).toHaveBeenCalled();
      expect(() => browserProbe(code, false)).toThrow(
        'Native crypto module could not be used to get secure random number'
      );
    }
  );

  it.each([false, true])('rejects unknown Node crypto consumers in optimizer=%s', async (optimizer) => {
    await expect(
      bundleProbe(`import { sign } from 'node:crypto'; globalThis.result = sign;`, optimizer)
    ).rejects.toThrow('Unsupported browser Node crypto import');
  });

  it('initializes dev source globals after Vue compilation and leaves SSR, styles, and shims untouched', () => {
    const plugin = browserNodePolyfillsPlugin();
    const config = plugin.config as (config: unknown, environment: { command: string }) => unknown;
    config({}, { command: 'serve' });
    const transform = plugin.transform as {
      order: string;
      handler: (code: string, id: string, options?: { ssr: boolean }) => { code: string } | null;
    };
    expect(transform.order).toBe('post');
    expect(transform.handler('export default {}', '/repo/src/App.vue')?.code).toContain(
      `import ${JSON.stringify(`/@fs/${globalsPath}`)}`
    );
    for (const id of [
      '/repo/src/shims/node-globals.mjs',
      '/repo/src/App.vue?vue&type=style',
      '/repo/node_modules/dep/index.js',
    ]) {
      expect(transform.handler('', id)).toBeNull();
    }
    expect(transform.handler('', '/repo/src/main.ts', { ssr: true })).toBeNull();
    config({}, { command: 'build' });
    expect(transform.handler('', '/repo/src/main.ts')).toBeNull();
  });

  it('serves injected globals from a real Vite filesystem URL after compiling Vue source', async () => {
    const server = await createServer({
      configFile: false,
      root,
      logLevel: 'silent',
      server: { middlewareMode: true },
      optimizeDeps: { noDiscovery: true },
      plugins: [
        {
          name: 'dev-polyfill-fixture',
          resolveId: (id) => (id === '/__polyfill-fixture.vue' ? id : null),
          load: (id) =>
            id === '/__polyfill-fixture.vue'
              ? '<script setup>const label = Buffer.from("ok").toString()</script><template>{{ label }}</template>'
              : null,
        },
        vue(),
        browserNodePolyfillsPlugin(),
      ],
    });
    try {
      const transformed = await server.transformRequest('/__polyfill-fixture.vue');
      const injected = transformed?.code.match(/^import "([^"]+node-globals\.mjs)";/)?.[1];
      expect(injected).toBe(`/@fs/${globalsPath}`);
      expect(transformed?.code).not.toContain('<script');
      const globals = await server.transformRequest(injected!);
      expect(globals?.code).toContain('globalThis.Buffer');
      expect(globals?.code).toContain('globalThis.process');
    } finally {
      await server.close();
    }
  });

  it('scans real Vite dependencies without injecting a browser entry into the scanner', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'polkaswap-polyfill-scan-'));
    const entry = join(directory, 'entry.js');
    await writeFile(entry, "import { ref } from 'vue'; console.log(ref(Buffer.from('ok')), process.browser);");
    const logger = createLogger('silent');
    const scanError = vi.spyOn(logger, 'error');
    const server = await createServer({
      configFile: false,
      root,
      cacheDir: join(directory, 'cache'),
      customLogger: logger,
      resolve: { alias: { vue: join(root, 'node_modules/vue/dist/vue.runtime.esm-bundler.js') } },
      server: { middlewareMode: true },
      optimizeDeps: { entries: [entry] },
      plugins: [browserNodePolyfillsPlugin()],
    });
    try {
      const optimizer = server.environments.client.depsOptimizer;
      expect(optimizer).toBeDefined();
      await optimizer!.scanProcessing;
      expect(scanError).not.toHaveBeenCalled();
      expect(optimizer!.metadata.discovered.vue ?? optimizer!.metadata.optimized.vue).toBeDefined();
    } finally {
      await server.close();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('initializes separate optimized Buffer and app entries without a circular global initializer', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'polkaswap-polyfill-split-'));
    const entry = join(directory, 'app.js');
    const outputDirectory = join(directory, 'out');
    await writeFile(join(directory, 'package.json'), '{"type":"module"}');
    await writeFile(
      entry,
      `import ${JSON.stringify(globalsPath)};
       import { kMaxLength } from 'node:buffer';
       export const result = {
         encoded: Buffer.from('split').toString('base64'), maxLength: kMaxLength,
         installedGlobals: globalThis.Buffer === Buffer && globalThis.process === process,
         browser: process.browser, globalIdentity: global === globalThis
       };`
    );
    try {
      await esbuild({
        entryPoints: { app: entry, buffer: join(root, 'node_modules/buffer/index.js') },
        outdir: outputDirectory,
        bundle: true,
        splitting: true,
        format: 'esm',
        platform: 'browser',
        logLevel: 'silent',
        define: optimizerGlobals,
        plugins: [browserNodeOptimizerPlugin()],
      });
      const result = execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '--eval',
          `const stdout = process.stdout;
           delete globalThis.Buffer; delete globalThis.process; delete globalThis.global;
           await import(${JSON.stringify(join(outputDirectory, 'buffer.js'))});
           const { result } = await import(${JSON.stringify(join(outputDirectory, 'app.js'))});
           stdout.write(JSON.stringify(result));`,
        ],
        { encoding: 'utf8', timeout: 5000 }
      );
      expect(JSON.parse(result)).toEqual({
        encoded: 'c3BsaXQ=',
        maxLength: 0x7fffffff,
        installedGlobals: true,
        browser: true,
        globalIdentity: true,
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
