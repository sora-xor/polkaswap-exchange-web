import type { FiatExchangeRateObject } from '../../types/currency';
export declare class CurrencyExchangeRateService {
  static readonly apiEndpoint =
    'https://api.coingecko.com/api/v3/simple/price?ids=dai&vs_currencies=btc%2Ceth%2Cusd%2Caed%2Cars%2Caud%2Cbdt%2Cbhd%2Cbmd%2Cbrl%2Ccad%2Cchf%2Cclp%2Ccny%2Cczk%2Cdkk%2Ceur%2Cgbp%2Cgel%2Chkd%2Chuf%2Cidr%2Cils%2Cinr%2Cjpy%2Ckrw%2Ckwd%2Clkr%2Cmmk%2Cmxn%2Cmyr%2Cngn%2Cnok%2Cnzd%2Cphp%2Cpkr%2Cpln%2Crub%2Csar%2Csek%2Csgd%2Cthb%2Ctry%2Ctwd%2Cuah%2Cvef%2Cvnd%2Czar%2Cxdr%2Cxag%2Cxau';
  /**
   * Returns rates by new fetching request or taking from localStorage
   * depending upon timestamp.
   *
   */
  private static getRates;
  static createExchangeRatesSubscription(
    handler: (newRates: FiatExchangeRateObject) => void,
    errorHandler: () => void
  ): VoidFunction;
  static resetData(error?: Error | string): void;
}
