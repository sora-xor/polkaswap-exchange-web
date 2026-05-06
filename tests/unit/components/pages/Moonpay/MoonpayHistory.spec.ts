import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MoonpayHistory from '@/components/pages/Moonpay/MoonpayHistory.vue';
import { MoonpayTransactionStatus } from '@/utils/moonpay';

import type { Nullable } from '@/types/common';
import type { MoonpayTransaction } from '@/utils/moonpay';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';

const shared = vi.hoisted(() => ({
  ctx: null as Nullable<Awaited<ReturnType<typeof createContext>>>,
}));

async function createContext() {
  const { reactive, ref, computed } = await import('vue');

  const state = reactive({
    moonpay: {
      transactions: [] as MoonpayTransaction[],
      currencies: [] as { id: string; code: string }[],
    },
    settings: {
      language: 'en',
    },
  });

  const moonpayStore = reactive({
    get transactions() {
      return state.moonpay.transactions;
    },
    get currencies() {
      return state.moonpay.currencies;
    },
    getTransactions: vi.fn(async () => undefined),
    getCurrencies: vi.fn(async () => undefined),
  });

  const loadingRef = ref(false);
  const isLoggedInRef = ref(true);
  const settingsStore = reactive({ libraryTheme: 'light' });
  const web3Store = reactive({ isValidNetwork: true });
  const moonpayApiMock = {
    createWidgetUrl: vi.fn(),
  };
  const initMoonpayApiMock = vi.fn();
  const prepareEvmNetworkMock = vi.fn(async () => undefined);
  const showHistoryMock = vi.fn(async () => undefined);
  const prepareMoonpayTxForBridgeTransferMock = vi.fn(async () => undefined);
  const getBridgeHistoryItemByMoonpayIdMock = vi.fn(() => bridgeTransactionRef.value);
  const changeEvmNetworkProvidedMock = vi.fn();
  const withApiMock = vi.fn(async (handler: () => unknown | Promise<unknown>) => {
    loadingRef.value = true;
    await handler();
    loadingRef.value = false;
  });

  const bridgeTransactionRef = ref(null);
  const evmAddressRef = ref('0xabc');

  const reset = () => {
    state.moonpay.transactions = [];
    state.moonpay.currencies = [];
    state.settings.language = 'en';
    web3Store.isValidNetwork = true;
    loadingRef.value = false;
    isLoggedInRef.value = true;
    bridgeTransactionRef.value = null;
    evmAddressRef.value = '0xabc';
    initMoonpayApiMock.mockClear();
    prepareEvmNetworkMock.mockClear();
    showHistoryMock.mockClear();
    prepareMoonpayTxForBridgeTransferMock.mockClear();
    getBridgeHistoryItemByMoonpayIdMock.mockClear();
    changeEvmNetworkProvidedMock.mockClear();
    withApiMock.mockClear();
    moonpayStore.getTransactions.mockClear();
    moonpayStore.getCurrencies.mockClear();
  };

  return {
    state,
    moonpayStore,
    settingsStore,
    web3Store,
    loadingRef,
    isLoggedInRef,
    moonpayApiMock,
    initMoonpayApiMock,
    prepareEvmNetworkMock,
    showHistoryMock,
    prepareMoonpayTxForBridgeTransferMock,
    getBridgeHistoryItemByMoonpayIdMock,
    changeEvmNetworkProvidedMock,
    withApiMock,
    bridgeTransactionRef,
    evmAddressRef,
    reset,
    computed,
  };
}

async function getContext() {
  if (!shared.ctx) {
    shared.ctx = await createContext();
  }
  return shared.ctx;
}

vi.mock('@/stores/moonpay', async () => {
  const ctx = await getContext();
  return {
    useMoonpayStore: () => ctx.moonpayStore,
  };
});

vi.mock('@/stores/settings', async () => {
  const ctx = await getContext();
  return {
    useSettingsStore: () => ctx.settingsStore,
  };
});

vi.mock('@/stores/web3', async () => {
  const ctx = await getContext();
  return {
    useWeb3Store: () => ctx.web3Store,
  };
});

vi.mock('@/lib/soraneo-wallet/src/components/FormattedAmount.vue', () => ({
  default: {
    name: 'FormattedAmountStub',
    props: ['value'],
    template: '<div class="formatted-amount"><slot /></div>',
  },
}));

vi.mock('@/lib/soraneo-wallet/src/components/HistoryPagination.vue', () => ({
  default: {
    name: 'HistoryPaginationStub',
    props: ['currentPage', 'pageAmount', 'total', 'loading', 'lastPage'],
    emits: ['pagination-click'],
    template:
      '<div class="history-pagination-stub"><button @click="$emit(\'pagination-click\', \'next\')">next</button></div>',
  },
}));

vi.mock('@/components/shared/Logo/Moonpay.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  default: {
    name: 'MoonpayLogoStub',
    template: '<div class="moonpay-logo-stub" />',
  },
}));

vi.mock('@/components/shared/Widget/IFrame.vue', () => ({
  default: {
    name: 'IFrameWidgetStub',
    template: '<div class="lazy-component-stub"><slot /></div>',
  },
}));

vi.mock('@/utils', () => ({
  getCssVariableValue: vi.fn(() => '#445566'),
  toQueryString: (params: Record<string, string>) =>
    Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join('&'),
}));

vi.mock('@/composables/useTranslation', async () => {
  const ctx = await getContext();
  return {
    useTranslation: () => ({
      t: (key: string) => key,
      language: ctx.computed(() => ctx.state.settings.language),
      formatDate: (timestamp: number) => new Date(timestamp).toISOString(),
    }),
  };
});

vi.mock('@/composables/useMoonpayBridge', async () => {
  const ctx = await getContext();
  return {
    useMoonpayBridge: () => ({
      loading: ctx.loadingRef,
      withApi: ctx.withApiMock,
      initMoonpayApi: ctx.initMoonpayApiMock,
      prepareEvmNetwork: ctx.prepareEvmNetworkMock,
      showHistory: ctx.showHistoryMock,
      prepareMoonpayTxForBridgeTransfer: ctx.prepareMoonpayTxForBridgeTransferMock,
      getBridgeHistoryItemByMoonpayId: ctx.getBridgeHistoryItemByMoonpayIdMock,
      walletConnect: {
        evmAddress: ctx.computed(() => ctx.evmAddressRef.value),
        changeEvmNetworkProvided: ctx.changeEvmNetworkProvidedMock,
      },
      moonpayApi: ctx.computed(() => ctx.moonpayApiMock),
    }),
  };
});

const mountComponent = () =>
  mount(MoonpayHistory, {
    global: {
      directives: {
        loading: () => undefined,
        button: () => undefined,
      },
      stubs: {
        's-button': { template: '<button><slot /></button>' },
        's-icon': { template: '<i />' },
      },
    },
  });

beforeEach(async () => {
  vi.useFakeTimers();
  const ctx = await getContext();
  ctx.reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('MoonpayHistory.vue', () => {
  it('initialises moonpay data on mount', async () => {
    const ctx = await getContext();

    mountComponent();
    await vi.runAllTimersAsync();

    expect(ctx.withApiMock).toHaveBeenCalledTimes(1);
    expect(ctx.initMoonpayApiMock).toHaveBeenCalledTimes(1);
    expect(ctx.prepareEvmNetworkMock).toHaveBeenCalledTimes(1);
    expect(ctx.moonpayStore.getTransactions).toHaveBeenCalledTimes(1);
    expect(ctx.moonpayStore.getCurrencies).toHaveBeenCalledTimes(1);
  });

  it('formats completed transaction rows', async () => {
    const ctx = await getContext();
    ctx.state.moonpay.transactions = [
      {
        id: 'tx-1',
        updatedAt: '2025-01-01T00:00:00.000Z',
        walletAddress: '0xabc',
        status: MoonpayTransactionStatus.Completed,
        baseCurrencyId: 'usd',
        baseCurrencyAmount: 10,
        currencyId: 'eth',
        quoteCurrencyAmount: 0.5,
      } as unknown as MoonpayTransaction,
    ];
    ctx.state.moonpay.currencies = [
      { id: 'usd', code: 'usd' },
      { id: 'eth', code: 'eth' },
    ];

    const wrapper = mountComponent();
    await vi.runAllTimersAsync();

    expect((wrapper.vm as unknown as { formattedItems: Array<Record<string, unknown>> }).formattedItems).toHaveLength(
      1
    );
    expect(wrapper.find('.moonpay-history-item__wallet-address').text()).toBe('0xabc');
  });

  it('guards against invalid transaction payloads', async () => {
    const ctx = await getContext();
    ctx.state.moonpay.transactions = { broken: true } as unknown as MoonpayTransaction[];

    const wrapper = mountComponent();
    await vi.runAllTimersAsync();

    expect((wrapper.vm as unknown as { emptyHistory: boolean }).emptyHistory).toBe(true);
  });

  it('navigates to details and starts bridge transfer for completed items', async () => {
    const ctx = await getContext();
    const wrapper = mountComponent();
    const item = {
      id: 'tx-1',
      updatedAt: '2025-01-01T00:00:00.000Z',
      walletAddress: '0xabc',
      status: MoonpayTransactionStatus.Completed,
      baseCurrencyId: 'usd',
      baseCurrencyAmount: 10,
      currencyId: 'eth',
      quoteCurrencyAmount: 0.5,
    } as unknown as MoonpayTransaction;

    (wrapper.vm as unknown as { navigateToDetails: (item: MoonpayTransaction) => void }).navigateToDetails(item);
    await wrapper.vm.$nextTick();
    await (wrapper.vm as unknown as { handleTransaction: () => Promise<void> }).handleTransaction();

    expect(ctx.prepareMoonpayTxForBridgeTransferMock).toHaveBeenCalledWith(item);
  });

  it('opens bridge history for already-bridged moonpay items', async () => {
    const ctx = await getContext();
    ctx.bridgeTransactionRef.value = { id: 'bridge-1' } as EthHistory;
    const wrapper = mountComponent();
    const item = {
      id: 'tx-2',
      updatedAt: '2025-01-01T00:00:00.000Z',
      walletAddress: '0xabc',
      status: MoonpayTransactionStatus.Completed,
      baseCurrencyId: 'usd',
      baseCurrencyAmount: 10,
      currencyId: 'eth',
      quoteCurrencyAmount: 0.5,
    } as unknown as MoonpayTransaction;

    (wrapper.vm as unknown as { navigateToDetails: (item: MoonpayTransaction) => void }).navigateToDetails(item);
    await wrapper.vm.$nextTick();
    await (wrapper.vm as unknown as { handleTransaction: () => Promise<void> }).handleTransaction();

    expect(ctx.prepareEvmNetworkMock).toHaveBeenCalled();
    expect(ctx.showHistoryMock).toHaveBeenCalledWith('bridge-1');
  });
});
