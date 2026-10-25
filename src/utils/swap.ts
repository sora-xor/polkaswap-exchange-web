import { FPNumber } from '@sora-substrate/sdk';
import { getAssetBalance } from '@/utils/asset-formatting';

import type { Nullable } from '@/types/common';
import type { CodecString } from '@sora-substrate/sdk';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

export enum DifferenceStatus {
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
}

export const calcFiatDifference = (from: FPNumber, to: FPNumber): FPNumber => {
  if (from.isZero() || to.isZero()) return FPNumber.ZERO;

  const difference = to.sub(from).div(from).mul(FPNumber.HUNDRED);

  return difference;
};

export const getDifferenceStatus = (value: number): string => {
  if (value > 0) return DifferenceStatus.Success;
  if (value < -10) return DifferenceStatus.Error;
  if (value < -1) return DifferenceStatus.Warning;
  return '';
};

/**
 * Returns the selected swap token balance for authenticated users.
 * Logged-out state should not render stale or synthetic balance rows, but
 * connected zero balances are still useful account state and should remain visible.
 */
export const getVisibleSwapTokenBalance = (
  token: Nullable<AccountAsset>,
  isLoggedIn: boolean
): Nullable<CodecString> => {
  if (!isLoggedIn || !token) return null;
  return getAssetBalance(token);
};
