import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/services/notification', () => ({
  default: {
    notify: vi.fn(),
  },
}));

const legacyStoreMock = vi.fn();
const settingsStorageGetMock = vi.fn();

vi.mock('@/utils/legacy-store', () => ({
  requireLegacyStore: () => legacyStoreMock(),
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

    legacyStoreMock.mockReturnValue({
      commit: {
        wallet: {
          settings: {
            updateFiatExchangeRates,
            setFiatCurrency,
          },
        },
      },
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

    legacyStoreMock.mockReturnValue({
      commit: {
        wallet: {
          settings: {
            updateFiatExchangeRates,
            setFiatCurrency: vi.fn(),
          },
        },
      },
    });

    const { CurrencyExchangeRateService } = await import('@/services/currency');

    await expect((CurrencyExchangeRateService as any).getRates()).rejects.toThrow('network failed');
    expect(updateFiatExchangeRates).not.toHaveBeenCalled();
  });

  it('updates fiat exchange rates and currency when legacy store is available', async () => {
    const updateFiatExchangeRates = vi.fn();
    const setFiatCurrency = vi.fn();

    legacyStoreMock.mockReturnValue({
      commit: {
        wallet: {
          settings: {
            updateFiatExchangeRates,
            setFiatCurrency,
          },
        },
      },
    });

    const { CurrencyExchangeRateService } = await import('@/services/currency');

    CurrencyExchangeRateService.resetData('error');

    expect(updateFiatExchangeRates).toHaveBeenCalled();
    expect(setFiatCurrency).toHaveBeenCalled();
  });

  it('does not throw if legacy store is unavailable', async () => {
    legacyStoreMock.mockReturnValue({});
    const { CurrencyExchangeRateService } = await import('@/services/currency');

    expect(() => CurrencyExchangeRateService.resetData('error')).not.toThrow();
  });
});
