import { describe, expect, it } from 'vitest';

import { MarketAlgorithms } from '@/consts';
import {
  resolveCurrentMarketAlgorithm,
  resolveMarketAlgorithms,
} from '@/features/swap/components/settings/MarketAlgorithm/utils';

describe('swap market algorithm helpers', () => {
  it('falls back to SMART when no algorithms are available', () => {
    expect(resolveMarketAlgorithms([])).toEqual([MarketAlgorithms.SMART]);
  });

  it('keeps provided algorithms when available', () => {
    expect(resolveMarketAlgorithms([MarketAlgorithms.TBC, MarketAlgorithms.XYK])).toEqual([
      MarketAlgorithms.TBC,
      MarketAlgorithms.XYK,
    ]);
  });

  it('returns SMART when market algorithms are unavailable', () => {
    expect(resolveCurrentMarketAlgorithm(false, MarketAlgorithms.XYK, [MarketAlgorithms.XYK])).toBe(
      MarketAlgorithms.SMART
    );
  });

  it('returns SMART when selected algorithm is missing from available list', () => {
    expect(resolveCurrentMarketAlgorithm(true, MarketAlgorithms.XYK, [MarketAlgorithms.SMART])).toBe(
      MarketAlgorithms.SMART
    );
  });

  it('keeps selected algorithm when it is available', () => {
    expect(
      resolveCurrentMarketAlgorithm(true, MarketAlgorithms.TBC, [MarketAlgorithms.SMART, MarketAlgorithms.TBC])
    ).toBe(MarketAlgorithms.TBC);
  });
});
