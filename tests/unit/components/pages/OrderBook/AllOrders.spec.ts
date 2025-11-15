import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';

import { Filter, OrderStatus } from '@/types/orderBook';

import type { OrderBook } from '@sora-substrate/liquidity-proxy';
import type { OrderData } from '@/types/orderBook';

const fetchOrdersMock = vi.fn();
const walletStoreMock = { address: '5F6...' };
const currentOrderBook = {
  orderBookId: { base: 'base-asset', quote: 'quote-asset', dexId: 0 },
} as unknown as OrderBook;

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock();
});

vi.mock('@/indexer/queries/orderBook/orders', () => ({
  fetchOrderBookAccountOrders: fetchOrdersMock,
}));

vi.mock('@/stores/wallet', () => ({
  __esModule: true,
  useWalletStore: () => walletStoreMock,
}));

vi.mock('@/composables/useLoading', () => ({
  __esModule: true,
  useLoading: () => ({
    loading: { value: false },
    withLoading: async (handler: () => Promise<void> | void) => {
      await handler();
    },
  }),
}));

vi.mock('@/components/pages/OrderBook/Tables/OrderTable.vue', () => ({
  __esModule: true,
  default: defineComponent({
    name: 'OrderTableStub',
    props: {
      orders: {
        type: Array,
        default: () => [],
      },
      parentLoading: {
        type: [Boolean, Object],
        default: false,
      },
    },
    template: '<div class="order-table-stub" :data-orders="orders.length" :data-loading="parentLoading"></div>',
  }),
}));

vi.mock('@/store', () => ({
  __esModule: true,
  default: {
    getters: {
      orderBook: {
        currentOrderBook,
      },
    },
  },
}));

describe('AllOrders.vue', () => {
  beforeEach(() => {
    fetchOrdersMock.mockReset();
  });

  const createWrapper = async (props?: Record<string, unknown>) => {
    const module = await import('@/components/pages/OrderBook/Tables/AllOrders.vue');

    return mount(module.default, {
      props,
    });
  };

  it('fetches account orders on mount', async () => {
    const dataset: OrderData[] = [
      {
        id: '1',
        status: OrderStatus.PartialFill,
      } as unknown as OrderData,
    ];

    fetchOrdersMock.mockResolvedValue(dataset);

    const wrapper = await createWrapper();
    await flushPromises();

    expect(fetchOrdersMock).toHaveBeenCalledTimes(1);
    expect(fetchOrdersMock).toHaveBeenCalledWith(walletStoreMock.address, currentOrderBook.orderBookId);

    const ordersLength = wrapper.find('.order-table-stub').attributes('data-orders');
    expect(ordersLength).toBe(String(dataset.length));

    wrapper.unmount();
  });

  it('filters executed orders when filter prop is set', async () => {
    const dataset: OrderData[] = [
      { id: '1', status: OrderStatus.Filled } as unknown as OrderData,
      { id: '2', status: OrderStatus.PartialFill } as unknown as OrderData,
    ];
    fetchOrdersMock.mockResolvedValue(dataset);

    const wrapper = await createWrapper({ filter: Filter.executed });
    await flushPromises();

    const ordersLength = wrapper.find('.order-table-stub').attributes('data-orders');
    expect(ordersLength).toBe('1');

    wrapper.unmount();
  });
});
