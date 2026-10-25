import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/sdk';
import { nextTick, reactive } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LimitOrderType } from '@/consts';
import type { AsyncFnWithoutArgs } from '@/types/common';

import type { OrderBookComposable } from '@/composables/useOrderBook';
import type { OrderBookPriceVolumeAggregated } from '@/composables/useOrderBook.utils';
import type { OrderBookDealData } from '@/types/orderBook';

const formattedAmountMock = vi.hoisted(() => vi.fn(() => '10'));

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    getFiatAmount: formattedAmountMock,
  }),
}));

vi.mock('dayjs/esm', () => ({
  default: (value: number) => ({
    format: (pattern: string) => `formatted-${value}-${pattern}`,
  }),
}));

const createOrderBookStoreStub = () =>
  reactive({
    orderBookId: 'book-1',
    dexId: 'dex-1',
    baseValue: '',
    quoteValue: '',
    amountSliderValue: 0,
    limitOrderType: LimitOrderType.limit,
    asks: [] as OrderBookPriceVolumeAggregated[],
    bids: [] as OrderBookPriceVolumeAggregated[],
    deals: [] as OrderBookDealData[],
    side: PriceVariant.Buy,
    baseAssetAddress: 'base',
    quoteAssetAddress: 'quote',
    baseAsset: {
      address: 'base',
      symbol: 'XOR',
      decimals: 18,
    },
    quoteAsset: {
      address: 'quote',
      symbol: 'USD',
      decimals: 18,
    },
    currentOrderBook: {
      tickSize: 0.01,
      stepLotSize: 0.001,
    },
    lastDeal: {
      price: new FPNumber(10),
      side: PriceVariant.Buy,
    } as OrderBookDealData,
    orderBookStats: null,
    subscribeToBidsAndAsks: vi.fn(async () => undefined),
    unsubscribeFromBidsAndAsks: vi.fn(async () => undefined),
    setBaseValue: vi.fn(),
    setQuoteValue: vi.fn(),
    setAmountSliderValue: vi.fn(),
    setLimitOrderType: vi.fn(),
    setSide: vi.fn(),
  });

const orderBookStoreStub = createOrderBookStoreStub();
const settingsStoreStub = reactive({
  nodeIsConnected: true,
  exchangeRate: 2,
  currencySymbol: '$',
});

vi.mock('@/stores/orderBook', () => ({
  useOrderBookStore: () => orderBookStoreStub,
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreStub,
}));

describe('useOrderBook', () => {
  let useOrderBook: () => OrderBookComposable;

  beforeEach(async () => {
    orderBookStoreStub.asks = [];
    orderBookStoreStub.bids = [];
    orderBookStoreStub.deals = [];
    orderBookStoreStub.limitOrderType = LimitOrderType.limit;
    orderBookStoreStub.side = PriceVariant.Buy;
    orderBookStoreStub.lastDeal = {
      price: new FPNumber(10),
      side: PriceVariant.Buy,
    } as OrderBookDealData;
    settingsStoreStub.nodeIsConnected = true;
    settingsStoreStub.exchangeRate = 2;
    settingsStoreStub.currencySymbol = '$';
    vi.clearAllMocks();

    const module = await import('@/composables/useOrderBook');
    useOrderBook = module.useOrderBook;
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('formats orders and exposes derived metrics', async () => {
    const asks = [
      [new FPNumber(10), new FPNumber(1), new FPNumber(10)],
      [new FPNumber(11), new FPNumber(2), new FPNumber(32)],
    ] as unknown as OrderBookPriceVolumeAggregated[];
    const bids = [
      [new FPNumber(9), new FPNumber(1.5), new FPNumber(13.5)],
      [new FPNumber(8.5), new FPNumber(0.5), new FPNumber(13.75)],
    ] as unknown as OrderBookPriceVolumeAggregated[];

    orderBookStoreStub.asks = asks;
    orderBookStoreStub.bids = bids;
    orderBookStoreStub.deals = [
      {
        timestamp: 10,
        amount: new FPNumber(1),
        price: new FPNumber(2),
        side: PriceVariant.Buy,
      } as unknown as OrderBookDealData,
      {
        timestamp: 20,
        amount: new FPNumber(3),
        price: new FPNumber(4),
        side: PriceVariant.Sell,
      } as unknown as OrderBookDealData,
    ];

    const orderBook = useOrderBook();
    await nextTick();

    expect(orderBook.selectedStep.value).toBe('0.01');
    expect(orderBook.asksFormatted.value[0].price).toBe('10.00');
    expect(orderBook.sellOrders.value).toHaveLength(2);
    expect(orderBook.buyOrders.value).toHaveLength(2);
    expect(orderBook.lastPriceFormatted.value).toBe('10');
    expect(orderBook.fiatValue.value).toBe('$20');
  });

  it('handles limit order type toggling', async () => {
    orderBookStoreStub.limitOrderType = LimitOrderType.market;

    const orderBook = useOrderBook();
    await nextTick();

    expect(orderBook.isMarketOrder.value).toBe(true);
  });

  it('subscribes and unsubscribes from order book feeds', async () => {
    const orderBook = useOrderBook();

    await orderBook.subscribeToOrderBook();
    expect(orderBookStoreStub.subscribeToBidsAndAsks).toHaveBeenCalled();

    await orderBook.unsubscribeFromOrderBook();
    expect(orderBookStoreStub.unsubscribeFromBidsAndAsks).toHaveBeenCalled();
  });

  it('fills price using the helper handler', async () => {
    const orderBook = useOrderBook();

    orderBook.fillPrice('1.23', PriceVariant.Buy);
    expect(orderBookStoreStub.setSide).toHaveBeenCalledWith(PriceVariant.Buy);
    expect(orderBookStoreStub.setQuoteValue).toHaveBeenCalledWith('1.23');
  });

  it('watches order book id and node connectivity to resubscribe', async () => {
    const subscribeSpy = vi
      .spyOn(orderBookStoreStub, 'subscribeToBidsAndAsks')
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    const unsubscribeSpy = vi.spyOn(orderBookStoreStub, 'unsubscribeFromBidsAndAsks').mockResolvedValue(undefined);

    const composable = useOrderBook();
    const stop = composable.watchOrderBookSubscription();
    await nextTick();

    expect(subscribeSpy).toHaveBeenCalledTimes(1);
    expect(unsubscribeSpy).not.toHaveBeenCalled();

    settingsStoreStub.nodeIsConnected = false;
    await nextTick();
    expect(unsubscribeSpy).toHaveBeenCalledTimes(1);

    orderBookStoreStub.orderBookId = '';
    settingsStoreStub.nodeIsConnected = true;
    await nextTick();
    expect(subscribeSpy).toHaveBeenCalledTimes(1);

    orderBookStoreStub.orderBookId = 'book-1';
    await nextTick();
    expect(subscribeSpy).toHaveBeenCalledTimes(2);

    stop?.();
  });

  it('exposes subscription helpers that respect loader callbacks', async () => {
    const orderBook = useOrderBook();
    const loaderSpy = vi.fn(async (handler: AsyncFnWithoutArgs) => {
      await handler();
    });

    await orderBook.subscribeToOrderBook({ withLoading: loaderSpy });
    expect(loaderSpy).toHaveBeenCalled();
  });
});
