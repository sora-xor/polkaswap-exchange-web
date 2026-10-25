import { FPNumber } from '@sora-substrate/math';
import { describe, expect, it } from 'vitest';

import { Errors, LiquiditySourceTypes } from '@/lib/substrate/liquidity-proxy/consts';
import { SwapChunk } from '@/lib/substrate/liquidity-proxy/common/primitives';
import {
  Aggregation,
  Cluster,
} from '@/lib/substrate/liquidity-proxy/pallets/liquidityProxy/liquidityAggregator/aggregation';

const fp = (value: string | number) => new FPNumber(value);
const chunk = (input: number, output: number, fee = 0) => new SwapChunk(fp(input), fp(output), fp(fee));

describe('liquidity aggregation', () => {
  it('keeps cluster totals in sync as chunks are pushed and popped', () => {
    const cluster = new Cluster();

    expect(cluster.isEmpty()).toBe(true);
    expect(cluster.popBack()).toBeNull();

    cluster.pushBack(chunk(2, 6, 0.2));
    cluster.pushBack(chunk(3, 3, 0.1));

    expect(cluster.isEmpty()).toBe(false);
    expect(cluster.getTotal().input.toString()).toBe('5');
    expect(cluster.getTotal().output.toString()).toBe('9');
    expect(cluster.popBack()?.output.toString()).toBe('3');
    expect(cluster.getTotal().input.toString()).toBe('2');
    expect(cluster.popBack()?.input.toString()).toBe('2');
    expect(cluster.isEmpty()).toBe(true);
  });

  it('creates and retrieves mutable source clusters', () => {
    const aggregation = new Aggregation();

    expect(aggregation.getTotal(LiquiditySourceTypes.XYKPool).isZero()).toBe(true);
    expect(() => aggregation.getMutCluster(LiquiditySourceTypes.XYKPool)).toThrow(Errors.AggregationError);

    aggregation.pushChunk(LiquiditySourceTypes.XYKPool, chunk(2, 6));
    aggregation.pushChunk(LiquiditySourceTypes.XYKPool, chunk(3, 6));

    expect(aggregation.getMutCluster(LiquiditySourceTypes.XYKPool).chunks).toHaveLength(2);
    expect(aggregation.getTotal(LiquiditySourceTypes.XYKPool).input.toString()).toBe('5');
    expect(aggregation.getTotal(LiquiditySourceTypes.XYKPool).output.toString()).toBe('12');
  });

  it('orders sources by their aggregated total price ascending', () => {
    const aggregation = new Aggregation();

    aggregation.pushChunk(LiquiditySourceTypes.XYKPool, chunk(1, 4));
    aggregation.pushChunk(LiquiditySourceTypes.XSTPool, chunk(1, 2));
    aggregation.pushChunk(LiquiditySourceTypes.OrderBook, chunk(1, 3));

    expect(aggregation.getTotalPriceAscendingQueue()).toEqual([
      LiquiditySourceTypes.XSTPool,
      LiquiditySourceTypes.OrderBook,
      LiquiditySourceTypes.XYKPool,
    ]);
  });

  it('keeps insertion order for equal aggregated prices', () => {
    const aggregation = new Aggregation();

    aggregation.pushChunk(LiquiditySourceTypes.XYKPool, chunk(1, 2));
    aggregation.pushChunk(LiquiditySourceTypes.XSTPool, chunk(2, 4));

    expect(aggregation.getTotalPriceAscendingQueue()).toEqual([
      LiquiditySourceTypes.XYKPool,
      LiquiditySourceTypes.XSTPool,
    ]);
  });
});
