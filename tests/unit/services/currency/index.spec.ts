import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/services/notification', () => ({
  default: {
    notify: vi.fn(),
  },
}));

const legacyStoreMock = vi.fn();

vi.mock('@/utils/legacy-store', () => ({
  requireLegacyStore: () => legacyStoreMock(),
}));

describe('CurrencyExchangeRateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
