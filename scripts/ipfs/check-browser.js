#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = global.__IPFS_CHECK_FS__ || require('fs');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('path');

const { chromium, firefox, webkit } = require('playwright');

const DEFAULT_GATEWAY = 'http://127.0.0.1:8080/ipfs';
const DEFAULT_ROUTE = '#/swap';
const DEFAULT_SELECTOR = '#app';
const LOAD_TIMEOUT = Number(process.env.IPFS_CHECK_TIMEOUT || 60000);
const DEFAULT_SETTLE_MS = Number(process.env.IPFS_CHECK_SETTLE_MS || 500);
const DEFAULT_SAMPLE_INTERVAL_MS = Number(process.env.IPFS_CHECK_SAMPLE_INTERVAL_MS || 500);
const CONTENT_POLL_INTERVAL_MS = Number(process.env.IPFS_CHECK_CONTENT_POLL || 200);
const DEFAULT_BROWSER_ORDER = ['chromium', 'webkit', 'firefox'];
const IPFS_BOOT_TIMEOUT = Number(process.env.IPFS_CHECK_IPFS_TIMEOUT || 15000);
const APPROVED_LIVE_RPC = 'wss://ws.mof.sora.org/';
const MAINNET_GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const MAX_LIVE_RPC_FRAME_BYTES = 64 * 1024;
// A presentation action budget, independent of hydration/load polling and route settling.
const FOOTER_PRESENTATION_TIMEOUT_MS = 2500;
const FIRST_VISIT_DISCLAIMER_SELECTOR = '.disclaimer-modal[data-open="true"]:not(.disclaimer-modal--nonblocking)';

const IGNORED_CONSOLE_PATTERNS = [
  /Electron Security Warning/i,
  /Cannot redefine property: \$route/i,
  /Cannot set property .*\$router/i,
  /\[createApp\] Failed to install plugin/i,
  /\[OfflineShell\] active/i,
  /Failed to execute 'querySelector'.*\[object Object\]/i,
  /ResizeObserver loop completed with undelivered notifications/i,
  /Error:\s*Connection Timeout/i,
  /\[Exchange rate API\] Error while fetching rates\./i,
];
const CORRUPTED_UI_PATTERNS = [
  /\[object Promise\]/i,
  /\bNaN\b/,
  /draggable element must have an item slot/i,
  /Cannot read properties of undefined \(reading '\$refs'\)/i,
  /Cannot read properties of null \(reading 'query'\)/i,
];
const PREVIEW_MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

/** Validate an explicit local build whose static files will use the requested browser origin. */
function resolvePreviewConfig(previewDist, targetUrl, fsDeps = fs) {
  if (typeof previewDist !== 'string' || !path.isAbsolute(previewDist)) {
    throw new Error('--preview-dist must be an absolute directory path.');
  }
  const target = new URL(targetUrl);
  if (!['https:', 'http:'].includes(target.protocol) || target.username || target.password) {
    throw new Error('--preview-dist requires an HTTP(S) target URL without credentials.');
  }
  const root = fsDeps.realpathSync(previewDist);
  if (!fsDeps.statSync(root).isDirectory()) throw new Error('--preview-dist must identify a directory.');
  return { root, origin: target.origin };
}

/** Read one same-origin GET from the build, rejecting escapes and missing files without network fallback. */
function readPreviewAsset(preview, requestUrl, method, fsDeps = fs) {
  const url = new URL(requestUrl);
  if (url.origin !== preview.origin || method !== 'GET') return null;
  const failure = (status) => ({
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    body: 'Static preview file unavailable.',
  });
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return failure(400);
  }
  if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').includes('..')) {
    return failure(403);
  }
  const requested = path.resolve(preview.root, `.${pathname === '/' ? '/index.html' : pathname}`);
  const withinRoot = (file) => file.startsWith(`${preview.root}${path.sep}`);
  if (!withinRoot(requested)) return failure(403);
  try {
    const realFile = fsDeps.realpathSync(requested);
    if (!withinRoot(realFile)) return failure(403);
    if (!fsDeps.statSync(realFile).isFile()) return failure(404);
    return {
      status: 200,
      headers: {
        'content-type': PREVIEW_MIME_TYPES[path.extname(realFile).toLowerCase()] || 'application/octet-stream',
        'cache-control': path.extname(realFile).toLowerCase() === '.html' ? 'no-store' : 'no-cache',
      },
      body: fsDeps.readFileSync(realFile),
    };
  } catch (error) {
    return failure(['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500);
  }
}

/** Only the chosen origin's static GETs are fulfilled; relay requests and non-GETs remain untouched. */
async function installStaticPreview(context, preview, fsDeps = fs) {
  await context.route(
    (url) => url.origin === preview.origin,
    async (route) => {
      const request = route.request();
      const response = readPreviewAsset(preview, request.url(), request.method(), fsDeps);
      if (response) await route.fulfill(response);
      else await route.continue();
    }
  );
}

function parseArgs(argv) {
  const args = {};
  argv.forEach((arg, idx) => {
    if (!arg.startsWith('--')) return;
    const [key, rawValue] = arg.includes('=') ? arg.split('=') : [arg, argv[idx + 1]];
    const normalized = key.slice(2);
    if (rawValue && !rawValue.startsWith('--')) {
      args[normalized] = rawValue;
    } else if (key.includes('=')) {
      args[normalized] = rawValue;
    } else {
      args[normalized] = true;
    }
  });
  return args;
}

function buildTargetUrl(opts) {
  if (opts.url) return opts.url;

  const cid = opts.cid;
  if (!cid) throw new Error('Either `--cid` or `--url` must be provided.');

  const gateway = (opts.gateway || DEFAULT_GATEWAY).replace(/\/?$/, '');
  const route = opts.route || DEFAULT_ROUTE;
  const normalizedCid = cid.replace(/^\/+/, '');
  const suffix = route.startsWith('#') || route.startsWith('?') ? `/index.html${route}` : `/index.html#${route}`;

  let url = `${gateway}/${normalizedCid}${suffix}`;
  if (url.includes('/index.html?')) {
    url = url.replace('/index.html?', '/index.html?ipfs-check=1&');
  } else {
    url = url.replace('/index.html', '/index.html?ipfs-check=1');
  }
  return url;
}

function pickBrowsers(arg) {
  if (!arg) return [...DEFAULT_BROWSER_ORDER];
  return arg
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter((name) => DEFAULT_BROWSER_ORDER.includes(name));
}

function multiaddrToGatewayUrl(multiaddr) {
  if (!multiaddr) return null;
  const parts = multiaddr.split('/').filter(Boolean);
  const ip4Index = parts.indexOf('ip4');
  const ip6Index = parts.indexOf('ip6');
  const tcpIndex = parts.indexOf('tcp');
  let host = '127.0.0.1';
  if (ip4Index !== -1 && parts[ip4Index + 1]) {
    host = parts[ip4Index + 1];
  } else if (ip6Index !== -1 && parts[ip6Index + 1]) {
    host = `[${parts[ip6Index + 1]}]`;
  }
  const port = tcpIndex !== -1 && parts[tcpIndex + 1] ? parts[tcpIndex + 1] : '8080';
  return `http://${host}:${port}/ipfs`;
}

function resolveIpfsPath(explicitPath) {
  const home = process.env.HOME || process.env.USERPROFILE;
  const candidates = [
    explicitPath,
    process.env.IPFS_PATH,
    path.join(process.cwd(), '.ipfs-workspace'),
    home ? path.join(home, '.ipfs') : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const configPath = path.join(candidate, 'config');
      if (fs.existsSync(configPath)) {
        return candidate;
      }
    } catch {
      // ignore access issues
    }
  }

  return null;
}

async function spawnIpfsGateway({ ipfsPath, enableGateway }) {
  if (!enableGateway) {
    return { stop: async () => {}, spawned: false };
  }

  if (!ipfsPath) {
    throw new Error(
      'Cannot spawn IPFS gateway automatically because no IPFS repository path was found. Specify one with `--ipfs-path` or set IPFS_PATH.'
    );
  }

  return new Promise((resolve, reject) => {
    const env = { ...process.env, IPFS_PATH: ipfsPath };
    const configPath = path.join(ipfsPath, 'config');
    try {
      const rawConfig = fs.readFileSync(configPath, 'utf8');
      const updatedConfig = JSON.parse(rawConfig);
      updatedConfig.Addresses = updatedConfig.Addresses || {};
      if (
        updatedConfig.Addresses.API !== '/ip4/127.0.0.1/tcp/0' ||
        updatedConfig.Addresses.Gateway !== '/ip4/127.0.0.1/tcp/0'
      ) {
        updatedConfig.Addresses.API = '/ip4/127.0.0.1/tcp/0';
        updatedConfig.Addresses.Gateway = '/ip4/127.0.0.1/tcp/0';
        fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));
      }
    } catch (configError) {
      console.warn(
        '[ipfs:check] Unable to adjust IPFS config for dynamic ports:',
        configError.message || String(configError)
      );
    }

    const daemonArgs = [
      'daemon',
      '--offline',
      '--enable-gc=false',
      '--routing=none',
      '--migrate=true',
      '--api=/ip4/127.0.0.1/tcp/0',
    ];

    const daemon = spawn('ipfs', daemonArgs, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let settled = false;
    const logs = [];
    let gatewayAddress = null;

    const onData = (data) => {
      const text = data.toString();
      logs.push(text);
      const gatewayMatch = text.match(/Gateway(?: \(readonly\))? server listening on ([^\n]+)/);
      if (!gatewayAddress && gatewayMatch) {
        gatewayAddress = gatewayMatch[1]?.trim();
      }
      if (/Daemon is ready/.test(text) || /Daemon is running/.test(text)) {
        settled = true;
        resolve({
          spawned: true,
          gatewayAddress,
          stop: async () => {
            daemon.removeAllListeners();
            daemon.kill('SIGINT');
            await delay(500);
            if (!daemon.killed) {
              daemon.kill('SIGKILL');
            }
          },
        });
      }
    };

    daemon.stdout.on('data', onData);
    daemon.stderr.on('data', onData);

    daemon.once('error', (error) => {
      if (settled) return;
      settled = true;
      reject(new Error(`Failed to start IPFS daemon: ${error.message}`));
    });

    daemon.once('exit', (code, signal) => {
      if (settled) return;
      settled = true;
      reject(
        new Error(
          `IPFS daemon exited prematurely (code=${code ?? 'null'}, signal=${signal ?? 'null'}). Logs:\n${logs.join('')}`
        )
      );
    });

    setTimeout(() => {
      if (settled) return;
      settled = true;
      daemon.kill('SIGKILL');
      reject(new Error(`Timed out after ${IPFS_BOOT_TIMEOUT}ms while waiting for IPFS daemon to start.`));
    }, IPFS_BOOT_TIMEOUT);
  });
}

async function waitForContent(page, selector, timeoutMs = LOAD_TIMEOUT) {
  const readMetrics = async () => {
    try {
      return await page.$eval(selector, (el) => {
        const htmlLength = (el.innerHTML || '').trim().length;
        const hasChildren = Boolean(el.children && el.children.length > 0);

        if (!hasChildren && htmlLength === 0) return null;

        return {
          textLength: (el.textContent || '').trim().length,
          htmlLength,
        };
      });
    } catch {
      return null;
    }
  };

  const timeoutAt = Date.now() + timeoutMs;

  while (Date.now() < timeoutAt) {
    const metrics = await readMetrics();
    if (metrics) return metrics;
    await page.waitForTimeout(CONTENT_POLL_INTERVAL_MS);
  }

  return readMetrics();
}

/** The requested hash path, route title, and mounted feature must survive hydration. */
function routeReadiness(targetUrl) {
  let routePath;
  try {
    routePath = new URL(targetUrl).hash.replace(/^#/, '').split('?')[0];
  } catch {
    return { name: 'app', title: null, selector: null };
  }

  if (/^\/swap(?:\/|$)/.test(routePath)) {
    return {
      name: 'swap',
      path: routePath,
      title: 'Swap - Polkaswap',
      selector: '.swap-container [data-widget-id="swapForm"]',
    };
  }
  if (/^\/bots(?:\/|$)/.test(routePath)) {
    return {
      name: 'bots',
      path: routePath,
      title: 'Bots - Polkaswap',
      selector: /^\/bots\/(?:lab|backtesting|my-bots)(?:\/|$)/.test(routePath)
        ? 'main.bots-page .bots-view-tabs'
        : 'main.bots-page [data-testid="autopilot"]',
    };
  }
  if (/^\/store(?:\/|$)/.test(routePath)) {
    return {
      name: 'store',
      path: routePath,
      title: 'Store - Polkaswap',
      selector: 'main.community-store [data-testid="store-checkout"]',
    };
  }
  if (/^\/buy-xor(?:\/|$)/.test(routePath)) {
    return {
      name: 'buy-xor',
      path: routePath,
      title: 'Buy XOR - Polkaswap',
      selector: 'main.get-ts[data-test-name="buyXorPage"] .get-ts__workspace',
    };
  }
  if (/^\/get-ts(?:\/|$)/.test(routePath)) {
    return {
      name: 'get-ts',
      path: routePath,
      title: 'Get TS - Polkaswap',
      selector: 'main.get-ts[data-test-name="getTsPage"] .get-ts__workspace',
    };
  }
  return { name: 'app', path: routePath, title: null, selector: null };
}

/** Inspect the live DOM so a server-rendered bootstrap loader cannot pass as a mounted route. */
async function inspectHydratedUi(page, appSelector, readiness) {
  try {
    return await page.evaluate(
      ({ appSelector, routeSelector }) => {
        const app = document.querySelector(appSelector);
        return {
          title: document.title,
          routePath: window.location.hash.replace(/^#/, '').split('?')[0],
          hasAppContent: Boolean(app?.children.length),
          hasBootstrapLoader: Boolean(app?.querySelector('.app-bootstrap-loader')),
          hasRouteUi: routeSelector ? Boolean(app?.querySelector(routeSelector)) : Boolean(app?.children.length),
        };
      },
      { appSelector, routeSelector: readiness.selector }
    );
  } catch {
    return null;
  }
}

/** Return the first unmet route condition, including an accurate final-state failure reason. */
function hydrationIssue(state, readiness) {
  if (!state?.hasAppContent) return 'App content did not render anything under the target selector.';
  if (state.hasBootstrapLoader) return 'App remained on the bootstrap loader.';
  if (readiness.path && state.routePath !== readiness.path) {
    return `Expected route "#${readiness.path}"; received "#${state.routePath ?? ''}".`;
  }
  if (readiness.title && state.title !== readiness.title) {
    return `Expected ${readiness.name} title "${readiness.title}"; received "${state.title}".`;
  }
  if (!state.hasRouteUi) return `${readiness.name} UI did not render after the bootstrap loader.`;
  return null;
}

/** Wait for the actual route before beginning the final settle and screenshot capture. */
async function waitForHydratedUi(page, appSelector, readiness, timeoutMs = LOAD_TIMEOUT) {
  const timeoutAt = Date.now() + timeoutMs;
  let state = await inspectHydratedUi(page, appSelector, readiness);
  while (hydrationIssue(state, readiness) && Date.now() < timeoutAt) {
    await page.waitForTimeout(CONTENT_POLL_INTERVAL_MS);
    state = await inspectHydratedUi(page, appSelector, readiness);
  }
  return state;
}

async function captureOfflineShell(page, selector) {
  return page.evaluate((sel) => {
    const offlineEl = document.querySelector('.offline-shell');
    if (!offlineEl) return null;
    const host = document.querySelector(sel);
    const text = (offlineEl.textContent || '').trim();
    const html = (offlineEl.innerHTML || '').trim();
    return {
      metrics: {
        textLength: text.length,
        htmlLength: html.length,
      },
      snapshot: offlineEl.outerHTML || null,
      hostSnapshot: host ? host.outerHTML || null : null,
    };
  }, selector);
}

/** Keeps browser CORS failures visible even when the affected API is optional. */
function filterConsoleMessages(messages) {
  return messages.filter((msg) => {
    if (msg.level !== 'error') return false;
    return !IGNORED_CONSOLE_PATTERNS.some((pattern) => pattern.test(msg.message));
  });
}

/** Every captured failed request must contribute to deployment validation. */
function filterFailedRequests(requests) {
  return Array.isArray(requests) ? requests : [];
}

async function ensureDirectory(filePath) {
  if (!filePath) return;
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
}

function resolveScreenshotPath(args) {
  if (args.screenshot) {
    return path.resolve(process.cwd(), args.screenshot);
  }
  if (args['screenshot-base64']) {
    return null;
  }
  if (process.env.IPFS_CHECK_SCREENSHOT) {
    return path.resolve(process.cwd(), process.env.IPFS_CHECK_SCREENSHOT);
  }
  return null;
}

function inferContentMetricsFromSnapshot(snapshot) {
  if (typeof snapshot !== 'string') return null;
  const html = snapshot.trim();
  if (!html.length) return null;

  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    textLength: text.length,
    htmlLength: html.length,
  };
}

function findInvalidResourceAttributes(snapshot) {
  if (typeof snapshot !== 'string' || !snapshot.length) return [];

  const results = [];
  const pattern = /\b(?:src|href)=["'][^"']*\[object Object\][^"']*["']/gi;
  let match = pattern.exec(snapshot);

  while (match) {
    results.push(match[0]);
    match = pattern.exec(snapshot);
  }

  return [...new Set(results)];
}

function findCorruptedUiPatterns(value) {
  if (typeof value !== 'string' || !value.trim().length) return [];

  return CORRUPTED_UI_PATTERNS.filter((pattern) => pattern.test(value)).map((pattern) => pattern.toString());
}

function parseNonNegativeInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

function collectCorruptedUiPatterns(samples) {
  if (!Array.isArray(samples) || !samples.length) return [];
  const patterns = [];

  samples.forEach((sample) => {
    patterns.push(...findCorruptedUiPatterns(sample));
  });

  return [...new Set(patterns)];
}

/**
 * Detects immutable IPFS/IPNS gateway paths where long-lived HTML caching is expected.
 */
function isIpfsPathUrl(url) {
  try {
    const parsed = new URL(url);
    return /^\/(?:ipfs|ipns)\//i.test(parsed.pathname);
  } catch {
    return false;
  }
}

/**
 * Limits cache validation to stable HTTP hostnames, not content-addressed gateway paths.
 */
function shouldValidateStableHostHtmlCache(targetUrl) {
  if (!targetUrl || isIpfsPathUrl(targetUrl)) return false;

  try {
    const parsed = new URL(targetUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Requires stable app shells to forbid storage or require revalidation on every reuse.
 * Shared-cache freshness must not override a zero browser max-age.
 */
function findStableHostHtmlCacheIssue(headers, targetUrl) {
  if (!shouldValidateStableHostHtmlCache(targetUrl)) return null;

  const cacheControl = String(headers?.['cache-control'] || '').trim();
  if (!cacheControl) {
    return 'Stable host HTML response is missing Cache-Control.';
  }

  // Keep quoted field lists intact so a qualified no-cache value cannot supply a directive.
  const parts = cacheControl.match(/(?:[^,"]|"(?:\\.|[^"\\])*")+/g) || [];
  if (parts.join(',') !== cacheControl) {
    return `Stable host HTML has malformed Cache-Control: ${cacheControl}`;
  }
  const directives = parts.map((part) => part.trim().toLowerCase());

  if (directives.includes('no-store')) {
    return null;
  }

  if (directives.includes('immutable')) {
    return `Stable host HTML must not be cached immutably; received Cache-Control: ${cacheControl}`;
  }

  if (directives.includes('no-cache')) {
    return null;
  }

  const maxAges = directives.filter((directive) => /^max-age\s*=/.test(directive));
  const sharedMaxAges = directives.filter((directive) => /^s-maxage\s*=/.test(directive));
  const zeroMaxAge = maxAges.length === 1 && /^max-age\s*=\s*(?:0|"0")$/.test(maxAges[0]);
  const zeroSharedMaxAge =
    sharedMaxAges.length === 0 || (sharedMaxAges.length === 1 && /^s-maxage\s*=\s*(?:0|"0")$/.test(sharedMaxAges[0]));

  if (zeroMaxAge && zeroSharedMaxAge && directives.includes('must-revalidate')) {
    return null;
  }

  return `Stable host HTML must require revalidation on every reuse; received Cache-Control: ${cacheControl}`;
}

const BROWSER_LAUNCHERS = {
  chromium: async () =>
    chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-crashpad',
        '--disable-dev-shm-usage',
      ],
    }),
  webkit: async () => webkit.launch({ headless: true }),
  firefox: async () => firefox.launch({ headless: true }),
};

/** Production cannot omit/override its live RPC gate; other targets may explicitly request the same gate. */
function resolveLiveRpcExpectation(targetUrl, explicit) {
  const target = new URL(targetUrl);
  const production = target.protocol === 'https:' && target.hostname === 'polkaswap.io' && !target.port;
  if (production && (target.username || target.password)) {
    throw new Error('Production live RPC checks require a target URL without credentials.');
  }
  if (explicit !== undefined && !['wss://ws.mof.sora.org', APPROVED_LIVE_RPC].includes(explicit)) {
    throw new Error('--expected-live-rpc may only be wss://ws.mof.sora.org.');
  }
  return production || explicit !== undefined ? APPROVED_LIVE_RPC : null;
}

/** Normalize a root WSS endpoint without aliases, credentials, query strings or fragments. */
function normalizeLiveRpcEndpoint(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'wss:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      return null;
    }
    return `${url.origin}/`;
  } catch {
    return null;
  }
}

/** Observe only; correlate genuine browser genesis reads without storing or sending RPC payloads. */
function observeLiveRpcSockets(page) {
  const sockets = [];
  const events = [];
  const cleanupEvents = [];
  const failures = [];
  let cleanupStarted = false;
  let sequence = 0;
  const record = (socket, kind, details = {}) => {
    const entry = { sequence: ++sequence, socketId: socket.id, kind, ...details };
    (cleanupStarted ? cleanupEvents : events).push(entry);
  };
  const messages = (frame) => {
    const payload = frame?.payload;
    if (!(typeof payload === 'string' || Buffer.isBuffer(payload))) return [];
    if (Buffer.byteLength(payload) > MAX_LIVE_RPC_FRAME_BYTES) return [];
    try {
      const parsed = JSON.parse(typeof payload === 'string' ? payload : payload.toString('utf8'));
      return Array.isArray(parsed) ? parsed.slice(0, 64) : [parsed];
    } catch {
      return [];
    }
  };
  const requestKey = (id) =>
    typeof id === 'string' || (typeof id === 'number' && Number.isSafeInteger(id)) ? `${typeof id}:${id}` : null;

  page.on('websocket', (transport) => {
    const rawUrl = transport.url();
    const endpoint = normalizeLiveRpcEndpoint(rawUrl);
    // Evidence excludes URL credentials/query strings even for unexpected sockets.
    let displayUrl = '<invalid websocket URL>';
    try {
      const url = new URL(rawUrl);
      displayUrl = `${url.protocol}//${url.host}${url.pathname === '/' ? '/' : '/<non-root>'}`;
    } catch {}
    const socket = {
      id: sockets.length + 1,
      endpoint,
      url: displayUrl,
      closed: false,
      sentGenesisReads: 0,
      successfulGenesisReads: 0,
    };
    const pending = new Set();
    sockets.push(socket);
    record(socket, 'created');
    transport.on('framesent', (frame) => {
      for (const message of messages(frame)) {
        const key = requestKey(message?.id);
        if (
          key &&
          message?.jsonrpc === '2.0' &&
          message.method === 'chain_getBlockHash' &&
          Array.isArray(message.params) &&
          message.params.length === 1 &&
          message.params[0] === 0
        ) {
          if (pending.size >= 1024) continue;
          pending.add(key);
          if (!cleanupStarted) socket.sentGenesisReads += 1;
          record(socket, 'genesis-read-sent');
        }
      }
    });
    transport.on('framereceived', (frame) => {
      for (const message of messages(frame)) {
        const key = requestKey(message?.id);
        if (!key || !pending.delete(key)) continue;
        const success =
          message?.jsonrpc === '2.0' &&
          !Object.prototype.hasOwnProperty.call(message, 'error') &&
          typeof message.result === 'string' &&
          message.result.toLowerCase() === MAINNET_GENESIS;
        if (success && !cleanupStarted) socket.successfulGenesisReads += 1;
        if (!success)
          failures.push({
            socketId: socket.id,
            errorClass: 'invalid-or-non-mainnet-genesis-response',
            duringCleanup: cleanupStarted,
          });
        record(socket, success ? 'mainnet-genesis-read-succeeded' : 'genesis-read-not-successful');
      }
    });
    transport.on('socketerror', (error) => {
      const cancelled = ['cancelled', 'net::ERR_ABORTED'].includes(error);
      const entry = {
        socketId: socket.id,
        errorClass: cancelled ? error : 'non-cancellation',
        duringCleanup: cleanupStarted,
      };
      record(socket, 'socketerror', entry);
      if (!cleanupStarted || !cancelled) failures.push(entry);
    });
    transport.on('close', () => {
      socket.closed = true;
      record(socket, 'closed');
    });
  });
  return {
    seal() {
      const snapshot = {
        boundary: { kind: 'end-of-observation-before-cleanup', monotonicNs: process.hrtime.bigint().toString() },
        sockets: sockets.map((socket) => ({ ...socket })),
        events: events.map((entry) => ({ ...entry })),
      };
      cleanupStarted = true;
      return snapshot;
    },
    failures: () => failures.map((entry) => ({ ...entry })),
    cleanupEvents: () => cleanupEvents.map((entry) => ({ ...entry })),
  };
}

/** Recognize the app's blocking legal notice without acknowledging, hiding or changing it. */
async function hasUnacceptedAppDisclaimer(page) {
  const notices = page.locator(FIRST_VISIT_DISCLAIMER_SELECTOR);
  if ((await notices.count()) !== 1) return false;
  return notices.first().evaluate((root) => {
    const document = root.ownerDocument;
    const visible = (element) => {
      const style = document.defaultView.getComputedStyle(element);
      return element.getClientRects().length > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(visible);
    const checkbox = root.querySelector('.disclaimer__acknowledgement input[type="checkbox"]');
    const accept = root.querySelector('button.disclaimer__accept-btn');
    const overlay = root.querySelector('.s-modal__overlay');
    return (
      visible(root) &&
      dialogs.length === 1 &&
      root.contains(dialogs[0]) &&
      dialogs[0].classList.contains('disclaimer-modal__dialog') &&
      Boolean(overlay && visible(overlay)) &&
      Boolean(checkbox && !checkbox.checked && !checkbox.disabled) &&
      Boolean(accept && accept.disabled) &&
      !root.querySelector('.disclaimer__header-close-btn') &&
      Boolean(root.querySelector('.disclaimer__text a[href="https://wiki.sora.org/polkaswap/terms"]')) &&
      Boolean(root.querySelector('.disclaimer__text a[href="https://wiki.sora.org/polkaswap/privacy"]'))
    );
  });
}

/** The two immersive checkout routes intentionally omit AppFooter; inspect their exact shell atomically. */
async function inspectCheckoutLiveRpcLayout(page, appSelector, readiness) {
  if (!['/buy-xor', '/get-ts'].includes(readiness.path)) return { connected: false, address: null };
  const expected = routeReadiness(`https://polkaswap.io/#${readiness.path}`);
  if (readiness.title !== expected.title || readiness.selector !== expected.selector)
    return { connected: false, address: null };
  const state = await page.locator(appSelector).evaluate(
    (app, { routeSelector }) => {
      const document = app.ownerDocument;
      const visible = (element) => {
        const style = document.defaultView.getComputedStyle(element);
        return element.getClientRects().length > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      };
      const shells = app.querySelectorAll('.app-main.app-main--checkout');
      const feature = shells.length === 1 ? shells[0].querySelector(routeSelector) : null;
      return {
        checkout: {
          layout: shells.length === 1 && visible(shells[0]) ? 'app-main--checkout' : null,
          footerAbsent: document.querySelectorAll('.app-status').length === 0,
          hasVisibleFeature: Boolean(feature && visible(feature)),
        },
        hydration: {
          title: document.title,
          routePath: document.defaultView.location.hash.replace(/^#/, '').split('?')[0],
          hasAppContent: Boolean(app.children.length),
          hasBootstrapLoader: Boolean(app.querySelector('.app-bootstrap-loader')),
          hasRouteUi: Boolean(feature && visible(feature)),
        },
      };
    },
    { routeSelector: readiness.selector }
  );
  return { connected: null, address: null, binding: 'intentional-checkout-no-footer', ...state };
}

/** Read the existing node popover only; do not change selection, accept terms, test latency or touch a wallet. */
async function inspectLiveRpcFooter(page, appSelector, readiness) {
  try {
    const nodes = page.locator('.app-status .app-status__item.node');
    const nodeCount = await nodes.count();
    if (nodeCount === 0) return await inspectCheckoutLiveRpcLayout(page, appSelector, readiness);
    if (nodeCount !== 1) return { connected: false, address: null };
    const node = nodes.first();
    const successful = async () =>
      (await node.isVisible()) &&
      String(await node.getAttribute('class'))
        .split(/\s+/)
        .includes('success');
    if (!(await successful())) return { connected: false, address: null };
    const oldVisiblePanels = await page.locator('.app-status__tooltip').evaluateAll(
      (elements) =>
        elements.filter((element) => {
          const style = element.ownerDocument.defaultView.getComputedStyle(element);
          return element.getClientRects().length > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        }).length
    );
    if (oldVisiblePanels !== 0) return { connected: false, address: null };
    const unacceptedDisclaimer = await hasUnacceptedAppDisclaimer(page);
    const presentationDeadline = Date.now() + FOOTER_PRESENTATION_TIMEOUT_MS;
    if (unacceptedDisclaimer) {
      // FooterPopper's Enter handler presents the read-only popup without the notice's click focus trap.
      await node.dispatchEvent(
        'keypress',
        { key: 'Enter', code: 'Enter' },
        { timeout: FOOTER_PRESENTATION_TIMEOUT_MS }
      );
    } else {
      await node.click({ timeout: FOOTER_PRESENTATION_TIMEOUT_MS });
    }
    const addresses = page.locator('.app-status__tooltip.success .item__desc > span').filter({ hasText: /^wss:\/\// });
    const presentationRemainingMs = Math.min(FOOTER_PRESENTATION_TIMEOUT_MS, presentationDeadline - Date.now());
    if (presentationRemainingMs <= 0) return { connected: false, address: null };
    await addresses.first().waitFor({ state: 'visible', timeout: presentationRemainingMs });
    // Read endpoint binding and every hydration condition from one live DOM after all presentation awaits.
    const state = await node.evaluate(
      (element, { appSelector, routeSelector }) => {
        const document = element.ownerDocument;
        const visible = (target) => {
          const style = document.defaultView.getComputedStyle(target);
          return target.getClientRects().length > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        };
        const nodes = document.querySelectorAll('.app-status .app-status__item.node');
        const panels = [...document.querySelectorAll('.app-status__tooltip')].filter(visible);
        const panel = panels.length === 1 && panels[0].classList.contains('success') ? panels[0] : null;
        const addresses = panel
          ? [...panel.querySelectorAll('.item__desc > span')]
              .filter((target) => visible(target) && /^wss:\/\//.test(target.textContent.trim()))
              .map((target) => target.textContent.trim())
          : [];
        const app = document.querySelector(appSelector);
        return {
          connected: nodes.length === 1 && visible(element) && element.classList.contains('success'),
          address: addresses.length === 1 ? addresses[0] : null,
          binding: panel ? 'fresh-node-popover' : null,
          hydration: {
            title: document.title,
            routePath: document.defaultView.location.hash.replace(/^#/, '').split('?')[0],
            hasAppContent: Boolean(app?.children.length),
            hasBootstrapLoader: Boolean(app?.querySelector('.app-bootstrap-loader')),
            hasRouteUi: routeSelector ? Boolean(app?.querySelector(routeSelector)) : Boolean(app?.children.length),
          },
        };
      },
      { appSelector, routeSelector: readiness.selector }
    );
    return {
      connected: state.connected,
      address: normalizeLiveRpcEndpoint(state.address),
      binding: state.binding,
      hydration: state.hydration,
      ...(unacceptedDisclaimer ? { presentation: 'node-event-with-unaccepted-disclaimer' } : {}),
    };
  } catch {
    return { connected: false, address: null };
  }
}

/** A probe HTTP200, old log, unmatched frame or post-boundary response never supplies live authority. */
function liveRpcIssue(expected, footer, snapshot, failures, readiness) {
  if (!expected) return null;
  const checkoutReadiness = readiness && routeReadiness(`https://polkaswap.io/#${readiness.path}`);
  const verifiedCheckout =
    ['/buy-xor', '/get-ts'].includes(readiness?.path) &&
    readiness.title === checkoutReadiness.title &&
    readiness.selector === checkoutReadiness.selector &&
    footer?.binding === 'intentional-checkout-no-footer' &&
    footer.checkout?.layout === 'app-main--checkout' &&
    footer.checkout.footerAbsent === true &&
    footer.checkout.hasVisibleFeature === true &&
    !hydrationIssue(footer.hydration, readiness);
  if (
    !verifiedCheckout &&
    (!footer?.connected ||
      footer.binding !== 'fresh-node-popover' ||
      normalizeLiveRpcEndpoint(footer.address) !== expected)
  ) {
    return 'Approved live RPC gate requires the rendered successful footer node address to be ws.mof.sora.org.';
  }
  if (failures.length) return 'Approved live RPC gate detected a WebSocket evidence failure.';
  if (
    snapshot?.sockets.some(
      (socket) =>
        socket.endpoint === 'wss://mof2.sora.org/' || (socket.endpoint !== expected && socket.sentGenesisReads > 0)
    )
  ) {
    return 'Approved live RPC gate observed an unexpected SORA genesis-read WebSocket endpoint.';
  }
  const newestApprovedSocket = snapshot?.sockets.filter((socket) => socket.endpoint === expected).at(-1);
  if (!newestApprovedSocket || newestApprovedSocket.closed || newestApprovedSocket.successfulGenesisReads === 0) {
    return 'Approved live RPC gate requires an active ws.mof WebSocket with a correlated successful mainnet genesis response.';
  }
  return null;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const settleMs = parseNonNegativeInteger(args['settle-ms'], DEFAULT_SETTLE_MS);
  const sampleIntervalMs = Math.max(1, parseNonNegativeInteger(args['sample-interval-ms'], DEFAULT_SAMPLE_INTERVAL_MS));
  let targetUrl;
  let preview = null;
  let expectedLiveRpc = null;
  try {
    targetUrl = buildTargetUrl(args);
    expectedLiveRpc = resolveLiveRpcExpectation(targetUrl, args['expected-live-rpc']);
    if (args['preview-dist']) {
      if (!args.url || args.cid) throw new Error('--preview-dist requires --url and cannot be combined with --cid.');
      preview = resolvePreviewConfig(args['preview-dist'], targetUrl);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  const selector = args.selector || DEFAULT_SELECTOR;
  const browserOrder = pickBrowsers(args.browser);
  const spawnGateway = preview || args['no-spawn-gateway'] ? false : true;
  const ipfsPath = resolveIpfsPath(args['ipfs-path']);

  const status = {
    mode: preview ? 'static-preview' : 'live',
    previewDist: preview?.root || null,
    previewOrigin: preview?.origin || null,
    targetUrl,
    selector,
    browser: null,
    console: [],
    failedRequests: [],
    content: null,
    hydration: null,
    offlineShell: null,
    domSnapshot: null,
    screenshotPath: null,
    screenshot: null,
    launchErrors: [],
    bodyText: null,
    bodyTextSamples: [],
    mainResponse: null,
    gateway: {
      attempted: spawnGateway,
      ipfsPath,
      spawned: false,
      url: args.gateway || DEFAULT_GATEWAY,
    },
  };

  const consoleMessages = [];
  const failedRequests = [];
  const cleanupEvents = { console: [], failedRequests: [] };
  let cleanupStarted = false;
  let observationBoundary = null;
  let observationSnapshot = null;

  let browser;
  let context;
  let page;
  let liveRpcObserver;
  let liveRpcSnapshot = null;
  let liveRpcFooter = null;
  let gatewayController = { stop: async () => {}, spawned: false };

  try {
    if (spawnGateway) {
      gatewayController = await spawnIpfsGateway({ ipfsPath, enableGateway: spawnGateway });
      status.gateway.spawned = gatewayController.spawned;
      status.gateway.address = gatewayController.gatewayAddress || null;
      if (!args.gateway && gatewayController.gatewayAddress) {
        const computedGateway = multiaddrToGatewayUrl(gatewayController.gatewayAddress);
        if (computedGateway) {
          targetUrl = buildTargetUrl({ ...args, gateway: computedGateway });
          status.targetUrl = targetUrl;
          status.gateway.url = computedGateway;
        }
      }
    }
  } catch (error) {
    console.error('Failed to start local IPFS gateway:', error.message || String(error));
    status.gateway.error = error.message || String(error);
  }

  for (const name of browserOrder) {
    const launchBrowser = BROWSER_LAUNCHERS[name];
    if (!launchBrowser) continue;
    try {
      browser = await launchBrowser();
      status.browser = { name, version: browser.version() };
      break;
    } catch (error) {
      status.launchErrors.push({ name, message: error.message || String(error) });
    }
  }

  if (!browser) {
    console.error('IPFS check failed: unable to launch any browser.');
    console.error(JSON.stringify(status, null, 2));
    process.exitCode = 1;
    return;
  }

  try {
    context = await browser.newContext(preview ? { serviceWorkers: 'block' } : undefined);
    if (preview) await installStaticPreview(context, preview);
    await context.addInitScript(() => {
      window.__PS_FORCE_ONLINE__ = true;
      window.__PS_IPFS_CHECK__ = false;
      try {
        const ua = (navigator.userAgent || '').replace(/HeadlessChrome/gi, 'Chrome');
        Object.defineProperty(navigator, 'userAgent', { get: () => ua, configurable: true });
        Object.defineProperty(navigator, 'onLine', { get: () => true, configurable: true });
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
      } catch {
        // Ignore immutable navigator properties in strict runtimes.
      }
      window.Telegram = window.Telegram || { WebApp: { ready: () => {}, expand: () => {} } };
    });
    page = await context.newPage();
    if (expectedLiveRpc) liveRpcObserver = observeLiveRpcSockets(page);

    page.on('console', (msg) => {
      const entry = { level: msg.type(), message: msg.text(), location: msg.location() };
      consoleMessages.push(entry);
      if (cleanupStarted) cleanupEvents.console.push(entry);
    });

    page.on('pageerror', (error) => {
      const entry = { level: 'error', message: error.message || String(error) };
      consoleMessages.push(entry);
      if (cleanupStarted) cleanupEvents.console.push(entry);
    });

    page.on('requestfailed', (request) => {
      const failure = request.failure();
      const entry = { url: request.url(), method: request.method(), errorText: failure?.errorText };
      if (cleanupStarted) cleanupEvents.failedRequests.push(entry);
      // Only teardown-delivered cancellation strings are excluded; every active failure remains fatal.
      if (!cleanupStarted || !['cancelled', 'net::ERR_ABORTED'].includes(entry.errorText)) {
        failedRequests.push(entry);
      }
    });

    page.on('response', (response) => {
      if (response.status() >= 400) {
        const entry = { url: response.url(), method: response.request().method(), status: response.status() };
        failedRequests.push(entry);
        if (cleanupStarted) cleanupEvents.failedRequests.push(entry);
      }
    });

    const mainResponse = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: LOAD_TIMEOUT });
    if (mainResponse) {
      status.mainResponse = {
        url: mainResponse.url(),
        status: mainResponse.status(),
        headers: mainResponse.headers(),
      };
    }

    const readiness = routeReadiness(targetUrl);
    await waitForHydratedUi(page, selector, readiness);

    if (settleMs > 0) {
      let waitedMs = 0;
      while (waitedMs < settleMs) {
        const step = Math.min(sampleIntervalMs, settleMs - waitedMs);
        await page.waitForTimeout(step);
        waitedMs += step;
        try {
          status.bodyTextSamples.push(await page.locator('body').innerText());
        } catch {
          status.bodyTextSamples.push(null);
        }
      }
    }

    // The final sample, DOM snapshot, and screenshot must describe the settled route,
    // not the static loader that exists immediately after DOMContentLoaded.
    status.hydration = await inspectHydratedUi(page, selector, readiness);
    status.content = await waitForContent(page, selector, 0);

    try {
      status.domSnapshot = await page.$eval(selector, (el) => el.outerHTML);
    } catch (error) {
      status.domSnapshot = null;
      status.error = status.error || (error && error.message);
    }

    try {
      status.bodyText = await page.locator('body').innerText();
      status.bodyTextSamples.push(status.bodyText);
    } catch {
      status.bodyText = null;
      status.bodyTextSamples.push(null);
    }

    if (!status.content && status.domSnapshot) {
      status.content = inferContentMetricsFromSnapshot(status.domSnapshot);
    }

    if (!status.content || (status.content.textLength === 0 && status.content.htmlLength === 0)) {
      const offline = await captureOfflineShell(page, selector);
      if (offline) {
        status.content = status.content || offline.metrics;
        status.offlineShell = offline.snapshot;
        if (!status.domSnapshot) {
          status.domSnapshot = offline.hostSnapshot || offline.snapshot;
        }
      }
    }

    const resolvedScreenshotPath = resolveScreenshotPath(args);
    if (resolvedScreenshotPath) {
      await ensureDirectory(resolvedScreenshotPath);
      await page.screenshot({ path: resolvedScreenshotPath, fullPage: true });
      status.screenshotPath = resolvedScreenshotPath;
    } else if (args['screenshot-base64']) {
      status.screenshot = await page.screenshot({ encoding: 'base64', fullPage: true });
    }
    if (expectedLiveRpc) {
      liveRpcFooter = await inspectLiveRpcFooter(page, selector, readiness);
      // Earlier hydration remains diagnostic only; the final gate uses this post-await atomic observation.
      status.hydrationBeforeFooter = status.hydration;
      status.hydration = liveRpcFooter.hydration || null;
    }
  } catch (error) {
    status.error = status.error || error.message || String(error);
  } finally {
    if (liveRpcObserver) liveRpcSnapshot = liveRpcObserver.seal();
    // Snapshot events delivered through final capture/error handling before the first close.
    observationBoundary = {
      kind: 'end-of-observation-before-cleanup',
      monotonicNs: process.hrtime.bigint().toString(),
    };
    if (liveRpcSnapshot) liveRpcSnapshot.boundary = observationBoundary;
    observationSnapshot = {
      console: consoleMessages.slice(),
      failedRequests: failedRequests.slice(),
      error: status.error || null,
    };
    cleanupStarted = true;
    if (page) {
      await page.close().catch(() => undefined);
    }
    if (context) {
      await context.close().catch(() => undefined);
    }
    if (browser) {
      await browser.close().catch(() => undefined);
    }
    await gatewayController.stop().catch(() => undefined);
    // Late HTTP, console/page and non-cancellation failures still contribute to the strict final gate.
    status.console = consoleMessages.slice();
    status.failedRequests = failedRequests.slice();
  }

  const consoleErrors = filterConsoleMessages(status.console);
  const failed = filterFailedRequests(status.failedRequests);
  const issues = [];
  const liveRpcFailures = liveRpcObserver?.failures() || [];
  const rpcIssue = liveRpcIssue(
    expectedLiveRpc,
    liveRpcFooter,
    liveRpcSnapshot,
    liveRpcFailures,
    routeReadiness(status.targetUrl)
  );
  if (rpcIssue) issues.push(rpcIssue);

  if (status.error) {
    issues.push(status.error);
  }

  const finalHydrationIssue = hydrationIssue(status.hydration, routeReadiness(status.targetUrl));
  if (finalHydrationIssue) issues.push(finalHydrationIssue);

  if (consoleErrors.length) {
    issues.push(`${consoleErrors.length} console error(s) detected.`);
  }

  if (failed.length) {
    issues.push(`${failed.length} failed network request(s).`);
  }

  const cacheHeaderIssue = findStableHostHtmlCacheIssue(status.mainResponse?.headers, status.mainResponse?.url);
  if (cacheHeaderIssue) {
    issues.push(cacheHeaderIssue);
  }

  const summary = {
    mode: status.mode,
    previewDist: status.previewDist,
    previewOrigin: status.previewOrigin,
    targetUrl: status.targetUrl,
    selector: status.selector,
    browser: status.browser,
    launchErrors: status.launchErrors,
    gateway: status.gateway,
    content: status.content,
    hydration: status.hydration,
    hydrationBeforeFooter: status.hydrationBeforeFooter || null,
    officialMainnetRpcVerified: Boolean(expectedLiveRpc && !rpcIssue && !finalHydrationIssue && !status.error),
    liveRpc: {
      expected: expectedLiveRpc,
      footer: liveRpcFooter,
      observation: liveRpcSnapshot,
      failures: liveRpcFailures,
      cleanupEvents: liveRpcObserver?.cleanupEvents() || [],
      issue: rpcIssue,
    },
    offlineShell: status.offlineShell,
    consoleErrors,
    failedRequests: failed,
    observationBoundary,
    observationSnapshot,
    cleanupEvents,
    settleMs,
    sampleIntervalMs,
    mainResponse: status.mainResponse,
    cacheHeaderIssue,
    bodyTextSamples: status.bodyTextSamples,
    corruptedBodyPatterns: collectCorruptedUiPatterns(status.bodyTextSamples),
    corruptedDomPatterns: findCorruptedUiPatterns(status.domSnapshot),
    invalidResourceAttributes: findInvalidResourceAttributes(status.domSnapshot),
    domSnapshot: status.domSnapshot,
    screenshotPath: status.screenshotPath,
    screenshot: status.screenshot,
  };

  if (summary.invalidResourceAttributes.length) {
    issues.push(`Found ${summary.invalidResourceAttributes.length} invalid resource attribute(s) in DOM snapshot.`);
  }

  const corruptedUiPatternCount = summary.corruptedBodyPatterns.length + summary.corruptedDomPatterns.length;
  if (corruptedUiPatternCount) {
    issues.push(`Found ${corruptedUiPatternCount} corrupted UI pattern(s) in rendered output.`);
  }

  if (issues.length) {
    console.error('IPFS check failed:', issues.join(' '));
    console.error(JSON.stringify(summary, null, 2));
    process.exitCode = 1;
  } else {
    console.log('IPFS check passed.');
    console.log(JSON.stringify(summary, null, 2));
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error('Unexpected failure while running IPFS check.');
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  });
}

module.exports = {
  resolveLiveRpcExpectation,
  normalizeLiveRpcEndpoint,
  observeLiveRpcSockets,
  hasUnacceptedAppDisclaimer,
  inspectCheckoutLiveRpcLayout,
  inspectLiveRpcFooter,
  liveRpcIssue,
  resolvePreviewConfig,
  readPreviewAsset,
  installStaticPreview,
  parseArgs,
  buildTargetUrl,
  pickBrowsers,
  multiaddrToGatewayUrl,
  resolveIpfsPath,
  spawnIpfsGateway,
  waitForContent,
  routeReadiness,
  inspectHydratedUi,
  hydrationIssue,
  waitForHydratedUi,
  captureOfflineShell,
  filterConsoleMessages,
  filterFailedRequests,
  ensureDirectory,
  resolveScreenshotPath,
  inferContentMetricsFromSnapshot,
  findInvalidResourceAttributes,
  findCorruptedUiPatterns,
  parseNonNegativeInteger,
  collectCorruptedUiPatterns,
  isIpfsPathUrl,
  shouldValidateStableHostHtmlCache,
  findStableHostHtmlCacheIssue,
  BROWSER_LAUNCHERS,
  run,
};
