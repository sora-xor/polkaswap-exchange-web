import { parseAssetFiatPrice, parsePriceStreamUpdate } from '../../../explorer/utils';
import { FiatPriceQuery, FiatPriceStreamQuery } from '../../queries/fiatPrice';
import { PriceStreamSubscription } from '../../subscriptions/stream';

import { PolkaswapBaseModule } from './_base';

import type { FiatPriceObject } from '../../types';

function mergeFiatPriceChunks(chunks: Nullable<FiatPriceObject[]>): Nullable<FiatPriceObject> {
  if (!chunks) return null;

  const merged = chunks.reduce<FiatPriceObject>((acc, item) => ({ ...acc, ...item }), {});

  return Object.keys(merged).length ? merged : null;
}

export class PolkaswapPriceModule extends PolkaswapBaseModule {
  /**
   * Gets fiat prices for assets from the full snapshot, then asks the latest
   * price stream payload from the same configured indexer when needed.
   */
  public async getFiatPriceObject(): Promise<Nullable<FiatPriceObject>> {
    const result = await this.root.fetchAllEntities(FiatPriceQuery, {}, parseAssetFiatPrice);
    const snapshot = mergeFiatPriceChunks(result);

    if (snapshot) return snapshot;

    return this.getFiatPriceUpdates();
  }

  /**
   * Gets the latest fiat price stream payload from the indexer.
   */
  public async getFiatPriceUpdates(): Promise<Nullable<FiatPriceObject>> {
    const result = await this.root.request(FiatPriceStreamQuery);

    if (!result) return null;

    const priceObject = parsePriceStreamUpdate(result.data);

    return priceObject && Object.keys(priceObject).length ? priceObject : null;
  }

  public createFiatPriceSubscription(
    handler: (entity: Nullable<FiatPriceObject>) => void,
    errorHandler: () => void | Promise<void>
  ): VoidFunction {
    return this.root.createEntitySubscription(
      PriceStreamSubscription,
      {},
      parsePriceStreamUpdate,
      handler,
      errorHandler
    );
  }
}
