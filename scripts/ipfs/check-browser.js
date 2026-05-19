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
const OPTIONAL_ENDPOINT_PATTERNS = [/api\.coingecko\.com\/api\/v3\/simple\/price/i];
const CORRUPTED_UI_PATTERNS = [
  /\[object Promise\]/i,
  /\bNaN\b/,
  /draggable element must have an item slot/i,
  /Cannot read properties of undefined \(reading '\$refs'\)/i,
  /Cannot read properties of null \(reading 'query'\)/i,
];
const CACHE_CONTROL_MAX_AGE_PATTERN = /(?:^|,)\s*max-age=(\d+)/i;
const STABLE_HOST_HTML_MAX_AGE_SECONDS = 60;

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

async function waitForContent(page, selector) {
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

  const timeoutAt = Date.now() + LOAD_TIMEOUT;

  while (Date.now() < timeoutAt) {
    const metrics = await readMetrics();
    if (metrics) return metrics;
    await page.waitForTimeout(CONTENT_POLL_INTERVAL_MS);
  }

  return readMetrics();
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

function filterConsoleMessages(messages) {
  return messages.filter((msg) => {
    if (msg.level !== 'error') return false;
    const locationUrl = msg.location?.url || '';
    const endpointInLocation = OPTIONAL_ENDPOINT_PATTERNS.some((pattern) => pattern.test(locationUrl));
    const endpointInMessage = OPTIONAL_ENDPOINT_PATTERNS.some((pattern) => pattern.test(msg.message));
    if (
      (endpointInLocation || endpointInMessage) &&
      /has been blocked by CORS policy|Failed to load resource: net::ERR_FAILED/i.test(msg.message)
    ) {
      return false;
    }
    return !IGNORED_CONSOLE_PATTERNS.some((pattern) => pattern.test(msg.message));
  });
}

function filterFailedRequests(requests) {
  if (!Array.isArray(requests) || !requests.length) return [];

  return requests.filter((request) => {
    const url = request?.url || '';
    return !OPTIONAL_ENDPOINT_PATTERNS.some((pattern) => pattern.test(url));
  });
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
 * Returns the cache-header issue that would keep old app shells or service workers alive.
 */
function findStableHostHtmlCacheIssue(headers, targetUrl) {
  if (!shouldValidateStableHostHtmlCache(targetUrl)) return null;

  const cacheControl = String(headers?.['cache-control'] || '').trim();
  if (!cacheControl) {
    return 'Stable host HTML response is missing Cache-Control.';
  }

  if (/\bno-store\b/i.test(cacheControl)) {
    return null;
  }

  const maxAge = Number(cacheControl.match(CACHE_CONTROL_MAX_AGE_PATTERN)?.[1] ?? 0);
  if (/\bimmutable\b/i.test(cacheControl) || maxAge > STABLE_HOST_HTML_MAX_AGE_SECONDS) {
    return `Stable host HTML must not be cached immutably; received Cache-Control: ${cacheControl}`;
  }

  return null;
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

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const settleMs = parseNonNegativeInteger(args['settle-ms'], DEFAULT_SETTLE_MS);
  const sampleIntervalMs = Math.max(1, parseNonNegativeInteger(args['sample-interval-ms'], DEFAULT_SAMPLE_INTERVAL_MS));
  let targetUrl;
  try {
    targetUrl = buildTargetUrl(args);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  const selector = args.selector || DEFAULT_SELECTOR;
  const browserOrder = pickBrowsers(args.browser);
  const spawnGateway = args['no-spawn-gateway'] ? false : true;
  const ipfsPath = resolveIpfsPath(args['ipfs-path']);

  const status = {
    targetUrl,
    selector,
    browser: null,
    console: [],
    failedRequests: [],
    content: null,
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

  let browser;
  let context;
  let page;
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
    context = await browser.newContext();
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

    page.on('console', (msg) => {
      consoleMessages.push({
        level: msg.type(),
        message: msg.text(),
        location: msg.location(),
      });
    });

    page.on('pageerror', (error) => {
      consoleMessages.push({ level: 'error', message: error.message || String(error) });
    });

    page.on('requestfailed', (request) => {
      const failure = request.failure();
      if (failure?.errorText === 'net::ERR_ABORTED') {
        return;
      }
      failedRequests.push({
        url: request.url(),
        method: request.method(),
        errorText: failure?.errorText,
      });
    });

    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedRequests.push({
          url: response.url(),
          method: response.request().method(),
          status: response.status(),
        });
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

    status.content = await waitForContent(page, selector);

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
  } catch (error) {
    status.error = status.error || error.message || String(error);
  } finally {
    status.console = consoleMessages;
    status.failedRequests = failedRequests;
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
  }

  const consoleErrors = filterConsoleMessages(status.console);
  const failed = filterFailedRequests(status.failedRequests);
  const issues = [];

  if (status.error) {
    issues.push(status.error);
  }

  if (!status.content || (status.content.textLength === 0 && status.content.htmlLength === 0)) {
    issues.push('App content did not render anything under the target selector.');
  }

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
    targetUrl: status.targetUrl,
    selector: status.selector,
    browser: status.browser,
    launchErrors: status.launchErrors,
    gateway: status.gateway,
    content: status.content,
    offlineShell: status.offlineShell,
    consoleErrors,
    failedRequests: failed,
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
  parseArgs,
  buildTargetUrl,
  pickBrowsers,
  multiaddrToGatewayUrl,
  resolveIpfsPath,
  spawnIpfsGateway,
  waitForContent,
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
