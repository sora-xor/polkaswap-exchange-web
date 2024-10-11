import type { Asset, AccountAsset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

type AnyAsset = Asset | AccountAsset | RegisteredAccountAsset;

export function filterAssetsByQuery<T extends AnyAsset>(
  assets: Array<T>,
  isRegisteredAssets = false
): (query: string) => T[] {
  const addressField = isRegisteredAssets ? 'externalAddress' : 'address';

  return (query: string): Array<T> => {
    if (!query) return assets;

    const search = query.toLowerCase().trim();

    return assets.filter(
      (asset) =>
        asset.name?.toLowerCase?.()?.includes?.(search) ||
        asset.symbol?.toLowerCase?.()?.includes?.(search) ||
        asset[addressField]?.toLowerCase?.() === search
    );
  };
}
