import { Errors } from '../../consts';
import { getChameleonPools } from '../../runtime';

import type { TradingPair } from '../../types';

// get_pair_info
/** Returns trading pair, chameleon base asset id (if exists) and chameleon pool flag */
export const getPairInfo = (
  baseAssetId: string,
  assetA: string,
  assetB: string
): [TradingPair, string | null, boolean] => {
  if (assetA === assetB) throw new Error(Errors.AssetsMustNotBeSame);

  const [baseChameleonAssetId, chameleonTargets] = getChameleonPools(baseAssetId);

  const ta = (() => {
    if (baseAssetId === assetA) {
      return assetB;
    } else if (baseAssetId === assetB) {
      return assetA;
    } else if (baseChameleonAssetId) {
      if (baseChameleonAssetId === assetA) {
        if (!chameleonTargets.includes(assetB)) throw new Error(Errors.RestrictedChameleonPool);
        return assetB;
      } else if (baseChameleonAssetId === assetB) {
        if (!chameleonTargets.includes(assetA)) throw new Error(Errors.RestrictedChameleonPool);
        return assetA;
      } else {
        throw new Error(Errors.BaseAssetIsNotMatchedWithAnyAssetArguments);
      }
    } else {
      throw new Error(Errors.BaseAssetIsNotMatchedWithAnyAssetArguments);
    }
  })();

  const isAllowedChameleonPool = chameleonTargets.includes(ta);

  const tPair: TradingPair = { baseAssetId, targetAssetId: ta };

  return [tPair, baseChameleonAssetId, isAllowedChameleonPool];
};

// get_trading_pair
/** Get trading pair from assets */
export const getTradingPair = (baseAssetId: string, assetA: string, assetB: string): TradingPair => {
  const [tPair] = getPairInfo(baseAssetId, assetA, assetB);
  return tPair;
};
