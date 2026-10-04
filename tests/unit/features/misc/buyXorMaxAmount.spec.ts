import { describe, expect, it, vi } from 'vitest';
import { FPNumber } from '@sora-substrate/sdk';
import {
  findBuyXorMaxDai,
  roundBuyXorPayment,
  scaleBuyXorMaxPayment,
  type BuyXorDaiQuote,
} from '@/features/misc/lib/buyXorMaxAmount';
import { evaluateTonswapLiquidity } from '@/features/misc/lib/tonswapLiquidity';

const UNIT = 10n ** 18n;
const fees = { swapFeeCodec: '100020712589707326', slippageTolerance: '1' };

/** Exact constant-product DAI → XOR pool with a 0.3% fee, in codec units (no floating point). */
function pool(daiReserve: string, xorReserve: string): BuyXorDaiQuote {
  const dai = BigInt(new FPNumber(daiReserve).toCodecString());
  const xor = BigInt(new FPNumber(xorReserve).toCodecString());
  return async (amount) => {
    const input = BigInt(new FPNumber(amount).toCodecString());
    const net = (input * 997n) / 1000n;
    return {
      amount: ((xor * net) / (dai + net)).toString(),
      amountWithoutImpact: ((xor * net) / dai).toString(),
    };
  };
}
async function impactOf(quote: BuyXorDaiQuote, amount: string) {
  const result = await quote(amount);
  return evaluateTonswapLiquidity(amount, result.amount, result.amountWithoutImpact, fees, 0, 'xor');
}

describe('Buy XOR maximum purchase', () => {
  it('finds the largest DAI amount within the 5% impact limit to about 1%', async () => {
    // Mainnet DAI/XOR reserves observed on 4 October 2026: 452.42 DAI and 82.835 XOR.
    const quote = vi.fn(pool('452.42', '82.835'));
    const max = await findBuyXorMaxDai(quote, fees);
    const reads = quote.mock.calls.length;
    expect(max).not.toBeNull();
    expect(new FPNumber(max!).dp(2, 1).toString()).toBe(max);
    expect((await impactOf(quote, max!)).allowed).toBe(true);
    // The exact limit is 452.42 × 0.05 / 0.95 / 0.997 ≈ 23.88 DAI; the search stops within 1% of it.
    const above = new FPNumber(max!).mul(new FPNumber('1.02')).dp(2, 1).toString();
    expect((await impactOf(quote, above)).reason).toBe('price-impact');
    expect(reads).toBeLessThanOrEqual(12);
    expect(quote.mock.calls.every(([amount]) => /^\d+(?:\.\d{1,2})?$/.test(amount))).toBe(true);
  });

  it('expands past the first bound when the market is deep', async () => {
    const max = await findBuyXorMaxDai(pool('100000', '18000'), fees);
    expect(new FPNumber(max!).gt(new FPNumber('5000'))).toBe(true);
    expect(new FPNumber(max!).lt(new FPNumber('5300'))).toBe(true);
  });

  it('reports no maximum when nothing passes, quotes fail or the search is stopped', async () => {
    expect(await findBuyXorMaxDai(pool('0.001', '0.0001'), fees)).toBeNull();
    expect(await findBuyXorMaxDai(pool('452', '82'), { ...fees, swapFeeCodec: (1000n * UNIT).toString() })).toBeNull();
    expect(await findBuyXorMaxDai(pool('452', '82'), {})).toBeNull();
    expect(
      await findBuyXorMaxDai(async () => {
        throw new Error('rpc down');
      }, fees)
    ).toBeNull();
    expect(await findBuyXorMaxDai(pool('452', '82'), fees, { maxQuotes: 3 })).toBeNull();
    const controller = new AbortController();
    controller.abort();
    expect(await findBuyXorMaxDai(pool('452', '82'), fees, { signal: controller.signal })).toBeNull();
    expect(await findBuyXorMaxDai(pool('1e12', '1e12'), fees)).toBeNull();
  });

  it('rounds suggestions down to amounts a buyer types', () => {
    expect(roundBuyXorPayment(new FPNumber('28.999'), 'USD')).toBe('28');
    expect(roundBuyXorPayment(new FPNumber('0.0077719'), 'ETH')).toBe('0.00777');
    expect(roundBuyXorPayment(new FPNumber('23.88'), 'DAI')).toBe('23');
    expect(roundBuyXorPayment(new FPNumber('9.876'), 'USDT')).toBe('9.87');
    expect(roundBuyXorPayment(new FPNumber('0.9'), 'USD')).toBeNull();
    expect(roundBuyXorPayment(new FPNumber('0.000001'), 'ETH')).toBeNull();
  });

  it('scales the maximum into the payment currency with exact fixed-point math and a 2% margin', () => {
    expect(scaleBuyXorMaxPayment('23.88', { amount: '50', paymentAsset: 'USD', daiAmount: '41.6' })).toBe('28');
    expect(scaleBuyXorMaxPayment('23.88', { amount: '0.01', paymentAsset: 'ETH', daiAmount: '30' })).toBe('0.0078');
    expect(scaleBuyXorMaxPayment('23.88', { amount: '30', paymentAsset: 'USDT', daiAmount: '29.9' })).toBe('23');
    // DAI needs no estimate and no margin.
    expect(scaleBuyXorMaxPayment('23.88', { amount: '1', paymentAsset: 'DAI' })).toBe('23');
  });

  it('refuses to scale without a usable DAI estimate', () => {
    expect(scaleBuyXorMaxPayment('23.88', { amount: '50', paymentAsset: 'USD' })).toBeNull();
    expect(scaleBuyXorMaxPayment('23.88', { amount: '50', paymentAsset: 'USD', daiAmount: '0' })).toBeNull();
    expect(scaleBuyXorMaxPayment('0', { amount: '50', paymentAsset: 'USD', daiAmount: '40' })).toBeNull();
    expect(scaleBuyXorMaxPayment('23.88', { amount: '0', paymentAsset: 'ETH', daiAmount: '40' })).toBeNull();
  });
});
