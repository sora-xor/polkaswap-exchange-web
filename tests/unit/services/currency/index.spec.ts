import { describe, expect, it, vi, beforeEach } from 'vitest';

const notifyMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/notification', () => ({
  default: {
    notify: notifyMock,
  },
}));

const settingsStoreMock = vi.fn();
const settingsStorageGetMock = vi.fn();

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreMock(),
}));

vi.mock('@/utils/storage', () => ({
  settingsStorage: {
    get: (...args: unknown[]) => settingsStorageGetMock(...args),
  },
}));

describe('CurrencyExchangeRateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    notifyMock.mockClear();
    settingsStorageGetMock.mockReturnValue(null);
  });

  it('uses fresh cached rates without making a network request', async () => {
    const timestamp = Date.now() - 5 * 60_000;
    settingsStorageGetMock.mockReturnValue(JSON.stringify({ usd: 0.99, timestamp }));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { CurrencyExchangeRateService } = await import('@/services/currency');
    const rates = await (CurrencyExchangeRateService as any).getRates();

    expect(rates).toEqual({ usd: 0.99, timestamp });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to stale cached rates when the API request fails', async () => {
    const updateFiatExchangeRates = vi.fn();
    const setFiatCurrency = vi.fn();
    settingsStorageGetMock.mockReturnValue(
      JSON.stringify({ usd: 1.23, eur: 0.92, timestamp: Date.now() - 16 * 60_000 })
    );
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network failed')));

    settingsStoreMock.mockReturnValue({
      updateFiatExchangeRates,
      setFiatCurrency,
    });

    const { CurrencyExchangeRateService } = await import('@/services/currency');
    const rates = await (CurrencyExchangeRateService as any).getRates();

    expect(rates).toEqual(
      expect.objectContaining({
        usd: 1.23,
        eur: 0.92,
      })
    );
    expect(rates.timestamp).toEqual(expect.any(Number));
    expect(updateFiatExchangeRates).toHaveBeenCalledWith(
      expect.objectContaining({
        usd: 1.23,
        eur: 0.92,
      })
    );
    expect(setFiatCurrency).not.toHaveBeenCalled();
  });

  it('does not treat timestamp-only cached payloads as valid rates', async () => {
    const updateFiatExchangeRates = vi.fn();
    settingsStorageGetMock.mockReturnValue(JSON.stringify({ timestamp: Date.now() - 16 * 60_000 }));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network failed')));

    settingsStoreMock.mockReturnValue({
      updateFiatExchangeRates,
      setFiatCurrency: vi.fn(),
    });

    const { CurrencyExchangeRateService } = await import('@/services/currency');

    await expect((CurrencyExchangeRateService as any).getRates()).rejects.toThrow('network failed');
    expect(updateFiatExchangeRates).not.toHaveBeenCalled();
  });

  it('updates fiat exchange rates and currency when legacy store is available', async () => {
    const updateFiatExchangeRates = vi.fn();
    const setFiatCurrency = vi.fn();

    settingsStoreMock.mockReturnValue({
      updateFiatExchangeRates,
      setFiatCurrency,
    });

    const { CurrencyExchangeRateService } = await import('@/services/currency');

    CurrencyExchangeRateService.resetData('error');

    expect(updateFiatExchangeRates).toHaveBeenCalled();
    expect(setFiatCurrency).toHaveBeenCalled();
    expect(notifyMock).toHaveBeenCalledWith({
      message: 'Switched to DAI fiat pricing.',
      severity: 'warning',
      timeout: 3000,
    });
  });

  it('does not throw if settings store is unavailable', async () => {
    settingsStoreMock.mockImplementation(() => {
      throw new Error('pinia not ready');
    });
    const { CurrencyExchangeRateService } = await import('@/services/currency');

    expect(() => CurrencyExchangeRateService.resetData('error')).not.toThrow();
  });

  it('dedupes repeated fiat fallback notifications', async () => {
    const { CurrencyExchangeRateService } = await import('@/services/currency');

    CurrencyExchangeRateService.resetData('first');
    CurrencyExchangeRateService.resetData('second');

    expect(notifyMock).toHaveBeenCalledTimes(1);
  });
});
