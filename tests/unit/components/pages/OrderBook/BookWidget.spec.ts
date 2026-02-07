import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

const stopSubscriptionMock = vi.fn();
const unsubscribeMock = vi.fn();
const setSelectedStepMock = vi.fn();
const fillPriceMock = vi.fn();

const usePiniaTelemetryMock = vi.fn();
const orderBookStoreStub = { $id: 'order-book-store' };

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
    asksFormatted: [],
    bidsFormatted: [],
    sellOrders: [],
    buyOrders: [],
    sellMarginStyle: () => ({}),
    barStyle: () => ({}),
    showAggregationOptions: false,
    isMarketOrder: false,
    steps: [],
    selectedStep: { value: '0.1' },
    setSelectedStep: setSelectedStepMock,
    lastDealTrendsUp: false,
    trendIcon: 'trend-up',
    trendClass: 'trend-class',
    lastPriceFormatted: '0.10',
    fiatValue: '$10',
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
});
