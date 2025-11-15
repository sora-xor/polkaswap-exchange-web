import BaseExplorer from '../../explorer/base';

import { SubsquidAccountModule } from './modules/account';
import { SubsquidAssetModule } from './modules/asset';
import { SubsquidPriceModule } from './modules/price';

import type { ConnectionQueryResponse, SubscriptionPayload } from '../../types';
import type { TypedDocumentNode, AnyVariables } from '../client';
import type { SubsquidQueryResponse, QueryResponseNodes, ConnectionQueryResponseData } from '../types';

export default class SubsquidExplorer extends BaseExplorer {
  public readonly account: SubsquidAccountModule = new SubsquidAccountModule(this);
  public readonly asset: SubsquidAssetModule = new SubsquidAssetModule(this);
  public readonly price: SubsquidPriceModule = new SubsquidPriceModule(this);

  public async fetchEntities<T>(
    query: TypedDocumentNode<SubsquidQueryResponse<T>>,
    variables?: AnyVariables
  ): Promise<Nullable<QueryResponseNodes<T>>> {
    try {
      const response = await this.request(query, variables);

      if (!response) return null;

      return { nodes: response.nodes, totalCount: response.info.totalCount };
    } catch (error) {
      console.warn('Subsquid is not available or data is incorrect!', error);
      return null;
    }
  }

  public async fetchEntitiesConnection<T>(
    query: TypedDocumentNode<ConnectionQueryResponse<T>>,
    variables?: AnyVariables
  ): Promise<Nullable<ConnectionQueryResponseData<T>>> {
    try {
      const response = await this.request(query, variables);

      if (!response || !response.data) return null;

      return response.data;
    } catch (error) {
      console.warn('Subsquid is not available or data is incorrect!', error);
      return null;
    }
  }

  public async fetchAllEntitiesConnection<T, R>(
    query: TypedDocumentNode<ConnectionQueryResponse<T>>,
    variables: AnyVariables = {},
    parse?: (entity: T) => R
  ): Promise<Nullable<R[]>> {
    const acc: any = [];

    let after: string | null = null;
    let hasNextPage = true;

    try {
      do {
        const response = await this.fetchEntitiesConnection(query, { ...variables, after });

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
      console.warn('Subsquid is not available or data is incorrect!', error);
      return null;
    }
  }

  public createEntitySubscription<T, R>(
    subscription: TypedDocumentNode<SubscriptionPayload<T>>,
    variables: AnyVariables = {},
    parse: (entity: T) => R,
    handler: (entity: R) => void,
    errorHandler?: (error: any) => void
  ): VoidFunction {
    const createSubscription = this.subscribe(subscription, variables);

    return createSubscription((result) => {
      try {
        if (result.data) {
          const entity = parse(result.data.payload);
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
