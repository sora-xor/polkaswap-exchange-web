import { FPNumber } from '@sora-substrate/sdk';
import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { describe, expect, it, vi } from 'vitest';

import { LimitOrderType } from '@/consts';
import {
  createFillPriceHandler,
  formatOrderRows,
  runOrderBookSubscription,
  type OrderBookPriceVolumeAggregated,
} from '@/features/misc/components/order-book/bookWidget.utils';

const createRow = (price: string, amount: string): OrderBookPriceVolumeAggregated => {
  const priceFp = new FPNumber(price);
  const amountFp = new FPNumber(amount);
  return [priceFp, amountFp, priceFp.mul(amountFp)];
};

describe('bookWidget.utils', () => {
  it('formats price, amount and filled percentage using tick precision', () => {
    const rows = [createRow('10', '2'), createRow('11.5', '1')];

    const result = formatOrderRows({
      orders: rows,
      tickSize: 0.01,
      stepLotSize: 0.001,
      selectedStep: '0.01',
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ price: '10.00', amount: '2.000', total: '20.00', filled: 100 });
    expect(result[1]).toMatchObject({ price: '11.50', amount: '1.000', total: '11.50', filled: 50 });
  });

  it('uses aggregated totals when step differs from tick size and filters zero amounts', () => {
    const aggregated: OrderBookPriceVolumeAggregated = [
      new FPNumber('1.01'),
      new FPNumber('2.500'),
      new FPNumber('123.456789'),
    ];

    const rows: OrderBookPriceVolumeAggregated[] = [[new FPNumber('0.99'), FPNumber.ZERO, FPNumber.ZERO], aggregated];

    const result = formatOrderRows({
      orders: rows,
      tickSize: 0.01,
      stepLotSize: 0.001,
      selectedStep: '0.1',
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      price: '1.01',
      amount: '2.500',
      total: '123.46',
      filled: 100,
    });
  });

  it('skips formatting when step is not provided', () => {
    const rows = [createRow('10', '2')];
    const result = formatOrderRows({ orders: rows, tickSize: 0.01, stepLotSize: 0.001, selectedStep: '' });

    expect(result).toEqual([]);
  });

  it('returns zero filled percentage when maximum volume is zero', () => {
    const rows: OrderBookPriceVolumeAggregated[] = [[new FPNumber('3.25'), FPNumber.ZERO, FPNumber.ZERO]];

    const result = formatOrderRows({
      orders: rows,
      tickSize: 0.01,
      stepLotSize: 0.001,
      selectedStep: '0.01',
    });

    expect(result).toHaveLength(0);
  });

  it('creates a fill-price handler that respects order type', () => {
    const setSide = vi.fn();
    const setQuoteValue = vi.fn();

    const limitHandler = createFillPriceHandler(LimitOrderType.limit, { setSide, setQuoteValue });
    limitHandler('12.5', PriceVariant.Buy);

    expect(setSide).toHaveBeenCalledWith(PriceVariant.Buy);
    expect(setQuoteValue).toHaveBeenCalledWith('12.5');

    setSide.mockClear();
    setQuoteValue.mockClear();

    const marketHandler = createFillPriceHandler(LimitOrderType.market, { setSide, setQuoteValue });
    marketHandler('15', PriceVariant.Sell);

    expect(setSide).not.toHaveBeenCalled();
    expect(setQuoteValue).not.toHaveBeenCalled();
  });

  it('normalises filled price values before calling store mutations', () => {
    const setSide = vi.fn();
    const setQuoteValue = vi.fn();

    const handler = createFillPriceHandler(LimitOrderType.limit, { setSide, setQuoteValue });
    handler('12.5000', PriceVariant.Buy);

    expect(setSide).toHaveBeenCalledWith(PriceVariant.Buy);
    expect(setQuoteValue).toHaveBeenCalledWith('12.5');
  });

  it('wraps subscriptions with widget and parent loaders', async () => {
    const subscribe = vi.fn(async () => undefined);
    const withParentLoading = vi.fn(async (handler) => {
      await handler();
    });
    const withLoading = vi.fn(async (handler) => {
      await handler();
    });

    await runOrderBookSubscription({
      withLoading,
      withParentLoading,
      subscribe,
    });

    expect(withLoading).toHaveBeenCalledTimes(1);
    expect(withParentLoading).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledTimes(1);
  });

  it('propagates subscription errors after executing loading wrappers', async () => {
    const subscribeError = new Error('boom');
    const subscribe = vi.fn(async () => {
      throw subscribeError;
    });
    const withParentLoading = vi.fn(async (handler) => {
      await handler();
    });
    const withLoading = vi.fn(async (handler) => {
      await handler();
    });

    await expect(
      runOrderBookSubscription({
        withLoading,
        withParentLoading,
        subscribe,
      })
    ).rejects.toThrow(subscribeError);

    expect(withLoading).toHaveBeenCalledTimes(1);
    expect(withParentLoading).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledTimes(1);
  });
});
