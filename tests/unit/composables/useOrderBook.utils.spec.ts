import { describe, expect, it, vi } from 'vitest';

import { FPNumber } from '@sora-substrate/sdk';
import { PriceVariant } from '@sora-substrate/liquidity-proxy';

import { LimitOrderType } from '@/consts';
import {
  createFillPriceHandler,
  formatOrderRows,
  runOrderBookSubscription,
  type OrderBookPriceVolumeAggregated,
} from '@/composables/useOrderBook.utils';

describe('useOrderBook.utils', () => {
  describe('formatOrderRows', () => {
    it('normalises order book entries using tick/lot precision', () => {
      const rows = formatOrderRows({
        orders: [
          [new FPNumber(10), new FPNumber(2), new FPNumber(20)],
          [new FPNumber(11), new FPNumber(1), new FPNumber(31)],
        ] as unknown as OrderBookPriceVolumeAggregated[],
        tickSize: 0.01,
        stepLotSize: 0.001,
        selectedStep: '0.01',
      });

      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        price: '10.00',
        amount: '2.000',
        total: '20.00',
        filled: 100,
      });
      expect(rows[1]).toMatchObject({
        price: '11.00',
        amount: '1.000',
        total: '11.00',
        filled: 50,
      });
    });

    it('falls back to aggregated totals when the selected step differs from tick size', () => {
      const rows = formatOrderRows({
        orders: [
          [new FPNumber(10.5), new FPNumber(3), new FPNumber(45)],
          [new FPNumber(9.5), new FPNumber(1.1), new FPNumber(55)],
        ] as unknown as OrderBookPriceVolumeAggregated[],
        tickSize: 0.01,
        stepLotSize: 0.001,
        selectedStep: '0.001',
      });

      expect(rows[0].total).toBe('45.00');
      expect(rows[1].total).toBe('55.00');
    });

    it('omits rows with zero amounts', () => {
      const rows = formatOrderRows({
        orders: [
          [new FPNumber(10), new FPNumber(0), new FPNumber(0)],
          [new FPNumber(11), new FPNumber(1), new FPNumber(11)],
        ] as unknown as OrderBookPriceVolumeAggregated[],
        tickSize: 0.01,
        stepLotSize: 0.001,
        selectedStep: '0.01',
      });

      expect(rows).toHaveLength(1);
      expect(rows[0].price).toBe('11.00');
    });
  });

  describe('createFillPriceHandler', () => {
    it('updates store callbacks for limit orders', () => {
      const setSide = vi.fn();
      const setQuoteValue = vi.fn();
      const handler = createFillPriceHandler(LimitOrderType.limit, { setSide, setQuoteValue });

      handler('12.34', PriceVariant.Buy);

      expect(setSide).toHaveBeenCalledWith(PriceVariant.Buy);
      expect(setQuoteValue).toHaveBeenCalledWith('12.34');
    });

    it('ignores clicks for market orders', () => {
      const setSide = vi.fn();
      const setQuoteValue = vi.fn();
      const handler = createFillPriceHandler(LimitOrderType.market, { setSide, setQuoteValue });

      handler('99.99', PriceVariant.Sell);

      expect(setSide).not.toHaveBeenCalled();
      expect(setQuoteValue).not.toHaveBeenCalled();
    });
  });

  describe('runOrderBookSubscription', () => {
    it('wraps the order book subscribe call with loader hooks', async () => {
      const calls: string[] = [];
      const withLoading = vi.fn(async (handler: () => Promise<void>) => {
        calls.push('widget-loading');
        await handler();
      });
      const withParentLoading = vi.fn(async (handler: () => Promise<void>) => {
        calls.push('parent-loading');
        await handler();
      });
      const subscribe = vi.fn(async () => {
        calls.push('subscribe');
      });

      await runOrderBookSubscription({ withLoading, withParentLoading, subscribe });

      expect(withLoading).toHaveBeenCalledTimes(1);
      expect(withParentLoading).toHaveBeenCalledTimes(1);
      expect(subscribe).toHaveBeenCalledTimes(1);
      expect(calls).toEqual(['widget-loading', 'parent-loading', 'subscribe']);
    });
  });
});
