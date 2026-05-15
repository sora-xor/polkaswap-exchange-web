import { getFiatPriceByAddress, type FiatPriceObjectLike } from '@/utils/fiatPrice';

import type { RewardsAmountHeaderItem } from '@/types/rewards';
import type { Asset } from '@sora-substrate/sdk/build/assets/types';

/**
 * Returns unique reward assets with non-empty reward amounts that still need
 * fiat price data before the rewards UI can render converted values.
 */
export function getMissingRewardFiatPriceAssets(
  items: readonly RewardsAmountHeaderItem[],
  fiatPriceObject: Nullable<FiatPriceObjectLike>
): Asset[] {
  const seen = new Set<string>();

  return items.reduce<Asset[]>((assets, item) => {
    const address = item.asset?.address;

    if (!item.amount || !address || seen.has(address) || getFiatPriceByAddress(fiatPriceObject, address)) {
      return assets;
    }

    seen.add(address);
    assets.push(item.asset);

    return assets;
  }, []);
}
