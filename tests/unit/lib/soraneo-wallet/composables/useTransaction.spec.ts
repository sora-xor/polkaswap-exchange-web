import { beforeEach, describe, expect, it, vi } from 'vitest';

const beforeTransactionSign = vi.hoisted(() => vi.fn(async () => undefined));
const useWalletStoreMock = vi.hoisted(() => vi.fn());
const showAppNotificationMock = vi.hoisted(() => vi.fn());
const withAppNotificationMock = vi.hoisted(() => vi.fn(async (handler: () => Promise<void>) => await handler()));
const getOperationMessageMock = vi.hoisted(() => vi.fn(() => 'operation-message'));
const api = vi.hoisted(() => ({
  historyList: [] as Array<{ id: string; startTime: string }>,
}));

vi.mock('@/api', () => ({
  api,
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    tc: (key: string) => key,
    te: () => true,
    formatDate: () => '',
    TranslationConsts: {},
    dayjsLocale: 'en',
    language: 'en',
    tOrdinal: vi.fn(),
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: useWalletStoreMock,
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useNotification', () => ({
  useNotification: () => ({
    t: (key: string) => key,
    te: () => true,
    tc: (key: string) => key,
    formatDate: () => '',
    TranslationConsts: {},
    dayjsLocale: 'en',
    getErrorMessage: vi.fn(),
    showAppAlert: vi.fn(),
    showAppNotification: showAppNotificationMock,
    withAppNotification: withAppNotificationMock,
    withAppAlert: vi.fn(),
    setDefaultErrorTranslationKey: vi.fn(),
    registerErrorMapping: vi.fn(),
    replaceErrorMappings: vi.fn(),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useOperations', () => ({
  useOperations: () => ({
    account: { address: 'sender' },
    t: (key: string) => key,
    TranslationConsts: {},
    formatDate: () => '',
    tc: (key: string) => key,
    te: () => true,
    dayjsLocale: 'en',
    Zero: {},
    Hundred: {},
    MaxInputNumber: '0',
    getFPNumber: vi.fn(),
    getFPNumberFromCodec: vi.fn(),
    formatCodecNumber: vi.fn(),
    formatStringValue: vi.fn(),
    getStringFromCodec: vi.fn(),
    isCodecZero: vi.fn(),
    getCorrectSupply: vi.fn(),
    getTitle: vi.fn(),
    getOperationMessage: getOperationMessageMock,
  }),
}));

import { useTransaction } from '@/lib/soraneo-wallet/src/composables/useTransaction';

describe('useTransaction', () => {
  let walletStore: any;

  beforeEach(() => {
    vi.clearAllMocks();
    api.historyList = [];
    walletStore = {
      isWalletLoaded: true,
      shouldBalanceBeHidden: false,
      accountAssetsAddressTable: {},
      beforeTransactionSign,
      addActiveTransaction: vi.fn(),
      removeActiveTransactions: vi.fn(),
    };
    useWalletStoreMock.mockReturnValue(walletStore);
  });

  it('resolves the wallet store from Pinia and tracks submitted transactions', async () => {
    const handler = vi.fn(async () => {
      api.historyList.push({
        id: 'tx-1',
        startTime: String(Date.now() + 1),
      });
    });

    const { withNotifications } = useTransaction();
    await withNotifications(handler);

    expect(beforeTransactionSign).toHaveBeenCalledWith(api);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(walletStore.addActiveTransaction).toHaveBeenCalledWith('tx-1');
    expect(showAppNotificationMock).toHaveBeenCalledWith('transactionSubmittedText');
  });
});
