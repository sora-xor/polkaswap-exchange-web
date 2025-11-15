import { timer } from 'rxjs';

import notificationService from '@/services/notification';
import { settingsStorage } from '@/util/storage';

import { API_ENDPOINT } from '../../consts/currencies';
import { getWalletStore } from '../../store/instance';

import type { FiatExchangeRateObject } from '../../types/currency';

const INTERVAL = 15; // 15min between requests
const ONE_MINUTE = 60_000; // 1 min in milliseconds
const exchangeRateUpdateInterval = timer(0, ONE_MINUTE * 0.25); // 15sec interval checks for data consistency

export class CurrencyExchangeRateService {
  public static readonly apiEndpoint = API_ENDPOINT;

  private static get store() {
    return getWalletStore();
  }

  /**
   * Returns rates by new fetching request or taking from localStorage
   * depending upon timestamp.
   *
   */
  private static async getRates(): Promise<any> {
    const rates = settingsStorage.get('fiatExchangeRates');
    const fiatExchangeRates = rates && JSON.parse(rates);

    if (fiatExchangeRates.timestamp) {
      const oldTimestamp = new Date(fiatExchangeRates.timestamp);
      const newTimestamp = new Date(Date.now());

      const deltaTime = Math.floor((newTimestamp.getTime() - oldTimestamp.getTime()) / ONE_MINUTE);

      if (deltaTime < INTERVAL) {
        return fiatExchangeRates;
      }
    }

    // to lock other tabs if they opened simultaneously
    this.store.commit.wallet.settings.updateFiatExchangeRates({ timestamp: Date.now() });

    try {
      const exchangeRatesApi = await fetch(CurrencyExchangeRateService.apiEndpoint, { cache: 'no-store' });
      const data = (await exchangeRatesApi.json())?.dai;

      return { ...data, timestamp: Date.now() };
    } catch (error) {
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
    this.store.commit.wallet.settings.updateFiatExchangeRates();
    this.store.commit.wallet.settings.setFiatCurrency();
  }
}
