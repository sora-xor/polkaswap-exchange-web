import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';

const beforeTransactionSign = vi.hoisted(() => vi.fn(async () => undefined));
const useWalletStoreMock = vi.hoisted(() => vi.fn());
const showAppNotificationMock = vi.hoisted(() => vi.fn());
const withAppNotificationMock = vi.hoisted(() => vi.fn(async (handler: () => Promise<void>) => await handler()));
const getOperationMessageMock = vi.hoisted(() => vi.fn(() => 'operation-message'));
const delayMock = vi.hoisted(() => vi.fn(async (): Promise<void> => undefined));
const api = vi.hoisted(() => ({
  api: { isReady: Promise.resolve() },
  historyList: [] as Array<{ id: string; startTime: string }>,
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api,
}));

vi.mock('@/util', async () => {
  const actual = await vi.importActual<typeof import('@/util')>('@/util');

  return {
    __esModule: true,
    ...actual,
    delay: delayMock,
  };
});

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
    delayMock.mockResolvedValue(undefined);
    api.historyList = [];
    walletStore = reactive({
      isWalletLoaded: true,
      shouldBalanceBeHidden: false,
      accountAssetsAddressTable: {},
      beforeTransactionSign,
      addActiveTransaction: vi.fn(),
      removeActiveTransactions: vi.fn(),
    });
    useWalletStoreMock.mockReturnValue(walletStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves the wallet store and tracks same-millisecond history insertion', async () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const handler = vi.fn(async () => {
      api.historyList.push({
        id: 'tx-1',
        startTime: String(now),
      });
    });

    const { withNotifications } = useTransaction();
    const result = await withNotifications(handler);

    expect(beforeTransactionSign).toHaveBeenCalledWith(api);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(walletStore.addActiveTransaction).toHaveBeenCalledWith('tx-1');
    expect(showAppNotificationMock).toHaveBeenCalledWith('transactionSubmittedText', 'info');
    expect(result).toEqual({
      submitted: true,
      submittedAt: now,
      transaction: { id: 'tx-1', startTime: String(now) },
    });
  });

  it('reserves distinct history items for concurrent submissions', async () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    let resolveFirst!: () => void;
    let resolveSecond!: () => void;
    let releaseHistoryPoll: (() => void) | undefined;
    delayMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseHistoryPoll = resolve;
        })
    );

    const { withNotifications: firstWithNotifications } = useTransaction();
    const { withNotifications: secondWithNotifications } = useTransaction();
    const firstResult = firstWithNotifications(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = resolve;
        })
    );
    const secondResult = secondWithNotifications(
      () =>
        new Promise<void>((resolve) => {
          resolveSecond = resolve;
        })
    );

    for (let attempt = 0; attempt < 20 && (!resolveFirst || !resolveSecond); attempt += 1) {
      await Promise.resolve();
    }

    api.historyList.push({ id: 'tx-1', startTime: String(now + 1) });
    resolveFirst();
    resolveSecond();

    for (let attempt = 0; attempt < 20 && !releaseHistoryPoll; attempt += 1) {
      await Promise.resolve();
    }

    api.historyList.push({ id: 'tx-2', startTime: String(now + 1) });
    releaseHistoryPoll?.();

    const results = await Promise.all([firstResult, secondResult]);
    expect(results.map((result) => result.transaction?.id).sort()).toEqual(['tx-1', 'tx-2']);
    expect(walletStore.addActiveTransaction.mock.calls.map(([id]: [string]) => id).sort()).toEqual(['tx-1', 'tx-2']);
  });

  it('returns a submitted timeout result when wallet history never appears', async () => {
    const { loading, withNotifications } = useTransaction();

    const result = await withNotifications(vi.fn(async () => undefined));

    expect(result).toEqual({
      submitted: true,
      submittedAt: expect.any(Number),
      historyTimedOut: true,
    });
    expect(showAppNotificationMock).toHaveBeenCalledWith('transactionSubmittedText', 'info');
    expect(walletStore.addActiveTransaction).not.toHaveBeenCalled();
    expect(delayMock).toHaveBeenCalled();
    expect(loading.value).toBe(false);
  });

  it('returns the reactive hidden-balance flag used by wallet send max availability', () => {
    const { shouldBalanceBeHidden } = useTransaction();

    expect(shouldBalanceBeHidden.value).toBe(false);

    walletStore.shouldBalanceBeHidden = true;

    expect(shouldBalanceBeHidden.value).toBe(true);
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

    expect(showAppNotificationMock).toHaveBeenCalledWith('transactionSubmittedText', 'info');
    expect(walletStore.addActiveTransaction).not.toHaveBeenCalled();

    api.historyList.push({
      id: 'tx-delayed',
      startTime: String(Date.now() + 5),
    });
    resolveDelay();

    await promise;

    expect(walletStore.addActiveTransaction).toHaveBeenCalledWith('tx-delayed');
  });
});
