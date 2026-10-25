import { timer } from 'rxjs';

import notificationService from '@/services/notification';
import { fetchCurrencyRates, isCurrencySnapshotCurrent } from '@/services/currency/rates';
import { useSettingsStore } from '@/stores/settings';
import { settingsStorage } from '@/utils/storage';
import { API_ENDPOINT } from '@/lib/soraneo-wallet/src/consts/currencies';

import type { FiatExchangeRateObject } from '@/lib/soraneo-wallet/src/types/currency';

const INTERVAL = 15; // minutes between refreshes
const ONE_MINUTE = 60_000;
const exchangeRateUpdateInterval = timer(0, ONE_MINUTE * 0.25); // polling interval (15s)
const TIMESTAMP_FIELD = 'timestamp';
const MAX_CACHED_AGE_MS = 3 * 24 * 60 * ONE_MINUTE;
let hasShownFiatFallbackNotification = false;

const getWalletSettingsStore = () => {
  try {
    return useSettingsStore();
  } catch {
    return null;
  }
};

type CachedExchangeRates = FiatExchangeRateObject & {
  timestamp?: number;
};

const parseCachedRates = (rawRates: unknown): CachedExchangeRates | null => {
  if (typeof rawRates !== 'string' || !rawRates) return null;

  try {
    const parsed = JSON.parse(rawRates) as CachedExchangeRates;
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
};

const hasRateValues = (rates: CachedExchangeRates | null): rates is CachedExchangeRates => {
  if (!rates) return false;

  return Object.entries(rates).some(
    ([key, value]) => key !== TIMESTAMP_FIELD && key !== 'sourceTimestamp' && Number.isFinite(value)
  );
};

/** Keep fallback prices bounded without pretending a failed refresh updated them. */
const isFreshCachedTimestamp = (timestamp: unknown, now: number, maxAgeMs = INTERVAL * ONE_MINUTE): boolean => {
  return (
    typeof timestamp === 'number' &&
    Number.isFinite(timestamp) &&
    timestamp > 0 &&
    timestamp <= now &&
    now - timestamp < maxAgeMs
  );
};

export class CurrencyExchangeRateService {
  public static readonly apiEndpoint = API_ENDPOINT;

  private static async getRates(): Promise<CachedExchangeRates> {
    const cachedRates = parseCachedRates(settingsStorage.get('fiatExchangeRates'));
    const now = Date.now();
    const hasCachedRates =
      hasRateValues(cachedRates) &&
      isFreshCachedTimestamp(cachedRates.timestamp, now, MAX_CACHED_AGE_MS) &&
      (cachedRates.sourceTimestamp === undefined || isCurrencySnapshotCurrent(cachedRates.sourceTimestamp, now));

    if (hasCachedRates && isFreshCachedTimestamp(cachedRates.timestamp, now)) {
      return cachedRates;
    }

    try {
      const fetchedRates = await fetchCurrencyRates();
      hasShownFiatFallbackNotification = false;
      return { ...fetchedRates, timestamp: Date.now() };
    } catch (error) {
      if (hasCachedRates) {
        console.warn('[Exchange rate API] Error while fetching rates, using cached values.');
        return cachedRates;
      }

      console.error('[Exchange rate API] Error while fetching rates.');
      throw error;
    }
  }

  public static createExchangeRatesSubscription(
    handler: (newRates: FiatExchangeRateObject) => void,
    errorHandler: () => void
  ): VoidFunction {
    const subscription = exchangeRateUpdateInterval.subscribe(async () => {
      try {
        const data = await this.getRates();

        if (!data) {
          this.resetData('No data arrived.');
          errorHandler();
        } else {
          handler(data);
        }
      } catch (error) {
        this.resetData(error as Error);
        errorHandler();
      }
    });

    return () => {
      console.info('[Exchange rate API] Currency rates unsubscribe.');
      subscription.unsubscribe();
    };
  }

  static resetData(error?: Error | string): void {
    console.warn('[Exchange rate API] not available. Now using default option.', error);
    if (!hasShownFiatFallbackNotification) {
      hasShownFiatFallbackNotification = true;
      notificationService.notify({
        message: 'Switched to DAI fiat pricing.',
        severity: 'warning',
        timeout: 3000,
      });
    }
    const walletSettings = getWalletSettingsStore();
    walletSettings?.updateFiatExchangeRates();
    walletSettings?.setFiatCurrency();
  }
}

export default CurrencyExchangeRateService;
