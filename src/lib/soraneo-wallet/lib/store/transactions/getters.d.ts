import { TransactionsState } from './types';
import { HistoryItem } from '@sora-substrate/sdk';

declare const getters: {
  activeTxs(state: TransactionsState, getters: any, rootState: any, rootGetters: any): Array<HistoryItem>;
  firstReadyTx(state: TransactionsState, getters: any, rootState: any, rootGetters: any): Nullable<HistoryItem>;
  selectedTx(state: TransactionsState, getters: any, rootState: any, rootGetters: any): Nullable<HistoryItem>;
};
export default getters;
