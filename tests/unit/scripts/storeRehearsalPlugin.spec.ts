import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveConfig } from 'vite';

import {
  STORE_REHEARSAL_ENV,
  STORE_REHEARSAL_MODE,
  STORE_REHEARSAL_PORT,
  storeRehearsalPlugin,
} from '../../../scripts/build/storeRehearsalPlugin.mjs';

const relayUrl = 'http://127.0.0.1:39849';
const context = { command: 'serve', mode: STORE_REHEARSAL_MODE };
const source = JSON.parse(readFileSync(new URL('../../../public/community-store.json', import.meta.url), 'utf8'));
const mainnetSource = {
  NETWORK_TYPE: 'Prod',
  CHAIN_GENESIS_HASH: '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5',
  DEFAULT_NETWORKS: [{ address: 'wss://ws.mof.sora.org' }, { address: 'wss://mof2.sora.org' }],
  unchangedSetting: 'retained',
};
const directories: string[] = [];

/** Resolve only Vite's configuration hooks; tests never bind a port or contact a relay. */
function prepared(config = source, mainnet: unknown = mainnetSource) {
  const directory = mkdtempSync(join(tmpdir(), 'store-rehearsal-test-'));
  directories.push(directory);
  const configPath = join(directory, 'community-store.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  const original = readFileSync(configPath, 'utf8');
  const mainnetConfigPath = join(directory, 'env.json');
  const mainnetOriginal = JSON.stringify(mainnet, null, 2) + '\n';
  writeFileSync(mainnetConfigPath, mainnetOriginal);
  const plugin = storeRehearsalPlugin({
    environment: { [STORE_REHEARSAL_ENV]: relayUrl },
    configPath,
    mainnetConfigPath,
  });
  const settings = plugin.config({}, context);
  const resolved = { ...context, ...settings, isProduction: false, env: { DEV: true, VITE_APP_VERSION: '1.0-test' } };
  return { plugin, resolved, configPath, original, mainnetConfigPath, mainnetOriginal };
}

/** Exercise the exact config middleware using an in-memory response. */
function serve(plugin: ReturnType<typeof storeRehearsalPlugin>, resolved: ReturnType<typeof prepared>['resolved']) {
  const use = vi.fn();
  plugin.configureServer({ config: resolved, middlewares: { use } });
  const middleware = use.mock.calls[0][0];
  return (method = 'GET', url = '/community-store.json', host = `127.0.0.1:${STORE_REHEARSAL_PORT}`) => {
    const response = { statusCode: 0, setHeader: vi.fn(), end: vi.fn() };
    const next = vi.fn();
    middleware({ method, url, headers: { host } }, response, next);
    return { response, next };
  };
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true });
});

describe('storeRehearsalPlugin', () => {
  it('preserves watch:null through actual Vite config merging without starting a server', async () => {
    const { plugin } = prepared();
    const resolved = await resolveConfig(
      { configFile: false, mode: STORE_REHEARSAL_MODE, plugins: [plugin], server: { watch: {}, hmr: {} } },
      'serve'
    );
    expect(resolved.server.watch).toBeNull();
    expect(resolved.server.hmr).toBe(false);
    expect(resolved.server).toMatchObject({ host: '127.0.0.1', port: STORE_REHEARSAL_PORT, strictPort: true });
    const use = vi.fn();
    plugin.configureServer({ config: resolved, middlewares: { use } });
    expect(use).toHaveBeenCalledOnce();
  });

  it('rejects a later plugin reactivating watching during actual Vite resolution', async () => {
    const { plugin } = prepared();
    await expect(
      resolveConfig(
        {
          configFile: false,
          mode: STORE_REHEARSAL_MODE,
          plugins: [
            plugin,
            { name: 'later-watch-override', enforce: 'post', config: () => ({ server: { watch: {} } }) },
          ],
        },
        'serve'
      )
    ).rejects.toThrow(/fixed loopback/);
  });

  it.each(['development', 'production', 'test'])('does nothing in ordinary %s mode', (mode) => {
    const plugin = storeRehearsalPlugin({
      environment: {},
      configPath: '/missing-config-must-not-be-read',
      mainnetConfigPath: '/missing-mainnet-must-not-be-read',
    });
    expect(plugin.config({}, { command: mode === 'production' ? 'build' : 'serve', mode })).toBeUndefined();
    expect(plugin.configResolved({})).toBeUndefined();
    const use = vi.fn();
    plugin.configureServer({ middlewares: { use } });
    expect(use).not.toHaveBeenCalled();
    expect(plugin).not.toHaveProperty('transform');
    expect(plugin).not.toHaveProperty('generateBundle');
  });

  it.each([
    { command: 'build', mode: 'production', environment: { [STORE_REHEARSAL_ENV]: relayUrl } },
    { command: 'build', mode: STORE_REHEARSAL_MODE, environment: {} },
    { command: 'build', mode: STORE_REHEARSAL_MODE, environment: { [STORE_REHEARSAL_ENV]: relayUrl } },
    { command: 'serve', mode: 'development', environment: { [STORE_REHEARSAL_ENV]: relayUrl } },
    { ...context, isPreview: true, environment: { [STORE_REHEARSAL_ENV]: relayUrl } },
    { ...context, environment: { [STORE_REHEARSAL_ENV]: relayUrl, NODE_ENV: 'production' } },
  ])('rejects accidental mode/environment use: %j', ({ environment, ...value }) => {
    expect(() => storeRehearsalPlugin({ environment }).config({}, value)).toThrow(/only.*serve mode/);
  });

  it.each([
    undefined,
    '',
    'http://localhost:39849',
    'http://[::1]:39849',
    'http://127.1:39849',
    'http://2130706433:39849',
    'https://127.0.0.1:39849',
    'http://127.0.0.1',
    'http://127.0.0.1:0',
    'http://127.0.0.1:80',
    'http://127.0.0.1:65536',
    'http://127.0.0.1:41829',
    'http://127.0.0.1:39849/v1',
    'http://127.0.0.1:39849?x=1',
    'http://127.0.0.1:39849#x',
    'http://user@127.0.0.1:39849',
    ' http://127.0.0.1:39849',
    'http://example.com:39849',
  ])('rejects missing or non-literal loopback relay origins: %s', (value) => {
    expect(() => storeRehearsalPlugin({ environment: { [STORE_REHEARSAL_ENV]: value } }).config({}, context)).toThrow(
      /explicit http/
    );
  });

  it('pins the local server and preserves every config field except relayUrl without writing the source', () => {
    const fixture = { ...source, futureOption: { value: 'preserved' } };
    const { plugin, resolved, configPath, original } = prepared(fixture);
    expect(resolved.optimizeDeps).toEqual({ entries: ['index.html'] });
    expect(resolved.server).toEqual({
      host: '127.0.0.1',
      port: 41829,
      strictPort: true,
      origin: 'http://127.0.0.1:41829',
      hmr: false,
      watch: null,
    });
    plugin.configResolved(resolved);
    const { response } = serve(plugin, resolved)();
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.end.mock.calls[0][0])).toEqual({ ...fixture, relayUrl });
    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(readFileSync(configPath, 'utf8')).toBe(original);
    expect(source.relayUrl).toBeNull();
  });

  it.each([
    { host: true },
    { host: '0.0.0.0' },
    { host: 'localhost' },
    { port: 8080 },
    { strictPort: false },
    { hmr: true },
    { hmr: {} },
    { hmr: undefined },
    { watch: {} },
    { watch: undefined },
    { https: {} },
    { middlewareMode: true },
    { origin: 'http://example.com:41829' },
  ])('rejects later host/server overrides: %j', (override) => {
    const { plugin, resolved } = prepared();
    resolved.server = { ...resolved.server, ...override };
    expect(() => plugin.configResolved(resolved)).toThrow(/fixed loopback/);
  });

  it.each([{ command: 'build' }, { isProduction: true }, { isPreview: true }, { env: { DEV: false } }])(
    'rejects production/preview resolution: %j',
    (override) => {
      const { plugin, resolved } = prepared();
      expect(() => plugin.configResolved({ ...resolved, ...override })).toThrow(/fixed loopback/);
    }
  );

  it.each([
    { ...source, version: 2 },
    { ...source, merchantId: '' },
    { ...source, recipient: null },
  ])('requires the existing merchant identity', (fixture) => {
    const { plugin, resolved } = prepared(fixture);
    expect(() => plugin.configResolved(resolved)).toThrow(/existing merchant identity/);
  });

  it('handles only the exact config path and rejects another Host or method', () => {
    const { plugin, resolved } = prepared();
    plugin.configResolved(resolved);
    const request = serve(plugin, resolved);
    expect(request('GET', '/other.json').next).toHaveBeenCalledOnce();
    expect(request('GET', '/community-store.json?x=1').next).toHaveBeenCalledOnce();
    const foreign = request('GET', '/community-store.json', 'example.com:41829');
    expect(foreign.response.statusCode).toBe(403);
    expect(foreign.response.end).toHaveBeenCalledWith();
    const post = request('POST');
    expect(post.response.statusCode).toBe(405);
    expect(post.response.setHeader).toHaveBeenCalledWith('Allow', 'GET, HEAD');
    const head = request('HEAD');
    expect(head.response.statusCode).toBe(200);
    expect(head.response.end).toHaveBeenCalledWith(undefined);
  });

  it('serves byte-identical mainnet settings at the development URL and its exact versioned URL', () => {
    const { plugin, resolved, mainnetConfigPath, mainnetOriginal } = prepared();
    plugin.configResolved(resolved);
    const request = serve(plugin, resolved);
    for (const path of ['/env.dev.json', '/env.dev.json?v=1.0-test']) {
      const { response } = request('GET', path);
      expect(response.statusCode).toBe(200);
      expect(response.end).toHaveBeenCalledWith(mainnetOriginal);
      expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    }
    expect(readFileSync(mainnetConfigPath, 'utf8')).toBe(mainnetOriginal);
    expect(resolved.env.DEV).toBe(true);
    expect(request('GET', '/env.json').next).toHaveBeenCalledOnce();
    expect(request('GET', '/env.dev.json', 'example.com:41829').response.statusCode).toBe(403);
    expect(request('POST', '/env.dev.json').response.statusCode).toBe(405);
  });

  it.each(['/env.dev.json?', '/env.dev.json?v=other', '/env.dev.json?x=1', '/env.dev.json?v=1.0-test&x=1'])(
    'rejects unexpected runtime environment queries without falling back to testnet: %s',
    (path) => {
      const { plugin, resolved } = prepared();
      plugin.configResolved(resolved);
      const { response, next } = serve(plugin, resolved)('GET', path);
      expect(response.statusCode).toBe(400);
      expect(next).not.toHaveBeenCalled();
      expect(response.end).toHaveBeenCalledWith();
    }
  );

  it.each([
    null,
    [],
    { ...mainnetSource, NETWORK_TYPE: 'Dev' },
    { ...mainnetSource, CHAIN_GENESIS_HASH: '0xwrong' },
    { ...mainnetSource, DEFAULT_NETWORKS: [] },
    { ...mainnetSource, DEFAULT_NETWORKS: [{ address: 'wss://mof2.sora.org' }] },
    { ...mainnetSource, DEFAULT_NETWORKS: [...mainnetSource.DEFAULT_NETWORKS, { address: 'wss://example.com' }] },
    { ...mainnetSource, DEFAULT_NETWORKS: [{ address: 'wss://ws.mof.sora.org?other=1' }] },
  ])('rejects malformed or non-mainnet runtime settings', (mainnet) => {
    const { plugin, resolved } = prepared(source, mainnet);
    expect(() => plugin.configResolved(resolved)).toThrow(/pinned SORA mainnet/);
  });

  it('fails before registering middleware when the mainnet file is invalid JSON', () => {
    const { plugin, resolved, mainnetConfigPath } = prepared();
    writeFileSync(mainnetConfigPath, '{invalid');
    expect(() => plugin.configResolved(resolved)).toThrow(SyntaxError);
    expect(() => serve(plugin, resolved)).toThrow(/not resolved/);
  });
});
