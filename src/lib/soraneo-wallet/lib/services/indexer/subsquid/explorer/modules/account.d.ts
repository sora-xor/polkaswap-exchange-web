import { BaseModule } from './_base';
import { ConnectionQueryResponseData, HistoryElement, QueryResponseNodes } from '../../types';

export declare class SubsquidAccountModule extends BaseModule {
  getHistory(variables?: {}): Promise<Nullable<QueryResponseNodes<HistoryElement>>>;
  getHistoryPaged(variables?: {}): Promise<Nullable<ConnectionQueryResponseData<HistoryElement>>>;
  createHistorySubscription(accountAddress: string, handler: (entity: HistoryElement) => void): () => void;
}
