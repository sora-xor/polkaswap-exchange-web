import { Operation, HistoryItem } from '@sora-substrate/sdk';
import { HistoryElement } from './subquery/types';

export default class IndexerDataParser {
  static readonly SUPPORTED_OPERATIONS: Operation[];
  get supportedOperations(): Array<Operation>;
  parseTransactionAsHistoryItem(transaction: HistoryElement): Promise<Nullable<HistoryItem>>;
}
