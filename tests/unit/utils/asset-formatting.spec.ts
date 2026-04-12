import { FPNumber } from '@sora-substrate/sdk';
import { describe, expect, it } from 'vitest';

import { formatAmountWithSuffix, isAmountValueIntegerOnly } from '@/utils/asset-formatting';

describe('formatAmountWithSuffix', () => {
  it('omits trailing decimals for integer values', () => {
    expect(formatAmountWithSuffix(new FPNumber('532'))).toEqual({
      amount: '532',
      suffix: '',
    });
  });

  it('keeps significant decimal digits when abbreviating values', () => {
    expect(formatAmountWithSuffix(new FPNumber('1500'))).toEqual({
      amount: '1.5',
      suffix: 'K',
    });
  });
});

describe('isAmountValueIntegerOnly', () => {
  it('treats values without a significant fractional part as integers', () => {
    expect(isAmountValueIntegerOnly('12,880.0')).toBe(true);
    expect(isAmountValueIntegerOnly('0.00')).toBe(true);
    expect(isAmountValueIntegerOnly('0')).toBe(true);
  });

  it('keeps decimal rendering when the fraction is significant', () => {
    expect(isAmountValueIntegerOnly('42,992,564.61')).toBe(false);
    expect(isAmountValueIntegerOnly('0.00001')).toBe(false);
  });
});
