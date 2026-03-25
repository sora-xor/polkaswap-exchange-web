import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/notification', () => ({
  default: {
    notify: vi.fn(),
  },
}));

const { getWalletPiniaStoreMock, useWalletStoreMock, resolveGlobalPiniaMock, sharedPinia, settingsStorageGetMock } =
  vi.hoisted(() => ({
    getWalletPiniaStoreMock: vi.fn(),
    useWalletStoreMock: vi.fn(),
    resolveGlobalPiniaMock: vi.fn(),
    sharedPinia: { id: 'shared-pinia' },
    settingsStorageGetMock: vi.fn(),
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
    resolveGlobalPiniaMock.mockReturnValue(sharedPinia);
    useWalletStoreMock.mockImplementation(() => getWalletPiniaStoreMock());
    settingsStorageGetMock.mockReturnValue(null);
  });

  it('uses stale cached rates to update the Pinia wallet store lock when refreshing', async () => {
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
    expect(updateFiatExchangeRates).toHaveBeenCalledWith(
      expect.objectContaining({
        usd: 1.23,
        eur: 0.92,
      })
    );
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
  });
});
