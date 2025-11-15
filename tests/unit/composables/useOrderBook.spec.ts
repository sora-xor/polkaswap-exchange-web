import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/sdk';
import { nextTick, reactive } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LimitOrderType } from '@/consts';
import type { AsyncFnWithoutArgs, Nullable } from '@/types/common';

import type { OrderBookComposable } from '@/composables/useOrderBook';
import type { OrderBookPriceVolumeAggregated } from '@/composables/useOrderBook.utils';
import type { OrderBookDealData } from '@/types/orderBook';

vi.mock('dayjs/esm', () => ({
  default: (value: number) => ({
    format: (pattern: string) => `formatted-${value}-${pattern}`,
  }),
}));

type StoreStub = {
  state: {
    orderBook: {
      limitOrderType: LimitOrderType;
      asks: OrderBookPriceVolumeAggregated[];
      bids: OrderBookPriceVolumeAggregated[];
      deals: OrderBookDealData[];
    };
    wallet: {
      account: {
        fiatPriceObject: Record<string, string>;
      };
      settings: {
        exchangeRate: number;
        currencySymbol: string;
      };
    };
  };
  getters: {
    orderBook: {
      baseAsset: Nullable<{ address: string; symbol: string; decimals: number }>;
      quoteAsset: Nullable<{ address: string; symbol: string; decimals: number }>;
      currentOrderBook: { tickSize: number; stepLotSize: number };
      orderBookLastDeal: Nullable<OrderBookDealData>;
      orderBookId: string;
    };
    wallet: {
      settings: {
        exchangeRate: number;
        currencySymbol: string;
      };
    };
    settings: {
      nodeIsConnected: boolean;
    };
  };
  commit: {
    orderBook: {
      setSide: ReturnType<typeof vi.fn>;
      setQuoteValue: ReturnType<typeof vi.fn>;
    };
  };
  dispatch: {
    orderBook: {
      subscribeToBidsAndAsks: ReturnType<typeof vi.fn>;
      unsubscribeFromBidsAndAsks: ReturnType<typeof vi.fn>;
    };
  };
};

const createStoreStub = (): StoreStub => {
  const orderBookState = reactive({
    limitOrderType: LimitOrderType.limit,
    asks: [] as OrderBookPriceVolumeAggregated[],
    bids: [] as OrderBookPriceVolumeAggregated[],
    deals: [] as OrderBookDealData[],
  });

  const currentOrderBook = reactive({
    tickSize: 0.01,
    stepLotSize: 0.001,
  });

  const quoteAsset = reactive({
    address: 'quote',
    symbol: 'USD',
    decimals: 18,
  });

  const baseAsset = reactive({
    address: 'base',
    symbol: 'XOR',
    decimals: 18,
  });

  const orderBookLastDeal = reactive({
    price: new FPNumber(10),
    side: PriceVariant.Buy,
  });

  return {
    state: reactive({
      orderBook: orderBookState,
      wallet: {
        account: {
          fiatPriceObject: reactive({ quote: '1000000000000000000' }),
        },
        settings: reactive({
          exchangeRate: 2,
          currencySymbol: '$',
        }),
      },
    }),
    getters: {
      orderBook: reactive({
        baseAsset,
        quoteAsset,
        currentOrderBook,
        orderBookLastDeal,
        orderBookId: 'book-1',
      }),
      wallet: reactive({
        settings: reactive({
          exchangeRate: 2,
          currencySymbol: '$',
        }),
      }),
      settings: reactive({
        nodeIsConnected: true,
      }),
    },
    commit: {
      orderBook: {
        setSide: vi.fn(),
        setQuoteValue: vi.fn(),
      },
    },
    dispatch: {
      orderBook: {
        subscribeToBidsAndAsks: vi.fn(async () => undefined),
        unsubscribeFromBidsAndAsks: vi.fn(async () => undefined),
      },
    },
  };
};

describe('useOrderBook', () => {
  let storeStub: StoreStub;
  let useOrderBook: () => OrderBookComposable;

  beforeEach(async () => {
    storeStub = createStoreStub();
    vi.doMock('@/store', () => ({
      default: storeStub,
    }));

    const module = await import('@/composables/useOrderBook');
    useOrderBook = module.useOrderBook;
  });

  afterEach(() => {
    vi.doUnmock('@/store');
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

    storeStub.state.orderBook.asks = asks;
    storeStub.state.orderBook.bids = bids;
    storeStub.state.orderBook.deals = [
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
    expect(orderBook.sellMarginStyle.value).toContain('height: 216px');

    const trades = orderBook.completedOrders.value;
    expect(trades).toHaveLength(2);
    expect(trades[0].time).toBe('formatted-10-M/DD HH:mm:ss');
    expect(trades[0].amount).toContain('XOR');
    expect(trades[0].price).toContain('USD');
    expect(trades[0].isBuy).toBe(true);
    expect(trades[1].isBuy).toBe(false);
  });

  it('fills price via store mutations for limit orders', async () => {
    const orderBook = useOrderBook();
    await nextTick();

    orderBook.fillPrice('12.34', PriceVariant.Buy);

    expect(storeStub.commit.orderBook.setSide).toHaveBeenCalledWith(PriceVariant.Buy);
    expect(storeStub.commit.orderBook.setQuoteValue).toHaveBeenCalledWith('12.34');
  });

  it('installs subscriptions with loader wrappers', async () => {
    const orderBook = useOrderBook();
    const withLoading = vi.fn(async (handler: AsyncFnWithoutArgs) => handler());
    const withParentLoading = vi.fn(async (handler: AsyncFnWithoutArgs) => handler());

    const stop = orderBook.watchOrderBookSubscription({ withLoading, withParentLoading });
    await nextTick();

    expect(withLoading).toHaveBeenCalled();
    expect(withParentLoading).toHaveBeenCalled();
    expect(storeStub.dispatch.orderBook.subscribeToBidsAndAsks).toHaveBeenCalled();

    stop();
  });

  it('updates selected step when order book precision changes', async () => {
    const orderBook = useOrderBook();
    await nextTick();
    expect(orderBook.selectedStep.value).toBe('0.01');

    (storeStub.getters.orderBook.currentOrderBook as { tickSize: number }).tickSize = 0.02;
    await nextTick();

    expect(orderBook.selectedStep.value).toBe('0.02');
  });

  it('exposes unsubscribe helper for order book stream', async () => {
    const orderBook = useOrderBook();
    await orderBook.unsubscribeFromOrderBook();

    expect(storeStub.dispatch.orderBook.unsubscribeFromBidsAndAsks).toHaveBeenCalled();
  });
});
