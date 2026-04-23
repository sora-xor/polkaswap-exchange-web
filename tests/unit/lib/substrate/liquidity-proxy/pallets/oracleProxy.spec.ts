import { describe, expect, it, vi } from 'vitest';

const bandMocks = vi.hoisted(() => ({
  quote: vi.fn(),
  unchecked: vi.fn(),
}));

vi.mock('@/lib/substrate/liquidity-proxy/pallets/band', () => ({
  bandQuote: bandMocks.quote,
  bandQuoteUnchecked: bandMocks.unchecked,
}));

import {
  oracleProxyQuote,
  oracleProxyQuoteUnchecked,
} from '@/lib/substrate/liquidity-proxy/pallets/oracleProxy';

describe('oracle proxy pallet helpers', () => {
  it('delegates checked and unchecked quotes to the Band pallet helpers', () => {
    const payload = { rates: {} } as any;
    const rate = { value: '1', lastUpdated: 1, dynamicFee: '0' };
    const uncheckedRate = { value: '2', lastUpdated: 2, dynamicFee: '0' };

    bandMocks.quote.mockReturnValue(rate);
    bandMocks.unchecked.mockReturnValue(uncheckedRate);

    expect(oracleProxyQuote('ETH', payload)).toBe(rate);
    expect(oracleProxyQuoteUnchecked('ETH', payload)).toBe(uncheckedRate);
    expect(bandMocks.quote).toHaveBeenCalledWith('ETH', payload);
    expect(bandMocks.unchecked).toHaveBeenCalledWith('ETH', payload);
  });
});
