import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const stopSubscriptionMock = vi.fn();
const unsubscribeMock = vi.fn();
const setSelectedStepMock = vi.fn();
const fillPriceMock = vi.fn();

const usePiniaTelemetryMock = vi.fn();
const orderBookStoreStub = { $id: 'order-book-store' };
const orderBookComposableState = {
  asksFormatted: [] as unknown[],
  bidsFormatted: [] as unknown[],
  sellOrders: [] as Array<{ price: string; amount: string; total: string; filled: number }>,
  buyOrders: [] as Array<{ price: string; amount: string; total: string; filled: number }>,
  lastPriceFormatted: '0.10',
  fiatValue: '$10',
};

vi.mock('@/composables/usePiniaTelemetry', () => ({
  usePiniaTelemetry: (...args: unknown[]) => usePiniaTelemetryMock(...args),
}));

vi.mock('@/stores/orderBook', () => ({
  useOrderBookStore: () => orderBookStoreStub,
}));

vi.mock('@/composables/useOrderBook', () => ({
  useOrderBook: () => ({
    orderBookId: { value: 'orderbook-1' },
    baseAsset: { value: { symbol: 'AAA' } },
    quoteAsset: { value: { symbol: 'BBB' } },
    asksFormatted: orderBookComposableState.asksFormatted,
    bidsFormatted: orderBookComposableState.bidsFormatted,
    sellOrders: orderBookComposableState.sellOrders,
    buyOrders: orderBookComposableState.buyOrders,
    sellMarginStyle: () => ({}),
    barStyle: () => ({}),
    showAggregationOptions: false,
    isMarketOrder: false,
    steps: [],
    selectedStep: { value: '0.1' },
    setSelectedStep: setSelectedStepMock,
    lastDealTrendsUp: false,
    trendIcon: 'trend-up',
    trendClass: 'stock-book-delimiter',
    lastPriceFormatted: orderBookComposableState.lastPriceFormatted,
    fiatValue: orderBookComposableState.fiatValue,
    fillPrice: fillPriceMock,
    watchOrderBookSubscription: () => stopSubscriptionMock,
    unsubscribeFromOrderBook: unsubscribeMock,
    PriceVariant: { Buy: 'Buy', Sell: 'Sell' },
  }),
}));

vi.mock('@/composables/useLoading', () => ({
  useLoading: () => ({
    loading: { value: false },
    withLoading: async (cb: () => Promise<void> | void) => {
      await cb();
    },
    withParentLoading: async (cb: () => Promise<void> | void) => {
      await cb();
    },
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/router', () => ({
  lazyComponent: () => ({
    template: '<div class="lazy-component-stub"><slot /><slot name="filters" /></div>',
  }),
}));

describe('BookWidget.vue', () => {
  beforeEach(() => {
    orderBookComposableState.asksFormatted = [];
    orderBookComposableState.bidsFormatted = [];
    orderBookComposableState.sellOrders = [];
    orderBookComposableState.buyOrders = [];
    orderBookComposableState.lastPriceFormatted = '0.10';
    orderBookComposableState.fiatValue = '$10';
  });

  it('registers telemetry for legacy usage', async () => {
    usePiniaTelemetryMock.mockClear();

    const module = await import('@/components/pages/OrderBook/BookWidget.vue');
    const wrapper = mount(module.default, {
      global: {
        stubs: {
          'base-widget': { template: '<div><slot name="filters" /><slot /></div>' },
          's-dropdown': { template: '<div><slot /><slot name="menu" /></div>' },
          's-dropdown-item': { template: '<div><slot /></div>' },
          's-icon': { template: '<i><slot /></i>' },
        },
        directives: {
          button: {
            mounted() {},
          },
          loading: {
            mounted() {},
            updated() {},
          },
        },
      },
    });

    expect(usePiniaTelemetryMock).toHaveBeenCalledTimes(1);
    const [, targets, options] = usePiniaTelemetryMock.mock.calls[0];
    expect(targets).toEqual([{ store: orderBookStoreStub, storeId: 'orderBook' }]);
    expect(options?.metadata?.()).toEqual({
      widget: 'book',
      orderBookId: 'orderbook-1',
      baseAsset: 'AAA',
      quoteAsset: 'BBB',
    });

    wrapper.unmount();
  });

  it('keeps full values in title attributes for clipped long order-book numbers', async () => {
    orderBookComposableState.asksFormatted = [{ price: '5,000,000,000,000' }];
    orderBookComposableState.bidsFormatted = [{ price: '5,000,000,000,000' }];
    orderBookComposableState.sellOrders = [
      {
        price: '5,000,000,000,000',
        amount: '5,000,000,000,000',
        total: '23,364,485,051,464.178875',
        filled: 100,
      },
    ];
    orderBookComposableState.buyOrders = [
      {
        price: '5,000,000,000,000',
        amount: '5,000,000,000,000',
        total: '23,364,485,051,464.178875',
        filled: 100,
      },
    ];
    orderBookComposableState.lastPriceFormatted = '5,000,000,000,000';
    orderBookComposableState.fiatValue = '$23,364,485,051,464.178875';

    const module = await import('@/components/pages/OrderBook/BookWidget.vue');
    const wrapper = mount(module.default, {
      global: {
        stubs: {
          'base-widget': { template: '<div><slot name="filters" /><slot /></div>' },
          's-dropdown': { template: '<div><slot /><slot name="menu" /></div>' },
          's-dropdown-item': { template: '<div><slot /></div>' },
          's-icon': { template: '<i><slot /></i>' },
        },
        directives: {
          button: {
            mounted() {},
          },
          loading: {
            mounted() {},
            updated() {},
          },
        },
      },
    });

    expect(wrapper.find('.stock-book-sell .order-info.total').attributes('title')).toBe('23,364,485,051,464.178875');
    expect(wrapper.find('.stock-book-sell .order-info.amount').attributes('title')).toBe('5,000,000,000,000');
    expect(wrapper.find('.stock-book-sell .order-info.price').attributes('title')).toBe('5,000,000,000,000');
    expect(wrapper.find('.stock-book-delimiter .mark-price').attributes('title')).toBe('5,000,000,000,000');
    expect(wrapper.find('.stock-book-delimiter .last-traded-price').attributes('title')).toBe(
      '$23,364,485,051,464.178875'
    );

    wrapper.unmount();
  });
});
