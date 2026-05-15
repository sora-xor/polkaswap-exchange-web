import { mount } from '@vue/test-utils';
import { nextTick, reactive, ref } from 'vue';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const SearchInputStub = { name: 'SearchInputStub', template: '<input />' };
const FormattedAmountStub = { name: 'FormattedAmountStub', template: '<span><slot /></span>' };
const HistoryPaginationStub = {
  name: 'HistoryPaginationStub',
  props: ['currentPage', 'pageAmount', 'total', 'lastPage'],
  emits: ['pagination-click'],
  template: '<div class="history-pagination-stub"><slot /></div>',
};

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      SearchInput: SearchInputStub,
      FormattedAmount: FormattedAmountStub,
      HistoryPagination: HistoryPaginationStub,
    },
    WALLET_CONSTS: {
      PaginationButton: {
        Prev: 'prev',
        Next: 'next',
        First: 'first',
        Last: 'last',
      },
    },
  });
});

type RegisteredAsset = {
  address: string;
  decimals: number;
};

const shared = (() => {
  const parentLoading = ref(false);
  const withLoadingMock = vi.fn(async (cb: () => Promise<void> | void) => {
    parentLoading.value = true;
    try {
      await cb();
    } finally {
      parentLoading.value = false;
    }
  });

  const historyRef = ref<Record<string, any>>({});
  const networkHistoryLoading = ref(false);
  const updateExternalHistoryMock = vi.fn(async () => undefined);
  const showHistoryMock = vi.fn();
  const setHistoryPageMock = vi.fn();
  const historyPage = ref(1);
  const networkHistoryId = ref('network-1');

  const registeredAssets = reactive<Record<string, RegisteredAsset>>({});
  const assetsStore = reactive({
    registeredAssets,
    registeredAssetsFetching: false,
  });
  const bridgeStoreMock = reactive({
    updateBridgeHistory: vi.fn(),
    get historyPage() {
      return historyPage.value;
    },
    get networkHistoryId() {
      return networkHistoryId.value;
    },
  });
  const navigateToBridgeMock = vi.fn();

  const getNetworkIconMock = vi.fn((network: unknown) => `icon-${network ?? 'default'}`);
  const isOutgoingTxMock = vi.fn((item: any) => item.direction === 'outgoing');
  const isFailedStateMock = vi.fn(() => false);
  const isSuccessStateMock = vi.fn(() => false);
  const isWaitingForActionStateMock = vi.fn((item: any) => Boolean(item.waiting));
  const formatDatetimeMock = vi.fn(() => 'formatted-date');

  return {
    parentLoading,
    withLoadingMock,
    historyRef,
    networkHistoryLoading,
    updateExternalHistoryMock,
    showHistoryMock,
    setHistoryPageMock,
    historyPage,
    registeredAssets,
    assetsStore,
    bridgeStoreMock,
    networkHistoryId,
    navigateToBridgeMock,
    getNetworkIconMock,
    isOutgoingTxMock,
    isFailedStateMock,
    isSuccessStateMock,
    isWaitingForActionStateMock,
    formatDatetimeMock,
  };
})();

beforeAll(async () => {
  vi.doMock('@/router', () => ({
    lazyComponent: () => ({
      template: '<div><slot /></div>',
    }),
    default: {},
  }));
  vi.doMock('@/composables/useTranslation', () => ({
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  }));
  vi.doMock('@/composables/useBridgeCore', () => ({
    useBridgeCore: () => ({
      navigateToBridge: shared.navigateToBridgeMock,
    }),
  }));
  vi.doMock('@/composables/useLoading', () => ({
    useLoading: () => ({
      loading: shared.parentLoading,
      withLoading: shared.withLoadingMock,
    }),
  }));
  vi.doMock('@/composables/useBridgeHistory', () => ({
    useBridgeHistory: () => ({
      history: shared.historyRef,
      networkHistoryLoading: shared.networkHistoryLoading,
      updateExternalHistory: shared.updateExternalHistoryMock,
      showHistory: shared.showHistoryMock,
      setHistoryPage: shared.setHistoryPageMock,
    }),
  }));
  vi.doMock('@/composables/useNetworkFormatter', () => ({
    useNetworkFormatter: () => ({
      getNetworkIcon: shared.getNetworkIconMock,
      isOutgoingTx: shared.isOutgoingTxMock,
      isFailedState: shared.isFailedStateMock,
      isSuccessState: shared.isSuccessStateMock,
      isWaitingForActionState: shared.isWaitingForActionStateMock,
      formatDatetime: shared.formatDatetimeMock,
    }),
  }));
  vi.doMock('@/stores/bridge', () => ({
    useBridgeStore: () => shared.bridgeStoreMock,
  }));
  vi.doMock('@/stores/assets', () => ({
    useAssetsStore: () => shared.assetsStore,
  }));
  vi.doMock('@/store', () => ({
    default: {},
  }));

  const walletRuntime = await import('@tests/stubs/walletRuntime');
  WALLET_CONSTS = walletRuntime.WALLET_CONSTS;
  BridgeTransactionsHistory = (await import('@/features/bridge/pages/BridgeTransactionsHistoryPage.vue')).default;
});

vi.mock('@/composables/useNetworkFormatter', () => ({
  useNetworkFormatter: () => ({
    getNetworkIcon: shared.getNetworkIconMock,
    isOutgoingTx: shared.isOutgoingTxMock,
    isFailedState: shared.isFailedStateMock,
    isSuccessState: shared.isSuccessStateMock,
    isWaitingForActionState: shared.isWaitingForActionStateMock,
    formatDatetime: shared.formatDatetimeMock,
  }),
}));

let WALLET_CONSTS: any;
let BridgeTransactionsHistory: any;

const createHistoryItem = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  assetAddress: 'asset-1',
  symbol: 'AAA',
  amount: '1000000000000',
  amount2: '1000000000000',
  startTime: Date.now(),
  externalNetwork: 1,
  direction: 'outgoing',
  ...overrides,
});

const setHistoryItems = (items: Array<Record<string, unknown>>) => {
  shared.historyRef.value = items.reduce<Record<string, any>>((acc, item) => {
    acc[item.id as string] = item;
    return acc;
  }, {});
};

const mountHistoryView = async () => {
  const wrapper = mount(BridgeTransactionsHistory, {
    global: {
      stubs: {
        's-card': { template: '<div><slot /></div>' },
        's-form': { template: '<form><slot /></form>' },
        's-button': { template: '<button><slot /></button>' },
        's-icon': { template: '<i />' },
        'generic-page-header': { template: '<div><slot /><slot name="back" /></div>' },
        'bridge-network-selector': { template: '<div class="bridge-network-selector" />' },
        'formatted-amount': { template: '<span class="formatted-amount"><slot /></span>' },
        'history-pagination': {
          props: ['currentPage', 'pageAmount', 'total', 'lastPage'],
          template: '<div class="pagination"><slot /></div>',
        },
        'search-input': {
          props: ['modelValue'],
          emits: ['update:modelValue', 'clear'],
          template:
            '<input class="search-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
      },
      directives: {
        button: () => undefined,
        loading: () => undefined,
      },
    },
  });

  await nextTick();
  await nextTick();

  return wrapper;
};

const resetEnvironment = () => {
  shared.historyRef.value = {};
  shared.networkHistoryLoading.value = false;
  shared.registeredAssets['asset-1'] = {
    address: 'asset-1',
    decimals: 12,
  };
  shared.registeredAssets['asset-2'] = {
    address: 'asset-2',
    decimals: 12,
  };

  shared.bridgeStoreMock.updateBridgeHistory.mockClear();
  shared.updateExternalHistoryMock.mockClear();
  shared.withLoadingMock.mockClear();
  shared.navigateToBridgeMock.mockClear();
  shared.setHistoryPageMock.mockClear();
  shared.showHistoryMock.mockClear();
  shared.parentLoading.value = false;
  shared.historyPage.value = 1;
  shared.networkHistoryId.value = 'network-1';
};

describe('BridgeTransactionsHistory.vue', () => {
  beforeEach(() => {
    resetEnvironment();
  });

  it('filters history items by query and resets pagination', async () => {
    setHistoryItems([
      createHistoryItem('tx-1', { assetAddress: 'asset-1', symbol: 'AAA', startTime: 2 }),
      createHistoryItem('tx-2', { assetAddress: 'asset-2', symbol: 'BBB', startTime: 3 }),
    ]);

    const wrapper = await mountHistoryView();

    expect(wrapper.vm.filteredHistoryItems.length).toBe(2);

    wrapper.vm.query = 'bbb';
    await nextTick();

    expect(wrapper.vm.filteredHistoryItems.length).toBe(1);

    wrapper.vm.handleResetSearch();
    await nextTick();

    expect(wrapper.vm.query).toBe('');
    expect(wrapper.vm.currentPage).toBe(1);
    expect(wrapper.vm.isLtrDirection).toBe(true);
    expect(shared.setHistoryPageMock).toHaveBeenCalledWith(1);

    wrapper.unmount();
  });

  it('shows the newest bridge transactions first on the current page', async () => {
    setHistoryItems([
      createHistoryItem('tx-older', { startTime: 100 }),
      createHistoryItem('tx-newest', { startTime: 300 }),
      createHistoryItem('tx-middle', { startTime: 200 }),
    ]);

    const wrapper = await mountHistoryView();

    expect(wrapper.vm.filteredHistoryItems.map((item: { id: string }) => item.id)).toEqual([
      'tx-newest',
      'tx-middle',
      'tx-older',
    ]);

    wrapper.unmount();
  });

  it('switches pagination direction when navigating to the last page', async () => {
    const items = Array.from({ length: 10 }, (_, index) =>
      createHistoryItem(`tx-${index}`, { startTime: index + 1, direction: index % 2 ? 'incoming' : 'outgoing' })
    );
    setHistoryItems(items);

    const wrapper = await mountHistoryView();

    wrapper.vm.currentPage = wrapper.vm.lastPage - 1;
    await nextTick();

    wrapper.vm.handlePaginationClick(WALLET_CONSTS.PaginationButton.Next);
    await nextTick();

    expect(wrapper.vm.isLtrDirection).toBe(false);
    expect(wrapper.vm.currentPage).toBe(wrapper.vm.lastPage);
    expect(shared.setHistoryPageMock).toHaveBeenCalledWith(wrapper.vm.currentPage);

    wrapper.unmount();
  });

  it('wraps external history refresh with loader handling', async () => {
    setHistoryItems([createHistoryItem('tx-1')]);

    const wrapper = await mountHistoryView();
    let resolveRefresh!: () => void;
    shared.updateExternalHistoryMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        })
    );

    const refreshPromise = wrapper.vm.refreshExternalHistory(true);

    await nextTick();

    expect(shared.parentLoading.value).toBe(true);

    resolveRefresh();
    await refreshPromise;

    expect(shared.updateExternalHistoryMock).toHaveBeenCalledWith(true);
    expect(shared.withLoadingMock).toHaveBeenCalled();
    expect(shared.parentLoading.value).toBe(false);

    wrapper.unmount();
  });

  it('navigates back to bridge and resets page state', async () => {
    setHistoryItems([createHistoryItem('tx-1')]);

    const wrapper = await mountHistoryView();

    wrapper.vm.handleBack();

    expect(shared.setHistoryPageMock).toHaveBeenCalledWith(1);
    expect(shared.navigateToBridgeMock).toHaveBeenCalled();

    wrapper.unmount();
  });
});
