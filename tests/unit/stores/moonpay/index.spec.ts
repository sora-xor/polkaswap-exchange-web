import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const shared = vi.hoisted(() => {
  const moonpayApi = {
    publicKey: '',
    getTransactionsByExtId: vi.fn(async () => []),
    getCurrencies: vi.fn(async () => []),
  };
  const walletStore = {
    isLoggedIn: true,
    address: '5FAKEADDRESS',
  };
  const waitForEvmTransaction = vi.fn(async () => undefined);
  const getEvmTransaction = vi.fn(async () => null);

  return {
    moonpayApi,
    walletStore,
    waitForEvmTransaction,
    getEvmTransaction,
  };
});

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => shared.walletStore,
}));

vi.mock('@/utils/ethers-util', () => ({
  __esModule: true,
  default: {
    waitForEvmTransaction: shared.waitForEvmTransaction,
    getEvmTransaction: shared.getEvmTransaction,
  },
}));

import { useMoonpayStore } from '@/stores/moonpay';

describe('moonpay store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    shared.walletStore.isLoggedIn = true;
    shared.walletStore.address = '5FAKEADDRESS';
    shared.moonpayApi.publicKey = '';
    shared.moonpayApi.getTransactionsByExtId.mockReset();
    shared.moonpayApi.getTransactionsByExtId.mockResolvedValue([]);
    shared.moonpayApi.getCurrencies.mockReset();
    shared.moonpayApi.getCurrencies.mockResolvedValue([]);
    shared.waitForEvmTransaction.mockReset();
    shared.waitForEvmTransaction.mockResolvedValue(undefined);
    shared.getEvmTransaction.mockReset();
    shared.getEvmTransaction.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores local moonpay ui state without delegating through the legacy bridge', () => {
    const store = useMoonpayStore();

    store.setDialogVisibility(true);
    store.setNotificationVisibility(true);
    store.setNotificationKey('success' as any);
    store.setConfirmationVisibility(true);
    store.setBridgeTxData({
      data: { id: 'bridge-1' } as any,
      startBridgeButtonVisibility: true,
    });

    expect(store.dialogVisibility).toBe(true);
    expect(store.notificationVisibility).toBe(true);
    expect(store.notificationKey).toBe('success');
    expect(store.confirmationVisibility).toBe(true);
    expect(store.bridgeTransactionData).toEqual({ id: 'bridge-1' });
    expect(store.startBridgeButtonVisibility).toBe(true);
  });

  it('updates moonpay account records through the Pinia moonpay api instance', () => {
    const store = useMoonpayStore();
    store.api = {
      accountRecords: {
        existing: '0xold',
      },
    } as any;

    store.setAccountRecord('moonpay-1', '0xhash');

    expect(store.api.accountRecords).toEqual({
      existing: '0xold',
      'moonpay-1': '0xhash',
    });
  });

  it('loads transactions from the moonpay api when wallet data is available', async () => {
    const store = useMoonpayStore();
    store.api = shared.moonpayApi as any;
    store.api.publicKey = 'moonpay-key';
    shared.moonpayApi.getTransactionsByExtId.mockResolvedValue([{ id: 'tx-1' }]);

    await store.getTransactions(true);

    expect(shared.moonpayApi.getTransactionsByExtId).toHaveBeenCalledWith('5FAKEADDRESS');
    expect(store.transactions).toEqual([{ id: 'tx-1' }]);
    expect(store.transactionsFetching).toBe(false);
  });

  it('normalizes malformed transaction responses to an empty array', async () => {
    const store = useMoonpayStore();
    store.api = shared.moonpayApi as any;
    store.api.publicKey = 'moonpay-key';
    shared.moonpayApi.getTransactionsByExtId.mockResolvedValue({ id: 'tx-1' });

    await store.getTransactions(true);

    expect(store.transactions).toEqual([]);
    expect(store.transactionsFetching).toBe(false);
  });

  it('skips transaction loading when moonpay is not initialised', async () => {
    const store = useMoonpayStore();
    store.api = shared.moonpayApi as any;
    store.api.publicKey = '';

    await store.getTransactions();

    expect(shared.moonpayApi.getTransactionsByExtId).not.toHaveBeenCalled();
  });

  it('loads currencies directly from the moonpay api', async () => {
    const store = useMoonpayStore();
    store.api = shared.moonpayApi as any;
    shared.moonpayApi.getCurrencies.mockResolvedValue([{ id: 'usd', code: 'usd' }]);

    await store.getCurrencies();

    expect(shared.moonpayApi.getCurrencies).toHaveBeenCalledTimes(1);
    expect(store.currencies).toEqual([{ id: 'usd', code: 'usd' }]);
  });

  it('normalizes malformed currency responses to an empty array', async () => {
    const store = useMoonpayStore();
    store.api = shared.moonpayApi as any;
    shared.moonpayApi.getCurrencies.mockResolvedValue({ id: 'usd', code: 'usd' });

    await store.getCurrencies();

    expect(store.currencies).toEqual([]);
  });

  it('creates polling that refreshes transactions and clears the timestamp on stop', async () => {
    vi.useFakeTimers();
    const store = useMoonpayStore();
    store.api = shared.moonpayApi as any;
    store.api.publicKey = 'moonpay-key';
    const getTransactionsSpy = vi.spyOn(store, 'getTransactions').mockResolvedValue(undefined);

    const stopPolling = await store.createTransactionsPolling();

    expect(store.pollingTimestamp).toBeGreaterThan(0);

    vi.advanceTimersByTime(15_000);
    await Promise.resolve();

    expect(getTransactionsSpy).toHaveBeenCalledTimes(1);

    stopPolling();

    expect(store.pollingTimestamp).toBe(0);
  });

  it('parses native ethereum transfer data', async () => {
    const store = useMoonpayStore();
    shared.getEvmTransaction.mockResolvedValue({
      data: '0x',
      to: '0xreceiver',
      value: '1000000000000000000',
    });

    const result = await store.getTransactionTranserData('0xhash');

    expect(shared.waitForEvmTransaction).toHaveBeenCalledWith('0xhash');
    expect(result).toEqual({
      amount: '1000000000000000000',
      address: '0x0000000000000000000000000000000000000000',
      to: '0xreceiver',
    });
  });

  it('returns null when ethereum transaction parsing fails', async () => {
    const store = useMoonpayStore();
    shared.getEvmTransaction.mockResolvedValue({
      data: '0xdeadbeef',
      to: '0xtoken',
    });

    const result = await store.getTransactionTranserData('0xhash');

    expect(result).toBeNull();
  });
});
