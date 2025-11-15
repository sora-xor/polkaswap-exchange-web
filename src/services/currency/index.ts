import { timer } from 'rxjs';

import notificationService from '@/services/notification';
import store from '@/store';
import { settingsStorage } from '@/utils/storage';

import { API_ENDPOINT } from '@wallet/src/consts/currencies';

import type { FiatExchangeRateObject } from '@wallet/src/types/currency';

const INTERVAL = 15; // minutes between refreshes
const ONE_MINUTE = 60_000;
const exchangeRateUpdateInterval = timer(0, ONE_MINUTE * 0.25); // polling interval (15s)

export class CurrencyExchangeRateService {
  public static readonly apiEndpoint = API_ENDPOINT;

  private static async getRates(): Promise<any> {
    const rates = settingsStorage.get('fiatExchangeRates');
    const fiatExchangeRates = rates && JSON.parse(rates);

    if (fiatExchangeRates?.timestamp) {
      const deltaTime = Math.floor((Date.now() - new Date(fiatExchangeRates.timestamp).getTime()) / ONE_MINUTE);
      if (deltaTime < INTERVAL) {
        return fiatExchangeRates;
      }
    }

    store.commit.wallet.settings.updateFiatExchangeRates({ timestamp: Date.now() });

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
      console.info('[Exchange rate API] Currency rates unsubscribe.');
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
    store.commit.wallet.settings.updateFiatExchangeRates();
    store.commit.wallet.settings.setFiatCurrency();
  }
}

export default CurrencyExchangeRateService;
