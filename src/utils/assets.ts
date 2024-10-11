import { isNativeAsset } from '@sora-substrate/sdk/build/assets';
import isNil from 'lodash/fp/isNil';

import type { Asset, AccountAsset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

type AssetWithBalance = AccountAsset | RegisteredAccountAsset;
type AnyAsset = Asset | AssetWithBalance;
type PoolAssets<T extends Asset> = { baseAsset: T; poolAsset: T };

export const filterAssetsByQuery = <T extends AnyAsset>(
  assets: Array<T>,
  isRegisteredAssets = false
): ((query: string) => T[]) => {
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
};

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

const isEmpty = (a: AssetWithBalance): boolean => isNil(a.balance) || !+a.balance.transferable;

export const sortByBalance = (a: AssetWithBalance, b: AssetWithBalance): number => {
  const emptyABalance = isEmpty(a);
  const emptyBBalance = isEmpty(b);

  if (emptyABalance === emptyBBalance) return sortAssets(a, b);

  return emptyABalance && !emptyBBalance ? 1 : -1;
};

export const sortPools = <T extends Asset>(a: PoolAssets<T>, b: PoolAssets<T>) => {
  const byBaseAsset = sortAssets(a.baseAsset, b.baseAsset);

  return byBaseAsset === 0 ? sortAssets(a.poolAsset, b.poolAsset) : byBaseAsset;
};
