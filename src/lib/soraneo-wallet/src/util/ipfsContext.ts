type LocationLike = Pick<Location, 'hostname' | 'pathname'>;

const IPFS_PATH_SEGMENT = /(?:^|\/)(ipfs|ipns)(?:\/|$)/i;
const IPFS_SUBDOMAIN_GATEWAY = /^[^.]+\.((?:ipfs)|(?:ipns))\./i;

/**
 * Detects whether the current location is served from an IPFS/IPNS gateway.
 *
 * Supports both path gateways (`/ipfs/<cid>/...`) and subdomain gateways
 * (`<cid>.ipfs.<gateway-domain>`), so bootstrap logic can avoid connection
 * flows that are known to stall in static gateway contexts.
 */
export function isIpfsGatewayLocation(location?: Partial<LocationLike> | null): boolean {
  if (!location) return false;

  const pathname = typeof location.pathname === 'string' ? location.pathname : '';
  if (IPFS_PATH_SEGMENT.test(pathname)) return true;

  const hostname = typeof location.hostname === 'string' ? location.hostname : '';
  return IPFS_SUBDOMAIN_GATEWAY.test(hostname);
}
