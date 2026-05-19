import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { describe, expect, it } from 'vitest';

import {
  normalizeDexId,
  normalizeLiquiditySource,
  normalizeNaturalAmount,
  normalizeOptionalNaturalAmount,
  normalizePercent,
  normalizeSlippageTolerance,
  normalizeSwapSide,
} from '@/features/agent-trading/validation';

describe('agent-trading validation', () => {
  it('normalizes swap defaults', () => {
    expect(normalizeSwapSide(undefined)).toBe('input');
    expect(normalizeDexId(undefined)).toBe('best');
    expect(normalizeSlippageTolerance(undefined, '0.5')).toBe('0.5');
  });

  it('rejects invalid token amount shapes before token math', () => {
    expect(normalizeNaturalAmount('1.25')).toBe('1.25');
    expect(normalizeOptionalNaturalAmount(undefined)).toBeUndefined();
    expect(normalizeOptionalNaturalAmount('2')).toBe('2');
    expect(() => normalizeNaturalAmount('0')).toThrow(expect.objectContaining({ code: 'INVALID_AMOUNT' }));
    expect(() => normalizeNaturalAmount('-1')).toThrow(expect.objectContaining({ code: 'INVALID_AMOUNT' }));
    expect(() => normalizeNaturalAmount('1e3')).toThrow(expect.objectContaining({ code: 'INVALID_AMOUNT' }));
  });

  it('enforces percent bounds for position-based liquidity removal', () => {
    expect(normalizePercent('0.01')).toBe('0.01');
    expect(normalizePercent('100')).toBe('100');
    expect(() => normalizePercent('0')).toThrow(expect.objectContaining({ code: 'INVALID_PERCENT' }));
    expect(() => normalizePercent('101')).toThrow(expect.objectContaining({ code: 'INVALID_PERCENT' }));
  });

  it('enforces existing slippage bounds', () => {
    expect(normalizeSlippageTolerance('0.01', '0.5')).toBe('0.01');
    expect(normalizeSlippageTolerance('10', '0.5')).toBe('10');
    expect(() => normalizeSlippageTolerance('0.001', '0.5')).toThrow(
      expect.objectContaining({ code: 'INVALID_SLIPPAGE' })
    );
    expect(() => normalizeSlippageTolerance('10.1', '0.5')).toThrow(
      expect.objectContaining({ code: 'INVALID_SLIPPAGE' })
    );
  });

  it('validates liquidity source and side values', () => {
    expect(normalizeLiquiditySource(LiquiditySourceTypes.OrderBook)).toBe(LiquiditySourceTypes.OrderBook);
    expect(() => normalizeLiquiditySource('unsupported')).toThrow(
      expect.objectContaining({ code: 'INVALID_LIQUIDITY_SOURCE' })
    );
    expect(() => normalizeSwapSide('exact')).toThrow(expect.objectContaining({ code: 'INVALID_SWAP_SIDE' }));
  });
});
