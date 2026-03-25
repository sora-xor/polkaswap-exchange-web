import { beforeEach, describe, expect, it, vi } from 'vitest';

const beforeTransactionSign = vi.hoisted(() => vi.fn(async () => undefined));
const useWalletStoreMock = vi.hoisted(() => vi.fn());
const api = vi.hoisted(() => ({
  historyList: [] as Array<{ id: string; startTime: string }>,
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api,
}));

vi.mock('@/lib/soraneo-wallet/src/util', async () => {
  const actual = await vi.importActual<typeof import('@/lib/soraneo-wallet/src/util')>('@/lib/soraneo-wallet/src/util');

  return {
    __esModule: true,
    ...actual,
    beforeTransactionSign,
  };
});

vi.mock('@/stores/wallet', () => ({
  useWalletStore: useWalletStoreMock,
}));

import TransactionMixin from '@/lib/soraneo-wallet/src/components/mixins/TransactionMixin';

describe('TransactionMixin', () => {
  let walletStore: any;

  beforeEach(() => {
    vi.clearAllMocks();
    walletStore = {
      beforeTransactionSign,
    };
    useWalletStoreMock.mockReturnValue(walletStore);
  });

  it('resolves the wallet store from Pinia instead of component injection', async () => {
    const context = {
      $store: {
        commit: vi.fn(() => {
          throw new Error('should not use component $store');
        }),
      },
      $pinia: {},
      withLoading: vi.fn(async (handler: () => Promise<void>) => {
        await handler();
      }),
      withAppNotification: vi.fn(async (handler: () => Promise<void>) => {
        await handler();
      }),
      getLastTransaction: vi.fn(async () => ({ id: 'tx-1' })),
      addActiveTransaction: vi.fn(),
      showAppNotification: vi.fn(),
      t: vi.fn((key: string) => key),
    };
    const handler = vi.fn(async () => undefined);

    await (TransactionMixin as any).methods.withNotifications.call(context, handler);

    expect(useWalletStoreMock).toHaveBeenCalledWith(context.$pinia);
    expect(beforeTransactionSign).not.toHaveBeenCalledWith(context.$store, api);
    expect(walletStore.beforeTransactionSign).toHaveBeenCalledWith(api);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(context.addActiveTransaction).toHaveBeenCalledWith('tx-1');
    expect(context.showAppNotification).toHaveBeenCalledWith('transactionSubmittedText');
  });
});
