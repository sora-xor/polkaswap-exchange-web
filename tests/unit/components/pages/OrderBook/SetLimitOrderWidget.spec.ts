import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

const usePiniaTelemetryMock = vi.fn();
const orderBookStoreStub = { $id: 'order-book-store' };

vi.mock('@/composables/usePiniaTelemetry', () => ({
  usePiniaTelemetry: (...args: unknown[]) => usePiniaTelemetryMock(...args),
}));

vi.mock('@/stores/orderBook', () => ({
  useOrderBookStore: () => orderBookStoreStub,
}));

const sideRef = ref('Buy');
const setSideMock = vi.fn();

vi.mock('@/composables/useOrderBook', () => ({
  useOrderBook: () => ({
    PriceVariant: { Buy: 'Buy', Sell: 'Sell' },
    side: sideRef,
    setSide: setSideMock,
    orderBookId: { value: 'orderbook-1' },
    baseAsset: { value: { symbol: 'AAA' } },
    quoteAsset: { value: { symbol: 'BBB' } },
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/router', () => ({
  lazyComponent: () => ({
    template: '<div class="lazy-stub"><slot /></div>',
  }),
}));

describe('SetLimitOrderWidget.vue', () => {
  it('registers telemetry metadata', async () => {
    usePiniaTelemetryMock.mockClear();

    const module = await import('@/components/pages/OrderBook/SetLimitOrderWidget.vue');
    mount(module.default, {
      global: {
        stubs: {
          'base-widget': { template: '<div><slot /></div>' },
          's-tabs': {
            props: ['value'],
            template: '<div><slot /></div>',
          },
          's-tab': { template: '<div><slot /></div>' },
        },
      },
    });

    expect(usePiniaTelemetryMock).toHaveBeenCalledTimes(1);
    const [, targets, options] = usePiniaTelemetryMock.mock.calls[0];
    expect(targets).toEqual([{ store: orderBookStoreStub, storeId: 'orderBook' }]);
    expect(options?.metadata?.()).toEqual({
      widget: 'set-limit-order',
      orderBookId: 'orderbook-1',
      baseAsset: 'AAA',
      quoteAsset: 'BBB',
    });
  });
});
