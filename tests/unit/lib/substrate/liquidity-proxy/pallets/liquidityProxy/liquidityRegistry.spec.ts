import { describe, expect, it, vi } from 'vitest';

const sourceMocks = vi.hoisted(() => {
  const methods = ['canExchange', 'quote', 'quoteWithoutImpact', 'stepQuote', 'checkRewards'] as const;
  const createSource = (prefix: string) =>
    Object.fromEntries(methods.map((method) => [method, vi.fn(() => `${prefix}:${method}`)]));

  return {
    xyk: createSource('xyk'),
    tbc: createSource('tbc'),
    xst: createSource('xst'),
    orderBook: createSource('orderBook'),
  };
});

vi.mock('@/lib/substrate/liquidity-proxy/pallets/poolXyk', () => sourceMocks.xyk);
vi.mock('@/lib/substrate/liquidity-proxy/pallets/multicollateralBoundingCurvePool', () => sourceMocks.tbc);
vi.mock('@/lib/substrate/liquidity-proxy/pallets/xst', () => sourceMocks.xst);
vi.mock('@/lib/substrate/liquidity-proxy/pallets/orderBook', () => sourceMocks.orderBook);

import { Errors, LiquiditySourceTypes } from '@/lib/substrate/liquidity-proxy/consts';
import { LiquidityRegistry } from '@/lib/substrate/liquidity-proxy/pallets/liquidityProxy/liquidityRegistry';

describe('liquidity registry', () => {
  it('resolves source handlers for every supported liquidity source', () => {
    const sources = [
      [LiquiditySourceTypes.XYKPool, sourceMocks.xyk],
      [LiquiditySourceTypes.MulticollateralBondingCurvePool, sourceMocks.tbc],
      [LiquiditySourceTypes.XSTPool, sourceMocks.xst],
      [LiquiditySourceTypes.OrderBook, sourceMocks.orderBook],
    ] as const;

    for (const [source, handlers] of sources) {
      expect(LiquidityRegistry.canExchange(source)).toBe(handlers.canExchange);
      expect(LiquidityRegistry.quote(source)).toBe(handlers.quote);
      expect(LiquidityRegistry.quoteWithoutImpact(source)).toBe(handlers.quoteWithoutImpact);
      expect(LiquidityRegistry.stepQuote(source)).toBe(handlers.stepQuote);
      expect(LiquidityRegistry.checkRewards(source)).toBe(handlers.checkRewards);
    }
  });

  it('rejects unsupported liquidity sources for every handler lookup', () => {
    const unsupported = 'unsupported' as LiquiditySourceTypes;

    expect(() => LiquidityRegistry.canExchange(unsupported)).toThrow(Errors.UnsupportedLiquiditySource);
    expect(() => LiquidityRegistry.quote(unsupported)).toThrow(Errors.UnsupportedLiquiditySource);
    expect(() => LiquidityRegistry.quoteWithoutImpact(unsupported)).toThrow(Errors.UnsupportedLiquiditySource);
    expect(() => LiquidityRegistry.stepQuote(unsupported)).toThrow(Errors.UnsupportedLiquiditySource);
    expect(() => LiquidityRegistry.checkRewards(unsupported)).toThrow(Errors.UnsupportedLiquiditySource);
  });
});
