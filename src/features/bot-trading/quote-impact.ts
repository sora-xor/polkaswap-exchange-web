/** Exact-input quote impact checks. Quote outputs already include pool fees; never deduct them again here. */
const U128_MAX = (1n << 128n) - 1n;

/** Require an observed, positive chain Balance rather than a missing/zero quote or rounded natural amount. */
function positiveCodec(value: unknown): bigint {
  if (typeof value !== 'string' || !/^[1-9]\d{0,38}$/.test(value)) throw new Error('bots.errors.quote');
  const amount = BigInt(value);
  if (amount > U128_MAX) throw new Error('bots.errors.quote');
  return amount;
}

/** Parse the existing policy's 0..100 percent range with at most 18 fractional digits, without division. */
function percentRatio(value: unknown): { numerator: bigint; denominator: bigint } {
  if (typeof value !== 'string') throw new Error('bots.errors.policy');
  const parts = /^(0|[1-9]\d{0,2})(?:\.(\d{1,18}))?$/.exec(value);
  if (!parts) throw new Error('bots.errors.policy');
  const fraction = parts[2] ?? '';
  const denominator = 10n ** BigInt(fraction.length);
  const numerator = BigInt(parts[1]) * denominator + BigInt(fraction || '0');
  if (numerator > 100n * denominator) throw new Error('bots.errors.policy');
  return { numerator, denominator };
}

/**
 * Compare (withoutImpact - output) / withoutImpact against an exact decimal percent cap.
 * Both amounts must be positive u128 outputs of the same WithDesiredInput quote, with the same
 * output asset/precision and pool-fee deduction. The caller verifies that quote's provenance,
 * route, exact input and state. No reserve mark, network fee, slippage or rounded display impact
 * enters this comparison. Network fees remain a separate ledger debit; output is never reduced.
 *
 * Equal outputs are valid zero impact. A zero/missing amount or output above the no-impact
 * baseline is invalid evidence and throws; a well-formed quote above the cap returns false.
 * Desired-output quotes use a different formula and must not be passed to this helper.
 */
export function isExactInputQuoteWithinImpactLimit(
  amountOutCodec: unknown,
  amountWithoutImpactCodec: unknown,
  maxPriceImpactPercent: unknown
): boolean {
  const output = positiveCodec(amountOutCodec);
  const withoutImpact = positiveCodec(amountWithoutImpactCodec);
  if (output > withoutImpact) throw new Error('bots.errors.quote');
  const limit = percentRatio(maxPriceImpactPercent);
  return (withoutImpact - output) * 100n * limit.denominator <= withoutImpact * limit.numerator;
}
