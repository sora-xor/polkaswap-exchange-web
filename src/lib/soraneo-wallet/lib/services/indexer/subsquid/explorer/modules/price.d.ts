import { BaseModule } from './_base';
import { FiatPriceObject } from '../../types';

export declare class SubsquidPriceModule extends BaseModule {
  /**
   * Get fiat price for each asset
   */
  getFiatPriceObject(): Promise<Nullable<FiatPriceObject>>;
  getFiatPriceUpdates(): Promise<Nullable<FiatPriceObject>>;
  createFiatPriceSubscription(
    handler: (entity: Nullable<FiatPriceObject>) => void,
    errorHandler: () => void
  ): VoidFunction;
}
