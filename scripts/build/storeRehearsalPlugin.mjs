import { readFileSync } from 'node:fs';
import { openRefundHandoff, REFUND_HANDOFF_ENV, refundRehearsalMiddleware } from './storeRefundRehearsal.mjs';

export const STORE_REHEARSAL_MODE = 'store-rehearsal';
export const STORE_REHEARSAL_PORT = 41829;
export const STORE_REHEARSAL_ENV = 'PS_STORE_REHEARSAL_RELAY_URL';
const ORIGIN = `http://127.0.0.1:${STORE_REHEARSAL_PORT}`;
const CONFIG_PATH = new URL('../../public/community-store.json', import.meta.url);
const MAINNET_CONFIG_PATH = new URL('../../public/env.json', import.meta.url);
const MAINNET_GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const MAINNET_NODES = new Set(['wss://ws.mof.sora.org', 'wss://mof2.sora.org']);

/** Read the existing mainnet file unchanged; never substitute an unpinned chain or another provider. */
function mainnetEnvironment(path) {
  const body = readFileSync(path, 'utf8');
  const source = JSON.parse(body);
  if (
    !source ||
    Array.isArray(source) ||
    source.NETWORK_TYPE !== 'Prod' ||
    source.CHAIN_GENESIS_HASH !== MAINNET_GENESIS ||
    !Array.isArray(source.DEFAULT_NETWORKS) ||
    source.DEFAULT_NETWORKS[0]?.address !== 'wss://ws.mof.sora.org' ||
    !source.DEFAULT_NETWORKS.every((node) => node && MAINNET_NODES.has(node.address))
  ) {
    throw new Error('Store rehearsal requires the pinned SORA mainnet environment.');
  }
  return body;
}

/** Require a literal loopback origin and an explicit port, without credentials or paths. */
function relayOrigin(value) {
  const match = typeof value === 'string' && /^http:\/\/127\.0\.0\.1:([1-9][0-9]{0,4})\/?$/.exec(value);
  const port = match ? Number(match[1]) : 0;
  if (!port || port === 80 || port > 65535 || port === STORE_REHEARSAL_PORT) {
    throw new Error('Store rehearsal requires an explicit http://127.0.0.1:<relay-port> origin.');
  }
  return `http://127.0.0.1:${port}`;
}

/** Refuse preview, production, or another bind address even if later config hooks changed them. */
function assertLocalServer(config) {
  if (
    config.command !== 'serve' ||
    config.mode !== STORE_REHEARSAL_MODE ||
    config.isProduction ||
    config.isPreview ||
    config.env?.DEV !== true ||
    config.server.host !== '127.0.0.1' ||
    config.server.port !== STORE_REHEARSAL_PORT ||
    config.server.strictPort !== true ||
    config.server.hmr !== false ||
    config.server.watch !== null ||
    config.server.https ||
    config.server.middlewareMode ||
    config.server.origin !== ORIGIN
  ) {
    throw new Error('Store rehearsal requires the fixed loopback development server.');
  }
}

/** Override only the development response; never write a config, transform a module, or emit an asset. */
export function storeRehearsalPlugin({
  environment = process.env,
  configPath = CONFIG_PATH,
  mainnetConfigPath = MAINNET_CONFIG_PATH,
} = {}) {
  let relayUrl;
  let body;
  let mainnetBody;
  let refundHandoff;
  const environmentPaths = new Set(['/env.dev.json']);
  return {
    name: 'polkaswap-store-rehearsal',
    enforce: 'post',
    config(_config, context) {
      const supplied = environment[STORE_REHEARSAL_ENV] !== undefined || environment[REFUND_HANDOFF_ENV] !== undefined;
      if (context.mode !== STORE_REHEARSAL_MODE && !supplied) return;
      if (
        context.command !== 'serve' ||
        context.isPreview ||
        context.mode !== STORE_REHEARSAL_MODE ||
        environment.NODE_ENV === 'production'
      ) {
        throw new Error('Store rehearsal configuration is allowed only in explicit development serve mode.');
      }
      relayUrl = relayOrigin(environment[STORE_REHEARSAL_ENV]);
      // Vite's mergeConfig drops returned null overrides; mutate this supported option before merging.
      _config.server ??= {};
      _config.server.watch = null;
      return {
        base: '/',
        define: {
          'import.meta.env.VITE_STORE_REFUND_REHEARSAL': JSON.stringify(environment[REFUND_HANDOFF_ENV] ? '1' : '0'),
        },
        // Archived HTML snapshots are not app entrypoints and can overwhelm the dependency scan.
        optimizeDeps: { entries: ['index.html'] },
        // Keep a prepared checkout stable while unrelated work changes files in this shared checkout.
        server: {
          host: '127.0.0.1',
          port: STORE_REHEARSAL_PORT,
          strictPort: true,
          origin: ORIGIN,
          hmr: false,
          watch: null,
        },
      };
    },
    configResolved(config) {
      if (!relayUrl) return;
      assertLocalServer(config);
      if (environment[REFUND_HANDOFF_ENV] !== undefined) {
        if (!environment[REFUND_HANDOFF_ENV]) throw new Error('Refund rehearsal requires an explicit private handoff.');
        refundHandoff = openRefundHandoff(environment[REFUND_HANDOFF_ENV]);
      }
      const source = JSON.parse(readFileSync(configPath, 'utf8'));
      if (
        !source ||
        Array.isArray(source) ||
        source.version !== 1 ||
        typeof source.merchantId !== 'string' ||
        !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(source.merchantId) ||
        typeof source.recipient !== 'string' ||
        !/^[1-9A-HJ-NP-Za-km-z]{45,64}$/.test(source.recipient)
      ) {
        throw new Error('Store rehearsal requires the existing merchant identity and recipient.');
      }
      body = JSON.stringify({ ...source, relayUrl });
      mainnetBody = mainnetEnvironment(mainnetConfigPath);
      const version = config.env.VITE_APP_VERSION?.trim();
      if (version) environmentPaths.add(`/env.dev.json?v=${encodeURIComponent(version)}`);
    },
    configureServer(server) {
      if (!relayUrl) return;
      assertLocalServer(server.config);
      if (!body || !mainnetBody) throw new Error('Store rehearsal configuration was not resolved.');
      server.middlewares.use((request, response, next) => {
        const runtimeEnvironment = request.url === '/env.dev.json' || request.url?.startsWith('/env.dev.json?');
        if (request.url !== '/community-store.json' && !runtimeEnvironment) return next();
        response.setHeader('Cache-Control', 'no-store');
        if (request.headers.host !== `127.0.0.1:${STORE_REHEARSAL_PORT}`) {
          response.statusCode = 403;
          return response.end();
        }
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          response.statusCode = 405;
          response.setHeader('Allow', 'GET, HEAD');
          return response.end();
        }
        if (runtimeEnvironment && !environmentPaths.has(request.url)) {
          response.statusCode = 400;
          return response.end();
        }
        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.end(request.method === 'HEAD' ? undefined : runtimeEnvironment ? mainnetBody : body);
      });
      if (refundHandoff) server.middlewares.use(refundRehearsalMiddleware(refundHandoff));
    },
  };
}
