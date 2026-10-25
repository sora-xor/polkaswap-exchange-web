/**
 * Parse CLI flags from argv. Supports both `--key value` and `--key=value` forms.
 * Repeated flags are resolved by the last seen value.
 *
 * @param {string[]} argv
 * @returns {Record<string, string | boolean>}
 */
export function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith('--')) continue;

    const raw = token.slice(2);
    if (!raw) continue;

    const separatorIndex = raw.indexOf('=');

    if (separatorIndex >= 0) {
      const key = raw.slice(0, separatorIndex);
      const value = raw.slice(separatorIndex + 1);
      if (key) parsed[key] = value;
      continue;
    }

    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith('--')) {
      parsed[raw] = next;
      index += 1;
      continue;
    }

    parsed[raw] = true;
  }

  return parsed;
}

/**
 * Convert optional CLI/env values to a boolean toggle.
 *
 * @param {unknown} value
 * @param {boolean} fallback
 * @returns {boolean}
 */
export function toBooleanFlag(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;

  return fallback;
}

/**
 * Normalize IPFS prefix values used by the preview server.
 * - Undefined/null/false values fall back to the provided default.
 * - Empty strings and bare flags map to root (`/`).
 * - Prefixes always have leading and trailing slashes.
 *
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
export function normalizePrefix(value, fallback = '/ipfs/polkaswap-e2e') {
  let source = fallback;

  if (value === true) {
    source = '';
  } else if (value !== undefined && value !== null && value !== false) {
    source = String(value);
  }
  const trimmed = source.trim();
  const normalized = trimmed ? (trimmed.startsWith('/') ? trimmed : `/${trimmed}`) : '/';

  return normalized.endsWith('/') ? normalized : `${normalized}/`;
}

/**
 * Determine whether the request should return the health payload instead of
 * resolving an asset from the dist directory.
 *
 * @param {string} pathname
 * @param {string} prefix
 * @returns {boolean}
 */
export function shouldServeHealth(pathname, prefix) {
  if (pathname === '/healthz') return true;
  if (prefix !== '/' && (pathname === '/' || pathname === '')) return true;
  return false;
}
