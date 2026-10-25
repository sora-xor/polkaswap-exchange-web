const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

type ExternalLinkOptions = {
  /**
   * Allow plain HTTP only for local development hosts.
   */
  allowHttpLocalhost?: boolean;
};

const normalizeHostname = (value: string): string => {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

export const isLocalhostHostname = (hostname: string): boolean => {
  return LOCALHOST_HOSTS.has(normalizeHostname(hostname));
};

/**
 * Returns a safe external URL for anchor/redirect usage.
 *
 * Accepts:
 * - https URLs
 * - optionally http URLs for localhost-style hosts
 *
 * Returns an empty string when the input is invalid or unsafe.
 */
export const toSafeExternalLink = (value: unknown, options: ExternalLinkOptions = {}): string => {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    return '';
  }

  if (parsed.protocol === 'https:') {
    return trimmed;
  }

  if (options.allowHttpLocalhost && parsed.protocol === 'http:' && isLocalhostHostname(parsed.hostname)) {
    return trimmed;
  }

  return '';
};
