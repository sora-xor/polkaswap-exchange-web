import { Subscription } from 'rxjs';

import type { AccountHistory, HistoryItem } from '@sora-substrate/sdk';

export type TimerId = number | NodeJS.Timeout;

export type TransactionsState = {
  history: AccountHistory<HistoryItem>;
  externalHistory: AccountHistory<HistoryItem>;
  externalHistoryUpdates: AccountHistory<HistoryItem>;
  saveExternalHistoryUpdates: boolean;
  externalHistoryTotal: number;
  externalHistorySubscription: Nullable<VoidFunction>;
  activeTxsIds: Array<string>;
  updateActiveTxsId: Nullable<NodeJS.Timeout | number>;
  selectedTxId: Nullable<string>;
  isConfirmTxDialogDisabled: boolean;
  isSignTxDialogDisabled: boolean;
  isSignTxDialogVisible: boolean;
  pendingMstTxsSubscription: Nullable<Subscription>;
  pendingMstTransactions: HistoryItem[];
};
