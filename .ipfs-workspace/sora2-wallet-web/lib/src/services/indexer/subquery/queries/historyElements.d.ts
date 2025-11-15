import { Operation } from '@sora-substrate/sdk';
import type { HistoryQuery } from '../../../../types/history';
import type { ConnectionQueryResponse, HistoryElement } from '../../types';
export declare const HistoryElementsQuery: import('@urql/core').TypedDocumentNode<
  ConnectionQueryResponse<HistoryElement>,
  import('@urql/core').AnyVariables
>;
type SubqueryHistoryElementsFilterOptions = {
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
}?: SubqueryHistoryElementsFilterOptions) => any;
export {};
