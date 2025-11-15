import { FPNumber } from '@sora-substrate/sdk';

import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

export function resolveTokenDecimals(token: Nullable<RegisteredAccountAsset>, external: boolean): number {
  if (!token) return FPNumber.DEFAULT_PRECISION;

  const decimals = external ? token.externalDecimals : token.decimals;

  return decimals ?? FPNumber.DEFAULT_PRECISION;
}

export function calculateFiatAmount(
  value: string | number | undefined,
  tokenPrice: FPNumber,
  exchangeRate: number
): FPNumber {
  if (!value && value !== 0) return FPNumber.ZERO;

  const priceWithRate = tokenPrice.mul(exchangeRate);

  return new FPNumber(value || 0).mul(priceWithRate);
}
