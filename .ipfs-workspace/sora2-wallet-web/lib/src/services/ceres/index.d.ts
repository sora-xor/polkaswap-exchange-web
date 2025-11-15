import type { FiatPriceObject } from '../indexer/types';
export declare class CeresApiService {
  static getFiatPriceObject(): Promise<Nullable<FiatPriceObject>>;
  static createFiatPriceSubscription(
    handler: (entity?: FiatPriceObject) => void,
    errorHandler: () => void
  ): VoidFunction;
}
