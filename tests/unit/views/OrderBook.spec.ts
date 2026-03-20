import { flushPromises, mount } from '@vue/test-utils';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageNames } from '@/consts';
import { BreakpointClass } from '@/consts/layout';
import { computed, defineComponent, h, reactive, ref } from 'vue';

const usePiniaTelemetryMock = vi.fn();
const goToMock = vi.fn();
const orderBookStoreStub = { $id: 'order-book-store-stub' };

const settingsStoreStub = reactive({
  $id: 'settings-store-stub',
  screenBreakpointClass: BreakpointClass.Desktop,
  orderBookEnabled: true,
});
const walletStoreStub = reactive({
  whitelistIdsBySymbol: {} as Record<string, string>,
  assetsDataTable: {} as Record<string, { address: string; symbol?: string }>,
});

const orderBookIdRef = ref('orderbook-aaa-bbb');
const baseAssetRef = ref({ symbol: 'AAA', address: 'addr-1' });
const quoteAssetRef = ref({ symbol: 'BBB', address: 'addr-2' });
const orderBooksRef = ref<Record<string, any>>({
  foo: {
    orderBookId: { base: 'addr-1', quote: 'addr-2', dexId: 0 },
    status: 2,
  },
});

const setCurrentOrderBookMock = vi.fn();
const getOrderBooksInfoMock = vi.fn().mockResolvedValue(undefined);
const subscribeToOrderBookStatsMock = vi.fn().mockResolvedValue(undefined);
const unsubscribeFromOrderBookStatsMock = vi.fn();
const unsubscribeFromBidsAndAsksMock = vi.fn();
const updateBalanceSubscriptionMock = vi.fn().mockResolvedValue(undefined);
const updateOrderBooksStatsMock = vi.fn().mockResolvedValue(undefined);

const firstRouteAddressRef = ref('addr-1');
const secondRouteAddressRef = ref('addr-2');
const routeMock = reactive({
  name: PageNames.OrderBook,
  params: {} as Record<string, string | undefined>,
});
const parseCurrentRouteMock = vi.fn(() => true);
const updateRouteAfterSelectTokensMock = vi.fn();
type TokensChangeHandler = (params: { firstAddress: string; secondAddress: string }) => Promise<void> | void;
let tokensChangeHandler: TokensChangeHandler | null = null;

vi.mock('@/composables/usePiniaTelemetry', () => ({
  usePiniaTelemetry: (...args: unknown[]) => usePiniaTelemetryMock(...args),
}));

vi.mock('@/stores/orderBook', () => ({
  useOrderBookStore: () => orderBookStoreStub,
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreStub,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreStub,
}));

vi.mock('@/composables/useOrderBook', () => ({
  useOrderBook: () => ({
    orderBookId: computed(() => orderBookIdRef.value),
    baseAsset: computed(() => baseAssetRef.value),
    quoteAsset: computed(() => quoteAssetRef.value),
  }),
}));

vi.mock('@/composables/useOrderBookManagement', () => ({
  useOrderBookManagement: () => ({
    orderBooks: computed(() => orderBooksRef.value),
    setCurrentOrderBook: (...args: unknown[]) => setCurrentOrderBookMock(...args),
    getOrderBooksInfo: (...args: unknown[]) => getOrderBooksInfoMock(...args),
    subscribeToOrderBookStats: (...args: unknown[]) => subscribeToOrderBookStatsMock(...args),
    unsubscribeFromOrderBookStats: (...args: unknown[]) => unsubscribeFromOrderBookStatsMock(...args),
    unsubscribeFromBidsAndAsks: (...args: unknown[]) => unsubscribeFromBidsAndAsksMock(...args),
    updateBalanceSubscription: (...args: unknown[]) => updateBalanceSubscriptionMock(...args),
    updateOrderBooksStats: (...args: unknown[]) => updateOrderBooksStatsMock(...args),
  }),
}));

vi.mock('@/composables/useSelectedTokensRoute', () => ({
  useSelectedTokensRoute: (handler: TokensChangeHandler) => {
    tokensChangeHandler = handler;
    return {
      route: routeMock,
      firstRouteAddress: firstRouteAddressRef,
      secondRouteAddress: secondRouteAddressRef,
      parseCurrentRoute: parseCurrentRouteMock,
      updateRouteAfterSelectTokens: updateRouteAfterSelectTokensMock,
    };
  },
}));

vi.mock('@/composables/useLoading', () => ({
  useLoading: () => ({
    withApi: async (cb: () => Promise<void> | void) => {
      await cb();
    },
  }),
}));

vi.mock('@/router', () => ({
  goTo: (...args: unknown[]) => goToMock(...args),
  lazyComponent: () =>
    defineComponent({
      name: 'LazyOrderBookStub',
      setup(_props, { slots }) {
        return () => h('div', { class: 'lazy-order-book-stub' }, slots.default?.());
      },
    }),
}));

let OrderBookView: any;

beforeAll(async () => {
  OrderBookView = (await import('@/views/OrderBook.vue')).default;
});

beforeEach(() => {
  usePiniaTelemetryMock.mockClear();
  goToMock.mockClear();
  setCurrentOrderBookMock.mockReset();
  getOrderBooksInfoMock.mockClear();
  subscribeToOrderBookStatsMock.mockClear();
  unsubscribeFromOrderBookStatsMock.mockClear();
  unsubscribeFromBidsAndAsksMock.mockClear();
  updateRouteAfterSelectTokensMock.mockClear();
  parseCurrentRouteMock.mockClear();
  orderBookIdRef.value = 'orderbook-aaa-bbb';
  baseAssetRef.value = { symbol: 'AAA', address: 'addr-1' };
  quoteAssetRef.value = { symbol: 'BBB', address: 'addr-2' };
  firstRouteAddressRef.value = 'addr-1';
  secondRouteAddressRef.value = 'addr-2';
  routeMock.name = PageNames.OrderBook;
  routeMock.params = { first: 'AAA', second: 'BBB' };
  walletStoreStub.whitelistIdsBySymbol = { AAA: 'addr-1', BBB: 'addr-2' };
  walletStoreStub.assetsDataTable = {
    'addr-1': { address: 'addr-1', symbol: 'AAA' },
  };
});

describe('OrderBookView telemetry', () => {
  it('registers Pinia telemetry with metadata', async () => {
    const wrapper = mount(OrderBookView);
    await flushPromises();

    expect(usePiniaTelemetryMock).toHaveBeenCalledTimes(1);
    const [flowId, targets, options] = usePiniaTelemetryMock.mock.calls[0];
    expect(flowId).toBe('order-book');
    expect(targets).toEqual([
      { store: settingsStoreStub, storeId: 'settings' },
      { store: orderBookStoreStub, storeId: 'orderBook' },
    ]);
    const metadata = options?.metadata;
    expect(typeof metadata).toBe('function');
    expect(metadata?.()).toEqual({
      orderBookId: 'orderbook-aaa-bbb',
      baseAsset: 'AAA',
      quoteAsset: 'BBB',
    });

    wrapper.unmount();
  });

  it('normalizes trade URL when route params are not provided', async () => {
    firstRouteAddressRef.value = '';
    secondRouteAddressRef.value = '';
    routeMock.params = {};

    const wrapper = mount(OrderBookView);
    await flushPromises();

    expect(updateRouteAfterSelectTokensMock).toHaveBeenCalledWith(
      expect.objectContaining({ address: 'addr-1', symbol: 'AAA' }),
      expect.objectContaining({ address: 'addr-2', symbol: 'BBB' })
    );

    wrapper.unmount();
  });

  it('syncs trade URL when explicit route params are present', async () => {
    routeMock.params = { first: 'AAA', second: 'BBB' };
    firstRouteAddressRef.value = 'addr-1';
    secondRouteAddressRef.value = 'addr-2';

    const wrapper = mount(OrderBookView);
    await flushPromises();

    expect(updateRouteAfterSelectTokensMock).toHaveBeenCalledWith(
      expect.objectContaining({ address: 'addr-1', symbol: 'AAA' }),
      expect.objectContaining({ address: 'addr-2', symbol: 'BBB' })
    );

    wrapper.unmount();
  });

  it('does not override explicit trade params while route symbols are unresolved', async () => {
    routeMock.params = { first: 'LLD', second: 'XOR' };
    firstRouteAddressRef.value = '';
    secondRouteAddressRef.value = '';
    walletStoreStub.whitelistIdsBySymbol = {};
    walletStoreStub.assetsDataTable = {};

    const wrapper = mount(OrderBookView);
    await flushPromises();

    expect(updateRouteAfterSelectTokensMock).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it('falls back when route symbols remain unresolved after lookup tables are ready', async () => {
    routeMock.params = { first: 'FOO', second: 'BAR' };
    firstRouteAddressRef.value = '';
    secondRouteAddressRef.value = '';
    orderBookIdRef.value = '';
    walletStoreStub.whitelistIdsBySymbol = { XOR: 'addr-2' };
    walletStoreStub.assetsDataTable = {
      'addr-2': { address: 'addr-2', symbol: 'XOR' },
    };
    parseCurrentRouteMock.mockReturnValueOnce(false);
    setCurrentOrderBookMock.mockImplementationOnce(() => {
      orderBookIdRef.value = 'fallback';
    });

    const wrapper = mount(OrderBookView);
    await flushPromises();

    expect(parseCurrentRouteMock).toHaveBeenCalled();
    expect(setCurrentOrderBookMock).toHaveBeenCalled();

    wrapper.unmount();
  });

  it('parses explicit route params even when a previous order-book selection exists', async () => {
    orderBookIdRef.value = 'existing-orderbook';
    routeMock.params = { first: 'LLD', second: 'XOR' };
    firstRouteAddressRef.value = 'addr-1';
    secondRouteAddressRef.value = 'addr-2';

    const wrapper = mount(OrderBookView);
    await flushPromises();

    expect(parseCurrentRouteMock).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });
});
