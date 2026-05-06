import { settingsStorage } from '@/lib/soraneo-wallet/src/util/storage';

import type { TransactionsState } from './types';

export function initialState(): TransactionsState {
  const isConfirmTxDialogDisabled = settingsStorage.get('confirmTxDialogDisabled');
  const isSignTxDialogDisabled = settingsStorage.get('signTxDialogDisabled');

  return {
    history: {},
    externalHistory: {},
    externalHistoryTotal: 0,
    externalHistorySubscription: null,
    externalHistoryUpdates: {},
    saveExternalHistoryUpdates: false,
    activeTxsIds: [],
    updateActiveTxsId: null,
    selectedTxId: null,
    isConfirmTxDialogDisabled: isConfirmTxDialogDisabled ? Boolean(JSON.parse(isConfirmTxDialogDisabled)) : false,
    isSignTxDialogDisabled: isSignTxDialogDisabled ? Boolean(JSON.parse(isSignTxDialogDisabled)) : false,
    isSignTxDialogVisible: false,
    pendingMstTxsSubscription: null,
    pendingMstTransactions: [],
  };
}

const state = initialState();

export default state;
