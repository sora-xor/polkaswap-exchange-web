import { describe, expect, it, vi } from 'vitest';

const canExchangeMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/substrate/liquidity-proxy/pallets/liquidityProxy/liquidityRegistry', () => ({
  LiquidityRegistry: {
    canExchange: canExchangeMock,
  },
}));

import { LiquiditySourceTypes } from '@/lib/substrate/liquidity-proxy/consts';
import { listLiquiditySources } from '@/lib/substrate/liquidity-proxy/pallets/dexApi';

describe('dexApi pallet helpers', () => {
  it('filters empty, locked, unselected, and unavailable liquidity sources', () => {
    canExchangeMock.mockImplementation((source: LiquiditySourceTypes) => () => {
      return source === LiquiditySourceTypes.XYKPool || source === LiquiditySourceTypes.XSTPool;
    });

    const payload = {
      lockedSources: [LiquiditySourceTypes.XSTPool],
    } as any;

    expect(
      listLiquiditySources(
        'base',
        'synthetic-base',
        'input',
        'output',
        [LiquiditySourceTypes.XYKPool, LiquiditySourceTypes.OrderBook],
        payload
      )
    ).toEqual([LiquiditySourceTypes.XYKPool]);
    expect(canExchangeMock).toHaveBeenCalledWith(LiquiditySourceTypes.XYKPool);
  });

  it('checks all unlocked sources when no explicit source filter is provided', () => {
    canExchangeMock.mockImplementation(() => () => true);

    const result = listLiquiditySources('base', 'synthetic-base', 'input', 'output', [], {
      lockedSources: [LiquiditySourceTypes.OrderBook],
    } as any);

    expect(result).toEqual([
      LiquiditySourceTypes.XYKPool,
      LiquiditySourceTypes.XSTPool,
      LiquiditySourceTypes.MulticollateralBondingCurvePool,
    ]);
  });
});
