import { OrderBookStatus } from '@sora-substrate/liquidity-proxy';
import { flushPromises, mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Cancel } from '@/types/orderBook';

import type { OrderBook } from '@sora-substrate/liquidity-proxy';
import type { LimitOrder } from '@sora-substrate/sdk/build/orderBook/types';

const walletApiMocks = vi.hoisted(() => ({
  cancelLimitOrder: vi.fn(),
  cancelLimitOrderBatch: vi.fn(),
}));

vi.mock('@tests/stubs/walletRuntime', () => ({
  api: {
    orderBook: {
      cancelLimitOrder: walletApiMocks.cancelLimitOrder,
      cancelLimitOrderBatch: walletApiMocks.cancelLimitOrderBatch,
    },
  },
  INDEXER_TYPES: {
    OrderStatus: {},
  },
  WALLET_CONSTS: {},
  WALLET_TYPES: {},
  components: {},
}));

const isLoggedInRef = ref(true);
const soraAddressRef = ref('addr-1');
const connectWalletMock = vi.fn();

vi.mock('@/composables/useInternalConnect', () => ({
  useInternalConnect: () => ({
    isLoggedIn: isLoggedInRef,
    soraAddress: soraAddressRef,
    connectSoraWallet: connectWalletMock,
  }),
}));

const orderBookIdRef = ref('order-book-1');
const baseAssetRef = ref({ symbol: 'AAA' });
const quoteAssetRef = ref({ symbol: 'BBB' });
const usePiniaTelemetryMock = vi.fn();
const orderBookStoreStub = { $id: 'order-book-store' };

vi.mock('@/composables/useOrderBook', () => ({
  useOrderBook: () => ({
    orderBookId: computed(() => orderBookIdRef.value),
    baseAsset: computed(() => baseAssetRef.value),
    quoteAsset: computed(() => quoteAssetRef.value),
  }),
}));

vi.mock('@/composables/usePiniaTelemetry', () => ({
  usePiniaTelemetry: (...args: unknown[]) => usePiniaTelemetryMock(...args),
}));

vi.mock('@/stores/orderBook', () => ({
  useOrderBookStore: () => orderBookStoreStub,
}));

const transactionLoading = ref(false);
const withNotificationsMock = vi.fn(async (handler: () => Promise<void> | void) => {
  await handler();
});

vi.mock('@/composables/useTransaction', () => ({
  useTransaction: () => ({
    loading: transactionLoading,
    withNotifications: withNotificationsMock,
  }),
}));

const confirmDialogVisible = ref(false);
const confirmOrExecuteMock = vi.fn(async (handler: () => Promise<void> | void) => handler());

vi.mock('@/composables/useConfirmDialog', () => ({
  useConfirmDialog: () => ({
    confirmDialogVisible,
    confirmOrExecute: confirmOrExecuteMock,
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params && 'value' in params ? `${key}:${params.value}` : key,
  }),
}));

const orderBookUserOrdersMocks = vi.hoisted(() => ({
  userLimitOrders: { value: [] as LimitOrder[] },
  ordersToBeCancelled: { value: [] as LimitOrder[] },
  nodeIsConnected: { value: true },
  currentOrderBook: { value: null as OrderBook | null },
  subscribeToUserLimitOrders: vi.fn(async () => undefined),
  unsubscribeFromUserLimitOrders: vi.fn(async () => undefined),
  setOrdersToBeCancelled: vi.fn((orders: LimitOrder[]) => {
    orderBookUserOrdersMocks.ordersToBeCancelled.value = orders;
  }),
}));

vi.mock('@/composables/useOrderBookUserOrders', () => ({
  useOrderBookUserOrders: () => ({
    userLimitOrders: computed(() => orderBookUserOrdersMocks.userLimitOrders.value),
    ordersToBeCancelled: computed(() => orderBookUserOrdersMocks.ordersToBeCancelled.value),
    nodeIsConnected: computed(() => orderBookUserOrdersMocks.nodeIsConnected.value),
    currentOrderBook: computed(() => orderBookUserOrdersMocks.currentOrderBook.value),
    isBookStopped: computed(
      () =>
        !orderBookUserOrdersMocks.currentOrderBook.value ||
        orderBookUserOrdersMocks.currentOrderBook.value?.status === OrderBookStatus.Stop
    ),
    subscribeToUserLimitOrders: orderBookUserOrdersMocks.subscribeToUserLimitOrders,
    unsubscribeFromUserLimitOrders: orderBookUserOrdersMocks.unsubscribeFromUserLimitOrders,
    setOrdersToBeCancelled: orderBookUserOrdersMocks.setOrdersToBeCancelled,
  }),
}));

const mountWidget = async () => {
  const module = await import('@/features/misc/components/order-book/HistoryOrderWidget.vue');

  return mount(module.default, {
    global: {
      stubs: {
        'base-widget': { template: '<div class="base-widget"><slot name="title" /><slot /></div>' },
        'open-orders': { template: '<div class="open-orders-stub"></div>' },
        'all-orders': { template: '<div class="all-orders-stub"></div>' },
        'cancel-confirm': { template: '<div class="cancel-confirm-stub"></div>' },
        's-button': { template: '<button class="s-button-stub" v-bind="$attrs"><slot /></button>' },
        's-tooltip': { template: '<span><slot /></span>' },
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
};

const createLimitOrder = (id: number): LimitOrder =>
  ({
    id,
    time: id,
    orderBookId: {
      base: 'base-asset',
      quote: 'quote-asset',
      dexId: 0,
    },
  }) as LimitOrder;

describe('HistoryOrderWidget.vue', () => {
  beforeEach(() => {
    transactionLoading.value = false;
    confirmDialogVisible.value = false;
    isLoggedInRef.value = true;
    soraAddressRef.value = 'addr-1';
    orderBookIdRef.value = 'order-book-1';
    orderBookUserOrdersMocks.userLimitOrders.value = [];
    orderBookUserOrdersMocks.ordersToBeCancelled.value = [];
    orderBookUserOrdersMocks.nodeIsConnected.value = true;
    orderBookUserOrdersMocks.currentOrderBook.value = { status: OrderBookStatus.Trade } as OrderBook;

    connectWalletMock.mockReset();
    withNotificationsMock.mockClear();
    confirmOrExecuteMock.mockClear();
    walletApiMocks.cancelLimitOrder.mockReset();
    walletApiMocks.cancelLimitOrderBatch.mockReset();
    orderBookUserOrdersMocks.subscribeToUserLimitOrders.mockClear();
    orderBookUserOrdersMocks.unsubscribeFromUserLimitOrders.mockClear();
    orderBookUserOrdersMocks.setOrdersToBeCancelled.mockClear();
  });

  it('registers telemetry metadata', async () => {
    usePiniaTelemetryMock.mockClear();

    const wrapper = await mountWidget();
    await flushPromises();

    expect(usePiniaTelemetryMock).toHaveBeenCalledTimes(1);
    const [flowId, targets, options] = usePiniaTelemetryMock.mock.calls[0];
    expect(flowId).toBe('order-book');
    expect(targets).toEqual([{ store: orderBookStoreStub, storeId: 'orderBook' }]);
    expect(options?.metadata?.()).toEqual({
      widget: 'history',
      orderBookId: 'order-book-1',
      baseAsset: 'AAA',
      quoteAsset: 'BBB',
    });

    wrapper.unmount();
  });

  it('subscribes and unsubscribes from user limit orders on lifecycle events', async () => {
    const wrapper = await mountWidget();
    await flushPromises();

    expect(orderBookUserOrdersMocks.unsubscribeFromUserLimitOrders).toHaveBeenCalledTimes(1);
    expect(orderBookUserOrdersMocks.subscribeToUserLimitOrders).toHaveBeenCalledTimes(1);

    wrapper.unmount();
    expect(orderBookUserOrdersMocks.unsubscribeFromUserLimitOrders).toHaveBeenCalledTimes(2);
  });

  it('recovers loading state when user limit order subscription fails', async () => {
    orderBookUserOrdersMocks.subscribeToUserLimitOrders.mockRejectedValueOnce(new Error('subscription failed'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const wrapper = await mountWidget();
    await flushPromises();

    const vm = wrapper.vm as unknown as { openOrdersLoading: boolean };
    expect(vm.openOrdersLoading).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('shows a dedicated connect CTA without clipping class regressions when user is logged out', async () => {
    isLoggedInRef.value = false;

    const wrapper = await mountWidget();
    await flushPromises();

    const connectButton = wrapper.find('button.order-book-connect-btn');
    expect(connectButton.exists()).toBe(true);
    expect(connectButton.text()).toContain('connectWalletText');

    await connectButton.trigger('click');
    expect(connectWalletMock).toHaveBeenCalledTimes(1);
  });

  it('cancels selected orders in batch mode', async () => {
    const orders = [createLimitOrder(1), createLimitOrder(2)];
    orderBookUserOrdersMocks.userLimitOrders.value = orders;
    orderBookUserOrdersMocks.ordersToBeCancelled.value = orders;

    const wrapper = await mountWidget();
    await flushPromises();

    await (wrapper.vm as unknown as { cancelOrders: (mode: Cancel) => Promise<void> }).cancelOrders(Cancel.multiple);

    expect(withNotificationsMock).toHaveBeenCalledTimes(1);
    expect(walletApiMocks.cancelLimitOrderBatch).toHaveBeenCalledWith('base-asset', 'quote-asset', [1, 2]);
    expect(walletApiMocks.cancelLimitOrder).not.toHaveBeenCalled();
    expect(orderBookUserOrdersMocks.setOrdersToBeCancelled).toHaveBeenLastCalledWith([]);
  });

  it('falls back to single-order cancellation when only one order is selected', async () => {
    const order = createLimitOrder(10);
    orderBookUserOrdersMocks.userLimitOrders.value = [order];
    orderBookUserOrdersMocks.ordersToBeCancelled.value = [];

    const wrapper = await mountWidget();
    await flushPromises();

    await (wrapper.vm as unknown as { cancelOrders: () => Promise<void> }).cancelOrders();

    expect(walletApiMocks.cancelLimitOrder).toHaveBeenCalledWith('base-asset', 'quote-asset', 10);
    expect(orderBookUserOrdersMocks.setOrdersToBeCancelled).toHaveBeenLastCalledWith([]);
  });

  it('opens the confirm dialog before cancelling all orders', async () => {
    const order = createLimitOrder(5);
    orderBookUserOrdersMocks.userLimitOrders.value = [order];

    const wrapper = await mountWidget();
    await flushPromises();

    await (wrapper.vm as unknown as { openConfirmCancelDialog: () => Promise<void> }).openConfirmCancelDialog();

    expect(confirmOrExecuteMock).toHaveBeenCalledTimes(1);
    expect(walletApiMocks.cancelLimitOrder).toHaveBeenCalledWith('base-asset', 'quote-asset', 5);
  });
});
