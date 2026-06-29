import { Operation, TransactionStatus } from '@/lib/substrate/sdk/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTransaction } from '@/composables/useTransaction';
import { api } from '@/lib/soraneo-wallet/src/api';

const addActiveTx = vi.hoisted(() => vi.fn());
const removeActiveTransactions = vi.hoisted(() => vi.fn());
const addAsset = vi.hoisted(() => vi.fn(async () => undefined));
const beforeTransactionSign = vi.hoisted(() => vi.fn(async () => undefined));
const notificationStubs = vi.hoisted(() => {
  const withAppNotification = vi.fn(async (handler: () => Promise<void> | void) => {
    await handler?.();
  });
  const showAppNotification = vi.fn();

  return {
    notificationMock: { withAppNotification, showAppNotification },
    withAppNotification,
    showAppNotification,
  };
});
const notificationMock = notificationStubs.notificationMock;
const withAppNotification = notificationStubs.withAppNotification;
const showAppNotification = notificationStubs.showAppNotification;
const getOperationMessage = vi.hoisted(() => vi.fn(() => 'operation-message'));

vi.mock('@/composables/useNotification', () => ({
  useNotification: () => notificationMock,
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

type HistoryEntry = { id: string; startTime: string };
const historyList = vi.hoisted(() => [] as HistoryEntry[]);
const apiMock = vi.hoisted(() => ({
  api: { isReady: Promise.resolve() },
  historyList,
  swap: { isALT: false },
}));
const connectionMock = vi.hoisted(() => ({
  endpoint: 'wss://sora.example',
}));
const delayMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('@tests/stubs/walletRuntime', () => ({
  api: apiMock,
  useNotification: () => notificationMock,
  WALLET_CONSTS: {},
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: apiMock,
  connection: connectionMock,
}));

vi.mock('@/lib/soraneo-wallet/src/util', async () => {
  const actual = await vi.importActual<typeof import('@/lib/soraneo-wallet/src/util')>('@/lib/soraneo-wallet/src/util');

  return {
    __esModule: true,
    ...actual,
    delay: delayMock,
  };
});

vi.mock('@/composables/useOperations', () => ({
  useOperations: () => ({ getOperationMessage }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    addAsset,
    addActiveTransaction: addActiveTx,
    removeActiveTransactions,
    beforeTransactionSign,
    shouldBalanceBeHidden: false,
    accountAssetsAddressTable: {},
  }),
}));

describe('useTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delayMock.mockResolvedValue(undefined);
    (api.historyList as Array<{ id: string; startTime: string }>).length = 0;
    getOperationMessage.mockClear();
  });

  it('wraps handlers with wallet notification flow', async () => {
    const { withNotifications } = useTransaction();

    const handler = vi.fn(async () => {
      const time = Date.now() + 5;
      (api.historyList as Array<{ id: string; startTime: string }>).push({ id: 'tx-1', startTime: time.toString() });
    });

    const result = await withNotifications(handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(withAppNotification).toHaveBeenCalledTimes(1);
    expect(beforeTransactionSign).toHaveBeenCalledWith(api);
    expect(addActiveTx).toHaveBeenCalledWith('tx-1');
    expect(showAppNotification).toHaveBeenCalledWith('transactionSubmittedText', 'info');
    expect(result).toEqual({
      submitted: true,
      submittedAt: expect.any(Number),
      transaction: { id: 'tx-1', startTime: expect.any(String) },
    });
  });

  it('returns a submitted timeout result when wallet history never appears', async () => {
    const { loading, withNotifications } = useTransaction();

    const result = await withNotifications(vi.fn(async () => undefined));

    expect(result).toEqual({
      submitted: true,
      submittedAt: expect.any(Number),
      historyTimedOut: true,
    });
    expect(showAppNotification).toHaveBeenCalledWith('transactionSubmittedText', 'info');
    expect(addActiveTx).not.toHaveBeenCalled();
    expect(delayMock).toHaveBeenCalled();
    expect(loading.value).toBe(false);
  });

  it('returns an unsubmitted result when the wrapped handler fails', async () => {
    const error = new Error('wallet rejected');
    withAppNotification.mockImplementationOnce(async (handler: () => Promise<void> | void) => {
      try {
        await handler?.();
      } catch (err) {
        showAppNotification('wallet rejected', 'error');
        throw err;
      }
    });

    const { withNotifications } = useTransaction();
    const result = await withNotifications(
      vi.fn(async () => {
        throw error;
      })
    );

    expect(result).toEqual({ submitted: false, error });
    expect(showAppNotification).toHaveBeenCalledWith('wallet rejected', 'error');
    expect(addActiveTx).not.toHaveBeenCalled();
  });

  it('shows submitted notification before waiting for wallet history', async () => {
    let resolveDelay: () => void = () => undefined;
    delayMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveDelay = resolve;
        })
    );

    const { withNotifications } = useTransaction();
    const promise = withNotifications(vi.fn(async () => undefined));

    for (let i = 0; i < 5 && !delayMock.mock.calls.length; i += 1) {
      await Promise.resolve();
    }

    expect(showAppNotification).toHaveBeenCalledWith('transactionSubmittedText', 'info');
    expect(addActiveTx).not.toHaveBeenCalled();

    (api.historyList as Array<{ id: string; startTime: string }>).push({
      id: 'tx-delayed',
      startTime: String(Date.now() + 5),
    });
    resolveDelay();

    await promise;

    expect(addActiveTx).toHaveBeenCalledWith('tx-delayed');
  });

  it('shows error notification for failed transactions', () => {
    const { handleChangeTransaction } = useTransaction();
    const tx = { id: 'tx-error', status: TransactionStatus.Error } as any;

    handleChangeTransaction(tx, null);

    expect(getOperationMessage).toHaveBeenCalledWith(tx, false);
    expect(showAppNotification).toHaveBeenCalledWith('operation-message', 'error');
    expect(removeActiveTransactions).toHaveBeenCalledWith(['tx-error']);
  });

  it('shows success notification for new finalized transactions', () => {
    const { handleChangeTransaction } = useTransaction();
    const tx = { id: 'tx-final', status: TransactionStatus.Finalized } as any;
    const previous = { id: 'other', status: TransactionStatus.Finalized } as any;

    handleChangeTransaction(tx, previous);

    expect(showAppNotification).toHaveBeenCalledWith('operation-message', 'success');
    expect(removeActiveTransactions).toHaveBeenCalledWith(['tx-final']);
  });

  it('adds registered asset notifications when asset is missing', async () => {
    const { handleChangeTransaction } = useTransaction();
    const tx = {
      id: 'tx-reg',
      status: TransactionStatus.Finalized,
      type: Operation.RegisterAsset,
      assetAddress: '0x987',
      symbol: 'REG',
    } as any;

    handleChangeTransaction(tx, { id: 'tx-reg', status: TransactionStatus.Finalized } as any);

    expect(addAsset).toHaveBeenCalledWith('0x987');
    await Promise.resolve();
    expect(showAppNotification).toHaveBeenLastCalledWith('addAsset.success', 'success');
    expect(removeActiveTransactions).toHaveBeenCalledWith(['tx-reg']);
  });
});
