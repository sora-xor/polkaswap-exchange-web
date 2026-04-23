import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const moonpayMocks = vi.hoisted(() => ({
  axiosGet: vi.fn(),
  accountStorage: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('@/api', () => ({
  default: {
    get: moonpayMocks.axiosGet,
  },
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    accountStorage: moonpayMocks.accountStorage,
  },
}));

import { SoraNetwork } from '@/consts';
import {
  buildMoonpayTransactionDetailsUrl,
  clampMoonpayTransferAmount,
  MoonpayApi,
  MoonpayTransactionStatus,
} from '@/utils/moonpay';

describe('MoonpayApi', () => {
  beforeEach(() => {
    moonpayMocks.axiosGet.mockReset();
    moonpayMocks.accountStorage.get.mockReset();
    moonpayMocks.accountStorage.set.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('selects production or staging widget origins from the SORA network', () => {
    expect(MoonpayApi.getWidgetBaseUrl(SoraNetwork.Prod)).toBe('https://buy.moonpay.com');
    expect(MoonpayApi.getWidgetBaseUrl(SoraNetwork.Stage)).toBe('https://buy-staging.moonpay.com');
  });

  it('builds widget URLs with required API key and caller query params', () => {
    const moonpay = new MoonpayApi();
    moonpay.publicKey = 'public-key';
    moonpay.soraNetwork = SoraNetwork.Stage;

    const url = new URL(moonpay.createWidgetUrl({ currencyCode: 'xor', walletAddress: 'sora-address' }));

    expect(url.origin).toBe('https://buy-staging.moonpay.com');
    expect(url.searchParams.get('apiKey')).toBe('public-key');
    expect(url.searchParams.get('currencyCode')).toBe('xor');
    expect(url.searchParams.get('walletAddress')).toBe('sora-address');
  });

  it('reads and writes persisted account records through wallet account storage', () => {
    const moonpay = new MoonpayApi();
    moonpayMocks.accountStorage.get.mockReturnValue('{"sora":"external"}');

    expect(moonpay.accountRecords).toEqual({ sora: 'external' });

    moonpay.accountRecords = { next: 'account' };

    expect(moonpayMocks.accountStorage.get).toHaveBeenCalledWith('moonpay');
    expect(moonpayMocks.accountStorage.set).toHaveBeenCalledWith('moonpay', '{"next":"account"}');
  });

  it('returns empty account records when wallet account storage is empty', () => {
    moonpayMocks.accountStorage.get.mockReturnValue('');

    expect(new MoonpayApi().accountRecords).toEqual({});
  });

  it('fetches transactions and currencies with required params', async () => {
    const moonpay = new MoonpayApi();
    moonpay.publicKey = 'public-key';
    const transactions = [
      {
        id: 'tx',
        cryptoTransactionId: 'hash',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        baseCurrencyId: 'usd',
        baseCurrencyAmount: 10,
        currencyId: 'xor',
        quoteCurrencyAmount: 1,
        status: MoonpayTransactionStatus.Completed,
      },
    ];
    const currencies = [{ id: 'xor', code: 'xor' }];

    moonpayMocks.axiosGet.mockResolvedValueOnce({ data: transactions }).mockResolvedValueOnce({ data: currencies });

    await expect(moonpay.getTransactionsByExtId('external-id')).resolves.toEqual(transactions);
    await expect(moonpay.getCurrencies()).resolves.toEqual(currencies);

    expect(moonpayMocks.axiosGet).toHaveBeenNthCalledWith(1, 'https://api.moonpay.com/v1/transactions/ext/external-id', {
      params: { apiKey: 'public-key' },
    });
    expect(moonpayMocks.axiosGet).toHaveBeenNthCalledWith(2, 'https://api.moonpay.com/v3/currencies', {
      params: { apiKey: 'public-key' },
    });
  });

  it('normalizes failed API requests to empty arrays', async () => {
    const moonpay = new MoonpayApi();
    moonpayMocks.axiosGet.mockRejectedValue(new Error('network unavailable'));

    await expect(moonpay.getTransactionsByExtId('external-id')).resolves.toEqual([]);
    await expect(moonpay.getCurrencies()).resolves.toEqual([]);
  });
});

describe('moonpay url utilities', () => {
  it('buildMoonpayTransactionDetailsUrl returns a safe widget URL for allowed origins', () => {
    const result = buildMoonpayTransactionDetailsUrl({
      returnUrl: 'https://buy.moonpay.com/transaction/123',
      transactionId: 'tx_123',
      language: 'en',
      colorCode: '#00ff00',
    });

    expect(result).toBeTruthy();

    const url = new URL(result);
    expect(url.origin).toBe('https://buy.moonpay.com');
    expect(url.pathname).toBe('/transaction/123');
    expect(url.searchParams.get('transactionId')).toBe('tx_123');
    expect(url.searchParams.get('language')).toBe('en');
    expect(url.searchParams.get('colorCode')).toBe('#00ff00');
  });

  it('buildMoonpayTransactionDetailsUrl rejects untrusted returnUrl origins', () => {
    const result = buildMoonpayTransactionDetailsUrl({
      returnUrl: 'https://evil.example/transaction/123',
      transactionId: 'tx_123',
      language: 'en',
      colorCode: '#00ff00',
    });

    expect(result).toBe('');
  });

  it('buildMoonpayTransactionDetailsUrl rejects non-https returnUrl', () => {
    const result = buildMoonpayTransactionDetailsUrl({
      returnUrl: 'http://buy.moonpay.com/transaction/123',
      transactionId: 'tx_123',
      language: 'en',
      colorCode: '#00ff00',
    });

    expect(result).toBe('');
  });

  it('buildMoonpayTransactionDetailsUrl accepts staging origin and preserves existing query params', () => {
    const result = buildMoonpayTransactionDetailsUrl({
      returnUrl: 'https://buy-staging.moonpay.com/transaction/123?theme=dark',
      transactionId: 'tx_123',
      language: 'ja',
      colorCode: '#112233',
    });

    const url = new URL(result);

    expect(url.origin).toBe('https://buy-staging.moonpay.com');
    expect(url.searchParams.get('theme')).toBe('dark');
    expect(url.searchParams.get('transactionId')).toBe('tx_123');
  });

  it('buildMoonpayTransactionDetailsUrl rejects missing or malformed inputs', () => {
    expect(
      buildMoonpayTransactionDetailsUrl({
        returnUrl: '',
        transactionId: 'tx_123',
        language: 'en',
        colorCode: '#00ff00',
      })
    ).toBe('');
    expect(
      buildMoonpayTransactionDetailsUrl({
        returnUrl: 'https://buy.moonpay.com/transaction/123',
        transactionId: '',
        language: 'en',
        colorCode: '#00ff00',
      })
    ).toBe('');
    expect(
      buildMoonpayTransactionDetailsUrl({
        returnUrl: 'not-a-url',
        transactionId: 'tx_123',
        language: 'en',
        colorCode: '#00ff00',
      })
    ).toBe('');
  });

  it('clampMoonpayTransferAmount preserves precision while capping the amount', () => {
    expect(clampMoonpayTransferAmount('1.000000000000000001', '2')).toBe('1.000000000000000001');
    expect(clampMoonpayTransferAmount('2', '1.500000000000000001')).toBe('1.500000000000000001');
    expect(clampMoonpayTransferAmount('-1', '5')).toBe('0');
    expect(clampMoonpayTransferAmount('', '')).toBe('0');
  });
});
