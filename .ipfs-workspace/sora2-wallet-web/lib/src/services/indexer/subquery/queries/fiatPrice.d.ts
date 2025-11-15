import type { QueryData, ConnectionQueryResponse, UpdatesStream } from '../../types';
import type { SubqueryAssetEntity } from '../types';
export declare const FiatPriceQuery: import('@urql/core').TypedDocumentNode<
  ConnectionQueryResponse<SubqueryAssetEntity>,
  import('@urql/core').AnyVariables
>;
export declare const FiatPriceStreamQuery: import('@urql/core').TypedDocumentNode<
  QueryData<UpdatesStream>,
  import('@urql/core').AnyVariables
>;
