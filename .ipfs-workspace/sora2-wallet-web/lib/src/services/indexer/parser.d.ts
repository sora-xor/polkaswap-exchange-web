import { Operation } from '@sora-substrate/sdk';
import type { HistoryElement } from './subquery/types';
import type { HistoryItem } from '@sora-substrate/sdk';
export default class IndexerDataParser {
  static readonly SUPPORTED_OPERATIONS: Operation[];
  get supportedOperations(): Array<Operation>;
  parseTransactionAsHistoryItem(transaction: HistoryElement): Promise<Nullable<HistoryItem>>;
}
