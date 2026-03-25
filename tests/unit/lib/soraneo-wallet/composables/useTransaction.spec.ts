import { Operation, TransactionStatus } from '@sora-substrate/sdk';
import { api } from '@/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const addActiveTransaction = vi.hoisted(() => vi.fn());
const removeActiveTransactions = vi.hoisted(() => vi.fn());
const addAsset = vi.hoisted(() => vi.fn(async () => undefined));
const beforeTransactionSign = vi.hoisted(() => vi.fn(async () => undefined));
const getOperationMessage = vi.hoisted(() => vi.fn(() => 'operation-message'));
const notificationState = vi.hoisted(() => {
  const withAppNotification = vi.fn(async (handler: () => Promise<void> | void) => {
    await handler?.();
  });
  const showAppNotification = vi.fn();

  return {
    withAppNotification,
    showAppNotification,
  };
});

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    addAsset,
    addActiveTransaction,
    removeActiveTransactions,
    beforeTransactionSign,
    shouldBalanceBeHidden: false,
    isWalletLoaded: true,
    accountAssetsAddressTable: {},
  }),
}));

vi.mock('@/composables/useLoading', () => ({
  useLoading: () => ({
    loading: false,
    withLoading: async (handler: () => Promise<void> | void) => {
      await handler?.();
    },
    withApi: vi.fn(),
    withChainApi: vi.fn(),
    withParentLoading: vi.fn(),
  }),
}));

vi.mock('@/composables/useNotification', () => ({
  useNotification: () => notificationState,
}));

vi.mock('@/composables/useOperations', () => ({
  useOperations: () => ({
    getOperationMessage,
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

type HistoryEntry = { id: string; startTime: string };
const historyList = vi.hoisted(() => [] as HistoryEntry[]);

vi.mock('@/api', () => ({
  api: {
    historyList,
    swap: { isALT: false },
  },
}));

vi.mock('@/util', async () => {
  const actual = await vi.importActual<typeof import('@/util')>('@/util');

  return {
    __esModule: true,
    ...actual,
    delay: vi.fn(async () => undefined),
  };
});

import { useTransaction } from '@/lib/soraneo-wallet/src/composables/useTransaction';

describe('wallet lib useTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    historyList.length = 0;
  });

  it('signs through the Pinia wallet store before submitting notifications', async () => {
    const { withNotifications } = useTransaction();

    const handler = vi.fn(async () => {
      historyList.push({ id: 'tx-1', startTime: String(Date.now() + 5) });
    });

    await withNotifications(handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(notificationState.withAppNotification).toHaveBeenCalledTimes(1);
    expect(beforeTransactionSign).toHaveBeenCalledWith(api);
    expect(addActiveTransaction).toHaveBeenCalledWith('tx-1');
    expect(notificationState.showAppNotification).toHaveBeenCalledWith('transactionSubmittedText');
  });

  it('adds a newly registered asset through the Pinia wallet store when it is missing locally', async () => {
    const { handleChangeTransaction } = useTransaction();
    const tx = {
      id: 'tx-reg',
      status: TransactionStatus.Finalized,
      type: Operation.RegisterAsset,
      assetAddress: '0x987',
      symbol: 'REG',
    } as never;

    handleChangeTransaction(tx, { id: 'tx-reg', status: TransactionStatus.Finalized } as never);

    expect(addAsset).toHaveBeenCalledWith('0x987');
    await Promise.resolve();
    expect(notificationState.showAppNotification).toHaveBeenLastCalledWith('addAsset.success', 'success');
    expect(removeActiveTransactions).toHaveBeenCalledWith(['tx-reg']);
  });
});
