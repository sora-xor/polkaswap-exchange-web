import { FPNumber } from '@sora-substrate/math';
import { describe, expect, it } from 'vitest';

import { Errors, LiquiditySourceTypes, SwapVariant } from '@/lib/substrate/liquidity-proxy/consts';
import { DiscreteQuotation, SideAmount, SwapChunk, SwapLimits } from '@/lib/substrate/liquidity-proxy/common/primitives';
import { Aggregation, Cluster } from '@/lib/substrate/liquidity-proxy/pallets/liquidityProxy/liquidityAggregator/aggregation';
import { Selector } from '@/lib/substrate/liquidity-proxy/pallets/liquidityProxy/liquidityAggregator/selector';

const fp = (value: string | number) => new FPNumber(value);
const chunk = (input: number, output: number, fee = 0) => new SwapChunk(fp(input), fp(output), fp(fee));

const quotation = (chunks: SwapChunk[], limits = new SwapLimits(null, null, null)) => {
  const result = new DiscreteQuotation();
  result.chunks = chunks;
  result.limits = limits;
  return result;
};

describe('liquidity selector', () => {
  it('tracks sources, limits, locks, and pushed-back chunks', () => {
    const selector = new Selector(SwapVariant.WithDesiredInput);
    const limits = new SwapLimits(null, null, null);

    expect(selector.isEmpty()).toBe(true);
    expect(() => selector.getLimits(LiquiditySourceTypes.XYKPool)).toThrow(Errors.AggregationError);
    expect(() => selector.pushChunk(LiquiditySourceTypes.XYKPool, chunk(1, 2))).toThrow(Errors.AggregationError);

    selector.addSource(LiquiditySourceTypes.XYKPool, quotation([], limits));
    selector.lockSource(LiquiditySourceTypes.XSTPool);
    selector.pushChunk(LiquiditySourceTypes.XYKPool, chunk(1, 2));

    expect(selector.isEmpty()).toBe(false);
    expect(selector.lockedSources.has(LiquiditySourceTypes.XSTPool)).toBe(true);
    expect(selector.getLimits(LiquiditySourceTypes.XYKPool)).toBe(limits);
    expect(selector.liquidityQuotations.get(LiquiditySourceTypes.XYKPool)?.chunks[0].output.toString()).toBe('2');
  });

  it('selects the highest-price available chunk and skips locked sources', () => {
    const selector = new Selector(SwapVariant.WithDesiredInput);
    selector.addSource(LiquiditySourceTypes.XYKPool, quotation([chunk(1, 2)]));
    selector.addSource(LiquiditySourceTypes.XSTPool, quotation([chunk(1, 3)]));
    selector.lockSource(LiquiditySourceTypes.XSTPool);

    const [source, selected] = selector.selectChunk(fp(10), new Aggregation());

    expect(source).toBe(LiquiditySourceTypes.XYKPool);
    expect(selected.output.toString()).toBe('2');
  });

  it('prefers a tied source that is already present in aggregation', () => {
    const selector = new Selector(SwapVariant.WithDesiredInput);
    selector.addSource(LiquiditySourceTypes.XYKPool, quotation([chunk(1, 2)]));
    selector.addSource(LiquiditySourceTypes.OrderBook, quotation([chunk(2, 4)]));

    const aggregation = new Aggregation();
    aggregation.pushChunk(LiquiditySourceTypes.OrderBook, chunk(1, 2));

    const [source] = selector.selectChunk(fp(10), aggregation);

    expect(source).toBe(LiquiditySourceTypes.OrderBook);
  });

  it('uses a delayed precision-limited source when no other candidate is available', () => {
    const selector = new Selector(SwapVariant.WithDesiredInput);
    const limits = new SwapLimits(null, null, new SideAmount(fp(10), SwapVariant.WithDesiredInput));
    selector.addSource(LiquiditySourceTypes.XYKPool, quotation([chunk(1, 5)], limits));

    const [source, selected] = selector.selectChunk(fp(5), new Aggregation());

    expect(source).toBe(LiquiditySourceTypes.XYKPool);
    expect(selected.output.toString()).toBe('5');
  });

  it('throws when liquidity is unavailable or a selected chunk cannot produce a price', () => {
    const empty = new Selector(SwapVariant.WithDesiredInput);
    expect(() => empty.selectChunk(fp(1), new Aggregation())).toThrow(Errors.InsufficientLiquidity);

    const withoutFrontChunk = new Selector(SwapVariant.WithDesiredInput);
    withoutFrontChunk.addSource(LiquiditySourceTypes.XYKPool, quotation([]));
    expect(() => withoutFrontChunk.selectChunk(fp(1), new Aggregation())).toThrow(Errors.InsufficientLiquidity);

    const invalid = new Selector(SwapVariant.WithDesiredInput);
    invalid.addSource(LiquiditySourceTypes.XYKPool, quotation([chunk(0, 1)]));
    expect(() => invalid.selectChunk(fp(1), new Aggregation())).toThrow(Errors.CalculationError);
  });

  it('returns liquidity from a cluster back to the selector, including partial chunks', () => {
    const selector = new Selector(SwapVariant.WithDesiredInput);
    selector.addSource(LiquiditySourceTypes.XYKPool, quotation([]));

    const cluster = new Cluster();
    cluster.pushBack(chunk(4, 8, 0.4));
    cluster.pushBack(chunk(4, 8, 0.4));

    const [taken, isEmpty] = selector.returnLiquidity(
      new SideAmount(fp(6), SwapVariant.WithDesiredInput),
      LiquiditySourceTypes.XYKPool,
      cluster
    );

    expect(isEmpty).toBe(false);
    expect(taken.input.toString()).toBe('6');
    expect(taken.output.toString()).toBe('12');
    expect(cluster.getTotal().input.toString()).toBe('2');
    expect(selector.liquidityQuotations.get(LiquiditySourceTypes.XYKPool)?.chunks).toHaveLength(2);
  });

  it('stops returning liquidity when the source cluster is already empty', () => {
    const selector = new Selector(SwapVariant.WithDesiredInput);
    selector.addSource(LiquiditySourceTypes.XYKPool, quotation([]));

    const [taken, isEmpty] = selector.returnLiquidity(
      new SideAmount(fp(1), SwapVariant.WithDesiredInput),
      LiquiditySourceTypes.XYKPool,
      new Cluster()
    );

    expect(taken.isZero()).toBe(true);
    expect(isEmpty).toBe(true);
    expect(selector.liquidityQuotations.get(LiquiditySourceTypes.XYKPool)?.chunks).toEqual([]);
  });
});
