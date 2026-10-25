import { describe, expect, it } from 'vitest';

import { Consts, PriceVariant } from '@/lib/substrate/liquidity-proxy/consts';
import { getAveragePrice } from '@/lib/substrate/liquidity-proxy/pallets/priceTools';

const codec = (value: number) => `${value}000000000000000000`;

const payload = {
  prices: {
    assetA: {
      [PriceVariant.Buy]: codec(5),
      [PriceVariant.Sell]: codec(4),
    },
    assetB: {
      [PriceVariant.Buy]: codec(3),
      [PriceVariant.Sell]: codec(2),
    },
  },
} as any;

describe('price tools', () => {
  it('returns one when both sides are the same asset', () => {
    expect(getAveragePrice('assetA', 'assetA', PriceVariant.Buy, payload).toString()).toBe('1');
  });

  it('returns direct XOR-denominated prices', () => {
    expect(getAveragePrice(Consts.XOR, 'assetA', PriceVariant.Buy, payload).toString()).toBe('5');
  });

  it('inverts the opposite variant when converting an asset back to XOR', () => {
    expect(getAveragePrice('assetA', Consts.XOR, PriceVariant.Buy, payload).toString()).toBe('0.25');
    expect(getAveragePrice('assetA', Consts.XOR, PriceVariant.Sell, payload).toString()).toBe('0.2');
  });

  it('composes non-XOR pair prices through XOR', () => {
    expect(getAveragePrice('assetA', 'assetB', PriceVariant.Buy, payload).toString()).toBe('0.75');
  });
});
