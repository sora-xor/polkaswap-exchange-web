/**
 * Convert various IPFS/IPNS URLs to a single gateway (dweb.link) to avoid blocked gateways.
 * - ipfs://CID/path -> https://dweb.link/ipfs/CID/path
 * - ipns://name/path -> https://dweb.link/ipns/name/path
 * - https://<gw>/<ipfs|ipns>/<rest> -> https://dweb.link/<ipfs|ipns>/<rest>
 * - https://CID.ipfs.<gw>/<path> -> https://dweb.link/ipfs/CID/<path>
 * Non-IPFS URLs are returned unchanged.
 */
export function toDwebLink(url?: string | null): string | undefined | null {
  if (!url) return url as any;
  try {
    const trimmed = url.trim();
    // ipfs:// or ipns://
    if (trimmed.startsWith('ipfs://')) {
      const rest = trimmed.slice('ipfs://'.length);
      return `https://dweb.link/ipfs/${rest}`;
    }
    if (trimmed.startsWith('ipns://')) {
      const rest = trimmed.slice('ipns://'.length);
      return `https://dweb.link/ipns/${rest}`;
    }
    // path-style gateways: https://<host>/(ipfs|ipns)/...
    const pathMatch = trimmed.match(/^https?:\/\/[^/]+\/(ipfs|ipns)\/(.+)$/i);
    if (pathMatch) {
      const proto = pathMatch[1].toLowerCase();
      const rest = pathMatch[2];
      return `https://dweb.link/${proto}/${rest}`;
    }
    // subdomain-style: https://CID.ipfs.<host>/<path>
    const subdomainMatch = trimmed.match(/^https?:\/\/([^.]+)\.ipfs\.[^/]+(\/.*)?$/i);
    if (subdomainMatch) {
      const cid = subdomainMatch[1];
      const rest = (subdomainMatch[2] || '').replace(/^\//, '');
      return `https://dweb.link/ipfs/${cid}${rest ? '/' + rest : ''}`;
    }
  } catch {
    // fall through
  }
  return url as any;
}
