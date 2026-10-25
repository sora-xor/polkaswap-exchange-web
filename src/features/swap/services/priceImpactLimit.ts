import { FPNumber } from '@sora-substrate/sdk';

/** Optional purchase-flow protection; an absent limit preserves the ordinary swap policy. */
export function isSwapPriceImpactAllowed(impact: unknown, limit?: string): boolean {
  if (limit === undefined) return true;
  if (typeof impact !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(impact)) return false;
  if (!/^\d+(?:\.\d+)?$/.test(limit)) return false;
  const maximum = new FPNumber(limit);
  const actual = new FPNumber(impact).abs();
  return maximum.gt(FPNumber.ZERO) && maximum.lte(new FPNumber('100')) && actual.lte(maximum);
}
