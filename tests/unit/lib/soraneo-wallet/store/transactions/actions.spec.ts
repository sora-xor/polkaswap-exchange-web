import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCurrentIndexerMock = vi.hoisted(() => vi.fn());
const startPendingTxsSubscriptionMock = vi.hoisted(() => vi.fn());
const createHistorySubscriptionMock = vi.hoisted(() => vi.fn());
const parseTransactionAsHistoryItemMock = vi.hoisted(() => vi.fn());

vi.mock('direct-vuex', () => ({
  defineActions: (actions: Record<string, unknown>) => actions,
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    history: {},
    mst: {
      isMstAddressExist: true,
      getMstAddress: vi.fn(() => 'mst-address'),
      startPendingTxsSubscription: startPendingTxsSubscriptionMock,
      pendingTxsUpdated: {
        subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
      },
      isMST: vi.fn(() => false),
      formatAddress: vi.fn((value: string) => value),
      getPrevoiusAccount: vi.fn(() => ''),
      stopPendingTxsSubscription: vi.fn(),
    },
  },
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: getCurrentIndexerMock,
}));

vi.mock('@/lib/soraneo-wallet/src/consts', () => ({
  accountIdBasedOperations: [],
}));

vi.mock('@/lib/soraneo-wallet/src/store/transactions', () => ({
  transactionsActionContext: (context: Record<string, unknown>) => context,
}));

import actions from '@/lib/soraneo-wallet/src/store/transactions/actions';

describe('wallet transactions actions', () => {
  beforeEach(() => {
    getCurrentIndexerMock.mockReset();
    startPendingTxsSubscriptionMock.mockReset();
    createHistorySubscriptionMock.mockReset();
    parseTransactionAsHistoryItemMock.mockReset();
  });

  it('skips external history subscription when wallet account state is absent', async () => {
    const commit = {
      resetExternalHistorySubscription: vi.fn(),
      setExternalHistorySubscription: vi.fn(),
    };
    const context = {
      commit,
      rootGetters: {
        wallet: {},
      },
    };

    await expect(actions.subscribeOnExternalHistory(context as any)).resolves.toBeUndefined();

    expect(commit.resetExternalHistorySubscription).toHaveBeenCalledTimes(1);
    expect(commit.setExternalHistorySubscription).not.toHaveBeenCalled();
    expect(getCurrentIndexerMock).not.toHaveBeenCalled();
  });

  it('skips pending MST subscription when account is not logged in', async () => {
    const commit = {
      resetPendingMstTxsSubscription: vi.fn(),
      setPendingMstTransactions: vi.fn(),
      setPendingMstTxsSubscription: vi.fn(),
      getHistory: vi.fn(),
    };
    const context = {
      commit,
      rootGetters: {
        wallet: {
          account: {
            isLoggedIn: false,
            account: {
              address: 'cnAccount',
            },
          },
        },
      },
    };

    await expect(actions.trackPendingMstTxs(context as any)).resolves.toBeUndefined();

    expect(commit.resetPendingMstTxsSubscription).toHaveBeenCalledTimes(1);
    expect(startPendingTxsSubscriptionMock).not.toHaveBeenCalled();
    expect(commit.setPendingMstTransactions).not.toHaveBeenCalled();
  });

  it('handles external history updates safely when wallet getters are unavailable during callback', async () => {
    let onHistory: ((transaction: unknown) => Promise<void>) | null = null;

    createHistorySubscriptionMock.mockImplementation(
      (_address: string, callback: (transaction: unknown) => Promise<void>) => {
        onHistory = callback;
        return { unsubscribe: vi.fn() };
      }
    );
    parseTransactionAsHistoryItemMock.mockResolvedValue({
      id: 'tx-1',
      type: 'Transfer',
      to: 'cnAddress',
      assetAddress: '0x01',
    });
    getCurrentIndexerMock.mockReturnValue({
      services: {
        explorer: {
          account: {
            createHistorySubscription: createHistorySubscriptionMock,
          },
        },
        dataParser: {
          parseTransactionAsHistoryItem: parseTransactionAsHistoryItemMock,
        },
      },
    });

    const commit = {
      resetExternalHistorySubscription: vi.fn(),
      setExternalHistorySubscription: vi.fn(),
      removeHistoryByIds: vi.fn(),
      getHistory: vi.fn(),
      setExternalHistoryUpdates: vi.fn(),
    };
    const context = {
      commit,
      state: {
        saveExternalHistoryUpdates: false,
        externalHistory: {},
        externalHistoryUpdates: {},
      },
      rootState: {
        wallet: {
          settings: {
            allowTopUpAlert: true,
          },
        },
      },
      rootGetters: {
        wallet: {
          account: {
            isLoggedIn: true,
            account: { address: 'cnAddress' },
            whitelist: {},
          },
        },
      },
    };

    await expect(actions.subscribeOnExternalHistory(context as any)).resolves.toBeUndefined();

    expect(createHistorySubscriptionMock).toHaveBeenCalledWith('cnAddress', expect.any(Function));
    expect(onHistory).not.toBeNull();

    context.rootGetters = { wallet: {} };
    await expect(onHistory?.({ id: 'h-1' })).resolves.toBeUndefined();

    expect(parseTransactionAsHistoryItemMock).toHaveBeenCalled();
  });
});
