import { FPNumber } from '@sora-substrate/sdk';
import { evaluateTonswapLiquidity, type TonswapFeeEvidence } from './tonswapLiquidity';
import type { GetTsPaymentAsset } from './getTsPlanQuote';

/** Read-only SORA DAI → XOR (or ETH → XOR) quote in codec units, as returned by the liquidity proxy. */
export type BuyXorDaiQuote = (dai: string) => Promise<{ amount: string; amountWithoutImpact: string }>;

export interface BuyXorMaxDaiOptions {
  signal?: AbortSignal;
  /** First upper bound to test, in the quoted asset. It is multiplied by four until the price-impact limit is exceeded. */
  start?: string;
  /** Decimal places of the result and of every tested amount: 2 for DAI (the default), more for ETH. */
  decimals?: number;
  /** Read budget for one search; running out reports no known maximum. */
  maxQuotes?: number;
  now?: () => number;
}

const ROUND_DOWN = 1;
const SEARCH_CEILING = new FPNumber('1000000');
/** Linear scaling ignores fixed fees, which already makes it err low; this margin covers quote drift. */
const SCALE_MARGIN = new FPNumber('0.98');

/**
 * Largest SORA DAI input, rounded down to 0.01, that the purchase liquidity check accepts: DAI → XOR
 * price impact within Buy XOR's limit (`BUY_XOR_MAX_PRICE_IMPACT`) and positive XOR after the swap fee. Bisects over
 * read-only quotes to about 1% precision (normally 8–10 reads). Card purchases pass an ETH → XOR quote, a smaller
 * `start` and more `decimals`. Returns null when no amount passes, a quote fails, the read budget runs out or the
 * search is aborted. The result is advice for the amount field only; every later step still runs its own fresh checks.
 */
export async function findBuyXorMaxDai(
  quote: BuyXorDaiQuote,
  fees: TonswapFeeEvidence,
  options: BuyXorMaxDaiOptions = {}
): Promise<string | null> {
  const budget = options.maxQuotes ?? 16;
  const now = options.now ?? Date.now;
  const decimals = options.decimals ?? 2;
  const unit = FPNumber.ONE.div(new FPNumber('10').pow(decimals));
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
    let high = new FPNumber(options.start ?? '64').dp(decimals, ROUND_DOWN);
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
      const precision = FPNumber.max(unit, high.mul(new FPNumber('0.01')));
      if (!high.sub(low).gt(precision)) break;
      const middle = low.add(high).div(new FPNumber('2')).dp(decimals, ROUND_DOWN);
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
 * Converts the largest DAI amount into the buyer's payment currency using a fresh estimate's DAI output. Card
 * purchases pass the largest ETH amount and the estimate's ETH swap amount as `daiAmount`, and the card provider's
 * fees included in the sample (`fees`, in USD).
 * DAI payments map one to one. Other assets scale with a 2% margin. Card fees are kept out of the scaling, as if they
 * were all fixed: MoonPay's are partly fixed, and scaling them too would overstate a large maximum (about 79 instead
 * of 70 USD from a 20 USD sample on 10 October 2026). Treating them as fixed errs low. The normal preview re-checks
 * the suggestion before the buyer can continue.
 */
export function scaleBuyXorMaxPayment(
  maxDai: string,
  sample: { amount: string; paymentAsset: GetTsPaymentAsset; daiAmount?: string; fees?: string }
): string | null {
  const max = new FPNumber(maxDai);
  if (!max.gt(FPNumber.ZERO) || !max.isFinity()) return null;
  if (sample.paymentAsset === 'DAI') return roundBuyXorPayment(max, 'DAI');
  if (!sample.daiAmount) return null;
  const amount = new FPNumber(sample.amount);
  const dai = new FPNumber(sample.daiAmount);
  if (!amount.gt(FPNumber.ZERO) || !dai.gt(FPNumber.ZERO) || !amount.isFinity() || !dai.isFinity()) return null;
  const fees = sample.fees ? new FPNumber(sample.fees) : FPNumber.ZERO;
  if (!fees.isFinity() || fees.lt(FPNumber.ZERO) || !amount.gt(fees)) return null;
  const scaled = fees.add(amount.sub(fees).mul(max).div(dai));
  return roundBuyXorPayment(scaled.mul(SCALE_MARGIN), sample.paymentAsset);
}
