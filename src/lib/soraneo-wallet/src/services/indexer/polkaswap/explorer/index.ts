import BaseExplorer from '../../explorer/base';

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

  public async fetchEntities<T>(
    query: TypedDocumentNode<ConnectionQueryResponse<T>>,
    variables?: AnyVariables
  ): Promise<Nullable<ConnectionQueryResponse<T>['data']>> {
    try {
      const response = await this.request(query, variables);

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
    parse?: (entity: T) => R
  ): Promise<Nullable<R[]>> {
    const acc: any = [];

    let after = '';
    let hasNextPage = true;

    try {
      do {
        const response = await this.fetchEntities(query, { ...variables, after });

        if (!response) {
          return null;
        }

        after = response.pageInfo.endCursor;
        hasNextPage = response.pageInfo.hasNextPage;

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
        if (result.data) {
          const entity = parse(result.data.payload._entity);
          handler(entity);
        } else {
          throw new Error('Subscription payload data is undefined');
        }
      } catch (error) {
        errorHandler?.(error);
      }
    });
  }
}
