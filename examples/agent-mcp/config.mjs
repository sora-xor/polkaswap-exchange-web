import path from 'node:path';

// `process.getBuiltinModule` keeps these Node-only dependencies out of Vite's
// browser-module rewriting when this file is imported by the Vitest project.
const fs = process.getBuiltinModule('node:fs');
const os = process.getBuiltinModule('node:os');

const DEFAULT_APP_URL = 'https://polkaswap.io/?polkaswap-agent=1#/swap';
const AGENT_SESSION_QUERY_PARAM = 'polkaswap-agent';
const TRUSTED_APP_ORIGIN = 'https://polkaswap.io';
const CASE_INSENSITIVE_PLATFORMS = new Set(['darwin', 'win32']);

const TIMEOUT_FIELDS = Object.freeze({
  navigationTimeoutMs: {
    env: 'POLKASWAP_MCP_NAVIGATION_TIMEOUT_MS',
    flag: '--navigation-timeout-ms',
    defaultValue: 60_000,
    maximum: 120_000,
  },
  readyTimeoutMs: {
    env: 'POLKASWAP_MCP_READY_TIMEOUT_MS',
    flag: '--ready-timeout-ms',
    defaultValue: 30_000,
    maximum: 120_000,
  },
  toolTimeoutMs: {
    env: 'POLKASWAP_MCP_TOOL_TIMEOUT_MS',
    flag: '--tool-timeout-ms',
    defaultValue: 120_000,
    maximum: 300_000,
  },
});

const VALUE_FLAGS = new Set([
  '--app-url',
  '--cdp-url',
  '--profile-dir',
  ...Object.values(TIMEOUT_FIELDS).map(({ flag }) => flag),
]);

const SWITCH_FLAGS = new Set(['--allow-custom-origin']);

/** A configuration error safe to print to stderr before MCP starts. */
export class McpBridgeConfigError extends Error {
  /**
   * @param {string} message Human-readable configuration failure.
   */
  constructor(message) {
    super(message);
    this.name = 'McpBridgeConfigError';
  }
}

/**
 * Return whether a URL hostname names the local loopback interface without DNS.
 *
 * @param {string} hostname URL hostname, possibly a bracketed IPv6 literal.
 * @returns {boolean}
 */
export function isLoopbackHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  if (normalized === 'localhost' || normalized === '::1') return true;

  const octets = normalized.split('.');
  return (
    octets.length === 4 &&
    octets[0] === '127' &&
    octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255)
  );
}

/**
 * Return whether a hostname is a literal IPv4/IPv6 loopback address.
 *
 * Unlike `localhost`, these values do not require name resolution and are safe
 * defaults for a local application origin.
 *
 * @param {string} hostname URL hostname, possibly a bracketed IPv6 literal.
 * @returns {boolean}
 */
export function isLiteralLoopbackHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  if (normalized === '::1') return true;
  const octets = normalized.split('.');
  return (
    octets.length === 4 &&
    octets[0] === '127' &&
    octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255)
  );
}

/**
 * Validate and normalize the browser application URL.
 *
 * Polkaswap production and literal loopback are trusted by default. Any other
 * HTTPS origin requires an explicit operator opt-in. Plain HTTP remains limited
 * to literal loopback even with that opt-in.
 *
 * @param {string} rawValue Candidate URL.
 * @param {{allowCustomOrigin?: boolean}} [options] Explicit custom-origin policy.
 * @returns {string} Normalized URL with agent mode enabled.
 */
export function normalizeAppUrl(rawValue, { allowCustomOrigin = false } = {}) {
  const url = parseUrl(rawValue, 'application URL');
  if (url.username || url.password) {
    throw new McpBridgeConfigError('The application URL must not contain credentials.');
  }

  const literalLoopback = isLiteralLoopbackHostname(url.hostname);
  const trustedByDefault = url.origin === TRUSTED_APP_ORIGIN || literalLoopback;
  const optedInCustomHttps = allowCustomOrigin && url.protocol === 'https:';
  const safeProtocol = url.protocol === 'https:' || (url.protocol === 'http:' && literalLoopback);
  if (!safeProtocol || (!trustedByDefault && !optedInCustomHttps)) {
    throw new McpBridgeConfigError(
      'The application URL must use Polkaswap production or literal loopback; other HTTPS origins require --allow-custom-origin.'
    );
  }

  url.searchParams.set(AGENT_SESSION_QUERY_PARAM, '1');
  return url.toString();
}

/**
 * Validate a Chrome DevTools Protocol endpoint.
 *
 * CDP grants control of the attached browser, so this example intentionally
 * accepts only unencrypted loopback HTTP or WebSocket endpoints.
 *
 * @param {string} rawValue Candidate CDP endpoint.
 * @returns {string} Normalized loopback endpoint.
 */
export function normalizeCdpUrl(rawValue) {
  const url = parseUrl(rawValue, 'CDP URL');
  if (url.username || url.password) {
    throw new McpBridgeConfigError('The CDP URL must not contain credentials.');
  }

  if (!['http:', 'ws:'].includes(url.protocol) || !isLoopbackHostname(url.hostname)) {
    throw new McpBridgeConfigError('The CDP URL must use loopback HTTP or WebSocket (http:// or ws://).');
  }
  return url.toString();
}

/**
 * Parse CLI arguments and environment variables for the local MCP bridge.
 *
 * CLI values take precedence over environment variables. A dedicated absolute
 * profile path is mandatory in persistent-profile mode; CDP mode instead uses
 * the profile of the externally launched browser.
 *
 * @param {{argv?: string[], env?: Record<string, string | undefined>}} [options]
 * @returns {{
 *   appUrl: string,
 *   allowCustomOrigin: boolean,
 *   cdpUrl: string | null,
 *   headless: boolean,
 *   mode: 'persistent' | 'cdp',
 *   navigationTimeoutMs: number,
 *   profileDir: string | null,
 *   readyTimeoutMs: number,
 *   toolTimeoutMs: number,
 * }}
 */
export function parseBridgeConfig({ argv = [], env = process.env } = {}) {
  const cli = parseArguments(argv);
  if (cli.help) return Object.freeze({ help: true });

  const cdpRaw = cli['--cdp-url'] ?? env.POLKASWAP_MCP_CDP_URL;
  const cdpUrl = cdpRaw ? normalizeCdpUrl(cdpRaw) : null;
  const profileRaw = cli['--profile-dir'] ?? env.POLKASWAP_MCP_PROFILE_DIR;

  if (cdpUrl && profileRaw) {
    throw new McpBridgeConfigError('Choose either --cdp-url or --profile-dir, not both.');
  }
  if (!cdpUrl && !profileRaw) {
    throw new McpBridgeConfigError(
      'Persistent mode requires an explicit absolute --profile-dir (or POLKASWAP_MCP_PROFILE_DIR).'
    );
  }

  const profileDir = profileRaw ? normalizeProfileDir(profileRaw) : null;
  const configuredCustomOrigin = cli.allowCustomOrigin ?? env.POLKASWAP_MCP_ALLOW_CUSTOM_ORIGIN;
  const allowCustomOrigin =
    configuredCustomOrigin === undefined ? false : parseBoolean(configuredCustomOrigin, 'allow custom origin');
  const configuredHeadless = cli.headless ?? env.POLKASWAP_MCP_HEADLESS;
  const headless = configuredHeadless === undefined ? false : parseBoolean(configuredHeadless, 'headless');

  const timeouts = Object.fromEntries(
    Object.entries(TIMEOUT_FIELDS).map(([field, definition]) => {
      const rawValue = cli[definition.flag] ?? env[definition.env] ?? definition.defaultValue;
      return [field, parseBoundedInteger(rawValue, definition.flag, 1_000, definition.maximum)];
    })
  );

  return Object.freeze({
    appUrl: normalizeAppUrl(cli['--app-url'] ?? env.POLKASWAP_MCP_APP_URL ?? DEFAULT_APP_URL, {
      allowCustomOrigin,
    }),
    allowCustomOrigin,
    cdpUrl,
    headless,
    mode: cdpUrl ? 'cdp' : 'persistent',
    profileDir,
    ...timeouts,
  });
}

/**
 * Human-readable CLI usage. It is emitted on stderr because stdout belongs to MCP.
 *
 * @returns {string}
 */
export function bridgeHelp() {
  return `Polkaswap local MCP bridge (stdio)

Usage:
  node examples/agent-mcp/index.mjs --profile-dir /absolute/dedicated/profile [options]
  node examples/agent-mcp/index.mjs --cdp-url http://127.0.0.1:9222 [options]

Options:
  --app-url URL                 HTTPS app URL, or loopback HTTP URL
  --allow-custom-origin         Permit an explicitly configured non-Polkaswap HTTPS origin
  --profile-dir PATH            Absolute dedicated Chromium profile path
  --cdp-url URL                 Existing loopback CDP endpoint (http:// or ws://)
  --headed                      Show the browser (default)
  --headless                    Hide the browser; unsuitable for wallet approval
  --navigation-timeout-ms N     1000..120000 (default 60000)
  --ready-timeout-ms N          1000..120000 (default 30000)
  --tool-timeout-ms N           1000..300000 (default 120000)
  --help                        Print this help to stderr
`;
}

/**
 * Parse a URL and turn native URL errors into stable configuration errors.
 *
 * @param {string} rawValue URL string.
 * @param {string} label User-facing value name.
 * @returns {URL}
 */
function parseUrl(rawValue, label) {
  try {
    return new URL(String(rawValue));
  } catch {
    throw new McpBridgeConfigError(`Invalid ${label}.`);
  }
}

/**
 * Validate a dedicated browser profile path without creating it.
 *
 * @param {string} rawValue Candidate path.
 * @param {{fileSystem?: object, homeDir?: string, platform?: string, environment?: object}} [options]
 * Read-only host dependencies; injectable for unit tests.
 * @returns {string}
 */
export function normalizeProfileDir(
  rawValue,
  { fileSystem = fs, homeDir = os.homedir(), platform = process.platform, environment = process.env } = {}
) {
  const value = String(rawValue).trim();
  if (!value || value.includes('\0') || !path.isAbsolute(value)) {
    throw new McpBridgeConfigError('The browser profile path must be explicit and absolute.');
  }

  const normalized = path.normalize(value);
  if (normalized === path.parse(normalized).root) {
    throw new McpBridgeConfigError('The filesystem root cannot be used as a browser profile.');
  }

  const resolved = resolveThroughExistingAncestor(normalized, fileSystem);
  if (resolved === path.parse(resolved).root) {
    throw new McpBridgeConfigError('The filesystem root cannot be used as a browser profile.');
  }

  const resolvedHome = resolveThroughExistingAncestor(path.resolve(homeDir), fileSystem);
  if (pathsEqual(resolved, resolvedHome, platform)) {
    throw new McpBridgeConfigError('The home directory itself cannot be used as a browser profile.');
  }

  const knownProfileRoots = knownBrowserProfileRoots(homeDir, environment, platform).map((candidate) =>
    resolveProtectedProfileRoot(candidate, fileSystem)
  );
  if (knownProfileRoots.some((root) => isSameOrDescendant(resolved, root, platform))) {
    throw new McpBridgeConfigError('A live/default browser profile tree cannot be used by the MCP bridge.');
  }

  return resolved;
}

/**
 * Resolve symlinks in the nearest existing ancestor without creating the
 * requested profile directory.
 *
 * @param {string} candidate Absolute candidate path.
 * @param {{lstatSync: Function, realpathSync: Function, statSync: Function}} fileSystem Read-only fs API.
 * @returns {string} Effective absolute path.
 */
function resolveThroughExistingAncestor(candidate, fileSystem) {
  let current = path.resolve(candidate);
  const missingSegments = [];

  for (;;) {
    let entry;
    try {
      entry = fileSystem.lstatSync(current);
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw new McpBridgeConfigError('The browser profile path could not be inspected safely.');
      }
    }

    if (entry) {
      let realPath;
      let realEntry;
      try {
        realPath = fileSystem.realpathSync(current);
        realEntry = fileSystem.statSync(realPath);
      } catch {
        throw new McpBridgeConfigError('The browser profile path could not be resolved safely.');
      }
      if (!realEntry.isDirectory()) {
        throw new McpBridgeConfigError('The browser profile path or its existing ancestor is not a directory.');
      }
      return path.resolve(realPath, ...missingSegments);
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new McpBridgeConfigError('The browser profile path has no inspectable directory ancestor.');
    }
    missingSegments.unshift(path.basename(current));
    current = parent;
  }
}

/** Resolve a protected browser root conservatively even if that tree is malformed. */
function resolveProtectedProfileRoot(candidate, fileSystem) {
  try {
    return resolveThroughExistingAncestor(candidate, fileSystem);
  } catch {
    return path.resolve(candidate);
  }
}

/**
 * Return common Chrome, Chromium, and Edge user-data roots across platforms.
 *
 * @param {string} homeDir User home directory.
 * @param {Record<string, string | undefined>} environment Process environment.
 * @param {string} platform Node platform identifier.
 * @returns {string[]} Known profile-tree roots.
 */
function knownBrowserProfileRoots(homeDir, environment, platform) {
  const linuxProfileNames = [
    'google-chrome',
    'google-chrome-beta',
    'google-chrome-unstable',
    'google-chrome-canary',
    'google-chrome-for-testing',
    'chromium',
    'chromium-browser',
    'microsoft-edge',
    'microsoft-edge-beta',
    'microsoft-edge-dev',
  ];
  const roots = [
    path.join(homeDir, 'Library', 'Application Support', 'Google', 'Chrome'),
    path.join(homeDir, 'Library', 'Application Support', 'Google', 'Chrome Beta'),
    path.join(homeDir, 'Library', 'Application Support', 'Google', 'Chrome Dev'),
    path.join(homeDir, 'Library', 'Application Support', 'Google', 'Chrome Canary'),
    path.join(homeDir, 'Library', 'Application Support', 'Google', 'Chrome for Testing'),
    path.join(homeDir, 'Library', 'Application Support', 'Chromium'),
    path.join(homeDir, 'Library', 'Application Support', 'Microsoft Edge'),
    path.join(homeDir, 'Library', 'Application Support', 'Microsoft Edge Beta'),
    path.join(homeDir, 'Library', 'Application Support', 'Microsoft Edge Dev'),
    path.join(homeDir, 'Library', 'Application Support', 'Microsoft Edge Canary'),
    ...linuxProfileNames.map((name) => path.join(homeDir, '.config', name)),
  ];

  if (environment.LOCALAPPDATA) {
    roots.push(
      path.join(environment.LOCALAPPDATA, 'Google', 'Chrome', 'User Data'),
      path.join(environment.LOCALAPPDATA, 'Google', 'Chrome Beta', 'User Data'),
      path.join(environment.LOCALAPPDATA, 'Google', 'Chrome Dev', 'User Data'),
      path.join(environment.LOCALAPPDATA, 'Google', 'Chrome SxS', 'User Data'),
      path.join(environment.LOCALAPPDATA, 'Google', 'Chrome for Testing', 'User Data'),
      path.join(environment.LOCALAPPDATA, 'Chromium', 'User Data'),
      path.join(environment.LOCALAPPDATA, 'Microsoft', 'Edge', 'User Data'),
      path.join(environment.LOCALAPPDATA, 'Microsoft', 'Edge Beta', 'User Data'),
      path.join(environment.LOCALAPPDATA, 'Microsoft', 'Edge Dev', 'User Data'),
      path.join(environment.LOCALAPPDATA, 'Microsoft', 'Edge SxS', 'User Data')
    );
  }

  if (platform === 'linux') {
    for (const configuredHome of [environment.XDG_CONFIG_HOME, environment.CHROME_CONFIG_HOME]) {
      const resolvedHome = resolveEnvironmentPath(configuredHome);
      if (resolvedHome) roots.push(...linuxProfileNames.map((name) => path.join(resolvedHome, name)));
    }

    const directChromeRoot = resolveEnvironmentPath(environment.CHROME_USER_DATA_DIR);
    if (directChromeRoot) roots.push(directChromeRoot);
  }
  return roots.map((root) => path.resolve(root));
}

/** Normalize an optional browser environment path without trusting it as input. */
function resolveEnvironmentPath(value) {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\0')) return null;
  return path.resolve(value);
}

/** Compare two resolved paths using the host filesystem's common casing rules. */
function pathsEqual(left, right, platform) {
  return comparablePath(left, platform) === comparablePath(right, platform);
}

/** Return whether a resolved path is equal to or below a protected root. */
function isSameOrDescendant(candidate, root, platform) {
  const comparableCandidate = comparablePath(candidate, platform);
  const comparableRoot = comparablePath(root, platform);
  const relative = path.relative(comparableRoot, comparableCandidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

/** Normalize path casing for common case-insensitive desktop platforms. */
function comparablePath(value, platform) {
  const normalized = path.normalize(value);
  return CASE_INSENSITIVE_PLATFORMS.has(platform) ? normalized.toLowerCase() : normalized;
}

/**
 * Parse a strict boolean accepted by CLI/environment configuration.
 *
 * @param {unknown} rawValue Candidate value.
 * @param {string} label User-facing value name.
 * @returns {boolean}
 */
function parseBoolean(rawValue, label) {
  if (rawValue === true || rawValue === '1' || rawValue === 'true') return true;
  if (rawValue === false || rawValue === '0' || rawValue === 'false') return false;
  throw new McpBridgeConfigError(`${label} must be true/false or 1/0.`);
}

/**
 * Parse a timeout as an integer within a conservative closed interval.
 *
 * @param {unknown} rawValue Candidate number.
 * @param {string} label User-facing value name.
 * @param {number} minimum Inclusive minimum.
 * @param {number} maximum Inclusive maximum.
 * @returns {number}
 */
function parseBoundedInteger(rawValue, label, minimum, maximum) {
  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new McpBridgeConfigError(`${label} must be an integer from ${minimum} to ${maximum}.`);
  }
  return value;
}

/**
 * Parse the small, dependency-free CLI surface and reject unknown/duplicate flags.
 *
 * @param {string[]} argv CLI arguments excluding node/script.
 * @returns {Record<string, string | boolean>}
 */
function parseArguments(argv) {
  const result = {};
  const seen = new Set();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help') {
      result.help = true;
      continue;
    }
    if (token === '--headless' || token === '--headed') {
      if (seen.has('headless')) throw new McpBridgeConfigError('Specify only one of --headless or --headed.');
      seen.add('headless');
      result.headless = token === '--headless';
      continue;
    }
    if (SWITCH_FLAGS.has(token)) {
      if (seen.has(token)) throw new McpBridgeConfigError(`Duplicate option: ${token}`);
      seen.add(token);
      result.allowCustomOrigin = true;
      continue;
    }

    const equalsIndex = token.indexOf('=');
    const flag = equalsIndex === -1 ? token : token.slice(0, equalsIndex);
    if (!VALUE_FLAGS.has(flag)) throw new McpBridgeConfigError(`Unknown option: ${flag}`);
    if (seen.has(flag)) throw new McpBridgeConfigError(`Duplicate option: ${flag}`);
    seen.add(flag);

    const inlineValue = equalsIndex === -1 ? undefined : token.slice(equalsIndex + 1);
    const value = inlineValue ?? argv[index + 1];
    if (!value || (inlineValue === undefined && value.startsWith('--'))) {
      throw new McpBridgeConfigError(`Missing value for ${flag}.`);
    }
    if (inlineValue === undefined) index += 1;
    result[flag] = value;
  }

  return result;
}
