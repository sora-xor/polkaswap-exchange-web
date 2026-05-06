import { FPNumber } from '@sora-substrate/math';
import { describe, expect, it } from 'vitest';

import { LiquiditySourceTypes, SwapVariant } from '@/lib/substrate/liquidity-proxy/consts';
import {
  AggregatedSwapOutcome,
  AggregationResult,
} from '@/lib/substrate/liquidity-proxy/pallets/liquidityProxy/liquidityAggregator/aggregationResult';

const fp = (value: string | number) => new FPNumber(value);

describe('liquidity aggregation result', () => {
  it('preserves swap info, distribution, amounts, variant, and fee', () => {
    const swapInfo = new Map([[LiquiditySourceTypes.XYKPool, [fp(2), fp(4)] as [FPNumber, FPNumber]]]);
    const distribution = [
      {
        market: LiquiditySourceTypes.XYKPool,
        income: fp(2),
        outcome: fp(4),
        fee: fp(0.1),
      },
    ];

    const result = new AggregationResult(swapInfo, distribution, fp(2), fp(4), SwapVariant.WithDesiredInput, fp(0.1));

    expect(result.swapInfo).toBe(swapInfo);
    expect(result.distribution).toBe(distribution);
    expect(result.desiredAmount.toString()).toBe('2');
    expect(result.resultAmount.toString()).toBe('4');
    expect(result.swapVariant).toBe(SwapVariant.WithDesiredInput);
    expect(result.fee.toString()).toBe('0.1');
  });

  it('converts aggregation results to public swap outcomes', () => {
    const distribution = [
      {
        market: LiquiditySourceTypes.OrderBook,
        income: fp(3),
        outcome: fp(9),
        fee: fp(0.2),
      },
    ];
    const result = new AggregationResult(new Map(), distribution, fp(3), fp(9), SwapVariant.WithDesiredInput, fp(0.2));

    const outcome = new AggregatedSwapOutcome([], FPNumber.ZERO, FPNumber.ZERO).from(result);

    expect(outcome).toBeInstanceOf(AggregatedSwapOutcome);
    expect(outcome.distribution).toBe(distribution);
    expect(outcome.amount.toString()).toBe('9');
    expect(outcome.fee.toString()).toBe('0.2');
  });
});
