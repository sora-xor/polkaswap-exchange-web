import { TransactionStatus } from '@sora-substrate/sdk';
import { defineGetters } from 'direct-vuex';

import { transactionsGetterContext } from './../transactions';

import type { TransactionsState } from './types';
import type { HistoryItem } from '@sora-substrate/sdk';

const getters = defineGetters<TransactionsState>()({
  activeTxs(...args): Array<HistoryItem> {
    const { state } = transactionsGetterContext(args);
    return state.activeTxsIds.reduce((buffer: Array<HistoryItem>, id: string) => {
      if (id in state.history) {
        buffer.push(state.history[id]);
      }
      return buffer;
    }, []);
  },
  firstReadyTx(...args): Nullable<HistoryItem> {
    const { getters } = transactionsGetterContext(args);
    return getters.activeTxs.find((t: HistoryItem) =>
      [TransactionStatus.InBlock, TransactionStatus.Finalized, TransactionStatus.Error].includes(
        t.status as TransactionStatus
      )
    );
  },
  selectedTx(...args): Nullable<HistoryItem> {
    const { state } = transactionsGetterContext(args);
    if (!state.selectedTxId) {
      return null;
    }
    return (
      state.history[state.selectedTxId] ||
      state.externalHistory[state.selectedTxId] ||
      state.externalHistoryUpdates[state.selectedTxId]
    );
  },
});

export default getters;
