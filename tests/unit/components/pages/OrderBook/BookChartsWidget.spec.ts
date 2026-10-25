import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import bookChartsWidgetSource from '@/features/misc/components/order-book/BookChartsWidget.vue?raw';

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
    baseAsset: { value: { address: 'addr-1', symbol: 'AAA' } },
    quoteAsset: { value: { address: 'addr-2', symbol: 'BBB' } },
    dexId: { value: 0 },
    orderBookId: { value: 'orderbook-1' },
  }),
}));

vi.mock('@/indexer/queries/orderBook/orderBook', () => ({
  subscribeOnOrderBookUpdates: vi.fn(async () => undefined),
}));

vi.mock('@/indexer/queries/orderBook/price', () => ({
  fetchOrderBookPriceData: vi.fn(),
}));

vi.mock('@/components/shared/Widget/PriceChart.vue', () => ({
  default: {
    template: '<div class="price-chart-stub"><slot /></div>',
  },
}));

describe('BookChartsWidget.vue', () => {
  it('emits telemetry metadata for charts widget', async () => {
    usePiniaTelemetryMock.mockClear();

    const module = await import('@/features/misc/components/order-book/BookChartsWidget.vue');
    mount(module.default, {
      global: {
        stubs: {
          'price-chart-widget': { template: '<div><slot /></div>' },
        },
      },
    });

    expect(usePiniaTelemetryMock).toHaveBeenCalledTimes(1);
    const [, targets, options] = usePiniaTelemetryMock.mock.calls[0];
    expect(targets).toEqual([{ store: orderBookStoreStub, storeId: 'orderBook' }]);
    expect(options?.metadata?.()).toEqual({
      widget: 'book-charts',
      orderBookId: 'orderbook-1',
      baseAsset: 'AAA',
      quoteAsset: 'BBB',
    });
  });

  it('uses the shared price chart widget directly', () => {
    expect(bookChartsWidgetSource).not.toContain('lazyComponent(');
    expect(bookChartsWidgetSource).not.toContain('Components.');
    expect(bookChartsWidgetSource).not.toContain("from '@/router'");
    expect(bookChartsWidgetSource).toContain(
      "import PriceChartWidget from '@/components/shared/Widget/PriceChart.vue';"
    );
  });
});
