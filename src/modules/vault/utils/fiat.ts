import { FPNumber } from '@sora-substrate/math';
import { DAI, KUSD, TBCD, XSTUSD } from '@sora-substrate/sdk/build/assets/consts';

import type { Asset, AccountAsset } from '@sora-substrate/sdk/build/assets/types';

export type KensetsuFiatResolver = (amount: FPNumber, asset: Nullable<Asset | AccountAsset>) => Nullable<FPNumber>;

const USD_PEGGED_ASSET_IDS = new Set([DAI.address, KUSD.address, TBCD.address, XSTUSD.address]);

/**
 * Resolves a Kensetsu amount to fiat, falling back to a 1:1 USD value for known
 * USD-pegged assets while the indexer fiat-price stream is still empty.
 */
export function getKensetsuFiatAmount(
  amount: FPNumber,
  asset: Nullable<Asset | AccountAsset>,
  resolveFiatAmount: KensetsuFiatResolver
): Nullable<FPNumber> {
  const fiatAmount = resolveFiatAmount(amount, asset);
  if (fiatAmount) return fiatAmount;

  return asset?.address && USD_PEGGED_ASSET_IDS.has(asset.address) ? amount : null;
}

/**
 * Produces a numeric sort key that prefers fiat value but keeps non-zero
 * on-chain amounts sortable before fiat prices are available.
 */
export function getKensetsuAmountSortValue(amount: FPNumber, fiatAmount: Nullable<FPNumber>): number {
  return (fiatAmount ?? amount).toNumber();
}
