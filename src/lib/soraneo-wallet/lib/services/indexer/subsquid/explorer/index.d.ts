import { default as BaseExplorer } from '../../explorer/base';
import { SubsquidAccountModule } from './modules/account';
import { SubsquidAssetModule } from './modules/asset';
import { SubsquidPriceModule } from './modules/price';
import { ConnectionQueryResponse, SubscriptionPayload } from '../../types';
import { TypedDocumentNode, AnyVariables } from '../client';
import { SubsquidQueryResponse, QueryResponseNodes, ConnectionQueryResponseData } from '../types';

export default class SubsquidExplorer extends BaseExplorer {
  readonly account: SubsquidAccountModule;
  readonly asset: SubsquidAssetModule;
  readonly price: SubsquidPriceModule;
  fetchEntities<T>(
    query: TypedDocumentNode<SubsquidQueryResponse<T>>,
    variables?: AnyVariables
  ): Promise<Nullable<QueryResponseNodes<T>>>;
  fetchEntitiesConnection<T>(
    query: TypedDocumentNode<ConnectionQueryResponse<T>>,
    variables?: AnyVariables
  ): Promise<Nullable<ConnectionQueryResponseData<T>>>;
  fetchAllEntitiesConnection<T, R>(
    query: TypedDocumentNode<ConnectionQueryResponse<T>>,
    variables?: AnyVariables,
    parse?: (entity: T) => R
  ): Promise<Nullable<R[]>>;
  createEntitySubscription<T, R>(
    subscription: TypedDocumentNode<SubscriptionPayload<T>>,
    variables: AnyVariables,
    parse: (entity: T) => R,
    handler: (entity: R) => void,
    errorHandler?: (error: any) => void
  ): VoidFunction;
}
