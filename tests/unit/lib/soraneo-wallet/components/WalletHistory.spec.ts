import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

const currentPage = ref(1);
const isLtrDirection = ref(true);
const navigate = vi.hoisted(() => vi.fn());
const getExternalHistory = vi.hoisted(() => vi.fn(async () => undefined));
const getHistory = vi.hoisted(() => vi.fn());

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
  useWalletStore: () => ({
    assets: [],
    history: {},
    externalHistory: {},
    externalHistoryUpdates: {},
    externalHistoryTotal: 32,
    account: { address: 'account-address' },
    resetExternalHistory: vi.fn(),
    saveExternalHistoryUpdates: vi.fn(),
    getHistory,
    setTxDetailsId: vi.fn(),
    getExternalHistory,
    navigate,
  }),
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
  it('switches to reverse pagination when jumping to the last page', async () => {
    currentPage.value = 1;
    isLtrDirection.value = true;
    const state = (WalletHistory as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    await state.handlePaginationClick(PaginationButton.Last);

    expect(getExternalHistory).toHaveBeenCalledWith(expect.objectContaining({ page: 4 }));
    expect(currentPage.value).toBe(4);
    expect(isLtrDirection.value).toBe(false);
  });

  it('routes empty transaction detail requests back through the wallet store boundary', () => {
    const state = (WalletHistory as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    state.handleOpenTransactionDetails();

    expect(navigate).toHaveBeenCalledWith({ name: 'Wallet' });
  });
});
