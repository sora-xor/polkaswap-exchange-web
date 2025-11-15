import { SubqueryBaseModule } from './_base';
import type { ConnectionQueryResponseData, HistoryElement, QueryResponseNodes } from '../../types';
export declare class SubqueryAccountModule extends SubqueryBaseModule {
  getHistory(variables?: {}): Promise<Nullable<QueryResponseNodes<HistoryElement>>>;
  getHistoryPaged(variables?: {}): Promise<Nullable<ConnectionQueryResponseData<HistoryElement>>>;
  createHistorySubscription(accountAddress: string, handler: (entity: HistoryElement) => void): () => void;
}
