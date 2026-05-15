import { OrderBookStatus } from '@sora-substrate/liquidity-proxy';
import { flushPromises, mount } from '@vue/test-utils';
import { computed } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LimitOrder } from '@sora-substrate/sdk/build/orderBook/types';
import type { OrderBook } from '@sora-substrate/liquidity-proxy';

const waitUntilMock = vi.fn(async (predicate: () => boolean) => {
  predicate();
});
const delayMock = vi.fn(async () => undefined);

vi.mock('@/utils', () => ({
  waitUntil: waitUntilMock,
  delay: delayMock,
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const orderBookUserOrdersMocks = vi.hoisted(() => ({
  userLimitOrders: { value: [] as LimitOrder[] },
  ordersToBeCancelled: { value: [] as LimitOrder[] },
  currentOrderBook: { value: null as OrderBook | null },
  subscribeOnLimitOrders: vi.fn(async () => undefined),
  resetPagedUserLimitOrdersSubscription: vi.fn(),
  setOrdersToBeCancelled: vi.fn((orders: LimitOrder[]) => {
    orderBookUserOrdersMocks.ordersToBeCancelled.value = orders;
  }),
}));

vi.mock('@/composables/useOrderBookUserOrders', () => ({
  useOrderBookUserOrders: () => ({
    userLimitOrders: computed(() => orderBookUserOrdersMocks.userLimitOrders.value),
    ordersToBeCancelled: computed(() => orderBookUserOrdersMocks.ordersToBeCancelled.value),
    currentOrderBook: computed(() => orderBookUserOrdersMocks.currentOrderBook.value),
    subscribeOnLimitOrders: orderBookUserOrdersMocks.subscribeOnLimitOrders,
    resetPagedUserLimitOrdersSubscription: orderBookUserOrdersMocks.resetPagedUserLimitOrdersSubscription,
    setOrdersToBeCancelled: orderBookUserOrdersMocks.setOrdersToBeCancelled,
  }),
}));

vi.mock('@tests/stubs/walletRuntime', () => ({
  components: {
    HistoryPagination: { template: '<div class="history-pagination-stub"></div>' },
  },
  WALLET_CONSTS: {},
  WALLET_TYPES: {},
  INDEXER_TYPES: {
    OrderStatus: {},
  },
}));

const mountComponent = async () => {
  const module = await import('@/features/misc/components/order-book/Tables/OpenOrders.vue');

  return mount(module.default, {
    props: {
      parentLoading: false,
    },
    global: {
      stubs: {
        OrderTable: {
          template: '<div class="order-table-stub"></div>',
        },
      },
    },
  });
};

const createLimitOrder = (id: number): LimitOrder =>
  ({
    id,
    time: id,
    orderBookId: {
      base: 'base',
      quote: 'quote',
      dexId: 0,
    },
  }) as LimitOrder;

describe('OpenOrders.vue', () => {
  beforeEach(() => {
    orderBookUserOrdersMocks.userLimitOrders.value = [];
    orderBookUserOrdersMocks.ordersToBeCancelled.value = [];
    orderBookUserOrdersMocks.currentOrderBook.value = { status: OrderBookStatus.Trade } as OrderBook;
    orderBookUserOrdersMocks.subscribeOnLimitOrders.mockClear();
    orderBookUserOrdersMocks.resetPagedUserLimitOrdersSubscription.mockClear();
    orderBookUserOrdersMocks.setOrdersToBeCancelled.mockClear();
    waitUntilMock.mockClear();
    delayMock.mockClear();
  });

  it('subscribes to paged limit orders when handling pagination', async () => {
    const wrapper = await mountComponent();
    const exposed = wrapper.vm as unknown as {
      handlePagination: (page: number, items?: LimitOrder[]) => Promise<void>;
    };
    const orders = [createLimitOrder(1), createLimitOrder(2)];

    await exposed.handlePagination(2, orders);

    expect(orderBookUserOrdersMocks.resetPagedUserLimitOrdersSubscription).toHaveBeenCalledTimes(1);
    expect(orderBookUserOrdersMocks.subscribeOnLimitOrders).toHaveBeenCalledWith([1, 2]);
  }, 15_000);

  it('tracks selections added for cancellation', async () => {
    const wrapper = await mountComponent();
    const exposed = wrapper.vm as unknown as {
      handleSelectionChange: (rows: LimitOrder[]) => void;
      needToUpdateSelection: boolean;
      selectedPageItemIds: number[];
    };

    exposed.needToUpdateSelection = true;
    exposed.selectedPageItemIds = [];

    const order = createLimitOrder(10);
    orderBookUserOrdersMocks.ordersToBeCancelled.value = [];

    exposed.handleSelectionChange([order]);

    expect(orderBookUserOrdersMocks.setOrdersToBeCancelled).toHaveBeenCalledWith([order]);
    expect(exposed.selectedPageItemIds).toEqual([order.id]);
  });

  it('removes deselected orders from the cancellation list', async () => {
    const wrapper = await mountComponent();
    const exposed = wrapper.vm as unknown as {
      handleSelectionChange: (rows: LimitOrder[]) => void;
      needToUpdateSelection: boolean;
      selectedPageItemIds: number[];
    };

    const order = createLimitOrder(7);
    orderBookUserOrdersMocks.ordersToBeCancelled.value = [order];
    exposed.needToUpdateSelection = true;
    exposed.selectedPageItemIds = [order.id];

    exposed.handleSelectionChange([]);

    expect(orderBookUserOrdersMocks.setOrdersToBeCancelled).toHaveBeenCalledWith([]);
    expect(exposed.selectedPageItemIds).toEqual([]);
  });

  it('clears selections and subscriptions on unmount', async () => {
    const wrapper = await mountComponent();
    orderBookUserOrdersMocks.ordersToBeCancelled.value = [createLimitOrder(1)];

    await flushPromises();
    wrapper.unmount();

    expect(orderBookUserOrdersMocks.setOrdersToBeCancelled).toHaveBeenCalledWith([]);
    expect(orderBookUserOrdersMocks.resetPagedUserLimitOrdersSubscription).toHaveBeenCalled();
  });
});
