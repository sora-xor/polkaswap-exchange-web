import { describe, expect, it } from 'vitest';

import { getFiatPriceByAddress } from '@/utils/fiatPrice';

describe('getFiatPriceByAddress', () => {
  it('reads exact and lowercase asset address matches', () => {
    const prices = {
      exact: '100',
      '0xabc': '200',
    };

    expect(getFiatPriceByAddress(prices, 'exact')).toBe('100');
    expect(getFiatPriceByAddress(prices, '0xABC')).toBe('200');
  });

  it('returns null when address or price data is unavailable', () => {
    expect(getFiatPriceByAddress(null, 'asset')).toBeNull();
    expect(getFiatPriceByAddress({}, null)).toBeNull();
    expect(getFiatPriceByAddress({}, 'asset')).toBeNull();
  });
});
