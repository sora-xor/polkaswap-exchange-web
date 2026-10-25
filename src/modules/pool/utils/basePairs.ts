import { XOR, XSTUSD } from '@sora-substrate/sdk/build/assets/consts';

import { api } from '@/lib/soraneo-wallet/src/api';

type PoolPairAddresses = {
  firstAddress: string;
  secondAddress: string;
};

/**
 * Returns base assets that can be used for user-created XYK pools.
 */
export const getSupportedPoolBaseAssetIds = (): readonly string[] => api.dex.poolBaseAssetsIds ?? [];

/**
 * Checks whether an asset can be used as the base side of a user pool pair.
 */
export const isSupportedPoolBaseAsset = (address: string): boolean =>
  Boolean(address && getSupportedPoolBaseAssetIds().includes(address));

/**
 * Validates whether a pair can be opened on the add-liquidity screen.
 */
export const isSupportedPoolBasePair = (firstAddress: string, secondAddress: string): boolean => {
  if (!(firstAddress && secondAddress) || firstAddress === secondAddress) return false;

  if (firstAddress === XSTUSD.address && secondAddress === XOR.address) {
    return false;
  }

  return isSupportedPoolBaseAsset(firstAddress) || isSupportedPoolBaseAsset(secondAddress);
};

/**
 * Keeps the supported base asset first so pool storage subscriptions use the
 * same asset order as XYK pool state.
 */
export const normalizeSupportedPoolBasePair = ({ firstAddress, secondAddress }: PoolPairAddresses): PoolPairAddresses => {
  if (!(firstAddress && secondAddress)) {
    return { firstAddress, secondAddress };
  }

  const firstIsBase = isSupportedPoolBaseAsset(firstAddress);
  const secondIsBase = isSupportedPoolBaseAsset(secondAddress);

  if (!firstIsBase && secondIsBase) {
    return { firstAddress: secondAddress, secondAddress: firstAddress };
  }

  return { firstAddress, secondAddress };
};
