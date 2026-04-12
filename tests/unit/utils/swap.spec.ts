import { FPNumber } from '@sora-substrate/sdk';
import { describe, expect, it } from 'vitest';

import { DifferenceStatus, calcFiatDifference, getDifferenceStatus, getVisibleSwapTokenBalance } from '@/utils/swap';

describe('swap utils', () => {
  it('returns zero fiat difference when either side is zero', () => {
    expect(calcFiatDifference(FPNumber.ZERO, new FPNumber('10')).toString()).toBe('0');
    expect(calcFiatDifference(new FPNumber('10'), FPNumber.ZERO).toString()).toBe('0');
  });

  it('resolves difference status thresholds', () => {
    expect(getDifferenceStatus(1)).toBe(DifferenceStatus.Success);
    expect(getDifferenceStatus(-2)).toBe(DifferenceStatus.Warning);
    expect(getDifferenceStatus(-11)).toBe(DifferenceStatus.Error);
    expect(getDifferenceStatus(0)).toBe('');
  });

  it('hides swap balance when user is not logged in', () => {
    const token = {
      balance: {
        transferable: '1230000000000000000',
      },
    } as any;

    expect(getVisibleSwapTokenBalance(token, false)).toBeNull();
    expect(getVisibleSwapTokenBalance(token, true)).toBe('1230000000000000000');
  });

  it('hides swap balance when the connected token balance is zero', () => {
    const token = {
      balance: {
        transferable: '0',
      },
    } as any;

    expect(getVisibleSwapTokenBalance(token, true)).toBeNull();
  });
});
