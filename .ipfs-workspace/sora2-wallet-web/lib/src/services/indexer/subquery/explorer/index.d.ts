import BaseExplorer from '../../explorer/base';
import { SubqueryAccountModule } from './modules/account';
import { SubqueryAssetModule } from './modules/asset';
import { SubqueryPriceModule } from './modules/price';
import type { ConnectionQueryResponse } from '../../types';
import type { TypedDocumentNode, AnyVariables } from '../client';
import type { SubquerySubscriptionPayload } from '../types';
export default class SubqueryExplorer extends BaseExplorer {
  readonly account: SubqueryAccountModule;
  readonly asset: SubqueryAssetModule;
  readonly price: SubqueryPriceModule;
  fetchEntities<T>(
    query: TypedDocumentNode<ConnectionQueryResponse<T>>,
    variables?: AnyVariables
  ): Promise<Nullable<ConnectionQueryResponse<T>['data']>>;
  fetchAllEntities<T, R>(
    query: TypedDocumentNode<ConnectionQueryResponse<T>>,
    variables?: AnyVariables,
    parse?: (entity: T) => R
  ): Promise<Nullable<R[]>>;
  createEntitySubscription<T, R>(
    subscription: TypedDocumentNode<SubquerySubscriptionPayload<T>>,
    variables: AnyVariables,
    parse: (entity: T) => R,
    handler: (entity: R) => void,
    errorHandler?: (error: any) => void
  ): VoidFunction;
}
