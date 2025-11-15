import { isNativeAsset } from '@sora-substrate/sdk/build/assets';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

type PoolAssets<T extends Asset> = { baseAsset: T; poolAsset: T };

const sortAssetsByProp = <T extends Asset>(a: T, b: T, prop: 'address' | 'symbol' | 'name') => {
  if (a[prop] < b[prop]) return -1;
  if (a[prop] > b[prop]) return 1;
  return 0;
};

export const sortAssets = <T extends Asset>(a: T, b: T) => {
  const isNativeA = isNativeAsset(a);
  const isNativeB = isNativeAsset(b);
  // sort native assets by address
  if (isNativeA && isNativeB) {
    return sortAssetsByProp(a, b, 'address');
  }
  if (isNativeA && !isNativeB) {
    return -1;
  }
  if (!isNativeA && isNativeB) {
    return 1;
  }
  // sort non native assets by symbol
  return sortAssetsByProp(a, b, 'symbol');
};

export const sortPools = <T extends Asset>(a: PoolAssets<T>, b: PoolAssets<T>) => {
  const byBaseAsset = sortAssets(a.baseAsset, b.baseAsset);

  return byBaseAsset === 0 ? sortAssets(a.poolAsset, b.poolAsset) : byBaseAsset;
};

export type { PoolAssets };
