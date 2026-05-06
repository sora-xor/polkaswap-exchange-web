import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

const ordersMock = [
  { time: 'formatted-10', amount: '123 XOR', price: '0.987 VAL', isBuy: true },
  { time: 'formatted-20', amount: '42 XOR', price: '1.234 VAL', isBuy: false },
];

const usePiniaTelemetryMock = vi.fn();
const orderBookStoreStub = { $id: 'order-book-store' };

vi.mock('@/composables/useOrderBook', () => ({
  useOrderBook: () => ({
    completedOrders: ordersMock,
    orderBookId: { value: 'order-book-1' },
    baseAsset: { value: { symbol: 'AAA' } },
    quoteAsset: { value: { symbol: 'BBB' } },
  }),
}));

vi.mock('@/composables/usePiniaTelemetry', () => ({
  usePiniaTelemetry: (...args: unknown[]) => usePiniaTelemetryMock(...args),
}));

vi.mock('@/stores/orderBook', () => ({
  useOrderBookStore: () => orderBookStoreStub,
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('MarketTradesWidget.vue', () => {
  it('renders completed orders provided by useOrderBook composable', async () => {
    const module = await import('@/components/pages/OrderBook/MarketTradesWidget.vue');
    const wrapper = mount(module.default, {
      global: {
        stubs: {
          BaseWidget: { template: '<div><slot /><slot name="title" /></div>' },
          's-table': {
            props: {
              data: {
                type: Array,
                default: () => [],
              },
            },
            template:
              '<table><tbody><tr v-for="item in data" :key="item.time"><slot :row="item" /></tr></tbody></table>',
          },
          's-table-column': {
            props: {
              prop: {
                type: String,
                default: '',
              },
              align: {
                type: String,
                default: '',
              },
              headerAlign: {
                type: String,
                default: '',
              },
              label: {
                type: String,
                default: '',
              },
            },
            template: '<template><slot /></template>',
          },
        },
      },
    });

    const exposed = wrapper.vm as { completedOrders: typeof ordersMock };
    expect(exposed.completedOrders).toEqual(ordersMock);
    expect(usePiniaTelemetryMock).toHaveBeenCalledTimes(1);
    const [, targets, options] = usePiniaTelemetryMock.mock.calls[0];
    expect(targets).toEqual([{ store: orderBookStoreStub, storeId: 'orderBook' }]);
    expect(options?.metadata?.()).toEqual({
      widget: 'market-trades',
      orderBookId: 'order-book-1',
      baseAsset: 'AAA',
      quoteAsset: 'BBB',
    });
  });
});
