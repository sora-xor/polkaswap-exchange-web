import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mountSetup } from '@stubs/mountSetup';

const currentPage = ref(1);
const isLtrDirection = ref(true);
const navigate = vi.hoisted(() => vi.fn());
const getExternalHistory = vi.hoisted(() => vi.fn(async () => undefined));
const getHistory = vi.hoisted(() => vi.fn());
const getOperationMessage = vi.hoisted(() => vi.fn(() => 'operation-message'));
const walletStore = vi.hoisted(() => ({
  assets: [] as Array<Record<string, unknown>>,
  history: {} as Record<string, Record<string, unknown>>,
  externalHistory: {} as Record<string, Record<string, unknown>>,
  externalHistoryUpdates: {} as Record<string, Record<string, unknown>>,
  externalHistoryTotal: 32,
  shouldBalanceBeHidden: false,
  account: { address: 'account-address' },
  resetExternalHistory: vi.fn(),
  saveExternalHistoryUpdates: vi.fn(),
  getHistory,
  setTxDetailsId: vi.fn(),
  getExternalHistory,
  navigate,
}));

vi.mock('@/lib/soraneo-wallet/src/composables/usePaginationSearch', () => ({
  usePaginationSearch: () => ({
    currentPage,
    pageAmount: ref(8),
    query: ref(''),
    searchQuery: ref(''),
    isLtrDirection,
    resetPage: vi.fn(),
    resetSearch: vi.fn(),
    sortTransactions: vi.fn((items: unknown[]) => items),
    getPageItems: vi.fn((items: unknown[], start = 0, end = items.length) => items.slice(start, end)),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useTransaction', () => ({
  useTransaction: () => ({
    t: (key: string) => key,
    formatDate: vi.fn(() => ''),
    getTitle: vi.fn(() => ''),
    getOperationMessage,
    loading: ref(false),
    withLoading: vi.fn((handler: () => Promise<unknown>) => handler()),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useEthBridgeTransaction', () => ({
  useEthBridgeTransaction: () => ({
    isEthBridgeTx: vi.fn(() => false),
    isEthBridgeTxToCompleted: vi.fn(() => false),
    isEthBridgeTxFromFailed: vi.fn(() => false),
    isEthBridgeTxToFailed: vi.fn(() => false),
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStore,
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => ({
    services: {
      dataParser: {
        supportedOperations: [],
      },
    },
  }),
}));

import WalletHistory from '@/lib/soraneo-wallet/src/components/WalletHistory.vue';
import { PaginationButton } from '@/lib/soraneo-wallet/src/consts';

describe('Wallet WalletHistory', () => {
  beforeEach(() => {
    currentPage.value = 1;
    isLtrDirection.value = true;
    walletStore.assets = [];
    walletStore.history = {};
    walletStore.externalHistory = {};
    walletStore.externalHistoryUpdates = {};
    walletStore.externalHistoryTotal = 32;
    walletStore.shouldBalanceBeHidden = false;
    walletStore.account = { address: 'account-address' };
    walletStore.resetExternalHistory.mockClear();
    walletStore.saveExternalHistoryUpdates.mockClear();
    walletStore.setTxDetailsId.mockClear();
    getExternalHistory.mockClear();
    getHistory.mockClear();
    getOperationMessage.mockClear();
    navigate.mockClear();
  });

  it('switches to reverse pagination when jumping to the last page', async () => {
    const { state } = mountSetup(WalletHistory as any, {}, { emit: vi.fn() });

    await state.handlePaginationClick(PaginationButton.Last);

    expect(getExternalHistory).toHaveBeenCalledWith(expect.objectContaining({ page: 4 }));
    expect(currentPage.value).toBe(4);
    expect(isLtrDirection.value).toBe(false);
  });

  it('routes empty transaction detail requests back through the wallet store boundary', () => {
    const { state } = mountSetup(WalletHistory as any, {}, { emit: vi.fn() });

    state.handleOpenTransactionDetails();

    expect(navigate).toHaveBeenCalledWith({ name: 'Wallet' });
  });

  it('renders transaction messages from the activity history list', () => {
    walletStore.externalHistoryTotal = 0;
    walletStore.shouldBalanceBeHidden = true;
    walletStore.history = {
      'tx-1': {
        id: 'tx-1',
        type: 'Transfer',
        status: 'finalized',
        startTime: 1,
      },
    };

    const wrapper = mount(WalletHistory as any, {
      global: {
        stubs: {
          SearchInput: true,
          HistoryPagination: true,
        },
      },
    });

    expect(wrapper.find('.history-item-title').text()).toBe('operation-message');
    expect(getOperationMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'tx-1' }), true);
  });

  it('renders the empty state without formatting a missing transaction', () => {
    walletStore.externalHistoryTotal = 0;
    walletStore.history = {};
    walletStore.externalHistory = {};

    const wrapper = mount(WalletHistory as any, {
      global: {
        stubs: {
          SearchInput: true,
          HistoryPagination: true,
        },
      },
    });

    expect(wrapper.find('.history-empty').text()).toBe('history.empty');
    expect(wrapper.find('.history-item-title').exists()).toBe(false);
    expect(getOperationMessage).not.toHaveBeenCalled();
  });
});
