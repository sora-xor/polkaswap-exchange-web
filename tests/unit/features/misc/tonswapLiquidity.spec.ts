import { describe, expect, it } from 'vitest';
import { evaluateTonswapLiquidity, isTonswapFundingAmount } from '@/features/misc/lib/tonswapLiquidity';

const fees = { swapFeeCodec: '10000000000000000', burnFeeCodec: '20000000000000000', slippageTolerance: '0.5' };

describe('Get TS liquidity preflight', () => {
  it('accepts exact positive DAI precision and rejects malformed amounts', () => {
    expect(isTonswapFundingAmount('0.000000000000000001')).toBe(true);
    for (const input of ['0', '-1', '01', '1e3', 'NaN', '1.0000000000000000001'])
      expect(isTonswapFundingAmount(input)).toBe(false);
  });
  it('applies the exact five-percent boundary and expires in thirty seconds', () => {
    expect(evaluateTonswapLiquidity('10', '950000000000000000', '1000000000000000000', fees, 1000)).toEqual({
      allowed: true,
      amount: '10',
      xor: '0.95',
      impact: '5',
      expiresAt: 31000,
      feeReserve: '0.03',
      burnableXor: '0.896345',
    });
    expect(evaluateTonswapLiquidity('10', '949999999999999999', '1000000000000000000', fees)).toMatchObject({
      allowed: false,
      reason: 'price-impact',
    });
  });
  it('reserves only the swap fee for generic XOR without requiring burn evidence', () => {
    const result = evaluateTonswapLiquidity(
      '10',
      '950000000000000000',
      '1000000000000000000',
      { ...fees, burnFeeCodec: undefined },
      1000,
      'xor'
    );
    expect(result).toEqual({
      allowed: true,
      amount: '10',
      xor: '0.95',
      impact: '5',
      expiresAt: 31000,
      feeReserve: '0.01',
      spendableXor: '0.916345',
    });
    expect(result).not.toHaveProperty('burnableXor');
    expect(
      evaluateTonswapLiquidity(
        '10',
        '950000000000000000',
        '1000000000000000000',
        { ...fees, swapFeeCodec: '0' },
        1000,
        'xor'
      )
    ).toMatchObject({ allowed: false, reason: 'fees-unavailable' });
  });
  it('preserves the generic XOR impact and precise positive-output fee limits', () => {
    expect(
      evaluateTonswapLiquidity('10', '949999999999999999', '1000000000000000000', fees, 1000, 'xor')
    ).toMatchObject({ allowed: false, reason: 'price-impact' });
    const genericFees = { swapFeeCodec: '98', slippageTolerance: '0' };
    expect(evaluateTonswapLiquidity('1', '101', '101', genericFees, 1000, 'xor')).toMatchObject({
      allowed: false,
      reason: 'fees-insufficient',
      spendableXor: '0',
    });
    expect(evaluateTonswapLiquidity('1', '102', '102', genericFees, 1000, 'xor')).toMatchObject({
      allowed: true,
      spendableXor: '0.000000000000000001',
    });
  });
  it('fails closed on missing, zero, negative, or malformed quote evidence', () => {
    for (const value of ['', '0', '-1', 'NaN', '100.1'])
      expect(() => evaluateTonswapLiquidity('10', value, '100', fees)).toThrow();
    expect(() => evaluateTonswapLiquidity('10', '100', '0', fees)).toThrow();
  });
  it('requires both known positive fee estimates, including the SDK zero sentinel', () => {
    for (const value of [undefined, null, '', '0', '-1', '1.1', '1e3', '01', '9'.repeat(79)]) {
      for (const key of ['swapFeeCodec', 'burnFeeCodec']) {
        expect(
          evaluateTonswapLiquidity('10', '1000000000000000000', '1000000000000000000', {
            ...fees,
            [key]: value,
          })
        ).toMatchObject({ allowed: false, reason: 'fees-unavailable' });
      }
    }
  });
  it('rejects output that covers either fee but cannot cover their sum', () => {
    expect(evaluateTonswapLiquidity('1', '25000000000000000', '25000000000000000', fees)).toMatchObject({
      allowed: false,
      reason: 'fees-insufficient',
      feeReserve: '0.03',
      burnableXor: '0',
    });
  });
  it('requires one whole codec unit left after the two-percent buffer and both fees', () => {
    const tinyFees = { swapFeeCodec: '50', burnFeeCodec: '48', slippageTolerance: '0' };
    for (const output of ['1', '99', '100', '101']) {
      expect(evaluateTonswapLiquidity('1', output, output, tinyFees)).toMatchObject({
        allowed: false,
        reason: 'fees-insufficient',
      });
    }
    expect(evaluateTonswapLiquidity('1', '102', '102', tinyFees)).toMatchObject({
      allowed: true,
      burnableXor: '0.000000000000000001',
    });
  });
  it('covers the accepted two-percent conversion minimum followed by SORA slippage at the exact fee boundary', () => {
    const boundaryFees = { swapFeeCodec: '5000', burnFeeCodec: '4751', slippageTolerance: '0.5' };
    // 10,000 * 0.98 * 0.995 = 9,751 codec units, all consumed by fees.
    expect(evaluateTonswapLiquidity('1', '10000', '10000', boundaryFees)).toMatchObject({
      allowed: false,
      reason: 'fees-insufficient',
      burnableXor: '0',
    });
    expect(
      evaluateTonswapLiquidity('1', '10000', '10000', {
        ...boundaryFees,
        burnFeeCodec: '4750',
      })
    ).toMatchObject({ allowed: true, burnableXor: '0.000000000000000001' });
  });
  it('includes larger configured SORA slippage plus the two-percent conversion allowance', () => {
    const largerFees = { swapFeeCodec: '470000000000000000', burnFeeCodec: '480000000000000000' };
    expect(evaluateTonswapLiquidity('1', '1000000000000000000', '1000000000000000000', largerFees).allowed).toBe(true);
    expect(
      evaluateTonswapLiquidity('1', '1000000000000000000', '1000000000000000000', {
        ...largerFees,
        slippageTolerance: '5',
      })
    ).toMatchObject({ allowed: false, reason: 'fees-insufficient' });
    for (const tolerance of ['-1', '100', '1e2', 'NaN', '']) {
      expect(
        evaluateTonswapLiquidity('1', '1000000000000000000', '1000000000000000000', {
          ...fees,
          slippageTolerance: tolerance,
        })
      ).toMatchObject({ allowed: false, reason: 'fees-unavailable' });
    }
  });
});
