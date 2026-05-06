import {
  kensetsuAssetRegexp as walletKensetsuAssetRegexp,
  syntheticAssetRegexp as walletSyntheticAssetRegexp,
} from '@/consts';

const ws = 'wss?:\\/\\/';
const port = '(?::([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5]))';
const dns = '(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)*[a-z0-9][a-z0-9-]{0,61}[a-z0-9]';
const segment = '\\/[a-z0-9-_]+';
const ipv4part = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)';
const ipv4 = `${ipv4part}(?:\\.${ipv4part}){3}`;

const exactStart = (exp) => `^${exp}`;
const exact = (exp) => `^${exp}$`;

export const wsRegexp = new RegExp(exactStart(ws));
export const secureWsRegexp = /^wss:\/\//;
export const dnsPathRegexp = new RegExp(exactStart(`${dns}${port}?(${segment})*/?`));
export const ipv4Regexp = new RegExp(exact(`${ipv4}${port}?(${segment})*/?`));
export const syntheticAssetRegexp = walletSyntheticAssetRegexp;
export const kensetsuAssetRegexp = walletKensetsuAssetRegexp;

const localhostHostnames = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

/**
 * Allows plaintext ws:// only for local development hosts.
 */
export const isLocalWsUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^\[(.*)\]$/, '$1');
    return url.protocol === 'ws:' && localhostHostnames.has(hostname);
  } catch {
    return false;
  }
};
