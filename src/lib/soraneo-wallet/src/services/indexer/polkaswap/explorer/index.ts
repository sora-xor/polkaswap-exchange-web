import BaseExplorer, { type ExplorerRequestOptions } from '../../explorer/base';

import { ExactFiatPriceStreamQuery } from '../queries/fiatPrice';
import { PolkaswapAccountModule } from './modules/account';
import { PolkaswapAssetModule } from './modules/asset';
import { PolkaswapPriceModule } from './modules/price';

import type { ConnectionQueryResponse } from '../../types';
import type { TypedDocumentNode, AnyVariables } from '../client';
import type { PolkaswapSubscriptionPayload } from '../types';

export default class PolkaswapExplorer extends BaseExplorer {
  public readonly account: PolkaswapAccountModule = new PolkaswapAccountModule(this);
  public readonly asset: PolkaswapAssetModule = new PolkaswapAssetModule(this);
  public readonly price: PolkaswapPriceModule = new PolkaswapPriceModule(this);

  private quoteSupport?: { endpoint: string; until: number; value: Promise<boolean> };

  /** Negotiate the price projection with an ordinary read and recheck after endpoint changes or upgrades. */
  public supportsExactPrices(): Promise<boolean> {
    const endpoint = this.getEndpoint();
    if (!endpoint) return Promise.resolve(false);
    const now = Date.now();
    if (this.quoteSupport?.endpoint === endpoint && this.quoteSupport.until > now) return this.quoteSupport.value;
    const value = this.request(ExactFiatPriceStreamQuery, {}, { requestPolicy: 'network-only', retryPendingCore: true })
      .then((result) => !!result && Object.hasOwn(result, 'data') && this.getEndpoint() === endpoint)
      .catch((error) => {
        if (this.quoteSupport?.endpoint === endpoint) this.quoteSupport = undefined;
        throw error;
      });
    this.quoteSupport = { endpoint, until: now + 60_000, value };
    return value;
  }

  public async fetchEntities<T>(
    query: TypedDocumentNode<ConnectionQueryResponse<T>>,
    variables?: AnyVariables,
    options?: ExplorerRequestOptions
  ): Promise<Nullable<ConnectionQueryResponse<T>['data']>> {
    try {
      const response = await this.request(query, variables, options);

      if (!response || !response.data) return null;

      return response.data;
    } catch (error) {
      console.warn('Polkaswap indexer is not available or data is incorrect!', error);
      return null;
    }
  }

  public async fetchAllEntities<T, R>(
    query: TypedDocumentNode<ConnectionQueryResponse<T>>,
    variables: AnyVariables = {},
    parse?: (entity: T) => R,
    options?: ExplorerRequestOptions
  ): Promise<Nullable<R[]>> {
    const acc: any = [];

    let after = '';
    let hasNextPage = true;
    const cursors = new Set<string>();

    try {
      do {
        const response = await this.fetchEntities(query, { ...variables, after }, options);

        if (!response) {
          return null;
        }

        after = response.pageInfo.endCursor;
        hasNextPage = response.pageInfo.hasNextPage;
        if (hasNextPage) {
          if (!after || cursors.has(after)) return null;
          cursors.add(after);
        }

        response.edges.forEach((el) => {
          const record = parse ? parse(el.node) : el.node;

          acc.push(record);
        });
      } while (hasNextPage);

      return acc;
    } catch (error) {
      console.warn('Polkaswap indexer is not available or data is incorrect!', error);
      return null;
    }
  }

  /**
   * Creates an entity subscription, skipping empty subscription frames while
   * preserving error reporting for GraphQL and parser failures.
   */
  public createEntitySubscription<T, R>(
    subscription: TypedDocumentNode<PolkaswapSubscriptionPayload<T>>,
    variables: AnyVariables = {},
    parse: (entity: T) => R,
    handler: (entity: R) => void,
    errorHandler?: (error: any) => void
  ): VoidFunction {
    const createSubscription = this.subscribe(subscription, variables);

    return createSubscription((result) => {
      try {
        if (result.error) {
          errorHandler?.(result.error);
          return;
        }

        const entity = result.data?.payload?._entity;
        if (entity === undefined || entity === null) return;

        handler(parse(entity));
      } catch (error) {
        errorHandler?.(error);
      }
    });
  }
}
