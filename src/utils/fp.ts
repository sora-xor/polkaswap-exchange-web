import { FPNumber } from '@sora-substrate/math';

/**
 * Adjusts an `FPNumber` to the specified precision by leveraging `toFixed`.
 * `FPNumber.dp()` is avoided due to rounding issues in the upstream SDK.
 */
export const toPrecision = (value: FPNumber, precision: number): FPNumber => {
  return new FPNumber(value.toFixed(precision), precision);
};
