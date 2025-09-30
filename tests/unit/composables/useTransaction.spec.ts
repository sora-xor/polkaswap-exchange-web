import { api } from '@soramitsu/soraneo-wallet-web';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTransaction } from '@/composables/useTransaction';

const addActiveTx = vi.hoisted(() => vi.fn());
const withAppNotification = vi.fn(async (handler: () => Promise<void> | void) => {
  await handler?.();
});
const showAppNotification = vi.fn();
const notificationMock = { withAppNotification, showAppNotification };

vi.mock('@soramitsu/soraneo-wallet-web/src/composables/useNotification', () => ({
  useNotification: () => notificationMock,
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@soramitsu/soraneo-wallet-web', () => ({
  api: {
    historyList: [] as Array<{ id: string; startTime: string }> & {
      push: Array<{ id: string; startTime: string }>['push'];
    },
  },
  useNotification: () => notificationMock,
  WALLET_CONSTS: { TranslationConsts: {} },
  components: {},
  storage: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
  settingsStorage: { get: vi.fn(), set: vi.fn() },
}));

vi.mock('@soramitsu/soraneo-wallet-web/src/util', () => ({
  beforeTransactionSign: vi.fn(),
  delay: vi.fn(async () => undefined),
}));

vi.mock('@/store', () => ({
  default: {
    state: {
      settings: {
        isWalletLoaded: true,
        language: 'en',
      },
      wallet: {
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
});
