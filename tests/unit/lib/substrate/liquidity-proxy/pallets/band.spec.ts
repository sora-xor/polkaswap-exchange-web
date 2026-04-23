import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bandQuote, bandQuoteUnchecked } from '@/lib/substrate/liquidity-proxy/pallets/band';

const createPayload = (lastUpdated: number, stalePeriod = 20_000) =>
  ({
    rates: {
      ETH: {
        value: '1000000000000000000',
        lastUpdated,
        dynamicFee: '0',
      },
    },
    consts: {
      band: {
        rateStalePeriod: stalePeriod,
      },
    },
  }) as any;

describe('band pallet helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(100_000));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a fresh rate and supports unchecked lookups', () => {
    const payload = createPayload(90);

    expect(bandQuote('ETH', payload)).toBe(payload.rates.ETH);
    expect(bandQuoteUnchecked('ETH', payload)).toBe(payload.rates.ETH);
  });

  it('rejects missing, future, and expired rates', () => {
    expect(() => bandQuote('DAI', createPayload(90))).toThrow('Rate not exists');
    expect(() => bandQuote('ETH', createPayload(101))).toThrow('Rate has invalid timestamp');
    expect(() => bandQuote('ETH', createPayload(70))).toThrow("Rate is expired and can't be used");
  });
});
