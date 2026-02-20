/**
 * Normalizes hash-router href values so they remain scoped to the current base
 * path (for example when served from an IPFS gateway like `/ipfs/<cid>/`).
 *
 * The SPA uses hash routing (`#/...`). A leading slash (`/#/...`) makes the
 * browser resolve the link against the origin root, which breaks when the app
 * is hosted under a nested path.
 */
export function normalizeHashHref(href: string): string {
  if (!href) return href;

  // Only normalize origin-root hash links (e.g. "/#/swap" -> "#/swap").
  // Keep absolute URLs intact (e.g. "https://polkaswap.io/#/swap").
  if (href.startsWith('/#')) return href.slice(1);

  return href;
}

export function isInternalHashHref(href: string): boolean {
  return normalizeHashHref(href).startsWith('#/');
}
