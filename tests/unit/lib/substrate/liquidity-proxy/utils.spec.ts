import { FPNumber } from '@sora-substrate/math';
import { describe, expect, it } from 'vitest';

import { AssetType, Consts, LiquiditySourceTypes } from '@/lib/substrate/liquidity-proxy/consts';
import {
  absDiff,
  checkedSub,
  extremum,
  getMaxPositive,
  intersection,
  isAssetAddress,
  isBetter,
  matchType,
  safeDivide,
  safeQuoteResult,
  saturatingSub,
  toFp,
} from '@/lib/substrate/liquidity-proxy/utils';

const fp = (value: string | number) => new FPNumber(value);

describe('liquidity proxy utils', () => {
  it('normalizes codec values and clamps negative values to zero', () => {
    expect(toFp('1000000000000000000').toString()).toBe('1');
    expect(getMaxPositive(fp(-5)).toString()).toBe('0');
    expect(getMaxPositive(fp(3)).toString()).toBe('3');
  });

  it('matches asset addresses and asset type pairs with optional bidirectionality', () => {
    expect(isAssetAddress('xor', 'xor')).toBe(true);
    expect(isAssetAddress('xor', 'val')).toBe(false);

    const matchesBaseSynthetic = matchType(AssetType.Base, AssetType.Synthetic);

    expect(matchesBaseSynthetic(AssetType.Base, AssetType.Synthetic)).toBe(true);
    expect(matchesBaseSynthetic(AssetType.Synthetic, AssetType.Base)).toBe(false);
    expect(matchesBaseSynthetic(AssetType.Synthetic, AssetType.Base, true)).toBe(true);
  });

  it('selects better quote amounts according to desired input mode', () => {
    expect(isBetter(true, fp(5), fp(4))).toBe(true);
    expect(isBetter(true, fp(4), fp(5))).toBe(false);

    expect(isBetter(false, fp(4), FPNumber.ZERO)).toBe(true);
    expect(isBetter(false, fp(3), fp(4))).toBe(true);
    expect(isBetter(false, FPNumber.ZERO, fp(4))).toBe(false);
  });

  it('returns the expected quote extremum and array intersection', () => {
    expect(extremum(true).toString()).toBe('0');
    expect(extremum(false).toString()).toBe(Consts.MAX.toString());
    expect(intersection(['xor', 'val', 'pswap'], ['pswap', 'xor'])).toEqual(['xor', 'pswap']);
  });

  it('performs guarded arithmetic operations', () => {
    expect(safeDivide(fp(6), fp(3)).toString()).toBe('2');
    expect(() => safeDivide(fp(1), FPNumber.ZERO)).toThrow('[liquidityProxy] Division error');
    expect(() => safeDivide(fp(1), fp(Number.NaN))).toThrow('[liquidityProxy] Division error');

    expect(saturatingSub(fp(3), fp(5)).toString()).toBe('0');
    expect(saturatingSub(fp(5), fp(3)).toString()).toBe('2');
    expect(checkedSub(fp(5), fp(3))?.toString()).toBe('2');
    expect(checkedSub(fp(3), fp(5))).toBeNull();
    expect(absDiff(fp(3), fp(5)).toString()).toBe('2');
    expect(absDiff(fp(5), fp(3)).toString()).toBe('2');
  });

  it('builds a safe empty quote result that preserves the requested route context', () => {
    const result = safeQuoteResult('xor', 'val', fp(12), LiquiditySourceTypes.XYKPool);

    expect(result.amount.toString()).toBe('0');
    expect(result.fee.toString()).toBe('0');
    expect(result.rewards).toEqual([]);
    expect(result.distribution).toHaveLength(1);
    expect(result.distribution[0]).toMatchObject({
      input: 'xor',
      output: 'val',
      market: LiquiditySourceTypes.XYKPool,
    });
    expect(result.distribution[0].income.toString()).toBe('12');
    expect(result.distribution[0].outcome.toString()).toBe('0');
    expect(result.distribution[0].fee.toString()).toBe('0');
  });
});
