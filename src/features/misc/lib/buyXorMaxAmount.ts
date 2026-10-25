import { FPNumber } from '@sora-substrate/sdk';
import { evaluateTonswapLiquidity, type TonswapFeeEvidence } from './tonswapLiquidity';
import type { GetTsPaymentAsset } from './getTsPlanQuote';

/** Read-only SORA DAI → XOR quote in codec units, as returned by the liquidity proxy. */
export type BuyXorDaiQuote = (dai: string) => Promise<{ amount: string; amountWithoutImpact: string }>;

export interface BuyXorMaxDaiOptions {
  signal?: AbortSignal;
  /** First upper bound to test, in DAI. It is multiplied by four until the price-impact limit is exceeded. */
  start?: string;
  /** Read budget for one search; running out reports no known maximum. */
  maxQuotes?: number;
  now?: () => number;
}

const ROUND_DOWN = 1;
const CENT = new FPNumber('0.01');
const SEARCH_CEILING = new FPNumber('1000000');
/** Linear scaling ignores fixed fees, which already makes it err low; this margin covers quote drift. */
const SCALE_MARGIN = new FPNumber('0.98');

/**
 * Largest SORA DAI input, rounded down to 0.01, that the purchase liquidity check accepts: DAI → XOR
 * price impact within the 5% limit and positive XOR after the swap fee. Bisects over read-only quotes
 * to about 1% precision (normally 8–10 reads). Returns null when no amount passes, a quote fails, the
 * read budget runs out or the search is aborted. The result is advice for the amount field only;
 * every later step still runs its own fresh checks.
 */
export async function findBuyXorMaxDai(
  quote: BuyXorDaiQuote,
  fees: TonswapFeeEvidence,
  options: BuyXorMaxDaiOptions = {}
): Promise<string | null> {
  const budget = options.maxQuotes ?? 16;
  const now = options.now ?? Date.now;
  let reads = 0;
  /** Impact above the limit is the only reason that moves the upper bound. */
  async function check(dai: FPNumber) {
    if (options.signal?.aborted || reads >= budget) throw new Error('Search stopped');
    reads += 1;
    const amount = dai.toString();
    const result = await quote(amount);
    if (options.signal?.aborted) throw new Error('Search stopped');
    return evaluateTonswapLiquidity(amount, result.amount, result.amountWithoutImpact, fees, now(), 'xor');
  }
  try {
    let low = FPNumber.ZERO;
    let lowAllowed = false;
    let high = new FPNumber(options.start ?? '64').dp(2, ROUND_DOWN);
    if (!high.gt(FPNumber.ZERO)) return null;
    for (;;) {
      const result = await check(high);
      if (result.reason === 'price-impact') break;
      low = high;
      lowAllowed = result.allowed;
      high = high.mul(new FPNumber('4'));
      if (high.gt(SEARCH_CEILING)) return null;
    }
    for (;;) {
      const precision = FPNumber.max(CENT, high.mul(new FPNumber('0.01')));
      if (!high.sub(low).gt(precision)) break;
      const middle = low.add(high).div(new FPNumber('2')).dp(2, ROUND_DOWN);
      if (!middle.gt(low) || !middle.lt(high)) break;
      const result = await check(middle);
      if (result.reason === 'price-impact') high = middle;
      else {
        low = middle;
        lowAllowed = result.allowed;
      }
    }
    return low.gt(FPNumber.ZERO) && lowAllowed ? low.toString() : null;
  } catch {
    return null;
  }
}

/** Rounds a suggested payment down to the precision a buyer types; null when nothing usable remains. */
export function roundBuyXorPayment(value: FPNumber, asset: GetTsPaymentAsset): string | null {
  let rounded: FPNumber;
  if (asset === 'ETH') rounded = value.dp(5, ROUND_DOWN);
  else if (asset === 'USD') rounded = value.dp(0, ROUND_DOWN);
  else if (asset === 'USDT' || asset === 'DAI')
    rounded = value.gte(new FPNumber('10')) ? value.dp(0, ROUND_DOWN) : value.dp(2, ROUND_DOWN);
  else rounded = value.dp(2, ROUND_DOWN);
  return rounded.gt(FPNumber.ZERO) && rounded.isFinity() ? rounded.toString() : null;
}

/**
 * Converts the largest DAI amount into the buyer's payment currency using a fresh estimate's DAI output.
 * DAI payments map one to one. Other assets scale linearly with a 2% margin: fixed card and network fees
 * make the true relationship affine, so the scaled amount errs low. The normal preview re-checks the
 * suggestion before the buyer can continue.
 */
export function scaleBuyXorMaxPayment(
  maxDai: string,
  sample: { amount: string; paymentAsset: GetTsPaymentAsset; daiAmount?: string }
): string | null {
  const max = new FPNumber(maxDai);
  if (!max.gt(FPNumber.ZERO) || !max.isFinity()) return null;
  if (sample.paymentAsset === 'DAI') return roundBuyXorPayment(max, 'DAI');
  if (!sample.daiAmount) return null;
  const amount = new FPNumber(sample.amount);
  const dai = new FPNumber(sample.daiAmount);
  if (!amount.gt(FPNumber.ZERO) || !dai.gt(FPNumber.ZERO) || !amount.isFinity() || !dai.isFinity()) return null;
  return roundBuyXorPayment(amount.mul(max).div(dai).mul(SCALE_MARGIN), sample.paymentAsset);
}
