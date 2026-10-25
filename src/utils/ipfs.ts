/** Shared gateway for native IPFS/IPNS links and links using retired public gateways. */
export const IPFS_GATEWAY_BASE_URL = 'https://mof.sora.org';

const RETIRED_GATEWAY_HOST = /(?:^|\.)(?:ipfs\.io|dweb\.link|cloudflare-ipfs\.com|cf-ipfs\.com)$/i;

/**
 * Resolves native IPFS/IPNS and retired gateway URLs through the maintained gateway.
 * Keeps content paths, query strings and fragments; preserves other HTTP gateways
 * so existing dedicated origins and their access settings continue to work.
 */
export function toIpfsGatewayUrl(url?: string | null): string | undefined | null {
  if (!url) return url;
  try {
    const trimmed = url.trim();
    const parsed = new URL(trimmed);
    const rawSuffix = trimmed.match(/^[a-z]+:\/\/[^/?#]*([\s\S]*)$/i)?.[1] ?? '';
    let namespace: string;
    let name: string;
    let suffix: string;

    if (parsed.protocol === 'ipfs:' || parsed.protocol === 'ipns:') {
      if (!parsed.hostname || parsed.username || parsed.password || parsed.port) return url;
      namespace = parsed.protocol.slice(0, -1);
      name = parsed.hostname;
      suffix = rawSuffix;
    } else {
      const hostname = parsed.hostname.replace(/\.+$/, '');
      if (!['http:', 'https:'].includes(parsed.protocol) || !RETIRED_GATEWAY_HOST.test(hostname)) {
        return url;
      }
      const subdomainMatch = hostname.match(
        /^(.+)\.(ipfs|ipns)\.(?:ipfs\.io|dweb\.link|cloudflare-ipfs\.com|cf-ipfs\.com)$/i
      );
      const pathMatch = rawSuffix.match(/^\/(ipfs|ipns)\/([^/?#]+)([\s\S]*)$/i);
      if (subdomainMatch) {
        [, name, namespace] = subdomainMatch;
        if (namespace.toLowerCase() === 'ipns' && !name.includes('.')) {
          name = name.replace(/--|-/g, (separator) => (separator === '--' ? '-' : '.'));
        }
        suffix = rawSuffix;
      } else if (pathMatch) {
        [, namespace, name, suffix] = pathMatch;
      } else {
        return url;
      }
    }

    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(name)) return url;
    const path = suffix.split(/[?#]/, 1)[0];
    if (/[\\\u0000-\u001f\u007f]/.test(path) || /%(?:25)*(?:2f|5c)/i.test(path)) return url;
    const root = `${IPFS_GATEWAY_BASE_URL}/${namespace.toLowerCase()}/${name}`;
    const rootPath = new URL(root).pathname;
    // Browser path normalization must never move a request outside its content root.
    for (const candidatePath of [path, decodeURIComponent(path)]) {
      const resolvedPath = new URL(`${root}${candidatePath}`).pathname;
      if (resolvedPath !== rootPath && !resolvedPath.startsWith(`${rootPath}/`)) return url;
    }
    return `${root}${suffix}`;
  } catch {
    // Image normalization must not interrupt rendering when a URL is malformed.
  }
  return url;
}
