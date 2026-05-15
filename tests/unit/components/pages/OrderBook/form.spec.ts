import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/sdk';
import { describe, expect, it } from 'vitest';

import {
  calculateOrderBookSliderAmount,
  calculateOrderBookSliderPercent,
  doesOrderBookPriceExceedSpread,
  formatOrderBookInputValue,
  isOrderBookAmountOutOfBounds,
  isOrderBookPriceUnique,
} from '@/features/misc/components/order-book/form';

import type { OrderBook, OrderBookPriceVolume } from '@sora-substrate/liquidity-proxy';

const priceVolume = (price: string): OrderBookPriceVolume =>
  [new FPNumber(price), FPNumber.ONE] as OrderBookPriceVolume;

const orderBook = {
  minLotSize: new FPNumber('1'),
  maxLotSize: new FPNumber('10'),
  stepLotSize: new FPNumber('0.5'),
} as OrderBook;

describe('order-book form helpers', () => {
  it('formats input values to the configured precision', () => {
    expect(formatOrderBookInputValue('', 2)).toBe('');
    expect(formatOrderBookInputValue('10.', 2)).toBe('10.');
    expect(formatOrderBookInputValue('10.', 0)).toBe('10');
    expect(formatOrderBookInputValue('10.123', 2)).toBe('10.12');
    expect(formatOrderBookInputValue('10.12', 2)).toBe('10.12');
  });

  it('converts between slider percentage and order amount', () => {
    expect(calculateOrderBookSliderPercent('5', new FPNumber('20'))).toBe(25);
    expect(calculateOrderBookSliderPercent('', new FPNumber('20'))).toBe(0);
    expect(calculateOrderBookSliderAmount('25', new FPNumber('20'), 2).toString()).toBe('5');
  });

  it('detects whether a stated price is unique on an order-book side', () => {
    const prices = [priceVolume('1'), priceVolume('2')];

    expect(isOrderBookPriceUnique(prices, '1')).toBe(false);
    expect(isOrderBookPriceUnique(prices, '3')).toBe(true);
  });

  it('detects spread-crossing prices for buy and sell sides', () => {
    const asks = [priceVolume('11'), priceVolume('10')];
    const bids = [priceVolume('9'), priceVolume('8')];

    expect(
      doesOrderBookPriceExceedSpread({
        asks,
        bids,
        quoteValue: '10',
        side: PriceVariant.Buy,
      })
    ).toBe(true);
    expect(
      doesOrderBookPriceExceedSpread({
        asks,
        bids,
        quoteValue: '9',
        side: PriceVariant.Sell,
      })
    ).toBe(true);
    expect(
      doesOrderBookPriceExceedSpread({
        asks,
        bids,
        quoteValue: '9.5',
        side: PriceVariant.Buy,
      })
    ).toBe(false);
  });

  it('validates order amount bounds and step size', () => {
    expect(isOrderBookAmountOutOfBounds(null, '5')).toBe(false);
    expect(isOrderBookAmountOutOfBounds(orderBook, '0.5')).toBe(true);
    expect(isOrderBookAmountOutOfBounds(orderBook, '10.5')).toBe(true);
    expect(isOrderBookAmountOutOfBounds(orderBook, '1.25')).toBe(true);
    expect(isOrderBookAmountOutOfBounds(orderBook, '5')).toBe(false);
  });
});
