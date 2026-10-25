import { OrderBookStatus } from '@sora-substrate/liquidity-proxy';
import { reactive } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LimitOrder } from '@sora-substrate/sdk/build/orderBook/types';
import type { OrderBook } from '@sora-substrate/liquidity-proxy';

const orderBookStoreStub = reactive({
  userLimitOrders: [] as LimitOrder[],
  ordersToBeCancelled: [] as LimitOrder[],
  currentOrderBook: null as OrderBook | null,
  setOrdersToBeCancelled: vi.fn(),
  resetPagedUserLimitOrdersSubscription: vi.fn(),
  subscribeToUserLimitOrders: vi.fn(async () => undefined),
  unsubscribeFromUserLimitOrders: vi.fn(async () => undefined),
  subscribeOnLimitOrders: vi.fn(async () => undefined),
});

const settingsStoreStub = reactive({
  nodeIsConnected: true,
});

vi.mock('@/stores/orderBook', () => ({
  useOrderBookStore: () => orderBookStoreStub,
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreStub,
}));

describe('useOrderBookUserOrders', () => {
  beforeEach(() => {
    orderBookStoreStub.userLimitOrders = [];
    orderBookStoreStub.ordersToBeCancelled = [];
    orderBookStoreStub.currentOrderBook = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('exposes reactive slices for user orders and selection state', async () => {
    const module = await import('@/composables/useOrderBookUserOrders');
    const composable = module.useOrderBookUserOrders();

    const order = { id: 1 } as LimitOrder;
    orderBookStoreStub.userLimitOrders = [order];
    orderBookStoreStub.ordersToBeCancelled = [order];
    orderBookStoreStub.currentOrderBook = { status: 'Trade' } as unknown as OrderBook;

    expect(composable.userLimitOrders.value).toEqual([order]);
    expect(composable.ordersToBeCancelled.value).toEqual([order]);
    expect(composable.currentOrderBook.value?.status).toBe('Trade');
    expect(composable.isBookStopped.value).toBe(false);
    expect(composable.nodeIsConnected.value).toBe(true);
  });

  it('routes mutations and dispatches through helper methods', async () => {
    const module = await import('@/composables/useOrderBookUserOrders');
    const composable = module.useOrderBookUserOrders();

    const orders = [{ id: 2 } as LimitOrder];
    composable.setOrdersToBeCancelled(orders as LimitOrder[]);
    expect(orderBookStoreStub.setOrdersToBeCancelled).toHaveBeenCalledWith(orders);

    await composable.subscribeToUserLimitOrders();
    expect(orderBookStoreStub.subscribeToUserLimitOrders).toHaveBeenCalled();

    await composable.unsubscribeFromUserLimitOrders();
    expect(orderBookStoreStub.unsubscribeFromUserLimitOrders).toHaveBeenCalled();

    await composable.subscribeOnLimitOrders([1, 2]);
    expect(orderBookStoreStub.subscribeOnLimitOrders).toHaveBeenCalledWith([1, 2]);

    composable.resetPagedUserLimitOrdersSubscription();
    expect(orderBookStoreStub.resetPagedUserLimitOrdersSubscription).toHaveBeenCalled();
  });

  it('marks the book as stopped when status is Stop or missing', async () => {
    const module = await import('@/composables/useOrderBookUserOrders');
    const composable = module.useOrderBookUserOrders();

    orderBookStoreStub.currentOrderBook = { status: OrderBookStatus.Stop } as unknown as OrderBook;
    expect(composable.isBookStopped.value).toBe(true);

    orderBookStoreStub.currentOrderBook = null;
    expect(composable.isBookStopped.value).toBe(true);
  });
});
