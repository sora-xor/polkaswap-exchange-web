import { timer } from 'rxjs';

import notificationService from '@/services/notification';
import { resolveGlobalPinia } from '@/plugins/pinia';
import { useWalletStore } from '@/stores/wallet';

import { API_ENDPOINT } from '../../consts/currencies';
import { settingsStorage } from '../../util/storage';

import type { FiatExchangeRateObject } from '../../types/currency';

const INTERVAL = 15; // 15min between requests
const ONE_MINUTE = 60_000; // 1 min in milliseconds
const exchangeRateUpdateInterval = timer(0, ONE_MINUTE * 0.25); // 15sec interval checks for data consistency
const TIMESTAMP_FIELD = 'timestamp';

type CachedExchangeRates = FiatExchangeRateObject & {
  timestamp?: number;
};

const resolveWalletStore = () => {
  try {
    return useWalletStore(resolveGlobalPinia());
  } catch {
    return null;
  }
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

  return Object.entries(rates).some(([key, value]) => key !== TIMESTAMP_FIELD && Number.isFinite(value));
};

export class CurrencyExchangeRateService {
  public static readonly apiEndpoint = API_ENDPOINT;

  /**
   * Returns rates by new fetching request or taking from localStorage
   * depending upon timestamp.
   *
   */
  private static async getRates(): Promise<CachedExchangeRates> {
    const cachedRates = parseCachedRates(settingsStorage.get('fiatExchangeRates'));
    const hasCachedRates = hasRateValues(cachedRates);
    const cachedTimestamp = hasCachedRates ? Number(cachedRates.timestamp ?? 0) : 0;

    if (hasCachedRates && cachedTimestamp > 0) {
      const deltaTime = Math.floor((Date.now() - cachedTimestamp) / ONE_MINUTE);
      if (deltaTime < INTERVAL) {
        return cachedRates;
      }
    }

    // lock other tabs without dropping valid rates from storage
    if (hasCachedRates) {
      resolveWalletStore()?.updateFiatExchangeRates({ ...cachedRates, timestamp: Date.now() });
    }

    try {
      const exchangeRatesApi = await fetch(CurrencyExchangeRateService.apiEndpoint, { cache: 'no-store' });
      const data = (await exchangeRatesApi.json())?.dai;
      const fetchedRates = typeof data === 'object' && data ? (data as CachedExchangeRates) : null;

      if (!hasRateValues(fetchedRates)) {
        throw new Error('Exchange rate API returned an invalid payload');
      }

      return { ...fetchedRates, timestamp: Date.now() };
    } catch (error) {
      if (hasCachedRates) {
        console.warn('[Exchange rate API] Error while fetching rates, using cached values.');
        return { ...cachedRates, timestamp: Date.now() };
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
      console.info(`[Exchange rate API] Currency rates unsubscribe.`);
      subscription.unsubscribe();
    };
  }

  static resetData(error?: Error | string): void {
    console.warn('[Exchange rate API] not available. Now using default option.', error);
    notificationService.notify({
      message: 'Switched to DAI fiat pricing.',
      severity: 'error',
      timeout: 4500,
    });
    const walletStore = resolveWalletStore();
    walletStore?.updateFiatExchangeRates();
    walletStore?.setFiatCurrency();
  }
}
