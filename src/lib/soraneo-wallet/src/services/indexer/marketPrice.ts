import { FPNumber } from '@sora-substrate/sdk';

/**
 * An exact zero is an observed quote. Older market rows also used zero for unsourced or
 * rounded prices, so only a positive legacy number can supply a quote.
 */
export function readMarketPrice(
  exact: unknown,
  legacy?: unknown,
  maxDecimals = FPNumber.DEFAULT_PRECISION
): FPNumber | null {
  const candidate = exact === undefined ? legacy : exact;
  const raw =
    exact === undefined && typeof candidate === 'number' && Number.isFinite(candidate) ? String(candidate) : candidate;
  if (typeof raw !== 'string' || raw.length > 80 + maxDecimals || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(raw)) return null;
  const decimals = raw.split('.')[1]?.length ?? 0;
  if (decimals > maxDecimals) return null;
  const price = new FPNumber(raw, Math.max(FPNumber.DEFAULT_PRECISION, decimals));
  if (!price.isFinity() || (exact === undefined && !price.isGtZero())) return null;
  return price;
}

/** Value a native amount while retaining fractional USD below either factor's scale. */
export function valueAtMarketPrice(amount: FPNumber, price: FPNumber | null): FPNumber | null {
  if (amount.isZero()) return FPNumber.ZERO;
  if (!price) return null;
  return new FPNumber(price.toString(), price.precision + amount.precision).mul(amount);
}
