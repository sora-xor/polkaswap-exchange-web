import { SubqueryBaseModule } from './_base';
import { FiatPriceObject } from '../../types';

export declare class SubqueryPriceModule extends SubqueryBaseModule {
  /**
   * Get fiat price for each asset
   */
  getFiatPriceObject(): Promise<Nullable<FiatPriceObject>>;
  getFiatPriceUpdates(): Promise<Nullable<FiatPriceObject>>;
  createFiatPriceSubscription(
    handler: (entity: Nullable<FiatPriceObject>) => void,
    errorHandler: () => void | Promise<void>
  ): VoidFunction;
}
