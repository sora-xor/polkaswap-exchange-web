import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getWalletPiniaStoreMock,
  useWalletStoreMock,
  resolveGlobalPiniaMock,
  sharedPinia,
  settingsStorageGetMock,
  notifyMock,
} = vi.hoisted(() => ({
  getWalletPiniaStoreMock: vi.fn(),
  useWalletStoreMock: vi.fn(),
  resolveGlobalPiniaMock: vi.fn(),
  sharedPinia: { id: 'shared-pinia' },
  settingsStorageGetMock: vi.fn(),
  notifyMock: vi.fn(),
}));

vi.mock('@/services/notification', () => ({
  default: {
    notify: notifyMock,
  },
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: useWalletStoreMock,
}));

vi.mock('@/plugins/pinia', () => ({
  resolveGlobalPinia: resolveGlobalPiniaMock,
}));

vi.mock('@/lib/soraneo-wallet/src/util/storage', () => ({
  settingsStorage: {
    get: (...args: unknown[]) => settingsStorageGetMock(...args),
  },
}));

describe('wallet lib CurrencyExchangeRateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    notifyMock.mockClear();
    resolveGlobalPiniaMock.mockReturnValue(sharedPinia);
    useWalletStoreMock.mockImplementation(() => getWalletPiniaStoreMock());
    settingsStorageGetMock.mockReturnValue(null);
  });

  it('does not serve cached rates older than three days after a failed refresh', async () => {
    settingsStorageGetMock.mockReturnValue(JSON.stringify({ usd: 0.99, timestamp: Date.now() - 4 * 86_400_000 }));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network failed')));
    const { CurrencyExchangeRateService } = await import('@/lib/soraneo-wallet/src/services/currency');
    await expect((CurrencyExchangeRateService as any).getRates()).rejects.toThrow('network failed');
  });

  it('expires an old source snapshot even when it was fetched recently', async () => {
    const sourceTimestamp = Math.floor(Date.now() / 86_400_000) * 86_400_000 - 4 * 86_400_000;
    settingsStorageGetMock.mockReturnValue(
      JSON.stringify({ usd: 0.99, sourceTimestamp, timestamp: Date.now() - 60_000 })
    );
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network failed')));
    const { CurrencyExchangeRateService } = await import('@/lib/soraneo-wallet/src/services/currency');
    await expect((CurrencyExchangeRateService as any).getRates()).rejects.toThrow('network failed');
  });

  it('does not accept source metadata without rates as a valid cache', async () => {
    const sourceTimestamp = Math.floor(Date.now() / 86_400_000) * 86_400_000;
    settingsStorageGetMock.mockReturnValue(JSON.stringify({ sourceTimestamp, timestamp: Date.now() - 60_000 }));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network failed')));
    const { CurrencyExchangeRateService } = await import('@/lib/soraneo-wallet/src/services/currency');
    await expect((CurrencyExchangeRateService as any).getRates()).rejects.toThrow('network failed');
  });

  it.each([
    ['future', Date.now() + 60 * 60_000],
    ['non-finite', 'Infinity'],
  ])('refreshes cached rates with a %s timestamp', async (_case, timestamp) => {
    settingsStorageGetMock.mockReturnValue(JSON.stringify({ usd: 0.99, timestamp }));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ date: new Date().toISOString().slice(0, 10), dai: { dai: 1, usd: 1.01 } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { CurrencyExchangeRateService } = await import('@/lib/soraneo-wallet/src/services/currency');
    const rates = await (CurrencyExchangeRateService as any).getRates();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(rates).toEqual(expect.objectContaining({ usd: 1.01, timestamp: expect.any(Number) }));
  });

  it('preserves the age of cached rates when refreshing fails', async () => {
    const updateFiatExchangeRates = vi.fn();

    settingsStorageGetMock.mockReturnValue(
      JSON.stringify({ usd: 1.23, eur: 0.92, timestamp: Date.now() - 16 * 60_000 })
    );
    getWalletPiniaStoreMock.mockReturnValue({
      updateFiatExchangeRates,
      setFiatCurrency: vi.fn(),
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network failed')));

    const { CurrencyExchangeRateService } = await import('@/lib/soraneo-wallet/src/services/currency');
    const rates = await (CurrencyExchangeRateService as any).getRates();

    expect(rates).toEqual(
      expect.objectContaining({
        usd: 1.23,
        eur: 0.92,
      })
    );
    expect(updateFiatExchangeRates).not.toHaveBeenCalled();
    expect(rates.timestamp).toBe(JSON.parse(settingsStorageGetMock()).timestamp);
  });

  it('resets fiat data through the Pinia wallet store when available', async () => {
    const updateFiatExchangeRates = vi.fn();
    const setFiatCurrency = vi.fn();

    getWalletPiniaStoreMock.mockReturnValue({
      updateFiatExchangeRates,
      setFiatCurrency,
    });

    const { CurrencyExchangeRateService } = await import('@/lib/soraneo-wallet/src/services/currency');

    CurrencyExchangeRateService.resetData('error');

    expect(updateFiatExchangeRates).toHaveBeenCalled();
    expect(setFiatCurrency).toHaveBeenCalled();
    expect(notifyMock).toHaveBeenCalledWith({
      message: 'Switched to DAI fiat pricing.',
      severity: 'warning',
      timeout: 3000,
    });
  });

  it('dedupes repeated fiat fallback notifications', async () => {
    getWalletPiniaStoreMock.mockReturnValue({
      updateFiatExchangeRates: vi.fn(),
      setFiatCurrency: vi.fn(),
    });

    const { CurrencyExchangeRateService } = await import('@/lib/soraneo-wallet/src/services/currency');

    CurrencyExchangeRateService.resetData('first');
    CurrencyExchangeRateService.resetData('second');

    expect(notifyMock).toHaveBeenCalledTimes(1);
  });
});
