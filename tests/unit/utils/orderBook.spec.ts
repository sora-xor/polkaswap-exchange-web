import type { OrderBook } from '@sora-substrate/liquidity-proxy';
import { describe, expect, it } from 'vitest';

import {
  getBookDecimals,
  MAX_ORDERS_PER_SIDE,
  MAX_ORDERS_PER_SINGLE_PRICE,
  MAX_ORDERS_PER_USER,
} from '@/utils/orderBook';

const createOrderBook = (stepLotSize: string): OrderBook =>
  ({
    stepLotSize: {
      toString: () => stepLotSize,
    },
  }) as unknown as OrderBook;

describe('orderBook utility', () => {
  it('exposes protocol order limits', () => {
    expect(MAX_ORDERS_PER_SIDE).toBe(1024);
    expect(MAX_ORDERS_PER_USER).toBe(1024);
    expect(MAX_ORDERS_PER_SINGLE_PRICE).toBe(1024);
  });

  it('falls back to two decimals when order book data is missing or integer-sized', () => {
    expect(getBookDecimals(null)).toBe(2);
    expect(getBookDecimals(createOrderBook('1'))).toBe(2);
  });

  it('derives decimals from the string representation of step lot size', () => {
    expect(getBookDecimals(createOrderBook('0.01'))).toBe(2);
    expect(getBookDecimals(createOrderBook('0.000001'))).toBe(6);
    expect(getBookDecimals(createOrderBook('10.0100'))).toBe(4);
  });
});
