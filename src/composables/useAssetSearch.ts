import type { Asset, AccountAsset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

export type SearchableAsset = Asset | AccountAsset | RegisteredAccountAsset;

export type AssetSearchOptions = {
  /**
   * Some registered assets expose an `externalAddress` field that should
   * participate in the filter instead of the native `address` property.
   */
  useExternalAddress?: boolean;
};

/**
 * Filters the provided asset list using a case-insensitive query that matches
 * by name, symbol, or full address (native or external).
 */
export function filterAssetsByQuery<T extends SearchableAsset>(
  assets: readonly T[],
  query: string,
  options: AssetSearchOptions = {}
): T[] {
  if (!query) return [...assets];

  const lowerQuery = query.trim().toLowerCase();
  const addressField = options.useExternalAddress ? 'externalAddress' : 'address';

  return assets.filter((asset) => {
    const nameMatches = asset.name?.toLowerCase?.().includes?.(lowerQuery) ?? false;
    const symbolMatches = asset.symbol?.toLowerCase?.().includes?.(lowerQuery) ?? false;
    const addressValue = (asset as Record<string, string | undefined>)[addressField];
    const addressMatches = addressValue?.toLowerCase?.() === lowerQuery;

    return nameMatches || symbolMatches || addressMatches;
  });
}
