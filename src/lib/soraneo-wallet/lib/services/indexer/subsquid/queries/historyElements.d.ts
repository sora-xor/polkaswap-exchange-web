import { Operation } from '@sora-substrate/sdk';
import { HistoryQuery } from '../../../../types/history';
import { ConnectionQueryResponse, HistoryElement } from '../../types';
import { SubsquidQueryResponse } from '../types';

export declare const HistoryElementsQuery: import('@urql/core').TypedDocumentNode<
  SubsquidQueryResponse<HistoryElement>,
  import('@urql/core').AnyVariables
>;
export declare const HistoryElementsConnectionQuery: import('@urql/core').TypedDocumentNode<
  ConnectionQueryResponse<HistoryElement>,
  import('@urql/core').AnyVariables
>;
type SubsquidHistoryElementsFilterOptions = {
  address?: string;
  assetAddress?: string;
  timestamp?: number;
  operations?: Array<Operation>;
  ids?: Array<string>;
  query?: HistoryQuery;
};
export declare const historyElementsFilter: ({
  address,
  assetAddress,
  timestamp,
  operations,
  ids,
  query: { operationNames, assetsAddresses, accountAddress, hexAddress },
}?: SubsquidHistoryElementsFilterOptions) => any;
export {};
