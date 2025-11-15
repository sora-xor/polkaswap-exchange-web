import { Operation, TransactionStatus } from '@sora-substrate/sdk';
import { api } from '@wallet';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTransaction } from '@/composables/useTransaction';

const addActiveTx = vi.hoisted(() => vi.fn());
const removeActiveTxs = vi.hoisted(() => vi.fn());
const addAsset = vi.hoisted(() => vi.fn(async () => undefined));
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

vi.mock('@wallet', async () => {
  const { createWalletMock, withWalletMock } = await import('@tests/stubs/createWalletMock');
  const wallet = createWalletMock();

  return withWalletMock(wallet, {
    api: {
      ...wallet.api,
      historyList,
    },
    useNotification: () => notificationMock,
  });
});

vi.mock('@wallet/src/util', async () => {
  const actual = await vi.importActual<typeof import('@wallet/src/util')>('@wallet/src/util');

  return {
    __esModule: true,
    ...actual,
    beforeTransactionSign: vi.fn(),
    delay: vi.fn(async () => undefined),
  };
});

vi.mock('@/composables/useOperations', () => ({
  useOperations: () => ({ getOperationMessage }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    addAsset,
  }),
}));

vi.mock('@/store', () => ({
  default: {
    state: {
      settings: {
        isWalletLoaded: true,
        language: 'en',
      },
      wallet: {
        settings: {
          shouldBalanceBeHidden: false,
        },
        transactions: {
          isConfirmTxDialogDisabled: false,
        },
        account: {
          address: '',
          fiatPriceObject: {},
        },
      },
    },
    getters: {
      assets: {
        xor: { symbol: 'XOR' },
      },
      settings: {
        debugEnabled: false,
        nodeIsConnected: true,
        liquiditySource: null,
      },
      wallet: {
        account: {
          isLoggedIn: true,
          accountAssetsAddressTable: {},
        },
      },
    },
    commit: {
      wallet: {
        transactions: {
          addActiveTx,
          removeActiveTxs,
        },
      },
    },
    dispatch: {
      wallet: {
        account: {
          logout: vi.fn(),
        },
      },
    },
    original: {},
  },
}));

describe('useTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.historyList as Array<{ id: string; startTime: string }>).length = 0;
    getOperationMessage.mockClear();
  });

  it('wraps handlers with wallet notification flow', async () => {
    const { withNotifications } = useTransaction();

    const handler = vi.fn(async () => {
      const time = Date.now() + 5;
      (api.historyList as Array<{ id: string; startTime: string }>).push({ id: 'tx-1', startTime: time.toString() });
    });

    await withNotifications(handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(withAppNotification).toHaveBeenCalledTimes(1);
    expect(addActiveTx).toHaveBeenCalledWith('tx-1');
    expect(showAppNotification).toHaveBeenCalledWith('transactionSubmittedText');
  });

  it('shows error notification for failed transactions', () => {
    const { handleChangeTransaction } = useTransaction();
    const tx = { id: 'tx-error', status: TransactionStatus.Error } as any;

    handleChangeTransaction(tx, null);

    expect(getOperationMessage).toHaveBeenCalledWith(tx, false);
    expect(showAppNotification).toHaveBeenCalledWith('operation-message', 'error');
    expect(removeActiveTxs).toHaveBeenCalledWith(['tx-error']);
  });

  it('shows success notification for new finalized transactions', () => {
    const { handleChangeTransaction } = useTransaction();
    const tx = { id: 'tx-final', status: TransactionStatus.Finalized } as any;
    const previous = { id: 'other', status: TransactionStatus.Finalized } as any;

    handleChangeTransaction(tx, previous);

    expect(showAppNotification).toHaveBeenCalledWith('operation-message', 'success');
    expect(removeActiveTxs).toHaveBeenCalledWith(['tx-final']);
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
    expect(removeActiveTxs).toHaveBeenCalledWith(['tx-reg']);
  });
});
