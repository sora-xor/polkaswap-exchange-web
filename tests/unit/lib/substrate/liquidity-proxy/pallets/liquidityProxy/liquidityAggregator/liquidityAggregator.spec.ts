import { FPNumber } from '@sora-substrate/math';
import { describe, expect, it } from 'vitest';

import { Errors, LiquiditySourceTypes, SwapVariant } from '@/lib/substrate/liquidity-proxy/consts';
import {
  DiscreteQuotation,
  SideAmount,
  SwapChunk,
  SwapLimits,
} from '@/lib/substrate/liquidity-proxy/common/primitives';
import { LiquidityAggregator } from '@/lib/substrate/liquidity-proxy/pallets/liquidityProxy/liquidityAggregator/liquidityAggregator';

const fp = (value: string | number) => new FPNumber(value);
const chunk = (input: number, output: number, fee = 0) => new SwapChunk(fp(input), fp(output), fp(fee));

const quotation = (chunks: SwapChunk[], limits = new SwapLimits(null, null, null)) => {
  const result = new DiscreteQuotation();
  result.chunks = chunks;
  result.limits = limits;
  return result;
};

describe('liquidity aggregator', () => {
  it('rejects aggregation when no liquidity sources are registered', () => {
    const aggregator = new LiquidityAggregator(SwapVariant.WithDesiredInput);

    expect(() => aggregator.aggregateLiquidity(fp(1))).toThrow(Errors.InsufficientLiquidity);
  });

  it('aggregates desired input across best-priced liquidity chunks', () => {
    const aggregator = new LiquidityAggregator(SwapVariant.WithDesiredInput);
    aggregator.addSource(LiquiditySourceTypes.XYKPool, quotation([chunk(2, 10, 0.2)]));
    aggregator.addSource(LiquiditySourceTypes.OrderBook, quotation([chunk(5, 10, 0.5)]));

    const result = aggregator.aggregateLiquidity(fp(5));

    expect(result.desiredAmount.toString()).toBe('5');
    expect(result.resultAmount.toString()).toBe('16');
    expect(result.fee.toString()).toBe('0.5');
    expect(result.swapInfo.get(LiquiditySourceTypes.XYKPool)?.map((value) => value.toString())).toEqual(['2', '10']);
    expect(result.swapInfo.get(LiquiditySourceTypes.OrderBook)?.map((value) => value.toString())).toEqual(['3', '6']);
    expect(result.distribution).toHaveLength(2);
  });

  it('aggregates desired output and reports input as the resulting amount', () => {
    const aggregator = new LiquidityAggregator(SwapVariant.WithDesiredOutput);
    aggregator.addSource(LiquiditySourceTypes.XYKPool, quotation([chunk(2, 10, 0.2)]));

    const result = aggregator.aggregateLiquidity(fp(5));

    expect(result.desiredAmount.toString()).toBe('5');
    expect(result.resultAmount.toString()).toBe('1');
    expect(result.swapInfo.get(LiquiditySourceTypes.XYKPool)?.map((value) => value.toString())).toEqual(['1', '5']);
    expect(result.distribution[0]).toMatchObject({ market: LiquiditySourceTypes.XYKPool });
  });

  it('returns refunded chunks to the selector when max source limits are exceeded', () => {
    const aggregator = new LiquidityAggregator(SwapVariant.WithDesiredInput);
    const limits = new SwapLimits(null, new SideAmount(fp(3), SwapVariant.WithDesiredInput), null);
    aggregator.addSource(LiquiditySourceTypes.XYKPool, quotation([chunk(5, 10, 0.5)], limits));

    const [fitted, amount] = aggregator.fitChunk(chunk(5, 10, 0.5), LiquiditySourceTypes.XYKPool, fp(5));

    expect(fitted.input.toString()).toBe('3');
    expect(fitted.output.toString()).toBe('6');
    expect(fitted.fee.toString()).toBe('0.3');
    expect(amount.toString()).toBe('5');
    expect(aggregator.selector.lockedSources.has(LiquiditySourceTypes.XYKPool)).toBe(true);
    expect(aggregator.selector.liquidityQuotations.get(LiquiditySourceTypes.XYKPool)?.chunks[0].input.toString()).toBe(
      '2'
    );
  });

  it('rounds the remaining amount down for precision-limited desired input', () => {
    const aggregator = new LiquidityAggregator(SwapVariant.WithDesiredInput);
    const limits = new SwapLimits(null, null, new SideAmount(fp(10), SwapVariant.WithDesiredInput));
    aggregator.addSource(LiquiditySourceTypes.XYKPool, quotation([chunk(10, 50)], limits));

    const [fitted, amount] = aggregator.fitChunk(chunk(10, 50), LiquiditySourceTypes.XYKPool, fp(5));

    expect(fitted.isZero()).toBe(true);
    expect(amount.isZero()).toBe(true);
    expect(aggregator.selector.liquidityQuotations.get(LiquiditySourceTypes.XYKPool)?.chunks[0].input.toString()).toBe(
      '10'
    );
  });

  it('rounds the remaining amount up for precision-limited desired output', () => {
    const aggregator = new LiquidityAggregator(SwapVariant.WithDesiredOutput);
    const limits = new SwapLimits(null, null, new SideAmount(fp(10), SwapVariant.WithDesiredOutput));
    aggregator.addSource(LiquiditySourceTypes.XYKPool, quotation([chunk(10, 50)], limits));

    const [fitted, amount] = aggregator.fitChunk(chunk(10, 50), LiquiditySourceTypes.XYKPool, fp(5));

    expect(fitted.input.toString()).toBe('2');
    expect(fitted.output.toString()).toBe('10');
    expect(amount.toString()).toBe('10');
    expect(aggregator.selector.liquidityQuotations.get(LiquiditySourceTypes.XYKPool)?.chunks[0].output.toString()).toBe(
      '40'
    );
  });

  it('calculates results directly from pre-filled aggregation state', () => {
    const aggregator = new LiquidityAggregator(SwapVariant.WithDesiredInput);
    aggregator.aggregation.pushChunk(LiquiditySourceTypes.XYKPool, chunk(2, 6, 0.2));
    aggregator.aggregation.pushChunk(LiquiditySourceTypes.XSTPool, chunk(3, 6, 0.3));

    const result = aggregator.calculateResult();

    expect(result.desiredAmount.toString()).toBe('5');
    expect(result.resultAmount.toString()).toBe('12');
    expect(result.fee.toString()).toBe('0.5');
    expect(result.distribution.map((item) => item.market)).toEqual([
      LiquiditySourceTypes.XYKPool,
      LiquiditySourceTypes.XSTPool,
    ]);
  });

  it('returns under-minimum source liquidity and refills it from another source', () => {
    const aggregator = new LiquidityAggregator(SwapVariant.WithDesiredInput);
    const minLimits = new SwapLimits(new SideAmount(fp(3), SwapVariant.WithDesiredInput), null, null);

    aggregator.selector.addSource(LiquiditySourceTypes.XYKPool, quotation([], minLimits));
    aggregator.selector.addSource(LiquiditySourceTypes.XSTPool, quotation([chunk(2, 6, 0.2)]));
    aggregator.aggregation.pushChunk(LiquiditySourceTypes.XYKPool, chunk(2, 4, 0.1));

    aggregator.alignMin();

    expect(aggregator.aggregation.has(LiquiditySourceTypes.XYKPool)).toBe(false);
    expect(aggregator.selector.lockedSources.has(LiquiditySourceTypes.XYKPool)).toBe(true);
    expect(aggregator.aggregation.getTotal(LiquiditySourceTypes.XSTPool).input.toString()).toBe('2');
    expect(aggregator.aggregation.getTotal(LiquiditySourceTypes.XSTPool).output.toString()).toBe('6');
  });
});
