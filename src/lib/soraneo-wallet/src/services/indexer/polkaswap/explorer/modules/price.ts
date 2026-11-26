import { parseAssetFiatPrice, parsePriceStreamUpdate } from '../../../explorer/utils';
import { StatsCoreNotReadyError } from '../../../coreRefresh';
import { ExactFiatPriceStreamQuery, FiatPriceQuery, FiatPriceStreamQuery } from '../../queries/fiatPrice';
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
    if (await this.root.supportsExactPrices()) {
      const result = await this.root.request(
        ExactFiatPriceStreamQuery,
        {},
        { requestPolicy: 'network-only', retryPendingCore: true }
      );
      const prices = result?.data && parsePriceStreamUpdate(result.data);
      if (!prices) throw new StatsCoreNotReadyError('Current indexer quotes are unavailable');
      return prices;
    }
    const result = await this.root.fetchAllEntities(FiatPriceQuery, {}, parseAssetFiatPrice);
    const snapshot = mergeFiatPriceChunks(result);

    if (snapshot) return snapshot;

    return this.getFiatPriceUpdates(true);
  }

  /**
   * Gets the latest fiat price stream payload. An initial load can wait for Pi's core refresh.
   */
  public async getFiatPriceUpdates(
    retryPendingCore = false,
    onComplete?: (prices: Nullable<FiatPriceObject>) => void
  ): Promise<Nullable<FiatPriceObject>> {
    if (await this.root.supportsExactPrices()) {
      const result = await this.root.request(
        ExactFiatPriceStreamQuery,
        {},
        { requestPolicy: 'network-only', retryPendingCore }
      );
      const prices = result?.data ? parsePriceStreamUpdate(result.data) : null;
      onComplete?.(prices);
      return prices;
    }
    const result = retryPendingCore
      ? await this.root.request(FiatPriceStreamQuery, {}, { requestPolicy: 'network-only', retryPendingCore: true })
      : await this.root.request(FiatPriceStreamQuery);

    if (!result) return null;

    const priceObject = parsePriceStreamUpdate(result.data);

    return priceObject && Object.keys(priceObject).length ? priceObject : null;
  }

  public createFiatPriceSubscription(
    handler: (entity: Nullable<FiatPriceObject>, complete?: boolean) => void,
    errorHandler: () => void | Promise<void>
  ): VoidFunction {
    return this.root.createEntitySubscription(
      PriceStreamSubscription,
      {},
      (entity) => ({ prices: parsePriceStreamUpdate(entity), complete: Object.hasOwn(entity, 'pricesExact') }),
      (update) => handler(update?.prices ?? null, update?.complete),
      errorHandler
    );
  }
}
